from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .models import Product

# (ad, qiymət AZN, şəkil faylının adı) - frontend/src/data.ts ilə eynidir
FLOWERS = [
    ("Qızılgül", 4, "qizilgul"), ("Lalə", 4, "lale"), ("Pion", 6, "pion"),
    ("Eustoma", 8, "eustoma"), ("Qladiolus", 7, "qladiolus"), ("Zambaq", 8, "zambaq"),
    ("Yasəmən", 4, "yasemen"), ("Gerbera", 5, "gerbera"), ("Xrizantema", 9, "xrizantema"),
    ("İris", 5, "iris"), ("Hortensiya", 5, "hortensiya"), ("Papatya", 5, "papatya"),
    ("Alstromeriya", 6, "alstromeriya"), ("Orxideya", 10, "orxideya"), ("Gipsofila", 4, "gipsofila"),
]


def seed_products(db: Session) -> None:
    """Cədvəl boşdursa, saytdakı güllərlə doldurur."""
    if db.scalar(select(func.count(Product.id))) == 0:
        db.add_all(
            Product(
                name=name, description="", price=float(price), category="Gül",
                image_url=f"/images/flowers/{img}.jpg", stock=100,
            )
            for name, price, img in FLOWERS
        )
        db.commit()
