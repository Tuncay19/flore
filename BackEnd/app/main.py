import os
from collections import defaultdict, deque
from time import monotonic

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import or_, select
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
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()

# Immutable facts used for catalog-aware suggestions. Browser and AI input never set prices.
CATALOG = [
    {"id": 1, "name": "Qızılgül", "price": 4, "moods": ["Romantik", "Klassik", "Dramatik"]},
    {"id": 2, "name": "Lalə", "price": 4, "moods": ["Minimal", "Parlaq", "Pastel"]},
    {"id": 3, "name": "Pion", "price": 6, "moods": ["Romantik", "Pastel", "Zərif"]},
    {"id": 4, "name": "Eustoma", "price": 8, "moods": ["Zərif", "Minimal", "Yumşaq"]},
    {"id": 5, "name": "Qladiolus", "price": 7, "moods": ["Dramatik", "Parlaq", "Klassik"]},
    {"id": 6, "name": "Zambaq", "price": 8, "moods": ["Klassik", "Zərif", "Yumşaq"]},
    {"id": 7, "name": "Yasəmən", "price": 4, "moods": ["Yumşaq", "Pastel", "Romantik"]},
    {"id": 8, "name": "Gerbera", "price": 5, "moods": ["Parlaq", "Minimal", "Yumşaq"]},
    {"id": 9, "name": "Xrizantema", "price": 9, "moods": ["Klassik", "Dramatik", "Parlaq"]},
    {"id": 10, "name": "Iris", "price": 5, "moods": ["Zərif", "Dramatik", "Minimal"]},
    {"id": 11, "name": "Hortensiya", "price": 5, "moods": ["Pastel", "Yumşaq", "Romantik"]},
    {"id": 12, "name": "Papatya", "price": 5, "moods": ["Minimal", "Yumşaq", "Parlaq"]},
    {"id": 13, "name": "Alstromeriya", "price": 6, "moods": ["Parlaq", "Zərif", "Klassik"]},
    {"id": 14, "name": "Orxideya", "price": 10, "moods": ["Dramatik", "Zərif", "Klassik"]},
    {"id": 15, "name": "Gipsofila", "price": 4, "moods": ["Yumşaq", "Minimal", "Pastel"]},
]
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
    return CATALOG


@app.post("/assistant/recommend", response_model=schemas.AssistantOut)
def assistant_recommend(data: schemas.AssistantIn, request: Request):
    """Deterministic catalog assistant; safe until an external provider is configured."""
    check_assistant_rate_limit(request)
    pool = [item for item in CATALOG if not data.mood or data.mood in item["moods"]]
    pool.sort(key=lambda item: (item["price"], item["id"]))
    remaining = data.budget
    result: list[dict] = []
    for item in pool:
        quantity = min(5, remaining // item["price"])
        if quantity:
            result.append({**item, "quantity": quantity})
            remaining -= item["price"] * quantity
        if len(result) >= 3:
            break
    return schemas.AssistantOut(
        provider_status="rule_based",
        disclaimer="Xarici AI provider hələ konfiqurasiya edilməyib; seçim yalnız təsdiqlənmiş kataloq qiymətləri ilə hesablanır.",
        total=data.budget - remaining,
        items=result,
    )


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
