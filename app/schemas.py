from pydantic import BaseModel, Field
from typing import Optional


class RegisterRequest(BaseModel):

    username: str = Field(
        min_length=3,
        max_length=50
    )

    password: str = Field(
        min_length=6,
        max_length=72
    )


class LoginRequest(BaseModel):

    username: str

    password: str


class CarCreate(BaseModel):

    brand: str

    model: str

    year: int = Field(
        ge=1990,
        le=2030
    )

    km_driven: int = Field(
        ge=0
    )

    fuel_type: str = "Petrol"

    last_service_km: int = Field(
        default=0,
        ge=0
    )


class ServiceCreate(BaseModel):

    car_id: int

    service_type: str

    cost: float = Field(
        ge=0
    )


class ServiceUpdate(BaseModel):

    status: str

    mechanic_notes: Optional[str] = None


class PredictionRequest(BaseModel):

    car_id: int

    months_since_service: int = Field(
        ge=0,
        le=60
    )
    