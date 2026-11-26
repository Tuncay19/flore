import { Heart, Minus, Plus } from "lucide-react";
import type { Flower } from "./data";
import { useLang } from "./i18n";
import { useFavorites } from "./favorites";

type Props = { f: Flower; qty: number; change: (f: Flower, d: number) => void };

export default function FlowerCard({ f, qty, change }: Props) {
  const { t, flower } = useLang();
  const { isFav, toggle } = useFavorites();
  const name = flower(f);
  const fav = isFav(f.id);

  return (
    <article className="flower-card">
      <div className="card-media">
        <img src={f.image} alt={name} loading="lazy" />
        <button
          className={fav ? "heart on" : "heart"}
          onClick={() => toggle(f.id)}
          aria-pressed={fav}
          aria-label={fav ? t("fav.remove") : t("fav.add")}
        >
          <Heart size={18} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>
      <div>
        <h2>{name}</h2>
        <p>{t("card.perStem", { price: f.price })}</p>
      </div>
      <div className="quantity">
        <button onClick={() => change(f, -1)} aria-label={t("card.decrease", { name })}><Minus size={15} /></button>
        <b>{qty}</b>
        <button onClick={() => change(f, 1)} aria-label={t("card.increase", { name })}><Plus size={15} /></button>
      </div>
    </article>
  );
}
