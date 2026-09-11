from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Car, User
from ..schemas import CarCreate
from ..dependencies import get_current_user


router = APIRouter(
    prefix="/cars",
    tags=["Cars"]
)


@router.post("/")
def create_car(
    data: CarCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    car = Car(
        owner_id=user.id,
        brand=data.brand,
        model=data.model,
        year=data.year,
        km_driven=data.km_driven,
        fuel_type=data.fuel_type,
        last_service_km=data.last_service_km
    )

    db.add(car)
    db.commit()
    db.refresh(car)

    return car


@router.get("/")
def get_my_cars(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    return db.query(Car).filter(
        Car.owner_id == user.id
    ).all()


@router.get("/{car_id}")
def get_car(
    car_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    car = db.query(Car).filter(
        Car.id == car_id,
        Car.owner_id == user.id
    ).first()

    if not car:

        raise HTTPException(
            status_code=404,
            detail="Car not found"
        )

    return car


@router.put("/{car_id}")
def update_car(
    car_id: int,
    data: CarCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    car = db.query(Car).filter(
        Car.id == car_id,
        Car.owner_id == user.id
    ).first()

    if not car:

        raise HTTPException(
            status_code=404,
            detail="Car not found"
        )

    car.brand = data.brand
    car.model = data.model
    car.year = data.year
    car.km_driven = data.km_driven
    car.fuel_type = data.fuel_type
    car.last_service_km = data.last_service_km

    db.commit()

    return {
        "message": "Car updated successfully"
    }


@router.delete("/{car_id}")
def delete_car(
    car_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    car = db.query(Car).filter(
        Car.id == car_id,
        Car.owner_id == user.id
    ).first()

    if not car:

        raise HTTPException(
            status_code=404,
            detail="Car not found"
        )

    db.delete(car)
    db.commit()

    return {
        "message": "Car deleted successfully"
    }
    