from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .security import decode_access_token

bearer = HTTPBearer()
optional_bearer = HTTPBearer(auto_error=False)

_BAD_TOKEN = "Token yanlışdır və ya vaxtı bitib"


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> models.User:
    user_id = decode_access_token(creds.credentials)
    user = db.get(models.User, user_id) if user_id else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_TOKEN)
    return user


def get_optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(optional_bearer),
    db: Session = Depends(get_db),
) -> models.User | None:
    """Token yoxdursa qonaq (None). Token var, amma yanlışdırsa 401: xal səssizcə itməsin."""
    if creds is None:
        return None
    user_id = decode_access_token(creds.credentials)
    user = db.get(models.User, user_id) if user_id else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, _BAD_TOKEN)
    return user
