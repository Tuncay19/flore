from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, get_optional_user

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut, status_code=201)
def create_order(
    data: schemas.OrderIn,
    user: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Sifariş yaradır. Qiymətlər həmişə bazadan götürülür (frontend-in göndərdiyi qiymətə güvənmirik).

    Daxil olmuş istifadəçinin sifarişi hesabına bağlanır, qonaq sifarişi isə user_id olmadan saxlanılır.
    """
    quantities: dict[int, int] = {}
    for item in data.items:
        quantities[item.product_id] = quantities.get(item.product_id, 0) + item.quantity

    products = db.scalars(
        select(models.Product).where(models.Product.id.in_(list(quantities)))
    ).all()
    if len(products) != len(quantities):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Məhsul tapılmadı")

    total = round(sum(p.price * quantities[p.id] for p in products), 2)

    order = models.Order(
        user_id=user.id if user is not None else None,
        customer_name=data.customer_name.strip(),
        phone=data.phone.strip(),
        address=data.address.strip(),
        receiver_name=data.receiver_name.strip(),
        receiver_phone=data.receiver_phone.strip(),
        payment_method=data.payment_method,
        subtotal=total,
        discount=0.0,
        total=total,
        points_earned=0,
    )
    for product in products:
        order.items.append(
            models.OrderItem(
                product_id=product.id,
                name=product.name,
                unit_price=product.price,
                quantity=quantities[product.id],
            )
        )
    db.add(order)
    db.commit()
    db.refresh(order)
    return schemas.OrderOut.model_validate(order)


@router.get("", response_model=list[schemas.OrderOut])
def my_orders(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = (
        select(models.Order)
        .where(models.Order.user_id == user.id)
        .options(selectinload(models.Order.items))
        .order_by(models.Order.created_at.desc(), models.Order.id.desc())
    )
    return [schemas.OrderOut.model_validate(o) for o in db.scalars(stmt).all()]
