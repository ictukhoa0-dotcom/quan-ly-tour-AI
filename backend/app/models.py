from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Destination(Base):
    __tablename__ = "destinations"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    region: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text, default="")


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(20))
    password_hash: Mapped[str] = mapped_column(String(128))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    session_version: Mapped[int] = mapped_column(Integer, default=0)


class Tour(Base):
    __tablename__ = "tours"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    destination_id: Mapped[int] = mapped_column(ForeignKey("destinations.id", ondelete="RESTRICT"))
    duration_days: Mapped[int] = mapped_column(Integer)
    price: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(30), default="Đang mở")
    __table_args__ = (CheckConstraint("duration_days > 0"), CheckConstraint("price >= 0"))


class Itinerary(Base):
    __tablename__ = "itineraries"
    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="CASCADE"), index=True)
    day_number: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(160))
    details: Mapped[str] = mapped_column(Text, default="")
    __table_args__ = (UniqueConstraint("tour_id", "day_number"), CheckConstraint("day_number > 0"))


class Departure(Base):
    __tablename__ = "departures"
    id: Mapped[int] = mapped_column(primary_key=True)
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="RESTRICT"), index=True)
    departure_date: Mapped[str] = mapped_column(String(10), index=True)
    capacity: Mapped[int] = mapped_column(Integer)
    reserved_seats: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Đang mở")
    __table_args__ = (CheckConstraint("capacity > 0"), CheckConstraint("reserved_seats >= 0 AND reserved_seats <= capacity"))


class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    email: Mapped[str] = mapped_column(String(160), default="")
    address: Mapped[str] = mapped_column(String(240), default="")


class Booking(Base):
    __tablename__ = "bookings"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_code: Mapped[str] = mapped_column(String(24), unique=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id", ondelete="RESTRICT"), index=True)
    departure_id: Mapped[int] = mapped_column(ForeignKey("departures.id", ondelete="RESTRICT"), index=True)
    seats: Mapped[int] = mapped_column(Integer)
    total_amount: Mapped[int] = mapped_column(Integer)
    paid_amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(30), default="Đã xác nhận")
    created_at: Mapped[str] = mapped_column(String(30))
    __table_args__ = (CheckConstraint("seats > 0"), CheckConstraint("total_amount >= 0"), CheckConstraint("paid_amount >= 0 AND paid_amount <= total_amount"))


class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="RESTRICT"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(40))
    paid_at: Mapped[str] = mapped_column(String(30))
    note: Mapped[str] = mapped_column(String(240), default="")
    __table_args__ = (CheckConstraint("amount > 0"),)


class Guide(Base):
    __tablename__ = "guides"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True)
    languages: Mapped[str] = mapped_column(String(120), default="Tiếng Việt")
    status: Mapped[str] = mapped_column(String(30), default="Sẵn sàng")


class Assignment(Base):
    __tablename__ = "assignments"
    id: Mapped[int] = mapped_column(primary_key=True)
    guide_id: Mapped[int] = mapped_column(ForeignKey("guides.id", ondelete="RESTRICT"))
    departure_id: Mapped[int] = mapped_column(ForeignKey("departures.id", ondelete="RESTRICT"))
    note: Mapped[str] = mapped_column(String(240), default="")
    __table_args__ = (UniqueConstraint("guide_id", "departure_id"),)


class Feedback(Base):
    __tablename__ = "feedback"
    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    tour_id: Mapped[int] = mapped_column(ForeignKey("tours.id", ondelete="RESTRICT"))
    rating: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(30))
    __table_args__ = (CheckConstraint("rating >= 1 AND rating <= 5"),)
