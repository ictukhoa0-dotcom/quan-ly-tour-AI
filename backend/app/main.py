from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from typing import Any, AsyncIterator
import secrets

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, SessionLocal, engine, get_db
from .models import Assignment, Booking, Customer, Departure, Destination, Feedback, Guide, Itinerary, Payment, Tour
from .schemas import BookingCreate, LoginRequest, PaymentCreate, RecommendationRequest, SummaryRequest, TourGenerationRequest

ALGORITHM = "HS256"
DEMO_USERS = {
    "admin": {"name": "Nguyễn Minh Anh", "role": "admin"},
    "tuvan": {"name": "Trần Hoàng Yến", "role": "consultant"},
    "ketoan": {"name": "Lê Quốc Bảo", "role": "accountant"},
}
ROLE_LABELS = {"admin": "Quản trị viên", "consultant": "Tư vấn viên", "accountant": "Kế toán"}
RESOURCE_MODELS = {
    "tours": Tour,
    "destinations": Destination,
    "itineraries": Itinerary,
    "departures": Departure,
    "customers": Customer,
    "guides": Guide,
    "assignments": Assignment,
    "feedback": Feedback,
}
WRITE_ROLES = {
    "tours": {"admin", "consultant"}, "destinations": {"admin", "consultant"},
    "itineraries": {"admin", "consultant"}, "departures": {"admin", "consultant"},
    "customers": {"admin", "consultant", "accountant"}, "bookings": {"admin", "consultant", "accountant"},
    "payments": {"admin", "accountant"}, "guides": {"admin", "consultant"},
    "assignments": {"admin", "consultant"}, "feedback": {"admin", "consultant"},
}
READ_ROLES = {
    "tours": {"admin", "consultant", "accountant"},
    "destinations": {"admin", "consultant"},
    "itineraries": {"admin", "consultant"},
    "departures": {"admin", "consultant", "accountant"},
    "customers": {"admin", "consultant", "accountant"},
    "bookings": {"admin", "consultant", "accountant"},
    "payments": {"admin", "accountant"},
    "guides": {"admin", "consultant"},
    "assignments": {"admin", "consultant"},
    "feedback": {"admin", "consultant"},
}
bearer = HTTPBearer(auto_error=False)
Base.metadata.create_all(bind=engine)


def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict[str, str]:
    if not credentials:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tiếp tục")
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload["role"], "name": payload["name"]}
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn") from None


def require_write(resource: str, user: dict[str, str]) -> None:
    if user["role"] not in WRITE_ROLES[resource]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")


def require_read(resource: str, user: dict[str, str]) -> None:
    if user["role"] not in READ_ROLES[resource]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem danh mục này")


def validate_input(model: Any, data: dict[str, Any]):
    try:
        return model.model_validate(data)
    except ValidationError as error:
        raise HTTPException(status_code=422, detail="Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc và giới hạn nhập.") from error


def validate_security_settings() -> None:
    secret = settings.jwt_secret.strip()
    placeholders = {
        "development-only-change-me",
        "replace-with-a-long-random-secret",
        "replace-with-a-random-secret-of-at-least-32-characters",
    }
    if len(secret) < 32 or secret.casefold() in placeholders:
        raise RuntimeError("JWT_SECRET phải là khóa ngẫu nhiên riêng tối thiểu 32 ký tự; hãy cấu hình biến môi trường trước khi chạy.")
    if settings.app_env == "development" and len(settings.demo_password) < 12:
        raise RuntimeError("Trong development, DEMO_PASSWORD phải được cấu hình với tối thiểu 12 ký tự.")


def serialize(item: Any) -> dict[str, Any]:
    return {column.name: getattr(item, column.name) for column in item.__table__.columns}


def remaining_seats(db: Session, departure: Departure) -> int:
    return max(0, departure.capacity - departure.reserved_seats)


def get_entity(db: Session, model: Any, entity_id: int, label: str):
    item = db.get(model, entity_id)
    if item is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy {label}")
    return item


def seed_database() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(func.count(Tour.id))):
            return
        destinations = [
            Destination(name="Hà Giang", region="Miền Bắc", description="Cao nguyên đá, đèo Mã Pì Lèng và văn hóa bản địa."),
            Destination(name="Vịnh Hạ Long", region="Miền Bắc", description="Di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi."),
            Destination(name="Huế", region="Miền Trung", description="Kinh thành cổ, ẩm thực cung đình và dòng sông Hương."),
            Destination(name="Đà Nẵng - Hội An", region="Miền Trung", description="Biển xanh, phố cổ đèn lồng và nhịp sống miền Trung."),
            Destination(name="Phú Quốc", region="Miền Nam", description="Đảo ngọc với bãi biển, rạn san hô và hoàng hôn."),
            Destination(name="Cần Thơ", region="Miền Nam", description="Miệt vườn sông nước và chợ nổi Cái Răng."),
        ]
        db.add_all(destinations)
        db.flush()
        destination_by_name = {item.name: item.id for item in destinations}
        tours = [
            Tour(name="Chạm vào Hà Giang", destination_id=destination_by_name["Hà Giang"], duration_days=4, price=4_890_000, category="Khám phá", description="Chinh phục đèo Mã Pì Lèng, thăm bản làng và ngắm cao nguyên đá.", status="Đang mở"),
            Tour(name="Du thuyền di sản Hạ Long", destination_id=destination_by_name["Vịnh Hạ Long"], duration_days=2, price=3_650_000, category="Nghỉ dưỡng", description="Một đêm du thuyền, chèo kayak và thưởng thức hải sản vịnh.", status="Đang mở"),
            Tour(name="Di sản miền Trung", destination_id=destination_by_name["Huế"], duration_days=3, price=3_290_000, category="Văn hóa", description="Kết nối Đại Nội Huế, lăng tẩm và ẩm thực cố đô.", status="Đang mở"),
            Tour(name="Đà Nẵng & phố cổ Hội An", destination_id=destination_by_name["Đà Nẵng - Hội An"], duration_days=4, price=5_290_000, category="Văn hóa", description="Bà Nà Hills, biển Mỹ Khê và đêm đèn lồng Hội An.", status="Đang mở"),
            Tour(name="Nghỉ dưỡng đảo Phú Quốc", destination_id=destination_by_name["Phú Quốc"], duration_days=3, price=6_490_000, category="Biển đảo", description="Nghỉ dưỡng bên biển, khám phá Nam đảo và ngắm hoàng hôn.", status="Đang mở"),
            Tour(name="Miền Tây mùa trái ngọt", destination_id=destination_by_name["Cần Thơ"], duration_days=2, price=2_450_000, category="Trải nghiệm", description="Chợ nổi bình minh, miệt vườn và bữa cơm miền Tây.", status="Đang mở"),
        ]
        db.add_all(tours)
        db.flush()
        tour_by_name = {item.name: item.id for item in tours}
        today = date.today()
        departures = []
        for tour_index, tour in enumerate(tours):
            for month_offset, capacity in [(8, 20), (22, 18), (36, 22)]:
                departures.append(Departure(
                    tour_id=tour.id,
                    departure_date=(today + timedelta(days=month_offset + tour_index * 2)).isoformat(),
                    capacity=capacity,
                    status="Đang mở",
                ))
        db.add_all(departures)
        customers = [
            Customer(name="Nguyễn Thu Hà", phone="0901234567", email="thuha@email.vn", address="Hà Nội"),
            Customer(name="Trần Minh Đức", phone="0912345678", email="minhduc@email.vn", address="TP. Hồ Chí Minh"),
            Customer(name="Lê Ngọc Mai", phone="0987654321", email="ngocmai@email.vn", address="Đà Nẵng"),
            Customer(name="Phạm Hoàng Long", phone="0934567890", email="longph@email.vn", address="Hà Nội"),
            Customer(name="Vũ Thanh Tâm", phone="0978123456", email="tamvt@email.vn", address="Cần Thơ"),
        ]
        db.add_all(customers)
        guides = [
            Guide(name="Nguyễn Văn Sơn", phone="0909876001", languages="Tiếng Việt, Tiếng Anh", status="Sẵn sàng"),
            Guide(name="Lê Thị Hương", phone="0909876002", languages="Tiếng Việt, Tiếng Anh, Tiếng Pháp", status="Sẵn sàng"),
            Guide(name="Trần Quốc Khánh", phone="0909876003", languages="Tiếng Việt", status="Đang dẫn tour"),
        ]
        db.add_all(guides)
        db.flush()
        for name, entries in {
            "Chạm vào Hà Giang": [("Hà Nội – Hà Giang", "Khởi hành, dừng chân tại Quản Bạ và nhận phòng."), ("Đồng Văn – Mã Pì Lèng", "Thăm phố cổ Đồng Văn, ngắm hẻm Tu Sản từ đèo Mã Pì Lèng."), ("Bản làng đá", "Ghé làng Lũng Cẩm và tìm hiểu đời sống người Mông."), ("Trở về Hà Nội", "Tự do mua đặc sản địa phương, khởi hành về Hà Nội.")],
            "Du thuyền di sản Hạ Long": [("Lên du thuyền", "Làm thủ tục, thưởng thức bữa trưa giữa vịnh."), ("Hang Sửng Sốt", "Khám phá hang động và chèo kayak tại khu vực cho phép.")],
            "Di sản miền Trung": [("Khám phá Đại Nội", "Tham quan Hoàng thành Huế và nghe câu chuyện triều Nguyễn."), ("Lăng tẩm & ẩm thực", "Thăm lăng Khải Định, thưởng thức món ăn địa phương."), ("Sông Hương", "Du thuyền ngắm cảnh, tự do khám phá phố Huế.")],
            "Đà Nẵng & phố cổ Hội An": [("Đà Nẵng", "Tham quan bán đảo Sơn Trà và biển Mỹ Khê."), ("Bà Nà Hills", "Vui chơi tại khu du lịch Bà Nà theo vé đã bao gồm."), ("Phố cổ Hội An", "Dạo phố cổ và thưởng thức cao lầu."), ("Chia tay miền Trung", "Tự do mua sắm trước khi khởi hành về.")],
            "Nghỉ dưỡng đảo Phú Quốc": [("Đến đảo ngọc", "Nhận phòng, thư giãn bên bãi biển."), ("Khám phá Nam đảo", "Thăm các điểm tham quan Nam đảo theo lịch đoàn."), ("Tạm biệt Phú Quốc", "Tự do buổi sáng, trả phòng và ra sân bay.")],
            "Miền Tây mùa trái ngọt": [("Bến Ninh Kiều", "Tham quan bến Ninh Kiều và thưởng thức đặc sản Cần Thơ."), ("Chợ nổi Cái Răng", "Trải nghiệm chợ nổi buổi sớm và ghé miệt vườn.")],
        }.items():
            tour_id = tour_by_name[name]
            db.add_all([Itinerary(tour_id=tour_id, day_number=index, title=title, details=details) for index, (title, details) in enumerate(entries, 1)])
        db.flush()
        booking_rows = [
            (customers[0], tours[0], departures[0], 2, "Đã xác nhận", 4_000_000),
            (customers[1], tours[3], departures[9], 2, "Đã xác nhận", 5_290_000),
            (customers[2], tours[2], departures[6], 1, "Chờ xác nhận", 0),
            (customers[3], tours[1], departures[3], 3, "Đã xác nhận", 3_650_000),
            (customers[4], tours[5], departures[15], 2, "Đã xác nhận", 2_450_000),
        ]
        for index, (customer, tour, departure, seats, booking_status, payment_amount) in enumerate(booking_rows, 1):
            departure.reserved_seats += seats
            booking = Booking(booking_code=f"VT2026{index:04d}", customer_id=customer.id, departure_id=departure.id,
                              seats=seats, total_amount=tour.price * seats, paid_amount=payment_amount, status=booking_status,
                              created_at=(datetime.now(timezone.utc) - timedelta(days=index * 2)).isoformat())
            db.add(booking)
            db.flush()
            if payment_amount:
                db.add(Payment(booking_id=booking.id, amount=payment_amount, method="Chuyển khoản",
                               paid_at=(datetime.now(timezone.utc) - timedelta(days=index)).isoformat(), note="Thanh toán đợt 1"))
        db.add_all([
            Feedback(customer_name="Nguyễn Thu Hà", tour_id=tours[0].id, rating=5, comment="Cung đường tuyệt đẹp, hướng dẫn viên nhiệt tình. Gia đình mình có trải nghiệm rất đáng nhớ!", created_at=(today - timedelta(days=5)).isoformat()),
            Feedback(customer_name="Trần Minh Đức", tour_id=tours[3].id, rating=4, comment="Lịch trình hợp lý, phố cổ Hội An buổi tối rất đẹp. Bữa ăn ngon.", created_at=(today - timedelta(days=3)).isoformat()),
            Feedback(customer_name="Lê Ngọc Mai", tour_id=tours[2].id, rating=5, comment="Hướng dẫn viên am hiểu lịch sử, đồ ăn Huế tuyệt vời.", created_at=(today - timedelta(days=1)).isoformat()),
        ])
        db.add(Assignment(guide_id=guides[0].id, departure_id=departures[0].id, note="Đón đoàn tại 06:30"))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    validate_security_settings()
    seed_database()
    yield


app = FastAPI(title="VietTour AI API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "VietTour AI"}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    if settings.app_env != "development":
        raise HTTPException(status_code=403, detail="Đăng nhập demo đã bị tắt. Hãy cấu hình nhà cung cấp danh tính cho môi trường này.")
    username, password = payload.username, payload.password
    account = DEMO_USERS.get(username)
    if account is None or not secrets.compare_digest(password, settings.demo_password):
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác")
    token = jwt.encode(
        {"sub": username, "role": account["role"], "name": account["name"],
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.jwt_secret, algorithm=ALGORITHM,
    )
    return {"access_token": token, "token_type": "bearer",
            "user": {"username": username, "name": account["name"], "role": account["role"], "role_label": ROLE_LABELS[account["role"]]}}


@app.get("/api/me")
def me(user: dict[str, str] = Depends(current_user)):
    return {**user, "role_label": ROLE_LABELS[user["role"]]}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    active_bookings = db.scalar(select(func.count(Booking.id)).where(Booking.status != "Đã hủy")) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0))) or 0
    tour_count = db.scalar(select(func.count(Tour.id))) or 0
    customer_count = db.scalar(select(func.count(Customer.id))) or 0
    upcoming = db.scalars(select(Departure).where(Departure.departure_date >= date.today().isoformat()).order_by(Departure.departure_date).limit(5)).all()
    recent = db.scalars(select(Booking).order_by(Booking.id.desc()).limit(5)).all()
    return {
        "metrics": {"active_bookings": active_bookings, "revenue": revenue, "tour_count": tour_count, "customer_count": customer_count},
        "upcoming_departures": [{**serialize(item), "remaining_seats": remaining_seats(db, item), "tour_name": db.get(Tour, item.tour_id).name} for item in upcoming],
        "recent_bookings": [{**serialize(item), "customer_name": db.get(Customer, item.customer_id).name,
                             "tour_name": db.get(Tour, db.get(Departure, item.departure_id).tour_id).name} for item in recent],
    }


@app.get("/api/{resource}")
def list_resources(resource: str, db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    if resource not in WRITE_ROLES:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    require_read(resource, user)
    if resource == "bookings":
        rows = db.scalars(select(Booking).order_by(Booking.id.desc())).all()
        result = []
        for row in rows:
            departure = db.get(Departure, row.departure_id)
            result.append({**serialize(row), "customer_name": db.get(Customer, row.customer_id).name,
                           "tour_name": db.get(Tour, departure.tour_id).name, "departure_date": departure.departure_date,
                           "amount_due": row.total_amount - row.paid_amount})
        return result
    if resource == "payments":
        rows = db.scalars(select(Payment).order_by(Payment.id.desc())).all()
        return [{**serialize(row), "booking_code": db.get(Booking, row.booking_id).booking_code} for row in rows]
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    rows = db.scalars(select(model).order_by(model.id.desc())).all()
    if resource == "departures":
        return [{**serialize(row), "tour_name": db.get(Tour, row.tour_id).name, "remaining_seats": remaining_seats(db, row)} for row in rows]
    if resource == "tours":
        return [{**serialize(row), "destination_name": db.get(Destination, row.destination_id).name} for row in rows]
    if resource == "itineraries":
        return [{**serialize(row), "tour_name": db.get(Tour, row.tour_id).name} for row in rows]
    if resource == "assignments":
        return [{**serialize(row), "guide_name": db.get(Guide, row.guide_id).name,
                 "departure_date": db.get(Departure, row.departure_id).departure_date} for row in rows]
    if resource == "feedback":
        return [{**serialize(row), "tour_name": db.get(Tour, row.tour_id).name} for row in rows]
    return [serialize(row) for row in rows]


@app.post("/api/{resource}", status_code=201)
def create_resource(resource: str, data: dict[str, Any], db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    if resource == "bookings":
        return create_booking(validate_input(BookingCreate, data), db, user)
    if resource == "payments":
        return create_payment(validate_input(PaymentCreate, data), db, user)
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không hỗ trợ tạo mới")
    require_write(resource, user)
    allowed = {column.name for column in model.__table__.columns} - {"id", "reserved_seats"}
    if not data or set(data) - allowed:
        raise HTTPException(status_code=422, detail="Dữ liệu không hợp lệ")
    item = model(**data)
    db.add(item)
    return commit_and_serialize(db, item)


@app.patch("/api/{resource}/{entity_id}")
def update_resource(resource: str, entity_id: int, data: dict[str, Any], db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không hỗ trợ chỉnh sửa")
    require_write(resource, user)
    item = get_entity(db, model, entity_id, resource)
    allowed = {column.name for column in model.__table__.columns} - {"id", "reserved_seats"}
    if not data or set(data) - allowed:
        raise HTTPException(status_code=422, detail="Dữ liệu cập nhật không hợp lệ")
    if isinstance(item, Departure) and "capacity" in data:
        reserved = item.reserved_seats
        if data["capacity"] < reserved:
            raise HTTPException(status_code=409, detail="Sức chứa không thể thấp hơn số ghế đã được đặt")
    for key, value in data.items():
        setattr(item, key, value)
    return commit_and_serialize(db, item)


@app.delete("/api/{resource}/{entity_id}")
def delete_resource(resource: str, entity_id: int, db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không hỗ trợ xóa")
    require_write(resource, user)
    item = get_entity(db, model, entity_id, resource)
    db.delete(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Không thể xóa vì dữ liệu đang được sử dụng") from None
    return {"message": "Đã xóa thành công"}


def commit_and_serialize(db: Session, item: Any):
    try:
        db.commit()
        db.refresh(item)
    except IntegrityError as error:
        db.rollback()
        detail = "Dữ liệu bị trùng hoặc không thỏa mãn ràng buộc liên quan"
        raise HTTPException(status_code=409, detail=detail) from error
    return serialize(item)


def create_booking(payload: BookingCreate, db: Session, user: dict[str, str]):
    require_write("bookings", user)
    departure = get_entity(db, Departure, payload.departure_id, "lịch khởi hành")
    get_entity(db, Customer, payload.customer_id, "khách hàng")
    if departure.status != "Đang mở" or departure.departure_date < date.today().isoformat():
        raise HTTPException(status_code=409, detail="Lịch khởi hành đã đóng hoặc đã qua")
    updated = db.execute(
        update(Departure)
        .where(Departure.id == departure.id, Departure.status == "Đang mở",
               Departure.departure_date >= date.today().isoformat(),
               Departure.reserved_seats + payload.seats <= Departure.capacity)
        .values(reserved_seats=Departure.reserved_seats + payload.seats)
    )
    if updated.rowcount != 1:
        db.refresh(departure)
        raise HTTPException(status_code=409, detail=f"Chỉ còn {remaining_seats(db, departure)} chỗ trống")
    tour = get_entity(db, Tour, departure.tour_id, "tour")
    booking = Booking(booking_code=f"VT{datetime.now():%y%m%d}{secrets.token_hex(3).upper()}",
                      customer_id=payload.customer_id, departure_id=departure.id, seats=payload.seats,
                      total_amount=tour.price * payload.seats, status="Đã xác nhận",
                      created_at=datetime.now(timezone.utc).isoformat())
    db.add(booking)
    db.flush()
    return commit_and_serialize(db, booking)


def create_payment(payload: PaymentCreate, db: Session, user: dict[str, str]):
    require_write("payments", user)
    booking = get_entity(db, Booking, payload.booking_id, "đơn đặt tour")
    if booking.status == "Đã hủy":
        raise HTTPException(status_code=409, detail="Không thể thu tiền cho đơn đã hủy")
    update_result = db.execute(
        update(Booking)
        .where(Booking.id == booking.id, Booking.status != "Đã hủy",
               Booking.paid_amount + payload.amount <= Booking.total_amount)
        .values(paid_amount=Booking.paid_amount + payload.amount)
    )
    if update_result.rowcount != 1:
        db.rollback()
        db.refresh(booking)
        if booking.status == "Đã hủy":
            raise HTTPException(status_code=409, detail="Không thể thu tiền cho đơn đã hủy")
        raise HTTPException(status_code=409, detail=f"Số tiền thu vượt số dư còn lại {booking.total_amount - booking.paid_amount:,} ₫")
    payment = Payment(booking_id=booking.id, amount=payload.amount, method=payload.method,
                      paid_at=datetime.now(timezone.utc).isoformat(), note=payload.note)
    db.add(payment)
    return commit_and_serialize(db, payment)


@app.post("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_write("bookings", user)
    booking = get_entity(db, Booking, booking_id, "đơn đặt tour")
    result = db.execute(
        update(Booking)
        .where(Booking.id == booking.id, Booking.status != "Đã hủy")
        .values(status="Đã hủy")
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail="Đơn đặt tour đã được hủy trước đó")
    db.execute(
        update(Departure)
        .where(Departure.id == booking.departure_id,
               Departure.reserved_seats >= booking.seats)
        .values(reserved_seats=Departure.reserved_seats - booking.seats)
    )
    return commit_and_serialize(db, booking)


@app.get("/api/departures/{departure_id}/seats")
def get_seats(departure_id: int, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    departure = get_entity(db, Departure, departure_id, "lịch khởi hành")
    return {"departure_id": departure.id, "capacity": departure.capacity, "remaining_seats": remaining_seats(db, departure)}


@app.get("/api/ai/status")
def ai_status(_user: dict[str, str] = Depends(current_user)):
    configured = bool(settings.ai_api_key.strip())
    return {"configured": configured, "mode": "provider" if configured else "deterministic"}


@app.post("/api/ai/recommendations")
def recommendations(payload: RecommendationRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    today = date.today().isoformat()
    earliest = max(today, payload.departure_after.isoformat() if payload.departure_after else today)
    tours = db.scalars(select(Tour).where(Tour.price <= payload.budget, Tour.status == "Đang mở")).all()
    matches = []
    prefs = [preference.casefold() for preference in payload.preferences]
    for tour in tours:
        if payload.duration_days and tour.duration_days != payload.duration_days:
            continue
        upcoming = db.scalars(select(Departure).where(
            Departure.tour_id == tour.id, Departure.departure_date >= earliest, Departure.status == "Đang mở"
        ).order_by(Departure.departure_date)).all()
        available = [departure for departure in upcoming if remaining_seats(db, departure) > 0]
        if not available:
            continue
        destination = db.get(Destination, tour.destination_id)
        text = f"{tour.name} {tour.category} {tour.description} {destination.name}".casefold()
        matching = sum(1 for preference in prefs if preference in text)
        matches.append({"tour_id": tour.id, "name": tour.name, "destination": destination.name,
                        "duration_days": tour.duration_days, "price": tour.price, "category": tour.category,
                        "description": tour.description, "departure_date": available[0].departure_date,
                        "remaining_seats": remaining_seats(db, available[0]), "departure_id": available[0].id,
                        "_match": matching})
    matches.sort(key=lambda item: (-item["_match"], item["price"]))
    for item in matches:
        item.pop("_match")
    return {"recommendations": matches[:3], "message": "Kết quả chỉ gồm tour, giá và lịch khởi hành hiện có trong hệ thống."}


def deterministic_tour_text(destination: str, days: int, style: str, existing: list[dict[str, str]], description: str = "") -> dict[str, Any]:
    if existing:
        return {"description": description, "itinerary": [{"day": row["day_number"], "title": row["title"], "details": row["details"]} for row in existing]}
    description = f"Hành trình {days} ngày tại {destination or 'Việt Nam'}, tập trung vào trải nghiệm {style}, nhịp độ cân bằng và khám phá văn hóa địa phương."
    itinerary = [{"day": day, "title": f"Ngày {day}: Khám phá {destination or 'điểm đến'}",
                  "details": "Tham quan theo lịch trình đã được đơn vị điều hành xác nhận; thời gian và dịch vụ cụ thể cần được kiểm tra trước khi công bố."}
                 for day in range(1, days + 1)]
    return {"description": description, "itinerary": itinerary}


async def optional_ai(system_prompt: str, user_prompt: str, max_tokens: int = 700) -> str | None:
    if not settings.ai_api_key:
        return None
    url = f"{settings.ai_base_url.rstrip('/')}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(url, headers={"Authorization": f"Bearer {settings.ai_api_key}"},
                                         json={"model": settings.ai_model, "temperature": 0.3, "max_tokens": max_tokens,
                                               "messages": [{"role": "system", "content": system_prompt},
                                                            {"role": "user", "content": user_prompt}]})
    except (httpx.TimeoutException, httpx.RequestError):
        raise HTTPException(status_code=502, detail="Không thể kết nối dịch vụ AI; vui lòng thử lại sau") from None
    if response.is_error:
        raise HTTPException(status_code=502, detail="Dịch vụ AI hiện không khả dụng; vui lòng thử lại sau")
    try:
        return response.json()["choices"][0]["message"]["content"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise HTTPException(status_code=502, detail="Dịch vụ AI trả về dữ liệu không hợp lệ") from None


@app.post("/api/ai/tour-content")
async def generate_tour_content(payload: TourGenerationRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    existing = []
    destination = payload.destination
    description = ""
    if payload.tour_id is not None:
        tour = get_entity(db, Tour, payload.tour_id, "tour")
        destination = db.get(Destination, tour.destination_id).name
        description = tour.description
        existing = [serialize(row) for row in db.scalars(select(Itinerary).where(Itinerary.tour_id == tour.id).order_by(Itinerary.day_number)).all()]
    if not destination:
        raise HTTPException(status_code=422, detail="Vui lòng cung cấp điểm đến hoặc chọn tour")
    fallback = deterministic_tour_text(destination, payload.duration_days, payload.style, existing, description)
    ai_text = await optional_ai(
        "Bạn là trợ lý biên tập tour Việt Nam. Chỉ viết phần mô tả và ý tưởng lịch trình. Không được bịa giá, ngày khởi hành, dịch vụ bao gồm hoặc địa điểm cụ thể không có trong dữ liệu đầu vào. Đánh dấu nội dung cần xác minh.",
        f"Điểm đến: {destination}. Thời lượng: {payload.duration_days} ngày. Phong cách: {payload.style}. "
        f"Lịch trình đã có: {fallback['itinerary']}. Viết mô tả ngắn và đề xuất lịch trình JSON hợp lệ.",
        900,
    )
    if ai_text:
        fallback["suggestion"] = ai_text[:6000]
    return {"content": fallback, "human_verification_required": True, "source": "ai" if ai_text else "deterministic"}


@app.post("/api/ai/feedback-summary")
async def feedback_summary(payload: SummaryRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    query = select(Feedback).order_by(Feedback.id.desc()).limit(payload.max_feedback)
    if payload.tour_id is not None:
        query = query.where(Feedback.tour_id == payload.tour_id)
    rows = db.scalars(query).all()
    if not rows:
        return {"summary": "Chưa có phản hồi để tổng hợp.", "count": 0, "average_rating": None, "human_verification_required": True}
    average = round(sum(row.rating for row in rows) / len(rows), 1)
    themes = []
    if average >= 4:
        themes.append("Khách hàng nhìn chung hài lòng với trải nghiệm.")
    if any("hướng dẫn viên" in row.comment.casefold() for row in rows):
        themes.append("Hướng dẫn viên được nhắc đến trong phản hồi.")
    if any("ẩm thực" in row.comment.casefold() or "ăn" in row.comment.casefold() for row in rows):
        themes.append("Ẩm thực là một điểm chạm đáng chú ý.")
    fallback = f"Đã tổng hợp {len(rows)} phản hồi, điểm trung bình {average}/5. " + " ".join(themes or ["Nên đọc phản hồi gốc để xác định chủ đề nổi bật."])
    ai_text = await optional_ai(
        "Tóm tắt trung thực phản hồi khách hàng bằng tiếng Việt. Chỉ dựa vào trích dẫn đầu vào, không suy diễn nguyên nhân. Không tiết lộ dữ liệu cá nhân.",
        "Các phản hồi: " + " | ".join(row.comment[:500] for row in rows[:50]),
        250,
    )
    return {"summary": (ai_text or fallback)[:1500], "count": len(rows), "average_rating": average,
            "human_verification_required": True, "source": "ai" if ai_text else "deterministic"}


@app.get("/")
def root():
    return {"message": "VietTour AI API", "docs": "/docs"}
