import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Heart, Menu, MessageCircle, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { flowers, moods, type Flower, type Mood } from "./data";
import { AuthModal, useAuth } from "./Auth";
import { api, type User } from "./api";
import "./auth.css";

type View = "home" | "catalog" | "assistant" | "planner" | "favorites" | "about" | "loyalty" | "checkout";
type CartItem = Flower & { quantity: number };
type Occasion = { id: number; title: string; person: string; date: string; reminder: string };
type ChatMessage = { from: "assistant" | "user"; text: string };
type DeliveryZone = "" | "central" | "outer";
type Quote = { subtotal_minor: number; delivery_minor: number; discount_minor: number; total_minor: number; loyalty_label: string | null; discount_percent: number };
type Order = { id: number; status: string; total_minor: number };
type Loyalty = { level: string; discount_percent: number; completed_spend_minor: number; next_level: string | null; amount_to_next_minor: number | null; history: { previous_level: string | null; new_level: string; reason: string; created_at: string }[] };

const price = (value: number) => `${value} AZN`;
const minorPrice = (value: number) => `${(value / 100).toFixed(2).replace(".00", "")} AZN`;
const azMonth = (date: string) => ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"][new Date(`${date}T00:00:00`).getMonth()];
const storage = <T,>(key: string, fallback: T): T => {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; }
};
const validViews: View[] = ["home", "catalog", "assistant", "planner", "favorites", "about", "loyalty", "checkout"];

function makeSuggestion(budget: number, mood?: Mood) {
  const pool = mood ? flowers.filter((flower) => flower.moods.includes(mood)) : flowers;
  const sorted = [...pool].sort((a, b) => a.price - b.price);
  const selected: CartItem[] = [];
  let remaining = Math.max(0, budget);
  for (const flower of sorted) {
    const quantity = Math.floor(remaining / flower.price);
    if (quantity > 0) { selected.push({ ...flower, quantity: Math.min(quantity, 5) }); remaining -= flower.price * Math.min(quantity, 5); }
    if (selected.length >= 3) break;
  }
  return selected;
}

export default function App() {
  const requested = new URLSearchParams(window.location.search).get("view") as View | null;
  const [view, setView] = useState<View>(requested && validViews.includes(requested) ? requested : "home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<number[]>(() => storage("flore-favorites", []));
  const [occasions, setOccasions] = useState<Occasion[]>(() => storage("flore-occasions", []));
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const { user, setSession, logout } = useAuth();
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => localStorage.setItem("flore-favorites", JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem("flore-occasions", JSON.stringify(occasions)), [occasions]);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2600); };
  const go = (next: View) => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const change = (flower: Flower, delta: number) => setCart((items) => {
    const current = items.find((item) => item.id === flower.id);
    if (!current && delta > 0) return [...items, { ...flower, quantity: 1 }];
    return items.flatMap((item) => {
      if (item.id !== flower.id) return [item];
      const nextQuantity = item.quantity + delta;
      if (nextQuantity <= 0) return [];
      return nextQuantity <= 99 ? [{ ...item, quantity: nextQuantity }] : [item];
    });
  });
  const addSelection = (selection: CartItem[]) => { setCart((items) => {
    const next = [...items]; selection.forEach((choice) => { const found = next.find((item) => item.id === choice.id); if (found) found.quantity += choice.quantity; else next.push(choice); }); return next;
  }); notify("Seçim səbətə əlavə edildi."); };
  const toggleFavorite = (id: number) => setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);

  return <div className="app-shell">
    <Header view={view} go={go} count={count} menu={menu} setMenu={setMenu} openCart={() => setDrawer(true)} userName={user?.full_name} openAuth={() => setAuthOpen(true)} logout={logout} />
    <main>
      {view === "home" && <Home go={go} />}
      {view === "catalog" && <Catalog cart={cart} change={change} favorites={favorites} toggleFavorite={toggleFavorite} go={go} />}
      {view === "assistant" && <Assistant addSelection={addSelection} go={go} />}
      {view === "planner" && <Planner occasions={occasions} setOccasions={setOccasions} go={go} user={user} />}
      {view === "favorites" && <Favorites favorites={favorites} change={change} toggleFavorite={toggleFavorite} go={go} />}
      {view === "about" && <About go={go} />}
      {view === "loyalty" && <LoyaltyPage user={user} openAuth={() => setAuthOpen(true)} />}
      {view === "checkout" && <Checkout cart={cart} total={total} change={change} go={go} user={user} complete={(order) => { setCart([]); notify(`Sorğu #${order.id} qeydə alındı.`); }} />}
    </main>
    <Cart drawer={drawer} close={() => setDrawer(false)} cart={cart} total={total} change={change} go={go} />
    <AuthModal open={authOpen} close={() => setAuthOpen(false)} onSession={setSession} />
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    <Footer go={go} />
  </div>;
}

function Header({ view, go, count, menu, setMenu, openCart, userName, openAuth, logout }: { view: View; go: (view: View) => void; count: number; menu: boolean; setMenu: (value: boolean) => void; openCart: () => void; userName?: string; openAuth: () => void; logout: () => void }) {
  const links: { label: string; value: View }[] = [{ label: "Güllər", value: "catalog" }, { label: "Florè Assistant", value: "assistant" }, { label: "Planlayıcı", value: "planner" }, { label: "Status", value: "loyalty" }, { label: "Haqqımızda", value: "about" }];
  return <header className="site-header"><button className="brand" onClick={() => go("home")} aria-label="Florè ana səhifə">Florè</button><nav className="desktop-nav">{links.map((link) => <button className={view === link.value ? "active" : ""} key={link.value} onClick={() => go(link.value)}>{link.label}</button>)}</nav><div className="header-actions">{userName ? <button className="account-action" onClick={logout} title="Hesabdan çıx">{userName.split(" ")[0]} · Çıxış</button> : <button className="account-action" onClick={openAuth}>Daxil ol</button>}<button className="text-action" onClick={() => go("favorites")} aria-label="Sevimlilər"><Heart size={18} /><span>Sevimlilər</span></button><button className="bag-button" onClick={openCart} aria-label="Səbəti aç"><ShoppingBag size={19} /><b>{count}</b></button><button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Menyunu aç">{menu ? <X /> : <Menu />}</button></div><nav className={menu ? "mobile-nav open" : "mobile-nav"}>{links.map((link) => <button key={link.value} onClick={() => go(link.value)}>{link.label}<ChevronRight size={18} /></button>)}<button onClick={() => go("favorites")}>Sevimli güllərin<Heart size={18} /></button></nav></header>;
}

function Home({ go }: { go: (view: View) => void }) {
  const featured = [flowers[2], flowers[7], flowers[13]];
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">BAKI · FƏRDİ GÜL SEÇİMİ</p><h1>Hədiyyə<br/><em>hiss kimi.</em></h1><p className="hero-text">Gülləri seç, sayını özün müəyyən et.</p><div className="hero-actions"><button className="primary" onClick={() => go("catalog")}>Gülləri kəşf et <ArrowRight size={18} /></button><button className="quiet-button" onClick={() => go("assistant")}><Sparkles size={17} />Köməkçi ilə seç</button></div><span className="hero-index">01 / 03</span></div><div className="hero-art"><div className="hero-wash"/><img src={flowers[2].image} alt="Açıq çəhrayı pion" fetchPriority="high"/><span className="art-caption">öz seçimin.<br/>öz hekayən.</span><div className="hero-orbit">Florè · fərdi seçim · Florè · fərdi seçim ·</div></div></section>
    <section className="value-strip"><p>Hazır buket yox. <em>Sənin seçimin.</em></p><span>15 fərdi gül · miqdarı özün müəyyən et</span></section>
    <section className="home-grid"><div className="section-intro"><p className="eyebrow">NECƏ İŞLƏYİR</p><h2>Hədiyyəni sadələşdirən<br/><em>üç addım.</em></h2></div><div className="steps"><article><b>01</b><h3>Seç</h3><p>Kataloqdan sevdiyin gülləri və sayını seç.</p></article><article><b>02</b><h3>Yarat</h3><p>Səbətdə öz kompozisiyanı formalaşdır.</p></article><article><b>03</b><h3>Planla</h3><p>Özəl günləri yadda saxla, vaxtında xatırla.</p></article></div></section>
    <section className="spotlight"><div className="spotlight-images">{featured.map((flower, index) => <img className={`spotlight-${index}`} key={flower.id} src={flower.image} alt={flower.name} loading="lazy" />)}</div><div><p className="eyebrow">MOOD-BASED SEÇİM</p><h2>Hansı əhvalı<br/><em>göndərirsən?</em></h2><p>Romantik, minimal və ya parlaq — istədiyin hissdən başla, kataloq səninlə dəyişsin.</p><button className="inline-link" onClick={() => go("catalog")}>Əhvala görə kəşf et <ArrowRight size={17} /></button></div></section>
    <section className="assistant-banner"><div><p className="eyebrow">FLORÈ ASSISTANT</p><h2>Qərarsız qalmısansa,<br/><em>birlikdə seçək.</em></h2><p>Büdcəni və hədiyyənin səbəbini yaz. Köməkçi yalnız kataloqumuzdakı güllərlə real məbləğ hesablayır.</p></div><button className="round-cta" onClick={() => go("assistant")}><MessageCircle size={25}/><span>Seçimə başla</span></button></section>
  </>;
}

function Catalog({ cart, change, favorites, toggleFavorite, go }: { cart: CartItem[]; change: (flower: Flower, delta: number) => void; favorites: number[]; toggleFavorite: (id: number) => void; go: (view: View) => void }) {
  const [query, setQuery] = useState(""); const [mood, setMood] = useState<Mood | "Hamısı">("Hamısı");
  const display = flowers.filter((flower) => flower.name.toLocaleLowerCase("az").includes(query.toLocaleLowerCase("az")) && (mood === "Hamısı" || flower.moods.includes(mood)));
  return <section className="catalog-page"><div className="catalog-head"><div><p className="eyebrow">FƏRDİ GÜL KATALOQU</p><h1>Öz seçimini<br/><em>yarat.</em></h1></div><p>Hər gül bir ədəd üçün qiymətləndirilir. Miqdarını sərbəst müəyyən et, cəm avtomatik hesablanacaq.</p></div><div className="catalog-tools"><label className="search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Gül axtar" aria-label="Gül axtar" /></label><div className="mood-row">{["Hamısı", ...moods].map((item) => <button key={item} className={mood === item ? "selected" : ""} onClick={() => setMood(item as Mood | "Hamısı")}>{item}</button>)}</div></div><div className="catalog-layout"><div className="product-grid">{display.map((flower) => <FlowerCard key={flower.id} flower={flower} quantity={cart.find((item) => item.id === flower.id)?.quantity ?? 0} favorite={favorites.includes(flower.id)} change={change} toggleFavorite={toggleFavorite} />)}{!display.length && <div className="no-results"><Search size={25}/><h2>Nəticə tapılmadı</h2><p>Axtarışı və ya əhval filtrini dəyişin.</p></div>}</div><aside className="catalog-note"><Sparkles size={21}/><h2>Büdcən var?</h2><p>Smart Budget Builder kataloqdakı qiymətlərə əsasən seçim təklif edir.</p><button className="inline-link" onClick={() => go("assistant")}>Köməkçi ilə seç <ArrowRight size={16}/></button></aside></div></section>;
}

function FlowerCard({ flower, quantity, favorite, change, toggleFavorite }: { flower: Flower; quantity: number; favorite: boolean; change: (flower: Flower, delta: number) => void; toggleFavorite: (id: number) => void }) {
  return <article className="flower-card"><div className="product-image"><img src={flower.image} alt={flower.name} loading="lazy"/><button className={favorite ? "heart active" : "heart"} onClick={() => toggleFavorite(flower.id)} aria-label={`${flower.name} sevimlilərə əlavə et`}><Heart size={18} fill={favorite ? "currentColor" : "none"}/></button><span>{flower.palette}</span></div><div className="product-detail"><div><h2>{flower.name}</h2><p>{price(flower.price)} <span>/ ədəd</span></p></div><div className="counter"><button onClick={() => change(flower, -1)} aria-label={`${flower.name} sayını azalt`}><Minus size={15}/></button><b>{quantity}</b><button onClick={() => change(flower, 1)} aria-label={`${flower.name} səbətə əlavə et`}><Plus size={16}/></button></div></div><p className="flower-story">{flower.story}</p></article>;
}

function Assistant({ addSelection, go }: { addSelection: (selection: CartItem[]) => void; go: (view: View) => void }) {
  const [budget, setBudget] = useState(40); const [mood, setMood] = useState<Mood | "">(""); const [message, setMessage] = useState(""); const [messages, setMessages] = useState<ChatMessage[]>([{ from: "assistant", text: "Salam, mən Florè Assistantam. Büdcənizi və hədiyyənin əhvalını yazın, kataloqdan uyğun seçim hesablayaq." }]);
  const [serverSelection, setServerSelection] = useState<CartItem[] | null>(null); const [serverNote, setServerNote] = useState("");
  const localSuggestion = useMemo(() => makeSuggestion(budget, mood || undefined), [budget, mood]); const suggestion = serverSelection ?? localSuggestion; const total = suggestion.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const send = async (event: FormEvent) => {
    event.preventDefault(); if (!message.trim()) return;
    const typed = message.trim(); const found = Number(typed.match(/\d+/)?.[0]); const nextBudget = Math.min(500, Math.max(4, found || budget));
    setBudget(nextBudget); setMessage(""); setServerSelection(null); setServerNote("Kataloq qaydaları yoxlanılır…"); setMessages((items) => [...items, { from: "user", text: typed }]);
    try {
      const result = await api<{ disclaimer: string; total_minor: number; items: { id: number; quantity: number }[] }>("/assistant/recommend", { method: "POST", body: { budget: nextBudget, mood: mood || null, message: typed } });
      const selection = result.items.flatMap((choice) => { const flower = flowers.find((item) => item.id === choice.id); return flower ? [{ ...flower, quantity: choice.quantity }] : []; });
      setServerSelection(selection); setServerNote(result.disclaimer); setMessages((items) => [...items, { from: "assistant", text: `${nextBudget} AZN büdcə üçün kataloqdan hesablanmış seçim hazırdır.` }]);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Köməkçi cavab vermədi.";
      setServerNote(`Server cavabı alınmadı: ${text}`); setMessages((items) => [...items, { from: "assistant", text: "Server əlçatan deyil. Aşağıdakı seçim yalnız lokal kataloq hesablamasıdır." }]);
    }
  };
  return <section className="assistant-page"><div className="assistant-intro"><p className="eyebrow">FLORÈ ASSISTANT</p><h1>Hədiyyə seçmək<br/><em>daha rahat.</em></h1><p>Bu versiya kataloq qaydaları və dəqiq qiymətlərlə işləyir. Xarici generativ AI xidməti konfiqurasiya edilməyib.</p><div className="prompt-chips"><button onClick={() => setMessage("Anama 40 manatlıq zərif güllər seç")}>Anama 40 AZN-lik zərif seçim</button><button onClick={() => setMessage("25 AZN büdcəm var")}>25 AZN büdcəm var</button><button onClick={() => setMood("Romantik")}>Romantik seçim</button></div></div><div className="assistant-workspace"><section className="chat-panel"><div className="chat-head"><span><Sparkles size={17}/> Florè Assistant</span><small>Kataloq köməkçisi</small></div><div className="messages">{messages.map((item, index) => <p className={item.from} key={index}>{item.text}</p>)}</div><form onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Məsələn: 30 AZN-lik pastel seçim"/><button aria-label="Mesajı göndər"><ArrowRight size={18}/></button></form></section><section className="recommendation"><div className="builder-controls"><label>Büdcə <input type="number" min="4" max="500" value={budget} onChange={(event) => { setBudget(Number(event.target.value) || 0); setServerSelection(null); }}/><span>AZN</span></label><select value={mood} onChange={(event) => { setMood(event.target.value as Mood | ""); setServerSelection(null); }} aria-label="Əhval seçin"><option value="">İstənilən əhval</option>{moods.map((item) => <option key={item}>{item}</option>)}</select></div><p className="eyebrow">SƏNİN ÜÇÜN SEÇDİK</p>{suggestion.length ? <><div className="assistant-products">{suggestion.map((item) => <div key={item.id}><img src={item.image} alt={item.name}/><span><b>{item.quantity}× {item.name}</b><small>{price(item.quantity * item.price)}</small></span></div>)}</div><div className="recommendation-total"><span>Cəmi</span><b>{price(total)}</b></div><button className="primary" onClick={() => addSelection(suggestion)}>Bu seçimi səbətə əlavə et <ArrowRight size={17}/></button></> : <div className="empty-state">Bu büdcə ilə uyğun seçim tapılmadı.</div>}{serverNote && <p className="assistant-note">{serverNote}</p>}<button className="quiet-button center" onClick={() => go("catalog")}>Kataloqa bax</button></section></div></section>;
}

function Planner({ occasions, setOccasions, go, user }: { occasions: Occasion[]; setOccasions: (items: Occasion[]) => void; go: (view: View) => void; user: User | null }) {
  const [form, setForm] = useState({ title: "Ad günü", person: "", date: "", reminder: "3 gün əvvəl" }); const [message, setMessage] = useState("");
  const token = localStorage.getItem("token") || undefined;
  useEffect(() => {
    if (!user) return;
    api<{ id: number; title: string; recipient_name: string; event_date: string; reminder: string }[]>("/occasions", { token })
      .then((saved) => setOccasions(saved.map((item) => ({ id: item.id, title: item.title, person: item.recipient_name, date: item.event_date.slice(0, 10), reminder: item.reminder }))))
      .catch(() => setMessage("Planlar yüklənmədi. Server bağlantısını yoxlayın."));
  }, [user, token, setOccasions]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form.person || !form.date) return; setMessage("");
    if (!user) { setOccasions([...occasions, { ...form, id: Date.now() }]); setForm({ title: "Ad günü", person: "", date: "", reminder: "3 gün əvvəl" }); return; }
    try {
      const saved = await api<{ id: number; title: string; recipient_name: string; event_date: string; reminder: string }>("/occasions", { method: "POST", token, body: { title: form.title, recipient_name: form.person, event_date: `${form.date}T00:00:00`, reminder: form.reminder } });
      setOccasions([...occasions, { id: saved.id, title: saved.title, person: saved.recipient_name, date: saved.event_date.slice(0, 10), reminder: saved.reminder }]); setForm({ title: "Ad günü", person: "", date: "", reminder: "3 gün əvvəl" });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tarix yadda saxlanmadı."); }
  };
  const remove = async (occasion: Occasion) => {
    setMessage("");
    if (user) { try { await api<void>(`/occasions/${occasion.id}`, { method: "DELETE", token }); } catch (error) { setMessage(error instanceof Error ? error.message : "Tarix silinmədi."); return; } }
    setOccasions(occasions.filter((item) => item.id !== occasion.id));
  };
  return <section className="planner-page"><div className="planner-intro"><p className="eyebrow">ÖZƏL GÜNLƏR</p><h1>Heç bir tarixi<br/><em>unutma.</em></h1><p>{user ? "Planların hesabına bağlı saxlanılır. E-poçt və ya SMS xatırlatmaları hələ konfiqurasiya edilməyib." : "Qonaq rejimində planlar yalnız bu brauzerdə saxlanır. Hesabınla daxil olduqda onlar hesabında qorunur."}</p></div><div className="planner-layout"><form className="occasion-form" onSubmit={submit}><h2>Yeni tarix əlavə et</h2><label>Hadisə<select value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}>{["Ad günü", "İldönümü", "Sevgililər günü", "Analar günü", "Müəllimlər günü", "Özəl tarix"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Alıcı<input required value={form.person} onChange={(event) => setForm({ ...form, person: event.target.value })} placeholder="Məsələn: Aysel"/></label><label>Tarix<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/></label><label>Xatırlatma<select value={form.reminder} onChange={(event) => setForm({ ...form, reminder: event.target.value })}><option>7 gün əvvəl</option><option>3 gün əvvəl</option><option>1 gün əvvəl</option><option>Yalnız həmin gün</option></select></label><button className="primary">Tarixi yadda saxla <CalendarDays size={17}/></button>{message && <p className="planner-message" role="alert">{message}</p>}</form><div className="occasion-list"><div className="list-title"><div><p className="eyebrow">QARŞIDAN GƏLƏN</p><h2>Planların</h2></div><span>{occasions.length} tarix</span></div>{occasions.length ? [...occasions].sort((a, b) => a.date.localeCompare(b.date)).map((occasion) => <article key={occasion.id}><div className="date-pill"><b>{new Date(`${occasion.date}T00:00:00`).getDate()}</b><span>{azMonth(occasion.date)}</span></div><div><h3>{occasion.title}</h3><p>{occasion.person} · {occasion.reminder}</p></div><button onClick={() => remove(occasion)} aria-label="Tarixi sil"><Trash2 size={17}/></button></article>) : <div className="planner-empty"><CalendarDays size={29}/><h3>Hələ plan yoxdur</h3><p>Önəmli bir tarixi əlavə et, vaxtında seçim etməyi unutma.</p><button className="quiet-button" onClick={() => go("catalog")}>Güllərə bax</button></div>}</div></div></section>;
}

function Favorites({ favorites, change, toggleFavorite, go }: { favorites: number[]; change: (flower: Flower, delta: number) => void; toggleFavorite: (id: number) => void; go: (view: View) => void }) {
  const selected = flowers.filter((flower) => favorites.includes(flower.id)); return <section className="favorites-page"><p className="eyebrow">SEVİMLİ GÜLLƏRİN</p><h1>Saxladığın<br/><em>seçimlər.</em></h1>{selected.length ? <div className="product-grid favorite-grid">{selected.map((flower) => <FlowerCard key={flower.id} flower={flower} quantity={0} favorite change={change} toggleFavorite={toggleFavorite}/>)}</div> : <div className="empty-state large"><Heart size={30}/><h2>Hələ sevimli gülün yoxdur</h2><p>Kataloqda ürək işarəsi ilə gülləri saxla.</p><button className="primary" onClick={() => go("catalog")}>Kataloqa keç <ArrowRight size={17}/></button></div>}</section>;
}

function LoyaltyPage({ user, openAuth }: { user: User | null; openAuth: () => void }) {
  const [loyalty, setLoyalty] = useState<Loyalty | null>(null); const [state, setState] = useState<"loading" | "ready" | "error">(user ? "loading" : "ready");
  useEffect(() => {
    if (!user) { setLoyalty(null); setState("ready"); return; }
    api<Loyalty>("/loyalty/me", { token: localStorage.getItem("token") || undefined })
      .then((result) => { setLoyalty(result); setState("ready"); })
      .catch(() => setState("error"));
  }, [user]);
  const levels = [{ name: "SILVER", amount: "Qeydiyyatdan sonra", discount: "2%" }, { name: "GOLD", amount: "300 AZN-dən çox", discount: "5%" }, { name: "PLATINUM", amount: "650 AZN-dən çox", discount: "10%" }, { name: "DIAMOND", amount: "1000 AZN-dən çox", discount: "15%" }];
  return <section className="loyalty-page"><div className="loyalty-hero"><div><p className="eyebrow">FLORÈ STATUS</p><h1>Seçiminə dəyər<br/><em>qatan status.</em></h1><p>Endirim yalnız gül seçimlərinə tətbiq edilir; çatdırılma haqqına şamil edilmir.</p>{!user && <button className="primary" onClick={openAuth}>Statusunu aktiv et <ArrowRight size={17}/></button>}</div><aside className="loyalty-card">{state === "loading" ? <p>Hesab məlumatları yüklənir…</p> : state === "error" ? <><p className="eyebrow">MƏLUMAT ƏLÇATMAZDIR</p><h2>Statusu göstərmək üçün serverə qoşulmaq lazımdır.</h2></> : user && loyalty ? <><p className="eyebrow">AKTİV STATUS</p><h2>{loyalty.level}</h2><b>{loyalty.discount_percent}% endirim</b><p>{loyalty.next_level && loyalty.amount_to_next_minor !== null ? `${loyalty.next_level} üçün daha ${minorPrice(loyalty.amount_to_next_minor)} tamamlanmış seçim lazımdır.` : "Ən yüksək statusdasınız."}</p></> : <><p className="eyebrow">QONAQ REJİMİ</p><h2>Hesabınla daha yaxın.</h2><p>Qeydiyyatdan sonra SILVER statusu və 2% endirim aktivləşir.</p></>}</aside></div><div className="status-grid">{levels.map((level) => <article className={loyalty?.level === level.name ? "active" : ""} key={level.name}><span>{level.name}</span><b>{level.discount}</b><p>{level.amount}</p></article>)}</div>{user && loyalty?.history.length ? <section className="loyalty-history"><p className="eyebrow">STATUS TARİXÇƏSİ</p><h2>Hesab hərəkətləri</h2>{loyalty.history.map((event, index) => <div key={`${event.created_at}-${index}`}><span>{event.previous_level || "Yeni hesab"} <ArrowRight size={13}/> {event.new_level}</span><p>{event.reason}</p></div>)}</section> : null}</section>;
}

function Checkout({ cart, change, go, user, complete }: { cart: CartItem[]; total: number; change: (flower: Flower, delta: number) => void; go: (view: View) => void; user: User | null; complete: (order: Order) => void }) {
  const [note, setNote] = useState(""); const [cardStyle, setCardStyle] = useState("rose");
  const [zone, setZone] = useState<DeliveryZone>(""); const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "error">("idle"); const [message, setMessage] = useState(""); const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token") || undefined;

  useEffect(() => {
    if (!zone || !cart.length) { setQuote(null); setQuoteState("idle"); return; }
    let cancelled = false;
    setQuoteState("loading"); setMessage("");
    api<Quote>("/pricing/quote", { method: "POST", token, body: { delivery_zone: zone, items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })) } })
      .then((next) => { if (!cancelled) { setQuote(next); setQuoteState("idle"); } })
      .catch((error) => { if (!cancelled) { setQuote(null); setQuoteState("error"); setMessage(error instanceof Error ? error.message : "Qiymət hesablana bilmədi."); } });
    return () => { cancelled = true; };
  }, [cart, zone, token]);

  if (!cart.length) return <section className="empty-page"><ShoppingBag size={31}/><h1>Səbətiniz boşdur.</h1><p>Əvvəlcə kompozisiyanız üçün gülləri seçin.</p><button className="primary" onClick={() => go("catalog")}>Gülləri kəşf et <ArrowRight size={17}/></button></section>;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quote || !zone) { setMessage("Çatdırılma ərazisini seçin və qiymətin hesablanmasını gözləyin."); return; }
    const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    setSubmitting(true); setMessage("");
    try {
      const order = await api<Order>("/orders/request", { method: "POST", token, body: { contact_name: values.contact_name, phone: values.phone, recipient_name: values.recipient_name, address: values.address, delivery_zone: zone, note, card_style: cardStyle, items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })) } });
      complete(order); go("home");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Sorğu qeydə alınmadı."); } finally { setSubmitting(false); }
  };
  return <section className="checkout-page"><div className="checkout-title"><p className="eyebrow">SİFARİŞ SORĞUSU</p><h1>Son<br/><em>toxunuşlar.</em></h1><p className="checkout-lede">Məbləğ serverdə yenidən hesablanır. Ödəniş və çatdırılma avtomatik başladılmır.</p></div><form onSubmit={submit} className="checkout-grid"><div className="checkout-fields"><section><h2>1. Əlaqə məlumatları</h2><div className="two-input"><label>Ad, soyad<input name="contact_name" required minLength={2} placeholder="Adınız"/></label><label>Telefon<input name="phone" required type="tel" minLength={5} placeholder="+994 50 000 00 00"/></label></div></section><section><h2>2. Çatdırılma</h2><label>Alıcının adı<input name="recipient_name" required minLength={2} placeholder="Alıcının adı"/></label><label>Ünvan<input name="address" required minLength={5} placeholder="Rayon, küçə, bina və mənzil"/></label><label>Çatdırılma ərazisi<select value={zone} onChange={(event) => setZone(event.target.value as DeliveryZone)} required><option value="">Ərazini seçin</option><option value="central">Mərkəzi Bakı rayonları</option><option value="outer">Bakı ətrafı, Abşeron, Sumqayıt, Xırdalan</option></select></label><div className="delivery-unavailable"><CalendarDays size={18}/><span><b>Vaxt aralığı aktiv deyil.</b> Seçilmiş tarix və saat funksiyası biznes tərəfdən təsdiqlənməyib.</span></div></section><section><h2>3. Təbrik kartı</h2><div className="card-styles">{["rose", "ivory", "night"].map((style) => <button className={cardStyle === style ? `note-card ${style} selected` : `note-card ${style}`} type="button" key={style} onClick={() => setCardStyle(style)} aria-label="Kart dizaynını seç">Florè</button>)}</div><label>Mesajın<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={180} placeholder="Qısa bir təbrik yazın"/></label></section></div><aside className="order-summary"><p className="eyebrow">SİFARİŞ XÜLASƏSİ</p>{cart.map((item) => <div className="summary-item" key={item.id}><img src={item.image} alt={item.name}/><span><b>{item.name}</b><small>{price(item.price)} / ədəd</small></span><div className="summary-counter"><button type="button" onClick={() => change(item, -1)} aria-label={`${item.name} sayını azalt`}><Minus size={13}/></button><b>{item.quantity}</b><button type="button" onClick={() => change(item, 1)} aria-label={`${item.name} sayını artır`}><Plus size={13}/></button></div><strong>{price(item.price * item.quantity)}</strong></div>)}<div className="price-breakdown"><span><i>Aralıq cəm</i><b>{quote ? minorPrice(quote.subtotal_minor) : "—"}</b></span><span><i>Çatdırılma</i><b>{quote ? minorPrice(quote.delivery_minor) : "Ərazi seçin"}</b></span>{quote?.discount_minor ? <span className="discount-line"><i>{quote.loyalty_label} endirimi ({quote.discount_percent}%)</i><b>−{minorPrice(quote.discount_minor)}</b></span> : null}</div><div className="summary-total"><span>Yekun</span><b>{quote ? minorPrice(quote.total_minor) : "—"}</b></div>{quoteState === "loading" && <p className="summary-note">Server məbləği hesablayır…</p>}{message && <p className="summary-error" role="alert">{message}</p>}<fieldset><legend>Ödəniş</legend><label><input type="radio" name="payment" defaultChecked/> Çatdırılmada nağd / kartla</label><p>Onlayn ödəniş hələ aktiv deyil.</p></fieldset><button className="primary" disabled={!quote || quoteState === "loading" || submitting}>{submitting ? "Sorğu göndərilir…" : <>Sorğunu təsdiqlə <ArrowRight size={17}/></>}</button><small>{user ? "Status endirimi yalnız serverdə təsdiqlənmiş hesaba tətbiq edilir." : "Qeydiyyatdan sonra SILVER statusu ilə 2% endirim aktiv olur."}</small></aside></form></section>;
}

function Cart({ drawer, close, cart, total, change, go }: { drawer: boolean; close: () => void; cart: CartItem[]; total: number; change: (flower: Flower, delta: number) => void; go: (view: View) => void }) {
  return <><button className={drawer ? "cart-overlay open" : "cart-overlay"} onClick={close} aria-label="Səbəti bağla"/><aside className={drawer ? "cart-drawer open" : "cart-drawer"} aria-label="Səbət"><button className="drawer-close" onClick={close} aria-label="Səbəti bağla"><X/></button><p className="eyebrow">SƏBƏTİN</p><h2>Seçimin</h2>{cart.length ? <><div className="drawer-list">{cart.map((item) => <article key={item.id}><img src={item.image} alt={item.name}/><div><h3>{item.name}</h3><p>{price(item.price)} / ədəd</p><div className="mini-counter"><button onClick={() => change(item, -1)}><Minus size={13}/></button><b>{item.quantity}</b><button onClick={() => change(item, 1)}><Plus size={13}/></button></div></div><strong>{price(item.price * item.quantity)}</strong></article>)}</div><div className="drawer-total"><span>Cəmi</span><b>{price(total)}</b></div><button className="primary full" onClick={() => { close(); go("checkout"); }}>Sifarişi tamamla <ArrowRight size={17}/></button></> : <div className="drawer-empty"><ShoppingBag size={28}/><p>Səbətiniz hələ boşdur.</p></div>}</aside></>;
}

function About({ go }: { go: (view: View) => void }) { return <section className="about-page"><div className="about-collage"><img src={flowers[6].image} alt="Yasəmən"/><img src={flowers[3].image} alt="Eustoma"/><img src={flowers[13].image} alt="Orxideya"/></div><div className="about-copy"><p className="eyebrow">FLORÈ HAQQINDA</p><h1>Gülü hədiyyəyə<br/><em>çevirən seçim.</em></h1><p>Florè-də hazır kompozisiyalara məcbur deyilsiniz. Siz gülləri, miqdarları və sözləri seçirsiniz; hədiyyənin dili sizdən gəlir.</p><button className="inline-link" onClick={() => go("planner")}>Özəl günü planla <ArrowRight size={17}/></button></div></section>; }

function Footer({ go }: { go: (view: View) => void }) { return <footer><div><button className="footer-brand" onClick={() => go("home")}>Florè</button><p>Fərdi seçimin sadə, zərif yolu.</p></div><div><p className="footer-label">KƏŞF ET</p><button onClick={() => go("catalog")}>Güllər</button><button onClick={() => go("assistant")}>Florè Assistant</button><button onClick={() => go("planner")}>Özəl günlər</button></div><div><p className="footer-label">MƏLUMAT</p><p>Çatdırılma və onlayn ödəniş biznes konfiqurasiyası aktivləşdirildikdə göstəriləcək.</p></div><small>© {new Date().getFullYear()} Florè · Məxfilik və istifadə şərtləri konfiqurasiya mərhələsindədir.</small></footer>; }
