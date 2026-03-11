/**
 * Analytics API client — wraps /api/analytics/* endpoints.
 */

interface ApiError {
  error: string;
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  if (res.status === 401) {
    // Redirect to sign-in
    window.location.href = '/host/#/sign-in?redirect=' + encodeURIComponent(window.location.href);
    throw new Error('Unauthenticated');
  }
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as ApiError;
      message = body.error ?? message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Host endpoints
  sessionReport: (sessionId: string) =>
    apiFetch(`/api/analytics/sessions/${encodeURIComponent(sessionId)}/report`),

  bankHealth: (bankId: string) =>
    apiFetch(`/api/analytics/banks/${encodeURIComponent(bankId)}/health`),

  bankEngagement: (bankId: string, range: 'day' | 'week' | 'month' = 'week') =>
    apiFetch(`/api/analytics/banks/${encodeURIComponent(bankId)}/engagement?range=${range}`),

  sessionCompare: (sessionA: string, sessionB: string) =>
    apiFetch(
      `/api/analytics/sessions/compare?sessionA=${encodeURIComponent(sessionA)}&sessionB=${encodeURIComponent(sessionB)}`,
    ),

  // Player endpoints
  sessionHistory: () => apiFetch('/api/analytics/me/sessions'),
  sessionDetail: (sessionId: string) =>
    apiFetch(`/api/analytics/me/sessions/${encodeURIComponent(sessionId)}`),
  dashboard: () => apiFetch('/api/analytics/me/dashboard'),
  accuracyTrend: () => apiFetch('/api/analytics/me/accuracy-trend'),
  weakTopics: (bankId?: string) =>
    apiFetch(`/api/analytics/me/weak-topics${bankId ? `?bankId=${encodeURIComponent(bankId)}` : ''}`),
  responseProfile: () => apiFetch('/api/analytics/me/response-profile'),
  practice: (bankId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (bankId) params.set('bankId', bankId);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return apiFetch(`/api/analytics/me/practice${qs ? '?' + qs : ''}`);
  },
  globalComparison: (bankId: string) =>
    apiFetch(`/api/analytics/me/global-comparison?bankId=${encodeURIComponent(bankId)}`),
};
