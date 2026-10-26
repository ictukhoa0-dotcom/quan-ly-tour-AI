import asyncio

import pytest
from fastapi import HTTPException, Request, Response
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine, event, inspect, select
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.db import Base, ensure_account_session_version, get_db
from app.main import (
    ALGORITHM, FixedWindowLimiter, ai_status, app, cancel_booking, create_account, create_booking,
    create_payment, current_user, ensure_initial_admin, generate_tour_content, hash_password, login, public_account,
    remaining_seats, update_account, validate_input, validate_request_origin, validate_security_settings,
    verify_password,
)
from app.models import Account, Booking, Customer, Departure, Destination, Payment, Tour
from app.schemas import (
    AccountCreate, AccountUpdate, BookingCreate, LoginRequest, PaymentCreate, TourGenerationRequest,
)


@pytest.fixture
def db_session(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'operations-test.db'}", connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = session_factory()
    destination = Destination(name="Huế", region="Miền Trung", description="Di sản cố đô")
    db.add(destination)
    db.flush()
    tour = Tour(name="Khám phá Huế", destination_id=destination.id, duration_days=2, price=1_000_000,
                category="Văn hóa", description="Hành trình cố đô", status="Đang mở")
    customer = Customer(name="Nguyễn An", phone="0900000001", email="an@example.vn", address="Huế")
    db.add_all([tour, customer])
    db.flush()
    departure = Departure(tour_id=tour.id, departure_date="2099-08-15", capacity=3, reserved_seats=0, status="Đang mở")
    db.add(departure)
    db.commit()
    yield db
    db.close()
    engine.dispose()


ADMIN = {"id": "1", "username": "admin", "role": "admin", "name": "Quản trị viên"}


def make_request(origin: str | None = None) -> Request:
    headers = [(b"origin", origin.encode())] if origin else []
    return Request({
        "type": "http", "method": "POST", "headers": headers,
        "client": ("testclient", 123), "scheme": "http", "server": ("testserver", 80),
        "path": "/api/auth/login", "query_string": b"", "http_version": "1.1", "root_path": "",
    })


def test_booking_capacity_and_remaining_seats(db_session):
    customer = db_session.query(Customer).first()
    departure = db_session.query(Departure).first()
    booking = create_booking(BookingCreate(customer_id=customer.id, departure_id=departure.id, seats=2), db_session, ADMIN)
    db_session.refresh(departure)
    assert booking["total_amount"] == 2_000_000
    assert remaining_seats(db_session, departure) == 1

    with pytest.raises(HTTPException) as error:
        create_booking(BookingCreate(customer_id=customer.id, departure_id=departure.id, seats=2), db_session, ADMIN)
    assert error.value.status_code == 409
    assert "1 chỗ" in error.value.detail

    last_seat = create_booking(BookingCreate(customer_id=customer.id, departure_id=departure.id, seats=1), db_session, ADMIN)
    db_session.refresh(departure)
    assert remaining_seats(db_session, departure) == 0
    cancel_booking(last_seat["id"], db_session, ADMIN)
    db_session.refresh(departure)
    assert remaining_seats(db_session, departure) == 1


def test_payments_enforce_booking_balance(db_session):
    customer = db_session.query(Customer).first()
    departure = db_session.query(Departure).first()
    booking_data = create_booking(BookingCreate(customer_id=customer.id, departure_id=departure.id, seats=2), db_session, ADMIN)
    booking = db_session.get(Booking, booking_data["id"])
    payment = create_payment(PaymentCreate(booking_id=booking.id, amount=750_000, method="Chuyển khoản"), db_session, ADMIN)
    db_session.refresh(booking)
    assert payment["amount"] == 750_000
    assert booking.paid_amount == 750_000
    assert db_session.query(Payment).count() == 1

    with pytest.raises(HTTPException) as error:
        create_payment(PaymentCreate(booking_id=booking.id, amount=1_250_001, method="Tiền mặt"), db_session, ADMIN)
    assert error.value.status_code == 409
    db_session.refresh(booking)
    assert booking.paid_amount == 750_000
    assert db_session.query(Payment).count() == 1


def test_ai_content_has_safe_deterministic_fallback(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "")
    result = asyncio.run(generate_tour_content(
        TourGenerationRequest(destination="Ninh Bình", duration_days=2, style="thiên nhiên"),
        db_session,
        ADMIN,
    ))
    assert result["source"] == "deterministic"
    assert result["human_verification_required"] is True
    assert len(result["content"]["itinerary"]) == 2
    assert "Ninh Bình" in result["content"]["description"]


def test_ai_status_never_exposes_secret(monkeypatch):
    monkeypatch.setattr(settings, "ai_api_key", "")
    assert ai_status(ADMIN) == {"configured": False, "mode": "deterministic"}
    monkeypatch.setattr(settings, "ai_api_key", "server-side-test-secret")
    response = ai_status(ADMIN)
    assert response == {"configured": True, "mode": "provider"}
    assert "server-side-test-secret" not in str(response)


def test_invalid_booking_payload_has_api_validation_error():
    with pytest.raises(HTTPException) as error:
        validate_input(BookingCreate, {"customer_id": 1, "departure_id": 1, "seats": 0})
    assert error.value.status_code == 422
    assert "Dữ liệu không hợp lệ" in error.value.detail


def test_startup_requires_jwt_and_bootstraps_private_initial_admin(db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_security_settings()

    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    monkeypatch.setattr(settings, "initial_admin_username", "")
    monkeypatch.setattr(settings, "initial_admin_password", "")
    validate_security_settings()
    with pytest.raises(RuntimeError, match="INITIAL_ADMIN_USERNAME"):
        ensure_initial_admin(db_session)

    monkeypatch.setattr(settings, "initial_admin_username", "admin")
    monkeypatch.setattr(settings, "initial_admin_password", "replace-with-a-private-initial-admin-password")
    with pytest.raises(RuntimeError, match="INITIAL_ADMIN_PASSWORD"):
        ensure_initial_admin(db_session)

    monkeypatch.setattr(settings, "initial_admin_password", "private-initial-admin-password")
    ensure_initial_admin(db_session)
    admin = db_session.scalar(select(Account).where(Account.username == "admin"))
    assert admin.role == "admin"
    assert verify_password("private-initial-admin-password", admin.password_hash)

    monkeypatch.setattr(settings, "initial_admin_password", "a-different-bootstrap-password")
    ensure_initial_admin(db_session)
    assert db_session.scalar(select(Account).where(Account.username == "admin")).password_hash == admin.password_hash


def test_login_sets_http_only_cookie_and_returns_no_jwt(db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    monkeypatch.setattr(settings, "app_env", "production")
    account = Account(username="staff", name="Nhân viên", role="consultant",
                      password_hash=hash_password("correct-private-password"), is_active=True)
    db_session.add(account)
    db_session.commit()
    response = Response()
    result = login(LoginRequest(username="staff", password="correct-private-password"),
                   make_request(), response, db_session)
    assert result["user"]["role"] == "consultant"
    assert "access_token" not in result
    cookie = response.headers["set-cookie"].lower()
    assert "viettour_session=" in cookie
    assert "httponly" in cookie
    assert "max-age=28800" in cookie
    assert "secure" in cookie
    assert "samesite=none" in cookie


def test_login_rejects_invalid_password_and_disabled_account(db_session):
    account = Account(username="locked", name="Tài khoản khóa", role="consultant",
                      password_hash=hash_password("correct-private-password"), is_active=False)
    db_session.add(account)
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        login(LoginRequest(username="locked", password="wrong-password"), make_request(), Response(), db_session)
    assert error.value.status_code == 401
    with pytest.raises(HTTPException) as error:
        login(LoginRequest(username="locked", password="correct-private-password"), make_request(), Response(), db_session)
    assert error.value.status_code == 401


def test_cookie_session_round_trip_through_api(db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    monkeypatch.setattr(settings, "app_env", "development")
    account = Account(username="apiuser", name="API nhân viên", role="consultant",
                      password_hash=hash_password("correct-private-password"), is_active=True)
    db_session.add(account)
    db_session.commit()

    def override_db():
        yield db_session

    app.dependency_overrides[get_db] = override_db
    try:
        client = TestClient(app)
        login_response = client.post("/api/auth/login", json={
            "username": "apiuser", "password": "correct-private-password",
        })
        assert login_response.status_code == 200
        assert login_response.json()["user"]["username"] == "apiuser"
        assert login_response.cookies.get("viettour_session")
        assert "httponly" in login_response.headers["set-cookie"].lower()
        assert client.get("/api/me").json()["role"] == "consultant"
        assert client.get("/api/users").status_code == 403
        assert client.post("/api/auth/logout").status_code == 200
        assert client.get("/api/me").status_code == 401
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_cookie_auth_uses_current_database_role_and_rejects_disabled_user(db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    account = Account(username="staff", name="Nhân viên", role="consultant",
                      password_hash=hash_password("correct-private-password"), is_active=True)
    db_session.add(account)
    db_session.commit()
    token = jwt.encode({"sub": str(account.id)}, settings.jwt_secret, algorithm=ALGORITHM)
    request = Request({
        "type": "http", "method": "GET",
        "headers": [(b"cookie", f"viettour_session={token}".encode())],
        "client": ("testclient", 123), "scheme": "http", "server": ("testserver", 80),
        "path": "/api/me", "query_string": b"", "http_version": "1.1", "root_path": "",
    })
    assert current_user(request, db_session)["role"] == "consultant"
    account.role = "accountant"
    db_session.commit()
    assert current_user(request, db_session)["role"] == "accountant"
    account.is_active = False
    db_session.commit()
    with pytest.raises(HTTPException) as error:
        current_user(request, db_session)
    assert error.value.status_code == 401


def test_admin_account_management_hashes_password_and_prevents_lockout(db_session, monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    admin_account = Account(username="admin", name="Quản trị viên", role="admin",
                            password_hash=hash_password("private-admin-password"), is_active=True)
    db_session.add(admin_account)
    db_session.commit()
    admin = {**ADMIN, "id": str(admin_account.id)}
    created = create_account(
        AccountCreate(username="staff01", name="Nhân viên", role="consultant", password="private-new-password"),
        db_session, admin,
    )
    stored = db_session.scalar(select(Account).where(Account.username == "staff01"))
    assert "password_hash" not in created
    assert verify_password("private-new-password", stored.password_hash)
    assert created == public_account(stored)
    session_token = jwt.encode(
        {"sub": str(stored.id), "ver": stored.session_version},
        settings.jwt_secret, algorithm=ALGORITHM,
    )
    session_request = Request({
        "type": "http", "method": "GET",
        "headers": [(b"cookie", f"viettour_session={session_token}".encode())],
        "client": ("testclient", 123), "scheme": "http", "server": ("testserver", 80),
        "path": "/api/me", "query_string": b"", "http_version": "1.1", "root_path": "",
    })
    assert current_user(session_request, db_session)["username"] == "staff01"

    with pytest.raises(HTTPException) as error:
        update_account(admin_account.id, AccountUpdate(role="consultant"), db_session, admin)
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        update_account(admin_account.id, AccountUpdate(is_active=False), db_session, admin)
    assert error.value.status_code == 409

    reset = update_account(created["id"], AccountUpdate(password="private-reset-password", is_active=False),
                           db_session, admin)
    assert reset["is_active"] is False
    db_session.refresh(stored)
    assert verify_password("private-reset-password", stored.password_hash)
    with pytest.raises(HTTPException) as error:
        current_user(session_request, db_session)
    assert error.value.status_code == 401


def test_mutating_requests_reject_untrusted_origins():
    with pytest.raises(HTTPException) as error:
        validate_request_origin(make_request("https://evil.example"))
    assert error.value.status_code == 403


def test_fixed_window_limiter_blocks_excess_requests():
    limiter = FixedWindowLimiter()
    limiter.check("login:test", 2)
    limiter.check("login:test", 2)
    with pytest.raises(HTTPException) as error:
        limiter.check("login:test", 2)
    assert error.value.status_code == 429


def test_account_session_version_schema_upgrade_for_existing_sqlite(tmp_path):
    legacy_engine = create_engine(f"sqlite:///{tmp_path / 'legacy.db'}")
    with legacy_engine.begin() as connection:
        connection.exec_driver_sql(
            "CREATE TABLE accounts (id INTEGER PRIMARY KEY, username VARCHAR(40) NOT NULL)"
        )
    ensure_account_session_version(legacy_engine)
    columns = {column["name"] for column in inspect(legacy_engine).get_columns("accounts")}
    assert "session_version" in columns
    legacy_engine.dispose()
