import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.main import (
    ai_status, cancel_booking, create_booking, create_payment, generate_tour_content,
    login, remaining_seats, validate_input, validate_security_settings,
)
from app.models import Booking, Customer, Departure, Destination, Payment, Tour
from app.schemas import BookingCreate, LoginRequest, PaymentCreate, TourGenerationRequest
from app.config import settings


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


ADMIN = {"username": "admin", "role": "admin", "name": "Quản trị viên"}


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


def test_startup_rejects_missing_or_placeholder_jwt_secret(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_security_settings()

    monkeypatch.setattr(settings, "jwt_secret", "replace-with-a-random-secret-of-at-least-32-characters")
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        validate_security_settings()


def test_startup_accepts_configured_secret_and_requires_private_demo_password(monkeypatch):
    monkeypatch.setattr(settings, "jwt_secret", "a-private-random-secret-with-at-least-32-characters")
    monkeypatch.setattr(settings, "app_env", "production")
    monkeypatch.setattr(settings, "demo_password", "")
    validate_security_settings()

    monkeypatch.setattr(settings, "app_env", "development")
    with pytest.raises(RuntimeError, match="DEMO_PASSWORD"):
        validate_security_settings()

    monkeypatch.setattr(settings, "demo_password", "private-local-demo-password")
    validate_security_settings()


def test_demo_login_is_disabled_outside_development(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    with pytest.raises(HTTPException) as error:
        login(LoginRequest(username="admin", password="any-password"))
    assert error.value.status_code == 403


def test_demo_login_uses_environment_password_only_in_development(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "demo_password", "private-local-demo-password")
    response = login(LoginRequest(username="admin", password="private-local-demo-password"))
    assert response["user"]["role"] == "admin"

    with pytest.raises(HTTPException) as error:
        login(LoginRequest(username="admin", password="wrong-development-password"))
    assert error.value.status_code == 401
