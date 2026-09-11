from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from datetime import datetime

from ..database import get_db

from ..models import (
    Car,
    Prediction,
    User
)

from ..schemas import PredictionRequest

from ..dependencies import get_current_user

from ..ml_service import predict_service


router = APIRouter(
    prefix="/prediction",
    tags=["Machine Learning"]
)


@router.post("/")
def predict(
    data: PredictionRequest,
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


    current_year = datetime.utcnow().year

    car_age = (
        current_year - car.year
    )


    result = predict_service(
        car_age,
        car.km_driven,
        data.months_since_service
    )


    prediction_record = Prediction(

        car_id=car.id,

        car_age=car_age,

        km_driven=car.km_driven,

        months_since_service=
            data.months_since_service,

        probability=
            result["probability"],

        risk_level=
            result["risk_level"],

        prediction=
            result["prediction"],

        recommended_service=
            ", ".join(
                result["recommended_service"]
            )
    )


    db.add(prediction_record)

    db.commit()

    return {

        "car_id": car.id,

        "car": (
            f"{car.brand} {car.model}"
        ),

        **result
    }


@router.get("/history/{car_id}")
def prediction_history(
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


    return db.query(
        Prediction
    ).filter(
        Prediction.car_id == car_id
    ).order_by(
        Prediction.created_at.desc()
    ).all()