from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
import json
from threading import Lock
from typing import Any, AsyncIterator
import secrets

import bcrypt
import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .db import Base, SessionLocal, engine, ensure_account_session_version, ensure_customer_password_hash, ensure_tour_image_url, get_db
from .exports import (
    booking_confirmation_pdf, bookings_workbook, revenue_pdf, revenue_workbook, tours_pdf, tours_workbook,
)
from .models import Account, Assignment, Booking, Customer, Departure, Destination, Feedback, Guide, Itinerary, Payment, Tour
from .schemas import AIChatRequest, AccountCreate, AccountUpdate, BookingCreate, BookingUpdate, LoginRequest, PaymentCreate, RecommendationRequest, SummaryRequest, TourGenerationRequest

ALGORITHM = "HS256"
ROLE_LABELS = {"admin": "Quản trị viên", "tu_van": "Tư vấn viên"}
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
ALL_RESOURCES = set(RESOURCE_MODELS) | {"bookings", "payments"}
WRITE_ROLES = {resource: {"admin"} for resource in ALL_RESOURCES}
WRITE_ROLES.update({"customers": {"admin", "tu_van"}, "bookings": {"admin", "tu_van"}})
READ_ROLES = {resource: {"admin"} for resource in ALL_RESOURCES}
READ_ROLES.update({
    "tours": {"admin", "tu_van"},
    "departures": {"admin", "tu_van"},
    "customers": {"admin", "tu_van"},
    "bookings": {"admin", "tu_van"},
})
Base.metadata.create_all(bind=engine)
ensure_account_session_version(engine)
ensure_customer_password_hash(engine)
ensure_tour_image_url(engine)
DUMMY_PASSWORD_HASH = bcrypt.hashpw(secrets.token_bytes(32), bcrypt.gensalt()).decode("ascii")


def current_user(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    token = request.cookies.get("viettour_session")
    if not token:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để tiếp tục")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        account_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn") from None
    account = db.get(Account, account_id)
    if account is None or not account.is_active or payload.get("ver", 0) != account.session_version:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn")
    validate_request_origin(request)
    return {"id": str(account.id), "username": account.username, "role": account.role, "name": account.name}


def validate_request_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    trusted_origins = {settings.frontend_origin}
    if settings.app_env == "development":
        for port in ("5173", "5174", "5175"):
            trusted_origins.add(f"http://localhost:{port}")
            trusted_origins.add(f"http://127.0.0.1:{port}")
    if origin and origin not in trusted_origins and request.method not in {"GET", "HEAD", "OPTIONS"}:
        raise HTTPException(status_code=403, detail="Nguồn yêu cầu không được phép")


class FixedWindowLimiter:
    def __init__(self) -> None:
        self._windows: dict[str, tuple[float, int]] = {}
        self._lock = Lock()

    def check(self, key: str, limit: int, window_seconds: int = 60) -> None:
        now = datetime.now(timezone.utc).timestamp()
        client = key
        with self._lock:
            expired = [item for item, (started, _) in self._windows.items() if now - started >= window_seconds]
            for item in expired:
                del self._windows[item]
            started, count = self._windows.get(client, (now, 0))
            if count >= limit:
                raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu. Vui lòng thử lại sau.")
            if client not in self._windows and len(self._windows) >= 10_000:
                del self._windows[next(iter(self._windows))]
            self._windows[client] = (started, count + 1)


rate_limiter = FixedWindowLimiter()


def limit_requests(request: Request, action: str, limit: int) -> None:
    client_host = request.client.host if request.client else "unknown"
    rate_limiter.check(f"{action}:{client_host}", limit)


def limit_ai_requests(request: Request) -> None:
    limit_requests(request, "ai", 20)


def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(status_code=422, detail="Mật khẩu không được vượt quá 72 byte")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    if len(password.encode("utf-8")) > 72:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return False


def public_account(account: Account) -> dict[str, Any]:
    return {
        "id": account.id,
        "username": account.username,
        "name": account.name,
        "role": account.role,
        "role_label": ROLE_LABELS[account.role],
        "is_active": account.is_active,
    }


def require_admin(user: dict[str, str]) -> None:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới được quản lý tài khoản")


def require_write(resource: str, user: dict[str, str]) -> None:
    if user["role"] not in WRITE_ROLES[resource]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này")


def require_delete(user: dict[str, str]) -> None:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới được xóa dữ liệu")


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


def ensure_initial_admin(db: Session | None = None) -> None:
    owned_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        if db.scalar(select(func.count(Account.id))):
            return
        username = settings.initial_admin_username.strip()
        if not username or len(username) > 40 or not all(char.isascii() and (char.isalnum() or char in "_.-") for char in username):
            raise RuntimeError("Cần cấu hình INITIAL_ADMIN_USERNAME hợp lệ để khởi tạo quản trị viên đầu tiên.")
        password = settings.initial_admin_password
        if (
            len(password) < 12
            or len(password.encode("utf-8")) > 72
            or password.casefold() == "replace-with-a-private-initial-admin-password"
        ):
            raise RuntimeError("INITIAL_ADMIN_PASSWORD phải là mật khẩu riêng từ 12 đến 72 byte.")
        db.add(Account(username=username, name="Quản trị viên", role="admin",
                       password_hash=hash_password(password), is_active=True))
        db.commit()
    finally:
        if owned_session:
            db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    validate_security_settings()
    ensure_initial_admin()
    seed_database()
    yield


app = FastAPI(title="VietTour AI API", version="1.0.0", lifespan=lifespan)
allowed_origins = [settings.frontend_origin]
if settings.app_env == "development":
    for port in ("5173", "5174", "5175"):
        allowed_origins.append(f"http://localhost:{port}")
        allowed_origins.append(f"http://127.0.0.1:{port}")
allowed_origins = list(set(allowed_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "VietTour AI"}


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    validate_request_origin(request)
    limit_requests(request, "login", 5)
    account = db.scalar(select(Account).where(Account.username == payload.username))
    password_hash = account.password_hash if account else DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, password_hash)
    if account is None or not account.is_active or not password_matches:
        raise HTTPException(status_code=401, detail="Tên đăng nhập hoặc mật khẩu không chính xác")
    token = jwt.encode(
        {"sub": str(account.id), "ver": account.session_version,
         "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.jwt_secret, algorithm=ALGORITHM,
    )
    response.set_cookie(
        key="viettour_session",
        value=token,
        max_age=8 * 60 * 60,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
        path="/api",
    )
    return {"user": public_account(account)}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    validate_request_origin(request)
    response.delete_cookie(key="viettour_session", path="/api", httponly=True,
                           secure=settings.app_env == "production",
                           samesite="none" if settings.app_env == "production" else "lax")
    return {"message": "Đã đăng xuất"}


@app.get("/api/me")
def me(user: dict[str, str] = Depends(current_user)):
    return {**user, "role_label": ROLE_LABELS[user["role"]]}


@app.get("/api/users")
def list_accounts(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_admin(user)
    accounts = db.scalars(select(Account).order_by(Account.username)).all()
    return [public_account(account) for account in accounts]


@app.post("/api/users", status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db),
                   user: dict[str, str] = Depends(current_user)):
    require_admin(user)
    account = Account(username=payload.username, name=payload.name, role=payload.role,
                      password_hash=hash_password(payload.password), is_active=True)
    db.add(account)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Tên đăng nhập đã được sử dụng") from None
    db.refresh(account)
    return public_account(account)


@app.patch("/api/users/{account_id}")
def update_account(account_id: int, payload: AccountUpdate, db: Session = Depends(get_db),
                   user: dict[str, str] = Depends(current_user)):
    require_admin(user)
    account = get_entity(db, Account, account_id, "tài khoản")
    changes = payload.model_dump(exclude_unset=True)
    if account.id == int(user["id"]) and (
        changes.get("is_active") is False or changes.get("role", account.role) != "admin"
    ):
        raise HTTPException(status_code=409, detail="Không thể vô hiệu hóa hoặc hạ quyền tài khoản đang đăng nhập")
    removing_admin = account.role == "admin" and account.is_active and (
        changes.get("is_active") is False or changes.get("role", account.role) != "admin"
    )
    if removing_admin:
        active_admins = db.scalar(select(func.count(Account.id)).where(
            Account.role == "admin", Account.is_active.is_(True)
        )) or 0
        if active_admins <= 1:
            raise HTTPException(status_code=409, detail="Phải duy trì ít nhất một quản trị viên đang hoạt động")
    if "password" in changes:
        account.password_hash = hash_password(changes.pop("password"))
        account.session_version += 1
    for field, value in changes.items():
        setattr(account, field, value)
    db.commit()
    db.refresh(account)
    return public_account(account)


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    tour_count = db.scalar(select(func.count(Tour.id))) or 0
    upcoming = db.scalars(select(Departure).where(Departure.departure_date >= date.today().isoformat()).order_by(Departure.departure_date).limit(5)).all()
    response = {
        "metrics": {"tour_count": tour_count},
        "upcoming_departures": [{**serialize(item), "remaining_seats": remaining_seats(db, item), "tour_name": db.get(Tour, item.tour_id).name} for item in upcoming],
        "recent_bookings": [],
    }
    if user["role"] == "admin":
        active_bookings = db.scalar(select(func.count(Booking.id)).where(Booking.status != "Đã hủy")) or 0
        revenue = db.scalar(select(func.coalesce(func.sum(Payment.amount), 0))) or 0
        customer_count = db.scalar(select(func.count(Customer.id))) or 0
        recent = db.scalars(select(Booking).order_by(Booking.id.desc()).limit(5)).all()
        response["metrics"].update({
            "active_bookings": active_bookings,
            "revenue": revenue,
            "customer_count": customer_count,
        })
        response["recent_bookings"] = [
            {**serialize(item), "customer_name": db.get(Customer, item.customer_id).name,
             "tour_name": db.get(Tour, db.get(Departure, item.departure_id).tour_id).name}
            for item in recent
        ]
    return response


@app.get("/api/export/tours")
def export_tours(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("tours", user)
    content = tours_workbook(db)
    return Response(content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="viettour-tours.xlsx"'})


@app.get("/api/export/tours/pdf")
def export_tours_pdf(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("tours", user)
    return Response(tours_pdf(db), media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="viettour-tours.pdf"'})


@app.get("/api/export/bookings")
def export_bookings(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("bookings", user)
    content = bookings_workbook(db)
    return Response(content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="viettour-bookings.xlsx"'})


@app.get("/api/export/revenue")
def export_revenue(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("payments", user)
    content = revenue_workbook(db)
    return Response(content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="viettour-revenue.xlsx"'})


@app.get("/api/export/revenue/pdf")
def export_revenue_pdf(db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("payments", user)
    return Response(revenue_pdf(db), media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="viettour-revenue.pdf"'})


@app.get("/api/export/bookings/{booking_id}/pdf")
def export_booking_pdf(booking_id: int, db: Session = Depends(get_db),
                       user: dict[str, str] = Depends(current_user)):
    require_read("bookings", user)
    try:
        content = booking_confirmation_pdf(db, booking_id)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
    return Response(content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="booking-{booking_id}.pdf"'})


class PublicBookingRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    email: str = Field(default="", max_length=160)
    address: str = Field(default="", max_length=240)
    departure_id: int
    seats: int = Field(gt=0, le=50)
    notes: str = Field(default="", max_length=500)


class PublicAIChatRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)


@app.get("/api/public/portal")
def public_portal_data(db: Session = Depends(get_db)):
    tours = db.scalars(select(Tour).where(Tour.status == "Đang mở")).all()
    destinations = db.scalars(select(Destination)).all()
    departures = db.scalars(
        select(Departure).where(
            Departure.status == "Đang mở",
            Departure.departure_date >= date.today().isoformat()
        ).order_by(Departure.departure_date)
    ).all()
    itineraries = db.scalars(select(Itinerary).order_by(Itinerary.tour_id, Itinerary.day_number)).all()
    feedbacks = db.scalars(select(Feedback).order_by(Feedback.id.desc()).limit(10)).all()

    dest_map = {d.id: d for d in destinations}
    tour_list = []
    for t in tours:
        dest = dest_map.get(t.destination_id)
        tour_list.append({
            **serialize(t),
            "destination_name": dest.name if dest else "",
            "region": dest.region if dest else "Việt Nam",
        })

    dep_list = []
    for dep in departures:
        dep_list.append({
            **serialize(dep),
            "remaining_seats": remaining_seats(db, dep),
        })

    return {
        "tours": tour_list,
        "destinations": [serialize(d) for d in destinations],
        "departures": dep_list,
        "itineraries": [serialize(it) for it in itineraries],
        "feedbacks": [serialize(f) for f in feedbacks],
    }


@app.post("/api/public/book")
def public_book(payload: PublicBookingRequest, request: Request, db: Session = Depends(get_db)):
    limit_requests(request, "public_book", 15)
    departure = get_entity(db, Departure, payload.departure_id, "lịch khởi hành")
    if departure.status != "Đang mở" or departure.departure_date < date.today().isoformat():
        raise HTTPException(status_code=409, detail="Lịch khởi hành đã đóng hoặc đã qua")

    clean_phone = payload.phone.strip()
    customer = db.scalar(select(Customer).where(Customer.phone == clean_phone))
    if not customer:
        customer = Customer(
            name=payload.name.strip(),
            phone=clean_phone,
            email=payload.email.strip(),
            address=payload.address.strip() or "Khách đặt trực tuyến",
        )
        db.add(customer)
        db.flush()
    else:
        if payload.name.strip():
            customer.name = payload.name.strip()
        if payload.email.strip():
            customer.email = payload.email.strip()

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
    booking_code = f"VT{datetime.now():%y%m%d}{secrets.token_hex(3).upper()}"
    booking = Booking(
        booking_code=booking_code,
        customer_id=customer.id,
        departure_id=departure.id,
        seats=payload.seats,
        total_amount=tour.price * payload.seats,
        status="Đã xác nhận",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    db.add(booking)
    db.commit()
    return {
        "success": True,
        "booking_code": booking.booking_code,
        "total_amount": booking.total_amount,
        "customer_name": customer.name,
        "tour_name": tour.name,
        "departure_date": departure.departure_date,
        "seats": booking.seats,
        "message": "Đặt tour thành công! Nhân viên VietTour AI sẽ liên hệ hỗ trợ bạn sớm nhất."
    }


@app.post("/api/public/ai-chat")
async def public_ai_chat(payload: PublicAIChatRequest, request: Request, db: Session = Depends(get_db)):
    limit_requests(request, "public_ai_chat", 20)
    prompt_lower = payload.prompt.lower()
    tours = db.scalars(select(Tour).where(Tour.status == "Đang mở")).all()
    destinations = db.scalars(select(Destination)).all()
    departures = db.scalars(
        select(Departure).where(Departure.status == "Đang mở", Departure.departure_date >= date.today().isoformat())
    ).all()

    matched = []
    for t in tours:
        dest = next((d for d in destinations if d.id == t.destination_id), None)
        dest_name = dest.name.lower() if dest else ""
        region = dest.region.lower() if dest else ""
        if (dest_name and dest_name in prompt_lower) or (region and region in prompt_lower) or t.name.lower() in prompt_lower or t.category.lower() in prompt_lower:
            matched.append(t)

    selected = matched[:4] if matched else tours[:4]
    matched_ids = [t.id for t in selected]

    ai_cfg = resolve_ai_config()
    if ai_cfg["provider"] != "none":
        # Chuẩn bị dữ liệu tour thực tế trong hệ thống làm tri thức cho Gemini AI
        tours_catalog_info = []
        for t in tours:
            dest = next((d for d in destinations if d.id == t.destination_id), None)
            t_deps = [dep for dep in departures if dep.tour_id == t.id and remaining_seats(db, dep) > 0]
            dates_str = ", ".join(d.departure_date for d in t_deps[:3]) if t_deps else "Chưa có ngày mở"
            tours_catalog_info.append(
                f"- Tour #{t.id}: {t.name} | Điểm đến: {dest.name if dest else 'VN'} ({dest.region if dest else ''}) | "
                f"Giá: {t.price:,.0f}đ/khách | {t.duration_days} ngày | Thể loại: {t.category} | "
                f"Khởi hành: {dates_str} | Lịch trình tóm tắt: {t.description}"
            )

        system_prompt = (
            "Bạn là chuyên viên tư vấn du lịch thông minh, thân thiện của VietTour AI. "
            "Hãy trả lời khách hàng bằng tiếng Việt tự nhiên, nhiệt tình, lịch sự, có biểu tượng cảm xúc sinh động. "
            "Chỉ tư vấn dựa trên danh mục tour có thật dưới đây. "
            "Nêu rõ tên tour, thời lượng, mức giá và điểm nổi bật phù hợp với yêu cầu của khách hàng. "
            "Nếu khách hỏi địa điểm chưa có tour, hãy giới thiệu các tour gần nhất đang có trong danh sách. "
            "Không bịa thông tin giá hoặc ngày khởi hành.\n\n"
            "DANH SÁCH TOUR HIỆN CÓ CỦA VIETTOUR:\n" + "\n".join(tours_catalog_info)
        )

        try:
            ai_reply = await optional_ai(system_prompt, payload.prompt, max_tokens=650)
            if ai_reply and ai_reply.strip():
                return {"reply": ai_reply.strip(), "tour_ids": matched_ids}
        except Exception:
            pass

    # Fallback tự động khi chưa cấu hình AI key hoặc khi dịch vụ AI bận
    reply_lines = ["Xin chào quý khách! VietTour AI hân hạnh gợi ý cho bạn các tour nổi bật phù hợp:"]
    for i, t in enumerate(selected[:3], 1):
        dest = next((d for d in destinations if d.id == t.destination_id), None)
        t_deps = [dep for dep in departures if dep.tour_id == t.id and remaining_seats(db, dep) > 0]
        dates_str = ", ".join(d.departure_date for d in t_deps[:2]) if t_deps else "Sắp có lịch mới"
        reply_lines.append(
            f"\n🌟 **{i}. {t.name}** ({t.duration_days} ngày - {t.category})\n"
            f"   • Điểm đến: {dest.name if dest else 'Việt Nam'} ({dest.region if dest else ''})\n"
            f"   • Giá tour: {t.price:,.0f} ₫/khách\n"
            f"   • Khởi hành: {dates_str}\n"
            f"   • Hành trình: {t.description}"
        )
    reply_lines.append("\n👉 Bạn có thể bấm chọn tour trực tiếp trên trang chủ để xem lịch trình ngày và đặt chỗ nhanh chóng!")
    return {"reply": "\n".join(reply_lines), "tour_ids": matched_ids}


class CustomerRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=6, max_length=72)
    email: str = Field(default="", max_length=160)
    address: str = Field(default="", max_length=240)


class CustomerLoginRequest(BaseModel):
    phone: str = Field(min_length=6, max_length=160)
    password: str = Field(min_length=1, max_length=72)


def serialize_customer(customer: Customer) -> dict[str, Any]:
    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
    }


def current_customer(request: Request, db: Session = Depends(get_db)) -> Customer:
    token = request.cookies.get("viettour_customer_session")
    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if not token:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập tài khoản khách hàng")
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        if payload.get("typ") != "customer":
            raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ")
        customer_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn") from None
    customer = db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=401, detail="Tài khoản khách hàng không tồn tại")
    return customer


@app.post("/api/public/customer/register")
def customer_register(payload: CustomerRegisterRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    limit_requests(request, "customer_register", 10)
    clean_phone = payload.phone.strip()
    clean_email = payload.email.strip()

    existing = db.scalar(select(Customer).where(Customer.phone == clean_phone))
    if existing:
        if existing.password_hash:
            raise HTTPException(status_code=409, detail="Số điện thoại này đã được đăng ký tài khoản. Vui lòng đăng nhập.")
        existing.name = payload.name.strip()
        if clean_email:
            existing.email = clean_email
        if payload.address.strip():
            existing.address = payload.address.strip()
        existing.password_hash = hash_password(payload.password)
        customer = existing
    else:
        customer = Customer(
            name=payload.name.strip(),
            phone=clean_phone,
            email=clean_email,
            address=payload.address.strip(),
            password_hash=hash_password(payload.password),
        )
        db.add(customer)

    db.commit()
    db.refresh(customer)

    token = jwt.encode(
        {"sub": str(customer.id), "typ": "customer",
         "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        settings.jwt_secret, algorithm=ALGORITHM,
    )
    response.set_cookie(
        key="viettour_customer_session",
        value=token,
        max_age=30 * 24 * 60 * 60,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
        path="/",
    )
    return {"customer": serialize_customer(customer), "token": token}


@app.post("/api/public/customer/login")
def customer_login(payload: CustomerLoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    limit_requests(request, "customer_login", 15)
    query_val = payload.phone.strip()
    customer = db.scalar(select(Customer).where((Customer.phone == query_val) | (Customer.email == query_val)))

    password_hash = customer.password_hash if (customer and customer.password_hash) else DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, password_hash)
    if customer is None or not customer.password_hash or not password_matches:
        raise HTTPException(status_code=401, detail="Số điện thoại/email hoặc mật khẩu không chính xác")

    token = jwt.encode(
        {"sub": str(customer.id), "typ": "customer",
         "exp": datetime.now(timezone.utc) + timedelta(days=30)},
        settings.jwt_secret, algorithm=ALGORITHM,
    )
    response.set_cookie(
        key="viettour_customer_session",
        value=token,
        max_age=30 * 24 * 60 * 60,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="none" if settings.app_env == "production" else "lax",
        path="/",
    )
    return {"customer": serialize_customer(customer), "token": token}


@app.get("/api/public/customer/me")
def customer_me(customer: Customer = Depends(current_customer)):
    return {"customer": serialize_customer(customer)}


@app.post("/api/public/customer/logout")
def customer_logout(response: Response):
    response.delete_cookie(key="viettour_customer_session", path="/", httponly=True,
                           secure=settings.app_env == "production",
                           samesite="none" if settings.app_env == "production" else "lax")
    return {"message": "Đã đăng xuất"}


@app.get("/api/public/customer/bookings")
def customer_bookings(customer: Customer = Depends(current_customer), db: Session = Depends(get_db)):
    bookings = db.scalars(select(Booking).where(Booking.customer_id == customer.id).order_by(Booking.id.desc())).all()
    result = []
    for b in bookings:
        departure = db.get(Departure, b.departure_id)
        tour = db.get(Tour, departure.tour_id) if departure else None
        result.append({
            "id": b.id,
            "booking_code": b.booking_code,
            "tour_name": tour.name if tour else "Tour du lịch",
            "departure_date": departure.departure_date if departure else "",
            "seats": b.seats,
            "total_amount": b.total_amount,
            "paid_amount": b.paid_amount,
            "status": b.status,
            "created_at": b.created_at,
        })
    return {"bookings": result}


@app.get("/api/{resource}")
def list_resources(
    resource: str,
    page: int | None = Query(default=None, ge=1),
    limit: int | None = Query(default=None, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    departure_date: date | None = None,
    status: str | None = Query(default=None, max_length=30),
    payment_status: str | None = Query(default=None, pattern="^(Chưa thanh toán|Thanh toán một phần|Đã thanh toán)$"),
    db: Session = Depends(get_db),
    user: dict[str, str] = Depends(current_user),
):
    if resource not in WRITE_ROLES:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    require_read(resource, user)
    paginated = any(value is not None for value in (page, limit, search, departure_date, status, payment_status))
    page_number = page or 1
    page_size = limit or 20
    if resource == "bookings":
        query = select(Booking)
        count_query = select(func.count(Booking.id))
        if search:
            term = f"%{search.strip()}%"
            query = query.join(Customer, Booking.customer_id == Customer.id).where(
                Booking.booking_code.ilike(term) | Customer.name.ilike(term)
            )
            count_query = count_query.join(Customer, Booking.customer_id == Customer.id).where(
                Booking.booking_code.ilike(term) | Customer.name.ilike(term)
            )
        if departure_date:
            query = query.join(Departure, Booking.departure_id == Departure.id).where(
                Departure.departure_date == departure_date.isoformat()
            )
            count_query = count_query.join(Departure, Booking.departure_id == Departure.id).where(
                Departure.departure_date == departure_date.isoformat()
            )
        if status:
            query = query.where(Booking.status == status)
            count_query = count_query.where(Booking.status == status)
        if payment_status == "Chưa thanh toán":
            query = query.where(Booking.paid_amount == 0)
            count_query = count_query.where(Booking.paid_amount == 0)
        elif payment_status == "Thanh toán một phần":
            query = query.where(Booking.paid_amount > 0, Booking.paid_amount < Booking.total_amount)
            count_query = count_query.where(Booking.paid_amount > 0, Booking.paid_amount < Booking.total_amount)
        elif payment_status == "Đã thanh toán":
            query = query.where(Booking.paid_amount >= Booking.total_amount)
            count_query = count_query.where(Booking.paid_amount >= Booking.total_amount)
        total = db.scalar(count_query) or 0
        query = query.order_by(Booking.id.desc())
        if paginated:
            query = query.offset((page_number - 1) * page_size).limit(page_size)
        rows = db.scalars(query).all()
        result = []
        for row in rows:
            departure = db.get(Departure, row.departure_id)
            result.append({**serialize(row), "customer_name": db.get(Customer, row.customer_id).name,
                           "tour_name": db.get(Tour, departure.tour_id).name, "departure_date": departure.departure_date,
                           "amount_due": row.total_amount - row.paid_amount})
        return {"items": result, "total": total, "page": page_number, "limit": page_size} if paginated else result
    if resource == "payments":
        rows = db.scalars(select(Payment).order_by(Payment.id.desc())).all()
        return [{**serialize(row), "booking_code": db.get(Booking, row.booking_id).booking_code} for row in rows]
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không tồn tại")
    query = select(model)
    count_query = select(func.count(model.id))
    if resource == "customers" and search:
        term = f"%{search.strip()}%"
        query = query.where(Customer.name.ilike(term) | Customer.phone.ilike(term) | Customer.email.ilike(term))
        count_query = count_query.where(Customer.name.ilike(term) | Customer.phone.ilike(term) | Customer.email.ilike(term))
    total = db.scalar(count_query) or 0
    query = query.order_by(model.id.desc())
    if paginated:
        query = query.offset((page_number - 1) * page_size).limit(page_size)
    rows = db.scalars(query).all()
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
    result = [serialize(row) for row in rows]
    return {"items": result, "total": total, "page": page_number, "limit": page_size} if paginated else result


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
    if resource == "bookings":
        return update_booking(entity_id, validate_input(BookingUpdate, data), db, user)
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
    if resource == "bookings":
        return delete_booking(entity_id, db, user)
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail="Danh mục không hỗ trợ xóa")
    require_delete(user)
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


def update_booking(booking_id: int, payload: BookingUpdate, db: Session, user: dict[str, str]):
    require_write("bookings", user)
    booking = get_entity(db, Booking, booking_id, "đơn đặt tour")
    if booking.status == "Đã hủy":
        raise HTTPException(status_code=409, detail="Không thể chỉnh sửa đơn đã hủy")

    customer_id = payload.customer_id if payload.customer_id is not None else booking.customer_id
    departure_id = payload.departure_id if payload.departure_id is not None else booking.departure_id
    seats = payload.seats if payload.seats is not None else booking.seats
    get_entity(db, Customer, customer_id, "khách hàng")
    target_departure = get_entity(db, Departure, departure_id, "lịch khởi hành")
    if target_departure.status != "Đang mở" or target_departure.departure_date < date.today().isoformat():
        raise HTTPException(status_code=409, detail="Lịch khởi hành đã đóng hoặc đã qua")
    target_tour = get_entity(db, Tour, target_departure.tour_id, "tour")
    total_amount = target_tour.price * seats
    if booking.paid_amount > total_amount:
        raise HTTPException(status_code=409, detail="Tổng tiền mới không thể thấp hơn số tiền đã thu")

    old_departure_id = booking.departure_id
    if departure_id == old_departure_id:
        seat_delta = seats - booking.seats
        if seat_delta:
            reservation = db.execute(
                update(Departure)
                .where(
                    Departure.id == departure_id,
                    Departure.reserved_seats + seat_delta <= Departure.capacity,
                    Departure.reserved_seats + seat_delta >= 0,
                )
                .values(reserved_seats=Departure.reserved_seats + seat_delta)
            )
            if reservation.rowcount != 1:
                db.rollback()
                raise HTTPException(status_code=409, detail="Lịch khởi hành không còn đủ chỗ")
    else:
        released = db.execute(
            update(Departure)
            .where(Departure.id == old_departure_id, Departure.reserved_seats >= booking.seats)
            .values(reserved_seats=Departure.reserved_seats - booking.seats)
        )
        reserved = db.execute(
            update(Departure)
            .where(
                Departure.id == departure_id,
                Departure.status == "Đang mở",
                Departure.departure_date >= date.today().isoformat(),
                Departure.reserved_seats + seats <= Departure.capacity,
            )
            .values(reserved_seats=Departure.reserved_seats + seats)
        )
        if released.rowcount != 1 or reserved.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="Không thể chuyển đơn do lịch khởi hành không đủ chỗ")

    booking.customer_id = customer_id
    booking.departure_id = departure_id
    booking.seats = seats
    booking.total_amount = total_amount
    return commit_and_serialize(db, booking)


def delete_booking(booking_id: int, db: Session, user: dict[str, str]):
    require_delete(user)
    booking = get_entity(db, Booking, booking_id, "đơn đặt tour")
    if db.scalar(select(func.count(Payment.id)).where(Payment.booking_id == booking.id)):
        raise HTTPException(status_code=409, detail="Không thể xóa đơn đã có thanh toán")
    if booking.status != "Đã hủy":
        released = db.execute(
            update(Departure)
            .where(Departure.id == booking.departure_id, Departure.reserved_seats >= booking.seats)
            .values(reserved_seats=Departure.reserved_seats - booking.seats)
        )
        if released.rowcount != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="Không thể hoàn lại số chỗ của đơn")
    db.delete(booking)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Không thể xóa đơn vì dữ liệu liên quan đang được sử dụng") from None
    return {"message": "Đã xóa thành công"}


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
    require_admin(user)
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
def get_seats(departure_id: int, db: Session = Depends(get_db), user: dict[str, str] = Depends(current_user)):
    require_read("departures", user)
    departure = get_entity(db, Departure, departure_id, "lịch khởi hành")
    return {"departure_id": departure.id, "capacity": departure.capacity, "remaining_seats": remaining_seats(db, departure)}


def resolve_ai_config() -> dict[str, str]:
    """
    Xác định cấu hình AI đang hoạt động:
    - Nếu có GEMINI_API_KEY hoặc AI_API_KEY là Google key (bắt đầu bằng AIzaSy): Sử dụng Google Gemini.
    - Nếu có AI_API_KEY khác: Sử dụng OpenAI-compatible endpoint.
    - Nếu không có key: Chuyển sang chế độ xác định (deterministic fallback).
    """
    gemini_key = settings.gemini_api_key.strip()
    if not gemini_key and settings.ai_api_key.strip().startswith("AIzaSy"):
        gemini_key = settings.ai_api_key.strip()

    if gemini_key:
        model = settings.gemini_model.strip() or "gemini-3.6-flash"
        if model in ("gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"):
            model = "gemini-3.6-flash"
        return {
            "provider": "gemini",
            "api_key": gemini_key,
            "model": model,
            "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        }

    openai_key = settings.ai_api_key.strip()
    if openai_key:
        return {
            "provider": "openai",
            "api_key": openai_key,
            "model": settings.ai_model.strip() or "gpt-4o-mini",
            "base_url": settings.ai_base_url.rstrip("/"),
        }

    return {"provider": "none", "api_key": "", "model": "", "base_url": ""}


@app.get("/api/ai/status", dependencies=[Depends(limit_ai_requests)])
def ai_status(_user: dict[str, str] = Depends(current_user)):
    require_admin(_user)
    cfg = resolve_ai_config()
    configured = cfg["provider"] != "none"
    return {
        "configured": configured,
        "mode": "provider" if configured else "deterministic",
    }


@app.post("/api/ai/recommendations", dependencies=[Depends(limit_ai_requests)])
def recommendations(payload: RecommendationRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    require_admin(_user)
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
    cfg = resolve_ai_config()
    if cfg["provider"] == "none":
        return None

    if cfg["provider"] == "gemini":
        from google import genai
        from google.genai import types

        candidates = [cfg["model"]]
        for fallback_m in ("gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"):
            if fallback_m not in candidates:
                candidates.append(fallback_m)

        for m in candidates:
            try:
                client = genai.Client(api_key=cfg["api_key"])
                response = await client.aio.models.generate_content(
                    model=m,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.3,
                        max_output_tokens=max_tokens,
                    ),
                )
                if response and response.text:
                    return response.text
            except Exception:
                continue

    # OpenAI-compatible API call (hỗ trợ cả OpenAI và Gemini OpenAI-compatible endpoint)
    url = f"{cfg['base_url']}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"},
                json={
                    "model": cfg["model"],
                    "temperature": 0.3,
                    "max_tokens": max_tokens,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            if not response.is_error:
                return response.json()["choices"][0]["message"]["content"]
    except Exception:
        pass
    return None


AI_CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_available_tours",
            "description": "Tìm tour đang mở có lịch khởi hành trong tương lai và còn chỗ thực tế.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destination": {"type": "string", "description": "Tên hoặc một phần tên điểm đến"},
                    "start_date": {"type": "string", "description": "Ngày khởi hành sớm nhất, YYYY-MM-DD"},
                    "end_date": {"type": "string", "description": "Ngày khởi hành muộn nhất, YYYY-MM-DD"},
                    "max_price": {"type": "integer", "description": "Giá tối đa cho mỗi khách"},
                    "duration_days": {"type": "integer", "description": "Số ngày của tour"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_tour_seats",
            "description": "Kiểm tra sức chứa và số chỗ còn lại của lịch khởi hành cụ thể.",
            "parameters": {
                "type": "object",
                "properties": {"departure_id": {"type": "integer"}},
                "required": ["departure_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_destinations",
            "description": "Tìm các điểm đến theo tên, vùng hoặc mô tả.",
            "parameters": {
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
]


def run_ai_tool(
    db: Session, name: str, arguments: dict[str, Any], user: dict[str, str] | None = None,
) -> dict[str, Any]:
    if name == "get_available_tours":
        today = date.today().isoformat()
        start_date = arguments.get("start_date", today)
        try:
            start_date = max(today, date.fromisoformat(start_date).isoformat())
            end_date = date.fromisoformat(arguments["end_date"]).isoformat() if arguments.get("end_date") else None
        except (TypeError, ValueError):
            return {"error": "Ngày phải có định dạng YYYY-MM-DD"}
        if end_date and end_date < start_date:
            return {"error": "Khoảng ngày không hợp lệ"}
        statement = (
            select(Tour, Destination, Departure)
            .join(Destination, Tour.destination_id == Destination.id)
            .join(Departure, Departure.tour_id == Tour.id)
            .where(Tour.status == "Đang mở", Departure.status == "Đang mở",
                   Departure.departure_date >= start_date,
                   Departure.departure_date >= today,
                   Departure.reserved_seats < Departure.capacity)
        )
        destination = arguments.get("destination")
        if destination:
            statement = statement.where(Destination.name.ilike(f"%{destination[:80]}%"))
        if end_date:
            statement = statement.where(Departure.departure_date <= end_date)
        if arguments.get("max_price") is not None:
            statement = statement.where(Tour.price <= max(0, int(arguments["max_price"])))
        if arguments.get("duration_days") is not None:
            statement = statement.where(Tour.duration_days == max(1, int(arguments["duration_days"])))
        results = []
        for tour, destination_row, departure in db.execute(statement.order_by(Departure.departure_date).limit(50)):
            seats = remaining_seats(db, departure)
            if seats:
                results.append({
                    "tour_id": tour.id, "name": tour.name, "destination": destination_row.name,
                    "price": tour.price, "duration_days": tour.duration_days,
                    "departure_id": departure.id, "departure_date": departure.departure_date,
                    "remaining_seats": seats,
                })
        return {"tours": results[:20]}
    if name == "check_tour_seats":
        try:
            departure_id = int(arguments["departure_id"])
        except (KeyError, TypeError, ValueError):
            return {"error": "departure_id không hợp lệ"}
        departure = db.get(Departure, departure_id)
        if departure is None:
            return {"error": "Không tìm thấy lịch khởi hành"}
        tour = db.get(Tour, departure.tour_id)
        return {
            "departure_id": departure.id, "tour": tour.name,
            "departure_date": departure.departure_date, "capacity": departure.capacity,
            "reserved_seats": departure.reserved_seats,
            "remaining_seats": remaining_seats(db, departure), "status": departure.status,
        }
    if name == "search_destinations":
        if user and user["role"] not in READ_ROLES["destinations"]:
            return {"error": "Tài khoản không có quyền tra cứu điểm đến"}
        query = str(arguments.get("query", "")).strip()[:80]
        if not query:
            return {"destinations": []}
        results = db.scalars(
            select(Destination).where(
                Destination.name.ilike(f"%{query}%") | Destination.region.ilike(f"%{query}%")
                | Destination.description.ilike(f"%{query}%")
            ).order_by(Destination.name).limit(10)
        ).all()
        return {"destinations": [{"name": row.name, "region": row.region, "description": row.description} for row in results]}
    return {"error": "Công cụ không được hỗ trợ"}


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/ai/chat", dependencies=[Depends(limit_ai_requests)])
async def ai_chat(payload: AIChatRequest, db: Session = Depends(get_db),
                  _user: dict[str, str] = Depends(current_user)):
    require_admin(_user)
    cfg = resolve_ai_config()
    if cfg["provider"] == "none":
        raise HTTPException(status_code=503, detail="Cần cấu hình GEMINI_API_KEY hoặc AI_API_KEY để sử dụng trò chuyện trực tuyến")

    async def stream() -> AsyncIterator[str]:
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": (
                "Bạn là trợ lý VietTour. Trả lời tiếng Việt ngắn gọn. Khi hỏi dữ liệu tour, điểm đến, ngày khởi hành "
                "hoặc số chỗ, hãy gọi công cụ dữ liệu phù hợp. Không đoán số chỗ hay thông tin chưa được công cụ xác nhận."
            )}
        ]
        messages.extend({"role": message.role, "content": message.content} for message in payload.history)
        messages.append({"role": "user", "content": payload.prompt})
        url = f"{cfg['base_url']}/chat/completions"
        headers = {"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                tool_calls: dict[int, dict[str, Any]] = {}
                initial_request = {
                    "model": cfg["model"], "temperature": 0.2, "stream": True,
                    "messages": messages, "tools": AI_CHAT_TOOLS, "tool_choice": "auto",
                }
                async with client.stream("POST", url, headers=headers, json=initial_request) as response:
                    if response.is_error:
                        yield _sse("error", {"message": "Dịch vụ AI hiện không khả dụng; vui lòng thử lại sau"})
                        return
                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue
                        data = line[5:].strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            delta = chunk["choices"][0].get("delta", {})
                        except (ValueError, KeyError, IndexError, TypeError):
                            continue
                        content = delta.get("content")
                        if isinstance(content, str) and content:
                            yield _sse("token", {"text": content})
                        for call in delta.get("tool_calls", []):
                            index = call.get("index", 0)
                            current = tool_calls.setdefault(index, {
                                "id": "", "type": "function", "function": {"name": "", "arguments": ""}
                            })
                            if call.get("id"):
                                current["id"] += call["id"]
                            function = call.get("function", {})
                            current["function"]["name"] += function.get("name", "")
                            current["function"]["arguments"] += function.get("arguments", "")

                if tool_calls:
                    calls = [tool_calls[index] for index in sorted(tool_calls)]
                    tool_messages = []
                    for call in calls:
                        try:
                            arguments = json.loads(call["function"]["arguments"] or "{}")
                            if not isinstance(arguments, dict):
                                raise ValueError
                            result = run_ai_tool(db, call["function"]["name"], arguments, _user)
                        except (ValueError, TypeError, KeyError, OverflowError):
                            result = {"error": "Tham số công cụ không hợp lệ"}
                        tool_messages.append({
                            "role": "tool", "tool_call_id": call["id"],
                            "content": json.dumps(result, ensure_ascii=False),
                        })
                    messages.append({"role": "assistant", "tool_calls": calls})
                    messages.extend(tool_messages)
                    final_request = {
                        "model": cfg["model"], "temperature": 0.2, "stream": True,
                        "messages": messages,
                    }
                    async with client.stream("POST", url, headers=headers, json=final_request) as response:
                        if response.is_error:
                            yield _sse("error", {"message": "Dịch vụ AI hiện không khả dụng; vui lòng thử lại sau"})
                            return
                        async for line in response.aiter_lines():
                            if not line.startswith("data:"):
                                continue
                            data = line[5:].strip()
                            if data == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data)
                                content = chunk["choices"][0].get("delta", {}).get("content")
                            except (ValueError, KeyError, IndexError, TypeError):
                                continue
                            if isinstance(content, str) and content:
                                yield _sse("token", {"text": content})
                yield _sse("done", {})
        except (httpx.TimeoutException, httpx.RequestError):
            yield _sse("error", {"message": "Không thể kết nối dịch vụ AI; vui lòng thử lại sau"})

    return StreamingResponse(stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/ai/tour-content", dependencies=[Depends(limit_ai_requests)])
async def generate_tour_content(payload: TourGenerationRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    require_admin(_user)
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


@app.post("/api/ai/feedback-summary", dependencies=[Depends(limit_ai_requests)])
async def feedback_summary(payload: SummaryRequest, db: Session = Depends(get_db), _user: dict[str, str] = Depends(current_user)):
    require_admin(_user)
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
