export const API: string = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
};
export type TokenOut = { access_token: string; token_type: string; user: User };

export type OrderOut = { id: number; total: number; status: string; created_at: string };

// status 0 = serverə qoşulmaq olmadı, 422 = məlumat formatı səhvdir
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
    throw new ApiError("", 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = data && typeof data.detail === "string" ? data.detail : "";
    throw new ApiError(detail, res.status);
  }
  return data as T;
}
