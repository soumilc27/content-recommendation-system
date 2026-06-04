from pydantic import BaseModel, ConfigDict
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None

