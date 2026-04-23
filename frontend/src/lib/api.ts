interface FetchOpts extends RequestInit {
  token?: string;
}

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { token, headers: extra, ...rest } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string> ?? {}),
  };

  const res = await fetch(path, { ...rest, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Something went wrong" }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: "GET", token }),

  post: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body), token }),

  patch: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), token }),

  put: <T>(path: string, body: unknown, token?: string) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body), token }),

  del: <T>(path: string, token?: string) =>
    request<T>(path, { method: "DELETE", token }),
};
