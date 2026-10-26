from datetime import date
from pydantic import BaseModel, ConfigDict, Field, field_validator


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(InputModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=256)


class BookingCreate(InputModel):
    customer_id: int
    departure_id: int
    seats: int = Field(gt=0, le=50)


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
