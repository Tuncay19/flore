import { useMemo, useState } from "react";
import { ArrowRight, Menu, Minus, Plus, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { flowers, type Flower } from "./data";
import type { CartItem, View } from "./types";
import { LANGS, useLang } from "./i18n";
import { useAuth } from "./Auth";
import { useFavorites } from "./favorites";
import { useToast } from "./toast";
import { money } from "./format";
import Shop from "./Shop";
import Checkout from "./Checkout";
import FavoritesPage from "./FavoritesPage";

const VIEWS: View[] = ["home", "shop", "favorites", "about", "contact", "checkout"];

export default function App() {
  const { t, lang, setLang } = useLang();
  const toast = useToast();
  const { user, openAuth, logout } = useAuth();
  const { ids } = useFavorites();

  // ?view=shop kimi ünvanla birbaşa səhifə açmaq mümkündür
  const requested = new URLSearchParams(window.location.search).get("view");
  const startView: View = (VIEWS as string[]).includes(requested ?? "") ? (requested as View) : "home";

  const [view, setView] = useState<View>(startView);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  const total = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  const go = (next: View) => {
    setView(next);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function change(f: Flower, d: number) {
    setCart((a) => {
      const has = a.find((x) => x.id === f.id);
      if (!has && d > 0) return [...a, { ...f, quantity: 1 }];
      return a.flatMap((x) =>
        x.id !== f.id ? [x] : x.quantity + d > 0 ? [{ ...x, quantity: x.quantity + d }] : [],
      );
    });
  }

  const orderDone = () => {
    setCart([]);
    toast(t("checkout.success"));
  };

  return (
    <main>
      <header className="site-header">
        <button className="wordmark" onClick={() => go("home")}>Florè</button>
        <button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label={t("nav.menu")}><Menu /></button>
        <nav className={menu ? "main-nav open" : "main-nav"}>
          <button onClick={() => go("shop")}>{t("nav.shop")}</button>
          <button onClick={() => go("favorites")}>
            {t("nav.favorites")}
            {ids.size > 0 && <b className="nav-count">{ids.size}</b>}
          </button>
          <button onClick={() => go("about")}>{t("nav.about")}</button>
          <button onClick={() => go("contact")}>{t("nav.contact")}</button>
        </nav>
        <div className="header-tools">
          <button onClick={() => go("checkout")}>{t("nav.order")}</button>
          <div className="lang-switch" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.id} className={l.id === lang ? "on" : ""} aria-pressed={l.id === lang} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
          {user ? (
            <span className="user-chip">
              <UserIcon size={16} />
              <span className="hide-sm">{user.full_name.split(" ")[0]}</span>
              <button onClick={logout}>{t("auth.logout")}</button>
            </span>
          ) : (
            <button className="signin" onClick={() => openAuth()} aria-label={t("auth.signIn")}>
              <UserIcon size={16} />
              <span className="hide-sm">{t("auth.signIn")}</span>
            </button>
          )}
          <button className="bag" onClick={() => setDrawer(true)} aria-label={t("nav.cart")}>
            <ShoppingBag size={20} /><b>{count}</b>
          </button>
        </div>
      </header>

      {view === "home" && <Home go={go} />}
      {view === "shop" && <Shop cart={cart} change={change} go={go} />}
      {view === "favorites" && <FavoritesPage cart={cart} change={change} go={go} />}
      {view === "about" && <About go={go} />}
      {view === "contact" && <Contact />}
      {view === "checkout" && <Checkout cart={cart} go={go} done={orderDone} />}

      <Cart
        open={drawer}
        close={() => setDrawer(false)}
        cart={cart}
        total={total}
        change={change}
        checkout={() => { setDrawer(false); go("checkout"); }}
      />

      <footer>
        <span>Florè</span>
        <p>{t("footer.tagline")}</p>
        <a href="mailto:hello@flore.az">hello@flore.az</a>
      </footer>
    </main>
  );
}

function Home({ go }: { go: (v: View) => void }) {
  const { t } = useLang();
  return (
    <>
      <section className="home-hero">
        <div className="hero-content">
          <p>{t("home.eyebrow")}</p>
          <h1>Florè</h1>
          <h2>{t("home.h2a")}<br /><em>{t("home.h2b")}</em></h2>
          <button className="primary" onClick={() => go("shop")}>{t("home.cta")} <ArrowRight size={18} /></button>
        </div>
        <div className="hero-photo">
          <img src={flowers[0].image} alt={t("home.heroAlt")} fetchPriority="high" />
          <span>{t("home.caption1")}<br />{t("home.caption2")}</span>
        </div>
      </section>
      <section className="home-note">
        <p>{t("home.note")}</p>
        <button onClick={() => go("shop")}>{t("home.noteCta")} <ArrowRight size={17} /></button>
      </section>
    </>
  );
}

function About({ go }: { go: (v: View) => void }) {
  const { t, flower } = useLang();
  return (
    <section className="about-page">
      <div className="about-photos">
        <img src={flowers[0].image} alt={flower(flowers[0])} />
        <img src={flowers[1].image} alt={flower(flowers[1])} />
        <img src={flowers[7].image} alt={flower(flowers[7])} />
      </div>
      <h1>{t("about.title")}</h1>
      <p>{t("about.text")}</p>
      <button className="primary" onClick={() => go("shop")}>{t("about.cta")} <ArrowRight size={18} /></button>
    </section>
  );
}

function Contact() {
  const { t } = useLang();
  return (
    <section className="contact-page">
      <div>
        <p>{t("contact.eyebrow")}</p>
        <h1>{t("contact.t1")}<br />{t("contact.t2")}<br /><em>{t("contact.t3")}</em></h1>
        <p className="contact-copy">{t("contact.copy")}</p>
        <hr />
        <h2>(+994) 55 200 00 00</h2>
        <p>{t("contact.hours")}</p>
      </div>
      <div className="map"><span>Florè<br />{t("contact.city")}</span></div>
    </section>
  );
}

type CartProps = {
  open: boolean;
  close: () => void;
  cart: CartItem[];
  total: number;
  change: (f: Flower, d: number) => void;
  checkout: () => void;
};

function Cart({ open, close, cart, total, change, checkout }: CartProps) {
  const { t, flower } = useLang();
  return (
    <>
      <div className={open ? "overlay open" : "overlay"} onClick={close} />
      <aside className={open ? "drawer open" : "drawer"}>
        <button className="close" onClick={close} aria-label={t("cart.close")}><X /></button>
        <p>{t("cart.eyebrow")}</p>
        <h1>{t("cart.title")}</h1>
        {cart.length > 0 ? (
          <>
            <div className="drawer-items">
              {cart.map((i) => (
                <div key={i.id}>
                  <img src={i.image} alt="" />
                  <section>
                    <h2>{flower(i)}</h2>
                    <span>{i.price} AZN</span>
                    <div className="quantity">
                      <button onClick={() => change(i, -1)} aria-label={t("card.decrease", { name: flower(i) })}><Minus size={14} /></button>
                      <b>{i.quantity}</b>
                      <button onClick={() => change(i, 1)} aria-label={t("card.increase", { name: flower(i) })}><Plus size={14} /></button>
                    </div>
                  </section>
                  <strong>{money(i.quantity * i.price)} AZN</strong>
                </div>
              ))}
            </div>
            <div className="drawer-bottom">
              <p>{t("cart.total")} <b>{money(total)} AZN</b></p>
              <button className="primary" onClick={checkout}>{t("cart.checkout")} <ArrowRight size={18} /></button>
            </div>
          </>
        ) : (
          <div className="empty">{t("cart.empty")}</div>
        )}
      </aside>
    </>
  );
}
