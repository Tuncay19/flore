import { FormEvent, useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, type TokenOut, type User } from "./api";
import GoogleLoginButton from "./GoogleLoginButton";

// Giriş vəziyyətini saxlayır: səhifə yenilənəndə də token ilə istifadəçini bərpa edir
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    api<User>("/auth/me", { token })
      .then(setUser)
      .catch(() => localStorage.removeItem("token"));
  }, []);

  const setSession = useCallback((t: TokenOut) => {
    localStorage.setItem("token", t.access_token);
    setUser(t.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return { user, setSession, logout };
}

type Props = { open: boolean; close: () => void; onSession: (t: TokenOut) => void };

export function AuthModal({ open, close, onSession }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!data.phone) delete data.phone;
    setBusy(true);
    setMsg("");
    try {
      const t = await api<TokenOut>(tab === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: data,
      });
      form.reset();
      onSession(t);
      close();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Xəta baş verdi");
    } finally {
      setBusy(false);
    }
  }

  function switchTab(next: "login" | "register") {
    setTab(next);
    setMsg("");
  }

  return (
    <>
      <div className="overlay open" onClick={close} />
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Giriş və qeydiyyat">
        <button className="close" onClick={close} aria-label="Bağla"><X /></button>
        <p className="auth-eyebrow">HESAB</p>
        <div className="auth-tabs">
          <button className={tab === "login" ? "active" : ""} onClick={() => switchTab("login")}>Giriş</button>
          <button className={tab === "register" ? "active" : ""} onClick={() => switchTab("register")}>Qeydiyyat</button>
        </div>

        <form key={tab} onSubmit={submit}>
          {tab === "register" && <label>Ad, soyad<input name="full_name" required minLength={2} /></label>}
          <label>E-poçt<input name="email" type="email" required /></label>
          {tab === "register" && <label>Telefon (ixtiyari)<input name="phone" type="tel" /></label>}
          <label>Parol<input name="password" type="password" required minLength={tab === "register" ? 8 : 1} /></label>
          <button className="primary" disabled={busy}>{tab === "login" ? "Daxil ol" : "Qeydiyyatdan keç"}</button>
        </form>

        {msg && <p className="auth-msg">{msg}</p>}

        <div className="auth-or"><span>və ya</span></div>
        <GoogleLoginButton onSuccess={(t) => { onSession(t); close(); }} onError={setMsg} />
      </div>
    </>
  );
}
