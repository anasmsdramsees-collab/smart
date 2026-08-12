const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'syltra_access_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

// Reads the `email` claim out of the stored access token without a round trip —
// the API doesn't expose a /v1/auth/me endpoint yet.
export function getTokenEmail(): string | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Access tokens are short-lived (15m default); there's no silent refresh
    // flow yet, so send the user back to sign in rather than showing a raw
    // "Unauthorized" JSON error.
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/';
    throw new Error('Session expired — signing you out.');
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
