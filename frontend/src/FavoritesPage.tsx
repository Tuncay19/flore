import { ArrowRight } from "lucide-react";
import { flowers, type Flower } from "./data";
import type { CartItem, View } from "./types";
import { useAuth } from "./Auth";
import { useFavorites } from "./favorites";
import { useLang } from "./i18n";
import FlowerCard from "./FlowerCard";

type Props = {
  cart: CartItem[];
  change: (f: Flower, d: number) => void;
  go: (v: View) => void;
};

export default function FavoritesPage({ cart, change, go }: Props) {
  const { t } = useLang();
  const { token, openAuth } = useAuth();
  const { ids, loading } = useFavorites();

  if (!token) {
    return (
      <section className="empty-page">
        <h1>{t("fav.loginTitle")}</h1>
        <p>{t("fav.loginText")}</p>
        <button className="primary" onClick={() => openAuth(t("fav.loginHint"))}>
          {t("auth.signIn")} <ArrowRight size={18} />
        </button>
      </section>
    );
  }

  const list = flowers.filter((f) => ids.has(f.id));

  if (!loading && list.length === 0) {
    return (
      <section className="empty-page">
        <h1>{t("fav.emptyTitle")}</h1>
        <p>{t("fav.emptyText")}</p>
        <button className="primary" onClick={() => go("shop")}>
          {t("fav.toShop")} <ArrowRight size={18} />
        </button>
      </section>
    );
  }

  return (
    <section className="shop-page">
      <div className="page-intro">
        <p>{t("fav.eyebrow")}</p>
        <h1>{t("fav.title1")}<br /><em>{t("fav.title2")}</em></h1>
        <span>{t("fav.subtitle")}</span>
      </div>
      {loading && list.length === 0 && <p className="result-count">{t("fav.loading")}</p>}
      <div className="flower-grid fav-grid">
        {list.map((f) => (
          <FlowerCard key={f.id} f={f} qty={cart.find((i) => i.id === f.id)?.quantity ?? 0} change={change} />
        ))}
      </div>
    </section>
  );
}
