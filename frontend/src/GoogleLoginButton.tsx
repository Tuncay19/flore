import { useEffect, useRef } from "react";
import { api, type TokenOut } from "./api";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

declare global {
  interface Window {
    google?: any;
  }
}

// Google-un skriptini yalnız lazım olanda yükləyir (index.html-ə toxunmaq lazım deyil)
function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const src = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

type Props = { onSuccess: (t: TokenOut) => void; onError: (msg: string) => void };

export default function GoogleLoginButton({ onSuccess, onError }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSuccess, onError });
  callbacks.current = { onSuccess, onError };

  useEffect(() => {
    if (!CLIENT_ID) {
      callbacks.current.onError("VITE_GOOGLE_CLIENT_ID təyin olunmayıb (frontend/.env faylına bax)");
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          // İstifadəçi Google hesabını seçəndə bu funksiya işləyir
          callback: async (response: { credential: string }) => {
            try {
              const t = await api<TokenOut>("/auth/google", {
                method: "POST",
                body: { credential: response.credential },
              });
              callbacks.current.onSuccess(t);
            } catch (err) {
              callbacks.current.onError(err instanceof Error ? err.message : "Google ilə giriş alınmadı");
            }
          },
        });

        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 320,
        });
      })
      .catch(() => callbacks.current.onError("Google skripti yüklənmədi (internet bağlantısını yoxla)"));

    return () => {
      cancelled = true;
    };
  }, []);

  return <div className="google-slot" ref={buttonRef} />;
}
