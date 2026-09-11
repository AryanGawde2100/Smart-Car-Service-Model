from fastapi import APIRouter, Depends, HTTPException, Request

from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..schemas import (
    RegisterRequest,
    LoginRequest
)

from ..auth import (
    hash_password,
    verify_password,
    create_access_token
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


async def _read_auth_payload(request: Request):
    content_type = request.headers.get("content-type", "")

    if "application/json" in content_type:
        try:
            data = await request.json()
            return data.get("username"), data.get("password")
        except Exception:
            return None, None

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        return form.get("username"), form.get("password")

    return None, None


@router.post("/register")
async def register(
    request: Request,
    db: Session = Depends(get_db)
):

    username_value, password_value = await _read_auth_payload(request)

    if username_value is None or password_value is None:
        raise HTTPException(
            status_code=422,
            detail="Username and password are required"
        )

    existing = db.query(User).filter(
        User.username == username_value
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    user = User(
        username=username_value,
        password=hash_password(password_value),
        role="customer"
    )

    db.add(user)
    db.commit()

    return {
        "message": "Registration successful"
    }


@router.post("/login")
async def login(
    request: Request,
    db: Session = Depends(get_db)
):

    username_value, password_value = await _read_auth_payload(request)

    if username_value is None or password_value is None:
        raise HTTPException(
            status_code=422,
            detail="Username and password are required"
        )

    user = db.query(User).filter(
        User.username == username_value
    ).first()

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not verify_password(
        password_value,
        user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_access_token(
        user.username,
        user.role
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role
    }