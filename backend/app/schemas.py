from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(InputModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=72)
    remember_me: bool = False


class AccountCreate(InputModel):
    username: str = Field(min_length=3, max_length=40, pattern=r"^[A-Za-z0-9_.-]+$")
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(pattern=r"^(admin|tu_van)$")
    password: str = Field(min_length=12, max_length=72)


class AccountUpdate(InputModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, pattern=r"^(admin|tu_van)$")
    password: str | None = Field(default=None, min_length=12, max_length=72)
    is_active: bool | None = None

    @field_validator("name", "role", "password", "is_active")
    @classmethod
    def reject_null_updates(cls, value):
        if value is None:
            raise ValueError("Giá trị cập nhật không được để trống")
        return value

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("Chỉ định ít nhất một trường cần cập nhật")
        return self


class BookingCreate(InputModel):
    customer_id: int
    departure_id: int
    seats: int = Field(gt=0, le=50)


class BookingUpdate(InputModel):
    customer_id: int | None = Field(default=None, gt=0)
    departure_id: int | None = Field(default=None, gt=0)
    seats: int | None = Field(default=None, gt=0, le=50)

    @field_validator("customer_id", "departure_id", "seats")
    @classmethod
    def reject_null_updates(cls, value):
        if value is None:
            raise ValueError("Giá trị cập nhật không được để trống")
        return value

    @model_validator(mode="after")
    def require_change(self):
        if not self.model_fields_set:
            raise ValueError("Chỉ định ít nhất một trường cần cập nhật")
        return self


class PaymentCreate(InputModel):
    booking_id: int
    amount: int = Field(gt=0)
    method: str = Field(min_length=2, max_length=40)
    note: str = Field(default="", max_length=240)


class RecommendationRequest(InputModel):
    budget: int = Field(ge=0, le=500_000_000)
    duration_days: int | None = Field(default=None, ge=1, le=60)
    preferences: list[str] = Field(default_factory=list, max_length=10)
    departure_after: date | None = None

    @field_validator("preferences")
    @classmethod
    def bound_preferences(cls, values: list[str]) -> list[str]:
        if any(len(value) > 60 for value in values):
            raise ValueError("Mỗi sở thích tối đa 60 ký tự")
        return values


class TourGenerationRequest(InputModel):
    tour_id: int | None = None
    destination: str = Field(default="", max_length=100)
    duration_days: int = Field(ge=1, le=30)
    style: str = Field(default="trải nghiệm văn hóa", max_length=100)


class SummaryRequest(InputModel):
    tour_id: int | None = None
    max_feedback: int = Field(default=50, ge=1, le=100)


class AIChatMessage(InputModel):
    role: str = Field(pattern=r"^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class AIChatRequest(InputModel):
    prompt: str = Field(min_length=1, max_length=2000)
    history: list[AIChatMessage] = Field(default_factory=list, max_length=10)
