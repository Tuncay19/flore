from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import Product
from .pricing import CATALOG


def seed_products(db: Session) -> None:
    """Cədvəl boşdursa, saytdakı güllərlə doldurur."""
    if db.scalar(select(func.count(Product.id))) == 0:
        db.add_all(
            Product(
                name=flower.name, description="", price=flower.price_minor / 100,
                category="Gül", image_url=f"/images/flowers/{flower.image_key}.jpg", stock=100,
            )
            for flower in CATALOG
        )
        db.commit()
