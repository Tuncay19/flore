from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    password: str = Field(min_length=8, max_length=72)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleLoginIn(BaseModel):
    # Frontend-də Google düyməsinə basandan sonra gələn "credential" (ID token)
    credential: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    price: float
    category: str
    image_url: str | None
    stock: int

    model_config = {"from_attributes": True}
