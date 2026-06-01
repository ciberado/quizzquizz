/**
 * API client for the admin app.
 * All calls target /api/* (proxied in dev, handled by Caddy in production).
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new ApiError(
      (body['error'] as string | undefined) ?? res.statusText,
      res.status,
      body
    );
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  name: string | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  createdAt: number;
}

export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    isAdmin: boolean;
    mustChangePassword: boolean;
  };
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  try {
    const data = await request<{ user: Session['user'] | null }>('/api/auth/get-session');
    if (!data.user) return null;
    return { user: data.user };
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<Session> {
  return request<Session>('/api/auth/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signOut(): Promise<void> {
  await request('/api/auth/sign-out', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await request('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// ── Admin users ────────────────────────────────────────────────────────────

export async function listUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: AdminUser[]; total: number; page: number; limit: number }> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.search) q.set('search', params.search);
  return request(`/api/admin/users?${q}`);
}

export async function updateUser(
  id: string,
  data: Partial<Pick<AdminUser, 'name' | 'email' | 'username' | 'isAdmin'>>
): Promise<{ user: AdminUser }> {
  return request(`/api/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function resetUserPassword(
  id: string
): Promise<{ tempPassword: string; message: string }> {
  return request(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
}
