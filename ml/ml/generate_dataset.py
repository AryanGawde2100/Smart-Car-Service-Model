import numpy as np
import pandas as pd

np.random.seed(42)

rows = 1500

car_age = np.random.randint(
    1, 16, rows
)

km_driven = np.random.randint(
    5000, 150000, rows
)

months_since_service = np.random.randint(
    1, 25, rows
)

service_required = (
    (
        (car_age >= 7) |
        (km_driven >= 70000) |
        (months_since_service >= 10)
    )
).astype(int)


df = pd.DataFrame({

    "car_age": car_age,

    "km_driven": km_driven,

    "months_since_service":
        months_since_service,

    "service_required":
        service_required
})


df.to_csv(
    "ml/car_service_dataset.csv",
    index=False
)

print("Dataset generated successfully")
print(df.head())