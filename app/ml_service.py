import joblib
import os
import pandas as pd


MODEL_PATH = "ml/model.pkl"


if not os.path.exists(MODEL_PATH):

    raise FileNotFoundError(
        "ML model not found. "
        "Run train_model.py first."
    )


model = joblib.load(
    MODEL_PATH
)


def predict_service(
    car_age,
    km_driven,
    months_since_service
):

    data = pd.DataFrame([{
        "car_age": car_age,
        "km_driven": km_driven,
        "months_since_service": months_since_service
    }])

    probability = model.predict_proba(
        data
    )[0][1]

    model_probability = float(probability)

    # The source dataset is synthetic and heavily weighted toward service
    # required. Combine its signal with transparent maintenance pressure
    # factors so vehicle age alone cannot dominate a healthy car.
    age_pressure = min(max((car_age - 10) / 8, 0), 1)
    mileage_pressure = min(max((km_driven - 60000) / 100000, 0), 1)
    months_pressure = min(max(months_since_service / 12, 0), 1)
    maintenance_pressure = (
        age_pressure * 0.2
        + mileage_pressure * 0.4
        + months_pressure * 0.4
    )
    probability = (
        model_probability * 0.25
        + maintenance_pressure * 0.75
    )

    # Never present absolute certainty to the user.
    probability = min(max(probability, 0.02), 0.98)


    if probability >= 0.75:

        risk = "HIGH"

    elif probability >= 0.45:

        risk = "MEDIUM"

    else:

        risk = "LOW"


    risk_factors = []
    if car_age >= 15:
        risk_factors.append("Vehicle is 15+ years old")
    if km_driven >= 120000:
        risk_factors.append("Mileage is above 120,000 km")
    if months_since_service >= 12:
        risk_factors.append("More than 12 months since the last service")

    if risk == "HIGH":

        recommendations = [
            "General inspection",
            "Engine oil check",
            "Brake inspection",
            "Battery check"
        ]

    elif risk == "MEDIUM":

        recommendations = [
            "General inspection",
            "Engine oil check"
        ]

    else:

        recommendations = [
            "Routine maintenance"
        ]


    out_of_training_range = (
        car_age > 15
        or km_driven > 150000
        or months_since_service > 24
    )

    return {

        "prediction":
            "Service Required"
            if probability >= 0.5
            else "Service Not Required",

        "probability":
            round(probability, 3),

        "model_probability":
            round(min(max(model_probability, 0.02), 0.98), 3),

        "risk_level":
            risk,

        "recommended_service":
            recommendations,

        "risk_factors":
            risk_factors,

        "probability_note": (
            "This vehicle is outside the model's usual training range, "
            "so the estimate is blended with maintenance thresholds."
            if out_of_training_range
            else
            "Blended estimate using the ML model, mileage, vehicle age, "
            "and time since service."
        )
    }