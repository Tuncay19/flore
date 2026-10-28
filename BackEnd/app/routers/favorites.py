from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[schemas.ProductOut])
def list_favorites(
    user: models.User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """İstifadəçinin sevimli məhsulları (ən yenisi birinci)."""
    stmt = (
        select(models.Product)
        .join(models.Favorite, models.Favorite.product_id == models.Product.id)
        .where(models.Favorite.user_id == user.id)
        .order_by(models.Favorite.created_at.desc(), models.Favorite.id.desc())
    )
    return db.scalars(stmt).all()


@router.post("/{product_id}", response_model=schemas.FavoriteOut)
def add_favorite(
    product_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if db.get(models.Product, product_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Məhsul tapılmadı")

    exists = db.scalar(
        select(models.Favorite).where(
            models.Favorite.user_id == user.id, models.Favorite.product_id == product_id
        )
    )
    if exists is None:
        db.add(models.Favorite(user_id=user.id, product_id=product_id))
        try:
            db.commit()
        except IntegrityError:  # eyni anda iki sorğu gəlibsə, artıq əlavə olunub
            db.rollback()
    return schemas.FavoriteOut(product_id=product_id, favorite=True)


@router.delete("/{product_id}", response_model=schemas.FavoriteOut)
def remove_favorite(
    product_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = db.scalar(
        select(models.Favorite).where(
            models.Favorite.user_id == user.id, models.Favorite.product_id == product_id
        )
    )
    if fav is not None:
        db.delete(fav)
        db.commit()
    return schemas.FavoriteOut(product_id=product_id, favorite=False)
