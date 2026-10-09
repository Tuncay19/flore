import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Heart, Menu, Minus, Plus, ShoppingBag, Truck, X } from "lucide-react";
import { products, type Product } from "./data";

type CartItem = Product & { quantity: number };
type AuthMode = "login" | "register" | null;
const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing ? current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} səbətə əlavə edildi.`);
    window.setTimeout(() => setNotice(""), 2600);
  }
  function updateQuantity(id: number, delta: number) {
    setCart((items) => items.flatMap((item) => item.id !== id ? [item] : item.quantity + delta > 0 ? [{ ...item, quantity: item.quantity + delta }] : []));
  }
  const navigate = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return <main>
    <div className="shipping"><Truck size={16} /> Bakı daxilində 50 ₼-dən yuxarı sifarişlərə çatdırılma pulsuzdur</div>
    <header className="header">
      <button className="mobile-menu" aria-label="Menyu" onClick={() => setMenuOpen(!menuOpen)}><Menu /></button>
      <a className="logo" href="#hero">flor<span>é</span></a>
      <nav className={menuOpen ? "nav open" : "nav"}>
        <button onClick={() => navigate("products")}>Kolleksiya</button>
        <button onClick={() => navigate("story")}>Haqqımızda</button>
        <button onClick={() => navigate("contact")}>Əlaqə</button>
      </nav>
      <div className="header-actions">
        <button className="login" onClick={() => setAuthMode("login")}>Daxil ol</button>
        <button className="bag" onClick={() => setCartOpen(true)} aria-label="Səbət"><ShoppingBag size={21}/><b>{itemCount}</b></button>
      </div>
    </header>

    <section id="hero" className="hero">
      <div className="hero-copy">
        <p className="eyebrow">TƏZƏ GÜLLƏR · BAKI</p>
        <h1>Hissləriniz<br/><em>çiçək açsın.</em></h1>
        <p className="hero-text">Ən gözəl anları zərif, əl ilə hazırlanmış gül kompozisiyaları ilə yadda saxlayın.</p>
        <button className="primary" onClick={() => navigate("products")}>Buketi kəşf et <ArrowRight size={18}/></button>
      </div>
      <div className="hero-art" aria-label="Çəhrayı çiçəklərdən ibarət dekorativ kompozisiya">
        <div className="sun"></div><div className="flower flower-one">✽</div><div className="flower flower-two">✿</div><div className="flower flower-three">✽</div><div className="vase">❀</div>
        <span className="scribble">sevgi ilə<br/>hazırlandı</span>
      </div>
    </section>

    <section className="benefits"><div><span>01</span><b>Hər gün təzə</b><p>Güllərimiz səhər seçilir.</p></div><div><span>02</span><b>Sevgi ilə hazırlanır</b><p>Hər buket xüsusi hazırlanır.</p></div><div><span>03</span><b>Sürətli çatdırılma</b><p>Bakıda eyni gün çatdırılma.</p></div></section>

    <section id="products" className="products section">
      <div className="section-heading"><div><p className="eyebrow">SEÇİLMİŞLƏR</p><h2>Bu günün <em>favoritləri</em></h2></div><button className="text-button">Bütün kolleksiya <ArrowRight size={17}/></button></div>
      <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} addToCart={addToCart}/>)}</div>
    </section>

    <section id="story" className="story section"><div className="story-image"><span>✿</span></div><div className="story-copy"><p className="eyebrow">BİZİM HEKAYƏMİZ</p><h2>Gözəllik kiçik<br/><em>detallardadır.</em></h2><p>floré hər buketin bir hekayə danışdığına inanır. Yerli çiçəkçilərlə çalışır, hər sifarişi diqqət və qayğı ilə hazırlayırıq.</p><button className="text-button">Daha çox öyrən <ArrowRight size={17}/></button></div></section>

    <section id="contact" className="newsletter"><div><p className="eyebrow">FLORÉ-DƏN MƏKTUBLAR</p><h2>Bir az çiçək,<br/>bir az <em>ilham.</em></h2></div><form onSubmit={(e) => { e.preventDefault(); setNotice("Abunəliyiniz qeydə alındı. Təşəkkürlər!"); }}><label htmlFor="email">E-poçt ünvanınız</label><div><input id="email" type="email" placeholder="adiniz@email.com" required/><button aria-label="Abunə ol"><ArrowRight/></button></div></form></section>
    <footer><a className="logo" href="#hero">flor<span>é</span></a><p>© 2026 floré. Sevgi ilə Bakıdan.</p><div><a href="#">Instagram</a><a href="#">TikTok</a></div></footer>

    {notice && <div className="toast"><Check size={18}/>{notice}</div>}
    <Cart open={cartOpen} close={() => setCartOpen(false)} cart={cart} total={total} updateQuantity={updateQuantity}/>
    {authMode && <AuthModal mode={authMode} close={() => setAuthMode(null)} switchMode={() => setAuthMode(authMode === "login" ? "register" : "login")} />}
  </main>;
}

function ProductCard({ product, addToCart }: { product: Product; addToCart: (p: Product) => void }) { return <article className="product-card"><div className="product-image" style={{ backgroundColor: product.color }}><button aria-label="Seçilmişlərə əlavə et"><Heart size={18}/></button><span>{product.emoji}</span></div><div className="product-info"><div><p>{product.kind}</p><h3>{product.name}</h3></div><b>{product.price} ₼</b></div><button className="add" onClick={() => addToCart(product)}>Səbətə əlavə et <Plus size={17}/></button></article>; }

function Cart({ open, close, cart, total, updateQuantity }: { open: boolean; close: () => void; cart: CartItem[]; total: number; updateQuantity: (id: number, n: number) => void }) { return <><div className={open ? "overlay visible" : "overlay"} onClick={close}/><aside className={open ? "cart open" : "cart"}><div className="panel-header"><h2>Səbətiniz <small>({cart.length})</small></h2><button onClick={close} aria-label="Bağla"><X/></button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><div className="mini-product" style={{backgroundColor: item.color}}>{item.emoji}</div><div><h3>{item.name}</h3><p>{item.price} ₼</p><div className="counter"><button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button></div></div><b>{item.price * item.quantity} ₼</b></div>)}</div><div className="cart-footer"><p><span>Cəmi</span><strong>{total} ₼</strong></p><button className="primary">Sifarişi rəsmiləşdir <ArrowRight size={18}/></button></div></> : <div className="empty"><ShoppingBag size={34}/><h3>Səbətiniz boşdur</h3><p>Ən gözəl güllər sizi gözləyir.</p><button className="text-button" onClick={close}>Alış-verişə başla</button></div>}</aside></>; }

function AuthModal({ mode, close, switchMode }: { mode: Exclude<AuthMode, null>; close: () => void; switchMode: () => void }) { const [message, setMessage] = useState(""); async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = mode === "login" ? { email: form.get("email"), password: form.get("password") } : { full_name: form.get("name"), email: form.get("email"), phone: form.get("phone") || null, password: form.get("password") }; try { const response = await fetch(`${API_URL}/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new Error(result.detail || "Xəta baş verdi"); localStorage.setItem("flore_token", result.access_token); setMessage("Uğurla davam etdiniz!"); window.setTimeout(close, 900); } catch (error) { setMessage(error instanceof Error ? error.message : "Xəta baş verdi"); } } return <div className="modal-wrap"><div className="modal"><button className="close-modal" onClick={close}><X/></button><p className="eyebrow">FLORÉ-YƏ XOŞ GƏLMİSİNİZ</p><h2>{mode === "login" ? "Yenidən salam!" : "Hesab yaradın"}</h2><form className="auth-form" onSubmit={submit}>{mode === "register" && <><label>Ad, soyad<input name="name" minLength={2} required placeholder="Adınız Soyadınız"/></label><label>Telefon<input name="phone" placeholder="+994 50 000 00 00"/></label></>}<label>E-poçt<input name="email" type="email" required placeholder="adiniz@email.com"/></label><label>Parol<input name="password" type="password" minLength={8} required placeholder="Minimum 8 simvol"/></label>{message && <p className="form-message">{message}</p>}<button className="primary" type="submit">{mode === "login" ? "Daxil ol" : "Qeydiyyatdan keç"}<ArrowRight size={18}/></button></form><p className="switch-auth">{mode === "login" ? "Hesabınız yoxdur?" : "Artıq hesabınız var?"}<button onClick={switchMode}>{mode === "login" ? "Qeydiyyatdan keçin" : "Daxil olun"}</button></p></div></div>; }
