import { useEffect, useRef } from "react";
import { api, type TokenOut } from "./api";
import { errorMessage, useLang } from "./i18n";

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

export default function GoogleButton({ onSuccess, onError }: Props) {
  const { t } = useLang();
  const slot = useRef<HTMLDivElement>(null);
  // Ən son callback-ləri və tərcüməni saxlayırıq ki, dil dəyişəndə də düzgün işləsin
  const latest = useRef({ onSuccess, onError, t });
  latest.current = { onSuccess, onError, t };

  useEffect(() => {
    if (!CLIENT_ID) {
      latest.current.onError(latest.current.t("google.noClientId"));
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !slot.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          // İstifadəçi Google hesabını seçəndə bu funksiya işləyir
          callback: async (response: { credential: string }) => {
            try {
              const data = await api<TokenOut>("/auth/google", {
                method: "POST",
                body: { credential: response.credential },
              });
              latest.current.onSuccess(data);
            } catch (err) {
              latest.current.onError(errorMessage(err, latest.current.t));
            }
          },
        });

        window.google.accounts.id.renderButton(slot.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 320,
        });
      })
      .catch(() => latest.current.onError(latest.current.t("google.loadFailed")));

    return () => {
      cancelled = true;
    };
  }, []);

  return <div className="google-slot" ref={slot} />;
}
