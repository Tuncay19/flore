export const API: string = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
};
export type TokenOut = { access_token: string; token_type: string; user: User };

function errorText(data: any): string {
  if (!data || !data.detail) return "Xəta baş verdi";
  // 422: məlumat formatı səhv olanda FastAPI siyahı qaytarır
  if (Array.isArray(data.detail)) return "Məlumatlar düzgün doldurulmayıb (e-poçt formatı, parol ən azı 8 simvol).";
  return String(data.detail);
}

export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(API + path, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Serverə qoşulmaq olmur. Backend işləyir?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorText(data));
  return data as T;
}
