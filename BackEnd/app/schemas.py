from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ---------------- Auth ----------------
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


# ---------------- Məhsullar ----------------
class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    price: float
    category: str
    image_url: str | None
    stock: int

    model_config = {"from_attributes": True}


# ---------------- Sevimlilər ----------------
class FavoriteOut(BaseModel):
    product_id: int
    favorite: bool


# ---------------- Sifarişlər ----------------
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=200)


class OrderIn(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    address: str = Field(min_length=3, max_length=255)
    receiver_name: str = Field(min_length=2, max_length=100)
    receiver_phone: str = Field(min_length=5, max_length=30)
    payment_method: Literal["cash", "card"] = "cash"
    items: list[OrderItemIn] = Field(min_length=1, max_length=50)


class OrderItemOut(BaseModel):
    product_id: int | None
    name: str
    unit_price: float
    quantity: int

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    total: float
    status: str
    payment_method: str
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}
