import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api, ApiError, type OrderOut } from "./api";
import { useAuth } from "./Auth";
import { errorMessage, useLang } from "./i18n";
import { money } from "./format";
import type { CartItem, View } from "./types";

type Props = { cart: CartItem[]; go: (v: View) => void; done: () => void };

export default function Checkout({ cart, go, done }: Props) {
  const { t, flower } = useLang();
  const { user, token, logout, openAuth } = useAuth();
  const [payment, setPayment] = useState<"cash" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (cart.length === 0) {
    return (
      <section className="empty-page">
        <h1>{t("checkout.emptyTitle")}</h1>
        <p>{t("checkout.emptyText")}</p>
        <button className="primary" onClick={() => go("shop")}>
          {t("checkout.toShop")} <ArrowRight size={18} />
        </button>
      </section>
    );
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const val = (name: string) => String(f.get(name) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      await api<OrderOut>("/orders", {
        method: "POST",
        token: token ?? undefined,
        body: {
          customer_name: val("customer_name"),
          phone: val("phone"),
          address: val("address"),
          receiver_name: val("receiver_name"),
          receiver_phone: val("receiver_phone"),
          payment_method: payment,
          items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      done();
      go("home");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout();
        openAuth(t("err.session"));
      }
      setError(errorMessage(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="checkout-page">
      <h1>{t("checkout.title1")}<br /><em>{t("checkout.title2")}</em></h1>
      {/* key: giriş edən kimi sahələr hesab məlumatı ilə yenidən doldurulsun */}
      <form key={user?.id ?? "guest"} onSubmit={submit}>
        <div className="form-card">
          <h2>{t("checkout.customerInfo")}</h2>
          <label>{t("checkout.fullName")}<input name="customer_name" required minLength={2} defaultValue={user?.full_name ?? ""} /></label>
          <label>{t("checkout.phone")}<input name="phone" required minLength={5} type="tel" placeholder="+994 50 000 00 00" defaultValue={user?.phone ?? ""} /></label>
          <h2>{t("checkout.deliveryInfo")}</h2>
          <label>{t("checkout.address")}<input name="address" required minLength={3} /></label>
          <label>{t("checkout.receiverName")}<input name="receiver_name" required minLength={2} /></label>
          <label>{t("checkout.receiverPhone")}<input name="receiver_phone" required minLength={5} type="tel" /></label>
        </div>

        <div className="summary">
          <h2>{t("checkout.summary")}</h2>
          {cart.map((i) => (
            <p key={i.id}><span>{i.quantity}× {flower(i)}</span><b>{money(i.quantity * i.price)} AZN</b></p>
          ))}
          <strong>{t("checkout.total")} <span>{money(total)} AZN</span></strong>

          <fieldset>
            <legend>{t("checkout.payment")}</legend>
            <label><input type="radio" checked={payment === "card"} onChange={() => setPayment("card")} name="payment" /> {t("checkout.payCard")}</label>
            <label><input type="radio" checked={payment === "cash"} onChange={() => setPayment("cash")} name="payment" /> {t("checkout.payCash")}</label>
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? t("checkout.sending") : t("checkout.confirm")} <ArrowRight size={18} />
          </button>
          <small>{t("checkout.cardNote")}</small>
        </div>
      </form>
    </section>
  );
}
