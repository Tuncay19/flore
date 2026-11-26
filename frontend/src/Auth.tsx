import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type FormEvent, type ReactNode,
} from "react";
import { X } from "lucide-react";
import { api, ApiError, type TokenOut, type User } from "./api";
import { errorMessage, useLang } from "./i18n";
import GoogleButton from "./GoogleButton";

type AuthState = {
  user: User | null;
  token: string | null;
  setSession: (t: TokenOut) => void;
  logout: () => void;
  openAuth: (reason?: string) => void;
};

const AuthCtx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("AuthProvider tapılmadı (main.tsx-ə bax)");
  return ctx;
}

function readToken(): string | null {
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readToken);
  const [user, setUser] = useState<User | null>(null);
  const [modal, setModal] = useState({ open: false, reason: "" });

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
  }, []);

  // Token dəyişəndə istifadəçini yükləyir (səhifə yenilənəndə giriş qalır)
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    let off = false;
    api<User>("/auth/me", { token })
      .then((u) => { if (!off) setUser(u); })
      .catch((e) => { if (e instanceof ApiError && e.status === 401) logout(); });
    return () => { off = true; };
  }, [token, logout]);

  const setSession = useCallback((t: TokenOut) => {
    try {
      localStorage.setItem("token", t.access_token);
    } catch {
      /* ignore */
    }
    setToken(t.access_token);
    setUser(t.user);
  }, []);

  const openAuth = useCallback((reason = "") => setModal({ open: true, reason }), []);
  const closeAuth = useCallback(() => setModal({ open: false, reason: "" }), []);

  const value = useMemo<AuthState>(
    () => ({ user, token, setSession, logout, openAuth }),
    [user, token, setSession, logout, openAuth],
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <AuthModal open={modal.open} reason={modal.reason} close={closeAuth} onSession={setSession} />
    </AuthCtx.Provider>
  );
}

type ModalProps = {
  open: boolean;
  reason: string;
  close: () => void;
  onSession: (t: TokenOut) => void;
};

function AuthModal({ open, reason, close, onSession }: ModalProps) {
  const { t } = useLang();
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
      const res = await api<TokenOut>(tab === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: data,
      });
      form.reset();
      onSession(res);
      close();
    } catch (err) {
      setMsg(errorMessage(err, t));
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
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label={t("auth.dialog")}>
        <button className="close" onClick={close} aria-label={t("auth.close")}><X /></button>
        <p className="auth-eyebrow">{t("auth.eyebrow")}</p>
        {reason && <p className="auth-reason">{reason}</p>}
        <div className="auth-tabs">
          <button className={tab === "login" ? "active" : ""} onClick={() => switchTab("login")}>{t("auth.tabLogin")}</button>
          <button className={tab === "register" ? "active" : ""} onClick={() => switchTab("register")}>{t("auth.tabRegister")}</button>
        </div>

        <form key={tab} onSubmit={submit}>
          {tab === "register" && (
            <label>{t("auth.fullName")}<input name="full_name" required minLength={2} /></label>
          )}
          <label>{t("auth.email")}<input name="email" type="email" required /></label>
          {tab === "register" && (
            <label>{t("auth.phoneOptional")}<input name="phone" type="tel" /></label>
          )}
          <label>
            {tab === "register" ? t("auth.passwordRegister") : t("auth.password")}
            <input name="password" type="password" required minLength={tab === "register" ? 8 : 1} />
          </label>
          <button className="primary" disabled={busy}>
            {tab === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}
          </button>
        </form>

        {msg && <p className="auth-msg">{msg}</p>}

        <div className="auth-or"><span>{t("auth.or")}</span></div>
        <GoogleButton onSuccess={(res) => { onSession(res); close(); }} onError={setMsg} />
      </div>
    </>
  );
}
