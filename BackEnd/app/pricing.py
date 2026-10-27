"""Single source of truth for Florè catalog, delivery and loyalty calculations.

All monetary values are stored in qəpik (AZN * 100).  Browser-supplied prices or
totals are deliberately never accepted by this module.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CatalogFlower:
    id: int
    name: str
    price_minor: int
    moods: tuple[str, ...]
    image_key: str


CATALOG: tuple[CatalogFlower, ...] = (
    CatalogFlower(1, "Qızılgül", 400, ("Romantik", "Klassik", "Dramatik"), "qizilgul"),
    CatalogFlower(2, "Lalə", 400, ("Minimal", "Parlaq", "Pastel"), "lale"),
    CatalogFlower(3, "Pion", 600, ("Romantik", "Pastel", "Zərif"), "pion"),
    CatalogFlower(4, "Eustoma", 800, ("Zərif", "Minimal", "Yumşaq"), "eustoma"),
    CatalogFlower(5, "Qladiolus", 700, ("Dramatik", "Parlaq", "Klassik"), "qladiolus"),
    CatalogFlower(6, "Zambaq", 800, ("Klassik", "Zərif", "Yumşaq"), "zambaq"),
    CatalogFlower(7, "Yasəmən", 400, ("Yumşaq", "Pastel", "Romantik"), "yasemen"),
    CatalogFlower(8, "Gerbera", 500, ("Parlaq", "Minimal", "Yumşaq"), "gerbera"),
    CatalogFlower(9, "Xrizantema", 900, ("Klassik", "Dramatik", "Parlaq"), "xrizantema"),
    CatalogFlower(10, "Iris", 500, ("Zərif", "Dramatik", "Minimal"), "iris"),
    CatalogFlower(11, "Hortensiya", 500, ("Pastel", "Yumşaq", "Romantik"), "hortensiya"),
    CatalogFlower(12, "Papatya", 500, ("Minimal", "Yumşaq", "Parlaq"), "papatya"),
    CatalogFlower(13, "Alstromeriya", 600, ("Parlaq", "Zərif", "Klassik"), "alstromeriya"),
    CatalogFlower(14, "Orxideya", 1000, ("Dramatik", "Zərif", "Klassik"), "orxideya"),
    CatalogFlower(15, "Gipsofila", 400, ("Yumşaq", "Minimal", "Pastel"), "gipsofila"),
)
CATALOG_BY_ID = {flower.id: flower for flower in CATALOG}

# The written rules in the supplied Florè reference. Unknown areas have no
# fallback price and therefore cannot be quoted until business confirms them.
CENTRAL_FREE_THRESHOLD_MINOR = 10_000
CENTRAL_DELIVERY_MINOR = 1_000
OUTER_DELIVERY_MINOR = 2_500
DELIVERY_ZONES = {"central", "outer"}


@dataclass(frozen=True)
class LoyaltyLevel:
    code: str
    label: str
    min_completed_spend_minor: int
    discount_percent: int


# Thresholds are intentionally strict ("daha çox"): exactly 300 AZN remains
# Silver and Gold starts from 300.01 AZN.
LOYALTY_LEVELS: tuple[LoyaltyLevel, ...] = (
    LoyaltyLevel("silver", "SILVER", 0, 2),
    LoyaltyLevel("gold", "GOLD", 30_001, 5),
    LoyaltyLevel("platinum", "PLATINUM", 65_001, 10),
    LoyaltyLevel("diamond", "DIAMOND", 100_001, 15),
)


def catalog_payload() -> list[dict[str, object]]:
    return [
        {
            "id": flower.id,
            "name": flower.name,
            "price_minor": flower.price_minor,
            "moods": list(flower.moods),
        }
        for flower in CATALOG
    ]


def loyalty_for(completed_spend_minor: int, registered: bool) -> LoyaltyLevel | None:
    if not registered:
        return None
    return max(
        (level for level in LOYALTY_LEVELS if completed_spend_minor >= level.min_completed_spend_minor),
        key=lambda level: level.min_completed_spend_minor,
    )


def next_loyalty_level(completed_spend_minor: int, registered: bool) -> LoyaltyLevel | None:
    if not registered:
        return LOYALTY_LEVELS[0]
    return next(
        (level for level in LOYALTY_LEVELS if level.min_completed_spend_minor > completed_spend_minor),
        None,
    )


def delivery_fee_minor(subtotal_minor: int, zone: str) -> int:
    if zone == "central":
        return 0 if subtotal_minor >= CENTRAL_FREE_THRESHOLD_MINOR else CENTRAL_DELIVERY_MINOR
    if zone == "outer":
        return OUTER_DELIVERY_MINOR
    raise ValueError("Çatdırılma ərazisi təsdiqlənməyib")


def calculate_quote(
    items: list[tuple[int, int]],
    delivery_zone: str,
    *,
    completed_spend_minor: int = 0,
    registered: bool = False,
) -> dict[str, object]:
    """Return an authoritative quote. Duplicate item ids are merged safely."""
    quantities: dict[int, int] = {}
    for product_id, quantity in items:
        if product_id not in CATALOG_BY_ID:
            raise ValueError("Məhsul tapılmadı")
        if not 1 <= quantity <= 99:
            raise ValueError("Məhsul sayı 1–99 aralığında olmalıdır")
        quantities[product_id] = quantities.get(product_id, 0) + quantity
        if quantities[product_id] > 99:
            raise ValueError("Bir məhsuldan maksimum 99 ədəd seçilə bilər")

    if not quantities:
        raise ValueError("Səbət boşdur")

    lines: list[dict[str, object]] = []
    subtotal_minor = 0
    for product_id, quantity in quantities.items():
        flower = CATALOG_BY_ID[product_id]
        line_total_minor = flower.price_minor * quantity
        subtotal_minor += line_total_minor
        lines.append(
            {
                "product_id": flower.id,
                "name": flower.name,
                "quantity": quantity,
                "unit_price_minor": flower.price_minor,
                "line_total_minor": line_total_minor,
            }
        )

    level = loyalty_for(completed_spend_minor, registered)
    discount_percent = level.discount_percent if level else 0
    # Delivery remains outside the status discount, as stated in the reference.
    discount_minor = subtotal_minor * discount_percent // 100
    delivery_minor = delivery_fee_minor(subtotal_minor, delivery_zone)
    return {
        "items": lines,
        "subtotal_minor": subtotal_minor,
        "delivery_minor": delivery_minor,
        "discount_minor": discount_minor,
        "total_minor": subtotal_minor + delivery_minor - discount_minor,
        "loyalty_level": level.code if level else None,
        "loyalty_label": level.label if level else None,
        "discount_percent": discount_percent,
    }
