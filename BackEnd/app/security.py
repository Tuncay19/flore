import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

# Production-da sabit standart açar ilə işə düşmək qadağandır. Lokal inkişaf
# üçün uzun, aydın şəkildə qeyri-prodakşn açar saxlanır ki, JWT kitabxanası da
# təhlükəli qısa açar xəbərdarlığı verməsin.
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("APP_ENV", "development").lower() == "production":
        raise RuntimeError("Production üçün SECRET_KEY mühit dəyişəni mütləqdir")
    SECRET_KEY = "development-only-key-change-before-production-2026"
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 gün


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
