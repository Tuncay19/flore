import { useEffect, useRef } from "react";

// .env faylından oxunur (Vite üçün dəyişən adı VITE_ ilə başlamalıdır)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Google-un skriptini yalnız lazım olanda yükləyir (index.html-ə toxunmaq lazım deyil)
function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const src = "https://accounts.google.com/gsi/client";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve);
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleLoginButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      onError?.("VITE_GOOGLE_CLIENT_ID təyin olunmayıb (frontend .env faylına bax)");
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          // İstifadəçi Google hesabını seçəndə bu funksiya işləyir
          callback: async (response) => {
            try {
              const res = await fetch(`${API}/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: response.credential }),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(
                  typeof data.detail === "string" ? data.detail : "Google ilə giriş alınmadı"
                );
              }
              // data = { access_token, token_type, user }
              localStorage.setItem("token", data.access_token);
              onSuccess?.(data);
            } catch (err) {
              onError?.(err.message || "Serverə qoşulmaq olmur");
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
      .catch(() => onError?.("Google skripti yüklənmədi (internet bağlantısını yoxla)"));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={buttonRef} />;
}
