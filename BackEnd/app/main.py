import os

from fastapi import Depends, FastAPI, HTTPException, Query, status
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
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer = HTTPBearer()


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
