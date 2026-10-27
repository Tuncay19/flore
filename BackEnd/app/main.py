import os
from collections import defaultdict, deque
from time import monotonic

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from . import models, schemas
from .database import Base, SessionLocal, engine, get_db
from .security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from .seed import seed_products
from .pricing import CATALOG, calculate_quote, catalog_payload, loyalty_for, next_loyalty_level

Base.metadata.create_all(bind=engine)
with SessionLocal() as _db:
    seed_products(_db)

app = FastAPI(title="Gül Mağazası API")

# Frontend-in ünvanını bura əlavə et (React/Vite: 5173, CRA/Next: 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()
optional_bearer = HTTPBearer(auto_error=False)
assistant_requests: dict[str, deque[float]] = defaultdict(deque)


def check_assistant_rate_limit(request: Request) -> None:
    address = request.client.host if request.client else "unknown"
    bucket = assistant_requests[address]
    now = monotonic()
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= 12:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Çox sorğu göndərildi. Bir az sonra yenidən cəhd edin.")
    bucket.append(now)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = decode_access_token(creds.credentials)
    user = db.get(models.User, user_id) if user_id else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token yanlışdır və ya vaxtı bitib")
    return user


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> models.User | None:
    if not creds:
        return None
    user_id = decode_access_token(creds.credentials)
    return db.get(models.User, user_id) if user_id else None


def completed_spend_minor(user_id: int, db: Session) -> int:
    """Only manually completed requests count; refunds and cancellations do not."""
    return int(
        db.scalar(
            select(func.coalesce(func.sum(models.Order.subtotal_minor), 0)).where(
                models.Order.user_id == user_id,
                models.Order.status == "completed",
            )
        )
        or 0
    )


def add_loyalty_event(db: Session, user_id: int, previous: str | None, current: str, reason: str) -> None:
    db.add(
        models.LoyaltyEvent(
            user_id=user_id,
            previous_level=previous,
            new_level=current,
            reason=reason,
        )
    )


def quote_for(data: schemas.QuoteIn, user: models.User | None, db: Session) -> dict[str, object]:
    try:
        return calculate_quote(
            [(item.product_id, item.quantity) for item in data.items],
            data.delivery_zone,
            completed_spend_minor=completed_spend_minor(user.id, db) if user else 0,
            registered=bool(user),
        )
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(error)) from error


# ---------------------------- AUTH ----------------------------

@app.post("/auth/register", response_model=schemas.TokenOut, status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(models.User).where(models.User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Bu e-poçt artıq qeydiyyatdan keçib")

    user = models.User(
        full_name=data.full_name.strip(),
        email=email,
        phone=data.phone,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.flush()
    add_loyalty_event(db, user.id, None, "SILVER", "Qeydiyyat")
    db.commit()
    db.refresh(user)
    return schemas.TokenOut(access_token=create_access_token(user.id), user=user)


@app.post("/auth/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(models.User).where(models.User.email == data.email.lower()))
    # Eyni mesaj: e-poçtun olub-olmadığını bildirmirik.
    # Google hesabının parolu olmur (password_hash boşdur) - o da eyni xəta verir.
    if not user or not user.password_hash or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "E-poçt və ya parol yanlışdır")
    return schemas.TokenOut(access_token=create_access_token(user.id), user=user)


@app.post("/auth/google", response_model=schemas.TokenOut)
def google_login(data: schemas.GoogleLoginIn, db: Session = Depends(get_db)):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "GOOGLE_CLIENT_ID təyin olunmayıb (.env faylına bax)",
        )

    # Google-un imzaladığı tokeni yoxlayırıq (saxta token keçmir)
    try:
        info = google_id_token.verify_oauth2_token(
            data.credential, google_requests.Request(), client_id
        )
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google tokeni yanlışdır")

    if not info.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Google e-poçtu təsdiqlənməyib")

    google_id = info["sub"]
    email = info["email"].lower()

    user = db.scalar(select(models.User).where(models.User.google_id == google_id))
    if not user:
        # Eyni e-poçtla əvvəl adi qeydiyyat olubsa, hesabı Google ilə əlaqələndiririk
        user = db.scalar(select(models.User).where(models.User.email == email))
        if user:
            user.google_id = google_id
        else:
            user = models.User(
                full_name=info.get("name") or email.split("@")[0],
                email=email,
                google_id=google_id,
            )
            db.add(user)
        db.flush()
        if not db.scalar(select(models.LoyaltyEvent).where(models.LoyaltyEvent.user_id == user.id)):
            add_loyalty_event(db, user.id, None, "SILVER", "Google ilə qeydiyyat")
        db.commit()
        db.refresh(user)

    return schemas.TokenOut(access_token=create_access_token(user.id), user=user)


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# -------------------------- PRODUCTS --------------------------

@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(
    q: str | None = Query(default=None, description="Axtarış sözü (ad və təsvirdə)"),
    category: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(models.Product)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(models.Product.name.ilike(like), models.Product.description.ilike(like))
        )
    if category:
        stmt = stmt.where(models.Product.category == category)
    stmt = stmt.order_by(models.Product.id).limit(limit).offset(offset)
    return db.scalars(stmt).all()


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Məhsul tapılmadı")
    return product


# ----------------------- SMART GIFTING -----------------------

@app.get("/catalog", response_model=list[schemas.CatalogItem])
def catalog():
    return catalog_payload()


@app.post("/assistant/recommend", response_model=schemas.AssistantOut)
def assistant_recommend(data: schemas.AssistantIn, request: Request):
    """Deterministic catalog assistant; safe until an external provider is configured."""
    check_assistant_rate_limit(request)
    pool = [item for item in CATALOG if not data.mood or data.mood in item.moods]
    pool.sort(key=lambda item: (item.price_minor, item.id))
    remaining = data.budget * 100
    result: list[dict] = []
    for item in pool:
        quantity = min(5, remaining // item.price_minor)
        if quantity:
            result.append({
                "id": item.id,
                "name": item.name,
                "price_minor": item.price_minor,
                "moods": list(item.moods),
                "quantity": quantity,
            })
            remaining -= item.price_minor * quantity
        if len(result) >= 3:
            break
    return schemas.AssistantOut(
        provider_status="rule_based",
        disclaimer="Xarici AI provider hələ konfiqurasiya edilməyib; seçim yalnız təsdiqlənmiş kataloq qiymətləri ilə hesablanır.",
        total_minor=data.budget * 100 - remaining,
        items=result,
    )


@app.post("/pricing/quote", response_model=schemas.QuoteOut)
def pricing_quote(
    data: schemas.QuoteIn,
    current_user: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    return quote_for(data, current_user, db)


@app.post("/orders/request", response_model=schemas.OrderOut, status_code=201)
def create_order_request(
    data: schemas.OrderRequestIn,
    current_user: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Stores a request only. Payment and delivery are never triggered here."""
    quote = quote_for(data, current_user, db)
    order = models.Order(
        user_id=current_user.id if current_user else None,
        contact_name=data.contact_name.strip(),
        phone=data.phone.strip(),
        recipient_name=data.recipient_name.strip(),
        address=data.address.strip(),
        delivery_zone=data.delivery_zone,
        note=data.note.strip() if data.note else None,
        card_style=data.card_style,
        subtotal_minor=quote["subtotal_minor"],
        delivery_minor=quote["delivery_minor"],
        discount_minor=quote["discount_minor"],
        total_minor=quote["total_minor"],
        loyalty_level=quote["loyalty_label"],
        status="request",
    )
    db.add(order)
    db.flush()
    for line in quote["items"]:
        db.add(
            models.OrderItem(
                order_id=order.id,
                product_id=line["product_id"],
                product_name=line["name"],
                unit_price_minor=line["unit_price_minor"],
                quantity=line["quantity"],
            )
        )
    db.commit()
    db.refresh(order)
    return order


@app.get("/orders/me", response_model=list[schemas.OrderOut])
def my_orders(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(models.Order)
        .where(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
    ).all()


@app.get("/loyalty/me", response_model=schemas.LoyaltyOut)
def my_loyalty(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    spend = completed_spend_minor(current_user.id, db)
    level = loyalty_for(spend, True)
    following = next_loyalty_level(spend, True)
    history = db.scalars(
        select(models.LoyaltyEvent)
        .where(models.LoyaltyEvent.user_id == current_user.id)
        .order_by(models.LoyaltyEvent.created_at.desc())
    ).all()
    return schemas.LoyaltyOut(
        level=level.label,
        discount_percent=level.discount_percent,
        completed_spend_minor=spend,
        next_level=following.label if following else None,
        amount_to_next_minor=(following.min_completed_spend_minor - spend) if following else None,
        history=history,
    )


@app.patch("/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    data: schemas.OrderStatusIn,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu əməliyyat yalnız əməkdaşlar üçündür")
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sifariş tapılmadı")
    allowed = {
        "request": {"confirmed", "cancelled"},
        "confirmed": {"completed", "cancelled"},
        "completed": {"refunded"},
        "cancelled": set(),
        "refunded": set(),
    }
    if data.status not in allowed.get(order.status, set()):
        raise HTTPException(status.HTTP_409_CONFLICT, "Sifariş statusu bu mərhələyə keçirilə bilməz")

    old_spend = completed_spend_minor(order.user_id, db) if order.user_id else 0
    before = loyalty_for(old_spend, True) if order.user_id else None
    order.status = data.status
    db.flush()
    if order.user_id:
        after = loyalty_for(completed_spend_minor(order.user_id, db), True)
        if before and after and before.code != after.code:
            add_loyalty_event(db, order.user_id, before.label, after.label, "Sifariş statusu yeniləndi")
    db.commit()
    db.refresh(order)
    return order


@app.get("/recipients", response_model=list[schemas.RecipientOut])
def list_recipients(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(models.Recipient).where(models.Recipient.user_id == current_user.id).order_by(models.Recipient.created_at.desc())).all()


@app.post("/recipients", response_model=schemas.RecipientOut, status_code=201)
def create_recipient(data: schemas.RecipientIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = models.Recipient(user_id=current_user.id, **data.model_dump())
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    return recipient


@app.delete("/recipients/{recipient_id}", status_code=204)
def delete_recipient(recipient_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.get(models.Recipient, recipient_id)
    if not recipient or recipient.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alıcı tapılmadı")
    db.delete(recipient)
    db.commit()


@app.get("/occasions", response_model=list[schemas.OccasionOut])
def list_occasions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(models.Occasion).where(models.Occasion.user_id == current_user.id).order_by(models.Occasion.event_date)).all()


@app.post("/occasions", response_model=schemas.OccasionOut, status_code=201)
def create_occasion(data: schemas.OccasionIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    occasion = models.Occasion(user_id=current_user.id, **data.model_dump())
    db.add(occasion)
    db.commit()
    db.refresh(occasion)
    return occasion


@app.delete("/occasions/{occasion_id}", status_code=204)
def delete_occasion(occasion_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    occasion = db.get(models.Occasion, occasion_id)
    if not occasion or occasion.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Tarix tapılmadı")
    db.delete(occasion)
    db.commit()
