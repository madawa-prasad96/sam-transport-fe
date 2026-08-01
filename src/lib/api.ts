const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Turns the API's `message` (string or string[]) into something displayable. */
const toMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return fallback;
};

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  // Collapse concurrent 401s into a single refresh so a page with several
  // queries doesn't fire a burst of refresh calls and rotate the token N times.
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => {
        refreshing = null;
      }, 0);
    });
  return refreshing;
}

export async function api<T>(
  path: string,
  options: RequestInit & { retryOnUnauthorised?: boolean } = {},
): Promise<T> {
  const { retryOnUnauthorised = true, ...init } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 401 && retryOnUnauthorised && path !== '/auth/login') {
    const refreshed = await refreshSession();
    if (refreshed) {
      return api<T>(path, { ...options, retryOnUnauthorised: false });
    }
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(
      toMessage(payload, `Request failed (${response.status})`),
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const get = <T>(path: string) => api<T>(path);

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const patch = <T>(path: string, body?: unknown) =>
  api<T>(path, {
    method: 'PATCH',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });

/** Serialises a filter object into a query string, dropping empty values. */
export const qs = (params: Record<string, unknown>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : '';
};
