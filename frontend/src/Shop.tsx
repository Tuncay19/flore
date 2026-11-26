import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { COLORS, flowers, MAX_PRICE, MIN_PRICE, type Color, type Flower } from "./data";
import type { CartItem, View } from "./types";
import { useLang } from "./i18n";
import { useFavorites } from "./favorites";
import { money } from "./format";
import type { Key } from "./locales";
import FlowerCard from "./FlowerCard";

type Sort = "default" | "priceAsc" | "priceDesc" | "name";
const SORTS: { id: Sort; key: Key }[] = [
  { id: "default", key: "filters.sortDefault" },
  { id: "priceAsc", key: "filters.sortPriceAsc" },
  { id: "priceDesc", key: "filters.sortPriceDesc" },
  { id: "name", key: "filters.sortName" },
];

type Props = {
  cart: CartItem[];
  change: (f: Flower, d: number) => void;
  go: (v: View) => void;
};

export default function Shop({ cart, change, go }: Props) {
  const { t, flower, locale } = useLang();
  const { ids } = useFavorites();

  // ---- Filtr vəziyyəti ----
  const [q, setQ] = useState("");
  const [colors, setColors] = useState<Color[]>([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [sort, setSort] = useState<Sort>("default");
  const [onlyFav, setOnlyFav] = useState(false);

  const filtersActive = q.trim() !== "" || colors.length > 0 || maxPrice < MAX_PRICE || onlyFav;
  const clearFilters = () => {
    setQ("");
    setColors([]);
    setMaxPrice(MAX_PRICE);
    setOnlyFav(false);
  };
  const toggleColor = (c: Color) =>
    setColors((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase(locale);
    const list = flowers.filter((f) => {
      const byText =
        needle === "" ||
        flower(f).toLocaleLowerCase(locale).includes(needle) ||
        f.name.toLocaleLowerCase(locale).includes(needle);
      const byColor = colors.length === 0 || f.colors.some((c) => colors.includes(c));
      const byPrice = f.price <= maxPrice;
      const byFav = !onlyFav || ids.has(f.id);
      return byText && byColor && byPrice && byFav;
    });
    if (sort === "priceAsc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") return [...list].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...list].sort((a, b) => flower(a).localeCompare(flower(b), locale));
    return list;
  }, [q, colors, maxPrice, sort, onlyFav, ids, locale, flower]);

  const quantity = (id: number) => cart.find((i) => i.id === id)?.quantity ?? 0;
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <section className="shop-page">
      <div className="page-intro">
        <p>{t("builder.eyebrow")}</p>
        <h1>{t("builder.title1")}<br /><em>{t("builder.title2")}</em></h1>
        <span>{t("builder.subtitle")}</span>
      </div>

      <div className="builder">
        <div className="builder-main">
          <div className="filters">
            <label className="search-field">
              <Search size={16} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("filters.search")}
                aria-label={t("filters.search")}
              />
            </label>

            <div>
              <span className="filter-label">{t("filters.color")}</span>
              <div className="color-chips">
                {COLORS.map((c) => {
                  const on = colors.includes(c.id);
                  return (
                    <button key={c.id} className={on ? "chip on" : "chip"} aria-pressed={on} onClick={() => toggleColor(c.id)}>
                      <i style={{ background: c.hex }} />
                      {t(`color.${c.id}` as Key)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="filter-row">
              <label>
                <span>{t("filters.maxPrice", { price: maxPrice })}</span>
                <input
                  type="range"
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={1}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                />
              </label>
              <label>
                <span>{t("filters.sort")}</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  {SORTS.map((s) => <option key={s.id} value={s.id}>{t(s.key)}</option>)}
                </select>
              </label>
              <label className="fav-toggle">
                <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />
                {t("filters.onlyFav")}
              </label>
            </div>

            {filtersActive && <button className="link-btn" onClick={clearFilters}>{t("filters.clear")}</button>}
          </div>

          <p className="result-count" aria-live="polite">{t("filters.count", { n: visible.length })}</p>

          {visible.length > 0 ? (
            <div className="flower-grid">
              {visible.map((f) => <FlowerCard key={f.id} f={f} qty={quantity(f.id)} change={change} />)}
            </div>
          ) : (
            <div className="no-results">{t("filters.empty")}<small>{t("filters.emptyHint")}</small></div>
          )}
        </div>

        <aside className="selection">
          <p>{t("builder.yourSelection")}</p>
          {cart.length > 0 ? (
            <ul>
              {cart.map((i) => (
                <li key={i.id}><span>{i.quantity}× {flower(i)}</span><b>{money(i.quantity * i.price)} AZN</b></li>
              ))}
            </ul>
          ) : (
            <div className="empty">{t("builder.empty")}</div>
          )}
          <div className="selection-total"><span>{t("builder.total")}</span><strong>{money(total)} AZN</strong></div>
          <button className="primary" disabled={!cart.length} onClick={() => go("checkout")}>
            {t("builder.checkout")} <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </section>
  );
}
