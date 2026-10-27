from datetime import datetime
from typing import Literal

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


class CatalogItem(BaseModel):
    id: int
    name: str
    price_minor: int
    moods: list[str]


class AssistantIn(BaseModel):
    budget: int = Field(ge=4, le=500)
    mood: str | None = Field(default=None, max_length=30)
    message: str | None = Field(default=None, max_length=500)


class AssistantItem(CatalogItem):
    quantity: int = Field(ge=1, le=5)


class AssistantOut(BaseModel):
    provider_status: str
    disclaimer: str
    total_minor: int
    items: list[AssistantItem]


class QuoteItemIn(BaseModel):
    product_id: int = Field(ge=1)
    quantity: int = Field(ge=1, le=99)


class QuoteItemOut(QuoteItemIn):
    name: str
    unit_price_minor: int
    line_total_minor: int


class QuoteIn(BaseModel):
    items: list[QuoteItemIn] = Field(min_length=1, max_length=15)
    delivery_zone: Literal["central", "outer"]


class QuoteOut(BaseModel):
    items: list[QuoteItemOut]
    subtotal_minor: int
    delivery_minor: int
    discount_minor: int
    total_minor: int
    loyalty_level: str | None
    loyalty_label: str | None
    discount_percent: int


class OrderRequestIn(QuoteIn):
    contact_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=5, max_length=30)
    recipient_name: str = Field(min_length=2, max_length=100)
    address: str = Field(min_length=5, max_length=300)
    note: str | None = Field(default=None, max_length=180)
    card_style: Literal["rose", "ivory", "night"] | None = None


class OrderOut(BaseModel):
    id: int
    status: str
    subtotal_minor: int
    delivery_minor: int
    discount_minor: int
    total_minor: int
    loyalty_level: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusIn(BaseModel):
    status: Literal["confirmed", "completed", "cancelled", "refunded"]


class LoyaltyEventOut(BaseModel):
    previous_level: str | None
    new_level: str
    reason: str
    created_at: datetime

    model_config = {"from_attributes": True}


class LoyaltyOut(BaseModel):
    level: str
    discount_percent: int
    completed_spend_minor: int
    next_level: str | None
    amount_to_next_minor: int | None
    history: list[LoyaltyEventOut]


class RecipientIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    address: str | None = Field(default=None, max_length=300)
    favorite_flowers: str | None = Field(default=None, max_length=300)


class RecipientOut(RecipientIn):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}


class OccasionIn(BaseModel):
    title: str = Field(min_length=2, max_length=100)
    recipient_name: str = Field(min_length=2, max_length=100)
    event_date: datetime
    reminder: str = Field(default="3 gün əvvəl", max_length=40)
    note: str | None = Field(default=None, max_length=300)


class OccasionOut(OccasionIn):
    id: int
    created_at: datetime
    model_config = {"from_attributes": True}
