from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import os

from .database import Base, engine
from .routers import (
    auth,
    cars,
    services,
    prediction,
)


Base.metadata.create_all(
    bind=engine
)


app = FastAPI(

    title="Smart Car Service Management API",

    description="""
    A machine-learning-powered automobile
    service management system.

    Features:
    - JWT Authentication
    - Role Based Access
    - Car Management
    - Service Booking
    - Service History
    - ML Predictive Maintenance
    - Risk Assessment
    - Service Recommendation
    """,

    version="2.0.0"
)


configured_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        configured_origins
        or [
            "http://127.0.0.1:8000",
            "http://localhost:8000"
        ]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


app.include_router(
    auth.router
)

app.include_router(
    cars.router
)

app.include_router(
    services.router
)

app.include_router(
    prediction.router
)


FRONTEND_DIR = os.path.join(
    os.path.dirname(os.path.dirname(
        os.path.abspath(__file__)
    )),
    "frontend"
)

if os.path.isdir(FRONTEND_DIR):

    app.mount(
        "/static",
        StaticFiles(directory=FRONTEND_DIR),
        name="frontend"
    )


@app.get("/")
def root():

    return {

        "application":
            "Smart Car Service Management System",

        "status":
            "running",

        "version":
            "2.0.0"
    }


@app.get("/health")
def health_check():

    return {

        "status": "healthy",

        "service":
            "Smart Car Service API"
    }