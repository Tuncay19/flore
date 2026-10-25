import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronRight, Heart, Menu, MessageCircle, Minus, Plus, Search, ShoppingBag, Sparkles, Trash2, X } from "lucide-react";
import { flowers, moods, type Flower, type Mood } from "./data";
import { AuthModal, useAuth } from "./Auth";
import "./auth.css";

type View = "home" | "catalog" | "assistant" | "planner" | "favorites" | "about" | "checkout";
type CartItem = Flower & { quantity: number };
type Occasion = { id: number; title: string; person: string; date: string; reminder: string };
type ChatMessage = { from: "assistant" | "user"; text: string };

const price = (value: number) => `${value} AZN`;
const storage = <T,>(key: string, fallback: T): T => {
  try { const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) as T : fallback; } catch { return fallback; }
};
const validViews: View[] = ["home", "catalog", "assistant", "planner", "favorites", "about", "checkout"];

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
    return items.flatMap((item) => item.id !== flower.id ? [item] : item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []);
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
      {view === "planner" && <Planner occasions={occasions} setOccasions={setOccasions} go={go} />}
      {view === "favorites" && <Favorites favorites={favorites} change={change} toggleFavorite={toggleFavorite} go={go} />}
      {view === "about" && <About go={go} />}
      {view === "checkout" && <Checkout cart={cart} total={total} change={change} go={go} complete={() => { setCart([]); notify("Sifariş sorğunuz qeydə alındı."); }} />}
    </main>
    <Cart drawer={drawer} close={() => setDrawer(false)} cart={cart} total={total} change={change} go={go} />
    <AuthModal open={authOpen} close={() => setAuthOpen(false)} onSession={setSession} />
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
    <Footer go={go} />
  </div>;
}

function Header({ view, go, count, menu, setMenu, openCart, userName, openAuth, logout }: { view: View; go: (view: View) => void; count: number; menu: boolean; setMenu: (value: boolean) => void; openCart: () => void; userName?: string; openAuth: () => void; logout: () => void }) {
  const links: { label: string; value: View }[] = [{ label: "Güllər", value: "catalog" }, { label: "Florè Assistant", value: "assistant" }, { label: "Planlayıcı", value: "planner" }, { label: "Haqqımızda", value: "about" }];
  return <header className="site-header"><button className="brand" onClick={() => go("home")} aria-label="Florè ana səhifə">Florè</button><nav className="desktop-nav">{links.map((link) => <button className={view === link.value ? "active" : ""} key={link.value} onClick={() => go(link.value)}>{link.label}</button>)}</nav><div className="header-actions">{userName ? <button className="account-action" onClick={logout} title="Hesabdan çıx">{userName.split(" ")[0]} · Çıxış</button> : <button className="account-action" onClick={openAuth}>Daxil ol</button>}<button className="text-action" onClick={() => go("favorites")} aria-label="Sevimlilər"><Heart size={18} /><span>Sevimlilər</span></button><button className="bag-button" onClick={openCart} aria-label="Səbəti aç"><ShoppingBag size={19} /><b>{count}</b></button><button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Menyunu aç">{menu ? <X /> : <Menu />}</button></div><nav className={menu ? "mobile-nav open" : "mobile-nav"}>{links.map((link) => <button key={link.value} onClick={() => go(link.value)}>{link.label}<ChevronRight size={18} /></button>)}<button onClick={() => go("favorites")}>Sevimli güllərin<Heart size={18} /></button></nav></header>;
}

function Home({ go }: { go: (view: View) => void }) {
  const featured = [flowers[2], flowers[7], flowers[13]];
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">BAKI · FƏRDİ GÜL SEÇİMİ</p><h1>Hədiyyə<br/><em>hiss kimi.</em></h1><p className="hero-text">Gülləri bir-bir seç, sayını özün müəyyən et. Florè seçimini sadələşdirir.</p><div className="hero-actions"><button className="primary" onClick={() => go("catalog")}>Gülləri kəşf et <ArrowRight size={18} /></button><button className="quiet-button" onClick={() => go("assistant")}><Sparkles size={17} />Köməkçi ilə seç</button></div><span className="hero-index">01 / 03</span></div><div className="hero-art"><div className="hero-wash"/><img src={flowers[2].image} alt="Açıq çəhrayı pion" fetchPriority="high"/><span className="art-caption">öz seçimin.<br/>öz hekayən.</span><div className="hero-orbit">Florè · fərdi seçim · Florè · fərdi seçim ·</div></div></section>
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
  const suggestion = useMemo(() => makeSuggestion(budget, mood || undefined), [budget, mood]); const total = suggestion.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const send = (event: FormEvent) => { event.preventDefault(); if (!message.trim()) return; const found = Number(message.match(/\d+/)?.[0]); if (found) setBudget(found); setMessages((items) => [...items, { from: "user", text: message.trim() }, { from: "assistant", text: found ? `${found} AZN üçün kataloqdan hesablanmış seçim hazırladım.` : "Büdcənizi rəqəmlə də yazsanız, dəqiq hesablayaram." }]); setMessage(""); };
  return <section className="assistant-page"><div className="assistant-intro"><p className="eyebrow">FLORÈ ASSISTANT</p><h1>Hədiyyə seçmək<br/><em>daha rahat.</em></h1><p>Bu versiya yalnız kataloq qaydaları və dəqiq qiymətlərlə işləyir. Xarici AI xidməti konfiqurasiya edilməyib.</p><div className="prompt-chips"><button onClick={() => setMessage("Anama 40 manatlıq zərif güllər seç")}>Anama 40 AZN-lik zərif seçim</button><button onClick={() => setMessage("25 AZN büdcəm var")}>25 AZN büdcəm var</button><button onClick={() => setMood("Romantik")}>Romantik seçim</button></div></div><div className="assistant-workspace"><section className="chat-panel"><div className="chat-head"><span><Sparkles size={17}/> Florè Assistant</span><small>Kataloq köməkçisi</small></div><div className="messages">{messages.map((item, index) => <p className={item.from} key={index}>{item.text}</p>)}</div><form onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Məsələn: 30 AZN-lik pastel seçim"/><button aria-label="Mesajı göndər"><ArrowRight size={18}/></button></form></section><section className="recommendation"><div className="builder-controls"><label>Büdcə <input type="number" min="4" value={budget} onChange={(event) => setBudget(Number(event.target.value) || 0)}/><span>AZN</span></label><select value={mood} onChange={(event) => setMood(event.target.value as Mood | "")} aria-label="Əhval seçin"><option value="">İstənilən əhval</option>{moods.map((item) => <option key={item}>{item}</option>)}</select></div><p className="eyebrow">SƏNİN ÜÇÜN SEÇDİK</p>{suggestion.length ? <><div className="assistant-products">{suggestion.map((item) => <div key={item.id}><img src={item.image} alt={item.name}/><span><b>{item.quantity}× {item.name}</b><small>{price(item.quantity * item.price)}</small></span></div>)}</div><div className="recommendation-total"><span>Cəmi</span><b>{price(total)}</b></div><button className="primary" onClick={() => addSelection(suggestion)}>Bu seçimi səbətə əlavə et <ArrowRight size={17}/></button></> : <div className="empty-state">Bu büdcə ilə uyğun seçim tapılmadı.</div>}<button className="quiet-button center" onClick={() => go("catalog")}>Kataloqa bax</button></section></div></section>;
}

function Planner({ occasions, setOccasions, go }: { occasions: Occasion[]; setOccasions: (items: Occasion[]) => void; go: (view: View) => void }) {
  const [form, setForm] = useState({ title: "Ad günü", person: "", date: "", reminder: "3 gün əvvəl" });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!form.person || !form.date) return; setOccasions([...occasions, { ...form, id: Date.now() }]); setForm({ title: "Ad günü", person: "", date: "", reminder: "3 gün əvvəl" }); };
  return <section className="planner-page"><div className="planner-intro"><p className="eyebrow">ÖZƏL GÜNLƏR</p><h1>Heç bir tarixi<br/><em>unutma.</em></h1><p>Qonaq rejimində planlar yalnız bu brauzerdə saxlanır. Hesab və bildiriş xidməti qoşulduqda təhlükəsiz şəkildə sinxronlaşdırıla bilər.</p></div><div className="planner-layout"><form className="occasion-form" onSubmit={submit}><h2>Yeni tarix əlavə et</h2><label>Hadisə<select value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })}>{["Ad günü", "İldönümü", "Sevgililər günü", "Analar günü", "Müəllimlər günü", "Özəl tarix"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Alıcı<input required value={form.person} onChange={(event) => setForm({ ...form, person: event.target.value })} placeholder="Məsələn: Aysel"/></label><label>Tarix<input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/></label><label>Xatırlatma<select value={form.reminder} onChange={(event) => setForm({ ...form, reminder: event.target.value })}><option>7 gün əvvəl</option><option>3 gün əvvəl</option><option>1 gün əvvəl</option><option>Yalnız həmin gün</option></select></label><button className="primary">Tarixi yadda saxla <CalendarDays size={17}/></button></form><div className="occasion-list"><div className="list-title"><div><p className="eyebrow">QARŞIDAN GƏLƏN</p><h2>Planların</h2></div><span>{occasions.length} tarix</span></div>{occasions.length ? occasions.sort((a, b) => a.date.localeCompare(b.date)).map((occasion) => <article key={occasion.id}><div className="date-pill"><b>{new Date(`${occasion.date}T00:00:00`).getDate()}</b><span>{new Intl.DateTimeFormat("az-AZ", { month: "short" }).format(new Date(`${occasion.date}T00:00:00`))}</span></div><div><h3>{occasion.title}</h3><p>{occasion.person} · {occasion.reminder}</p></div><button onClick={() => setOccasions(occasions.filter((item) => item.id !== occasion.id))} aria-label="Tarixi sil"><Trash2 size={17}/></button></article>) : <div className="planner-empty"><CalendarDays size={29}/><h3>Hələ plan yoxdur</h3><p>Önəmli bir tarixi əlavə et, vaxtında seçim etməyi unutma.</p><button className="quiet-button" onClick={() => go("catalog")}>Güllərə bax</button></div>}</div></div></section>;
}

function Favorites({ favorites, change, toggleFavorite, go }: { favorites: number[]; change: (flower: Flower, delta: number) => void; toggleFavorite: (id: number) => void; go: (view: View) => void }) {
  const selected = flowers.filter((flower) => favorites.includes(flower.id)); return <section className="favorites-page"><p className="eyebrow">SEVİMLİ GÜLLƏRİN</p><h1>Saxladığın<br/><em>seçimlər.</em></h1>{selected.length ? <div className="product-grid favorite-grid">{selected.map((flower) => <FlowerCard key={flower.id} flower={flower} quantity={0} favorite change={change} toggleFavorite={toggleFavorite}/>)}</div> : <div className="empty-state large"><Heart size={30}/><h2>Hələ sevimli gülün yoxdur</h2><p>Kataloqda ürək işarəsi ilə gülləri saxla.</p><button className="primary" onClick={() => go("catalog")}>Kataloqa keç <ArrowRight size={17}/></button></div>}</section>;
}

function Checkout({ cart, total, change, go, complete }: { cart: CartItem[]; total: number; change: (flower: Flower, delta: number) => void; go: (view: View) => void; complete: () => void }) {
  const [note, setNote] = useState(""); const [cardStyle, setCardStyle] = useState("rose");
  if (!cart.length) return <section className="empty-page"><ShoppingBag size={31}/><h1>Səbətiniz boşdur.</h1><p>Əvvəlcə kompozisiyanız üçün gülləri seçin.</p><button className="primary" onClick={() => go("catalog")}>Gülləri kəşf et <ArrowRight size={17}/></button></section>;
  const submit = (event: FormEvent) => { event.preventDefault(); complete(); go("home"); };
  return <section className="checkout-page"><div className="checkout-title"><p className="eyebrow">SİFARİŞİN RƏSMİLƏŞDİRİLMƏSİ</p><h1>Son<br/><em>toxunuşlar.</em></h1></div><form onSubmit={submit} className="checkout-grid"><div className="checkout-fields"><section><h2>1. Əlaqə məlumatları</h2><div className="two-input"><label>Ad, soyad<input required placeholder="Adınız"/></label><label>Telefon<input required type="tel" placeholder="+994 50 000 00 00"/></label></div></section><section><h2>2. Çatdırılma</h2><label>Alıcının adı<input required placeholder="Alıcının adı"/></label><label>Ünvan<input required placeholder="Çatdırılma ünvanı"/></label><div className="delivery-unavailable"><CalendarDays size={18}/><span><b>Vaxt aralığı hələ aktiv deyil.</b> Çatdırılma slotları biznes tərəfdən konfiqurasiya edilməlidir.</span></div></section><section><h2>3. Təbrik kartı</h2><div className="card-styles">{["rose", "ivory", "night"].map((style) => <button className={cardStyle === style ? `note-card ${style} selected` : `note-card ${style}`} type="button" key={style} onClick={() => setCardStyle(style)} aria-label="Kart dizaynını seç">Florè</button>)}</div><label>Mesajın<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={180} placeholder="Qısa bir təbrik yazın"/></label></section></div><aside className="order-summary"><p className="eyebrow">SİFARİŞ XÜLASƏSİ</p>{cart.map((item) => <div className="summary-item" key={item.id}><img src={item.image} alt={item.name}/><span><b>{item.name}</b><small>{price(item.price)} / ədəd</small></span><div className="summary-counter"><button type="button" onClick={() => change(item, -1)}><Minus size={13}/></button><b>{item.quantity}</b><button type="button" onClick={() => change(item, 1)}><Plus size={13}/></button></div><strong>{price(item.price * item.quantity)}</strong></div>)}<div className="summary-total"><span>Cəmi</span><b>{price(total)}</b></div><fieldset><legend>Ödəniş</legend><label><input type="radio" name="payment" defaultChecked/> Çatdırılmada nağd / kartla</label><p>Onlayn ödəniş hələ aktiv deyil.</p></fieldset><button className="primary">Sorğunu təsdiqlə <ArrowRight size={17}/></button><small>Sorğu ödəniş deyil. Əlaqə üçün məlumatlarınız yoxlanacaq.</small></aside></form></section>;
}

function Cart({ drawer, close, cart, total, change, go }: { drawer: boolean; close: () => void; cart: CartItem[]; total: number; change: (flower: Flower, delta: number) => void; go: (view: View) => void }) {
  return <><button className={drawer ? "cart-overlay open" : "cart-overlay"} onClick={close} aria-label="Səbəti bağla"/><aside className={drawer ? "cart-drawer open" : "cart-drawer"} aria-label="Səbət"><button className="drawer-close" onClick={close} aria-label="Səbəti bağla"><X/></button><p className="eyebrow">SƏBƏTİN</p><h2>Seçimin</h2>{cart.length ? <><div className="drawer-list">{cart.map((item) => <article key={item.id}><img src={item.image} alt={item.name}/><div><h3>{item.name}</h3><p>{price(item.price)} / ədəd</p><div className="mini-counter"><button onClick={() => change(item, -1)}><Minus size={13}/></button><b>{item.quantity}</b><button onClick={() => change(item, 1)}><Plus size={13}/></button></div></div><strong>{price(item.price * item.quantity)}</strong></article>)}</div><div className="drawer-total"><span>Cəmi</span><b>{price(total)}</b></div><button className="primary full" onClick={() => { close(); go("checkout"); }}>Sifarişi tamamla <ArrowRight size={17}/></button></> : <div className="drawer-empty"><ShoppingBag size={28}/><p>Səbətiniz hələ boşdur.</p></div>}</aside></>;
}

function About({ go }: { go: (view: View) => void }) { return <section className="about-page"><div className="about-collage"><img src={flowers[6].image} alt="Yasəmən"/><img src={flowers[3].image} alt="Eustoma"/><img src={flowers[13].image} alt="Orxideya"/></div><div className="about-copy"><p className="eyebrow">FLORÈ HAQQINDA</p><h1>Gülü hədiyyəyə<br/><em>çevirən seçim.</em></h1><p>Florè-də hazır kompozisiyalara məcbur deyilsiniz. Siz gülləri, miqdarları və sözləri seçirsiniz; hədiyyənin dili sizdən gəlir.</p><button className="inline-link" onClick={() => go("planner")}>Özəl günü planla <ArrowRight size={17}/></button></div></section>; }

function Footer({ go }: { go: (view: View) => void }) { return <footer><div><button className="footer-brand" onClick={() => go("home")}>Florè</button><p>Fərdi seçimin sadə, zərif yolu.</p></div><div><p className="footer-label">KƏŞF ET</p><button onClick={() => go("catalog")}>Güllər</button><button onClick={() => go("assistant")}>Florè Assistant</button><button onClick={() => go("planner")}>Özəl günlər</button></div><div><p className="footer-label">MƏLUMAT</p><p>Çatdırılma və onlayn ödəniş biznes konfiqurasiyası aktivləşdirildikdə göstəriləcək.</p></div><small>© {new Date().getFullYear()} Florè · Məxfilik və istifadə şərtləri konfiqurasiya mərhələsindədir.</small></footer>; }
