from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks
)

from sqlalchemy.orm import Session

from datetime import datetime

from ..database import get_db
from ..models import Car, Service, User
from ..schemas import (
    ServiceCreate,
    ServiceUpdate
)

from ..dependencies import get_current_user


router = APIRouter(
    prefix="/services",
    tags=["Services"]
)


def send_notification(
    username,
    service_id
):

    with open(
        "service_notifications.txt",
        "a"
    ) as file:

        file.write(
            f"Service {service_id} booked "
            f"for user {username}\n"
        )


@router.post("/")
def book_service(
    data: ServiceCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    car = db.query(Car).filter(
        Car.id == data.car_id,
        Car.owner_id == user.id
    ).first()

    if not car:

        raise HTTPException(
            status_code=404,
            detail="Car not found"
        )

    service = Service(
        car_id=car.id,
        service_type=data.service_type,
        service_date=datetime.utcnow(),
        cost=data.cost,
        status="Booked"
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    background_tasks.add_task(
        send_notification,
        user.username,
        service.id
    )

    return {
        "message": "Service booked",
        "service_id": service.id
    }


@router.get("/")
def get_services(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    return (
        db.query(Service)
        .join(Car)
        .filter(Car.owner_id == user.id)
        .all()
    )


@router.put("/{service_id}")
def update_service(
    service_id: int,
    data: ServiceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):

    service = (
        db.query(Service)
        .join(Car)
        .filter(
            Service.id == service_id,
            Car.owner_id == user.id
        )
        .first()
    )

    if not service:

        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    service.status = data.status
    service.mechanic_notes = data.mechanic_notes

    db.commit()

    return {
        "message": "Service updated"
    }