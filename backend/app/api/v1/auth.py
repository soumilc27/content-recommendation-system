from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import timedelta

from app import models
from app.db.session import get_db
from app.schemas.auth import UserCreate, UserOut, Token, LoginRequest
from app.core import security

router = APIRouter()

@router.post('/auth/register', response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user_in.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed = security.get_password_hash(user_in.password)
    user = models.User(username=user_in.username, email=user_in.email, hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post('/auth/token', response_model=Token)
def login_for_access_token(form_data: LoginRequest = Body(...), db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(data={"sub": user.username, "user_id": user.id}, expires_delta=access_token_expires)
    return {"access_token": token, "token_type": "bearer"}
