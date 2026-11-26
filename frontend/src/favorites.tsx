import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import { useAuth } from "./Auth";
import { errorMessage, useLang } from "./i18n";
import { useToast } from "./toast";

type FavState = {
  ids: Set<number>;
  loading: boolean;
  isFav: (id: number) => boolean;
  toggle: (id: number) => Promise<void>;
};

const FavCtx = createContext<FavState | null>(null);

export function useFavorites(): FavState {
  const ctx = useContext(FavCtx);
  if (!ctx) throw new Error("FavoritesProvider tapılmadı (main.tsx-ə bax)");
  return ctx;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { token, openAuth, logout } = useAuth();
  const { t } = useLang();
  const toast = useToast();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Daxil olanda sevimliləri serverdən yüklə, çıxanda təmizlə
  useEffect(() => {
    if (!token) {
      setIds(new Set());
      return;
    }
    let off = false;
    setLoading(true);
    api<{ id: number }[]>("/favorites", { token })
      .then((list) => { if (!off) setIds(new Set(list.map((p) => p.id))); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [token]);

  const toggle = useCallback(
    async (id: number) => {
      if (!token) {
        openAuth(t("fav.loginHint"));
        return;
      }
      const had = ids.has(id);
      // Dərhal göstəririk (optimistic), xəta olsa geri qaytarırıq
      setIds((prev) => {
        const next = new Set(prev);
        if (had) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        await api(`/favorites/${id}`, { method: had ? "DELETE" : "POST", token });
      } catch (err) {
        setIds((prev) => {
          const next = new Set(prev);
          if (had) next.add(id);
          else next.delete(id);
          return next;
        });
        if (err instanceof ApiError && err.status === 401) {
          logout();
          openAuth(t("err.session"));
        } else {
          toast(errorMessage(err, t));
        }
      }
    },
    [token, ids, openAuth, logout, t, toast],
  );

  const value = useMemo<FavState>(
    () => ({ ids, loading, isFav: (id: number) => ids.has(id), toggle }),
    [ids, loading, toggle],
  );
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}
