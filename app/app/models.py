from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Boolean
)

from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class User(Base):

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        default="customer"
    )

    is_active = Column(
        Boolean,
        default=True
    )

    cars = relationship(
        "Car",
        back_populates="owner"
    )


class Car(Base):

    __tablename__ = "cars"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    brand = Column(
        String(50),
        nullable=False
    )

    model = Column(
        String(50),
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False
    )

    km_driven = Column(
        Integer,
        nullable=False
    )

    fuel_type = Column(
        String(20),
        default="Petrol"
    )

    last_service_km = Column(
        Integer,
        default=0
    )

    owner = relationship(
        "User",
        back_populates="cars"
    )

    services = relationship(
        "Service",
        back_populates="car"
    )

    predictions = relationship(
        "Prediction",
        back_populates="car"
    )


class Service(Base):

    __tablename__ = "services"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    car_id = Column(
        Integer,
        ForeignKey("cars.id")
    )

    service_type = Column(
        String(100),
        nullable=False
    )

    service_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    cost = Column(
        Float,
        default=0
    )

    status = Column(
        String(30),
        default="Booked"
    )

    mechanic_notes = Column(
        String(500),
        nullable=True
    )

    car = relationship(
        "Car",
        back_populates="services"
    )


class Prediction(Base):

    __tablename__ = "predictions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    car_id = Column(
        Integer,
        ForeignKey("cars.id")
    )

    car_age = Column(Integer)

    km_driven = Column(Integer)

    months_since_service = Column(Integer)

    probability = Column(Float)

    risk_level = Column(String(20))

    prediction = Column(String(50))

    recommended_service = Column(
        String(500)
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    car = relationship(
        "Car",
        back_populates="predictions"
    )