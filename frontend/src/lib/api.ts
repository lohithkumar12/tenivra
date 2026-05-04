interface FetchOpts extends RequestInit {
  token?: string;
}

/** Render free tier can cold-start 30–60s; 15s caused false "Request timed out" on signup. */
const REQUEST_TIMEOUT_MS = 60000;

async function request<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { token, headers: extra, ...rest } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string> ?? {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(path, { ...rest, headers, signal: controller.signal });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw new Error("Unable to reach server. Check your connection and try again.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (body && typeof body.detail === "string" && body.detail.trim()) {
      throw new Error(body.detail);
    }
    const fallback = await res.text().catch(() => "");
    throw new Error(fallback || `Request failed (${res.status})`);
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
