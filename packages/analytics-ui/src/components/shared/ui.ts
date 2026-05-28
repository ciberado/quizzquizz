/**
 * Shared UI utilities — stat cards, layout helpers, loading/error states.
 */

export function renderLoading(container: HTMLElement, message = 'Loading…'): void {
  container.innerHTML = `<div class="loading"><div class="spinner"></div><p>${message}</p></div>`;
}

export function renderApiError(container: HTMLElement, error: unknown): void {
  const msg = error instanceof Error ? error.message : 'Unknown error';
  container.innerHTML = `<div class="api-error"><p>⚠ ${msg}</p><button onclick="window.location.reload()">Retry</button></div>`;
}

export function statCard(label: string, value: string | number, trend?: 'up' | 'down' | 'flat'): string {
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const cls = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : '';
  return `
    <div class="stat-card">
      <div class="stat-value">${value} <span class="${cls}">${arrow}</span></div>
      <div class="stat-label">${label}</div>
    </div>`;
}

export function pct(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export function msToSeconds(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

export function navSidebar(activeRoute: string): string {
  const links = [
    { href: '#/player/dashboard', label: 'My Dashboard' },
    { href: '#/player/sessions', label: 'Session History' },
    { href: '#/player/topics', label: 'Topics Overview' },
    { href: '#/player/trend', label: 'Accuracy Trend' },
    { href: '#/player/speed', label: 'Response Profile' },
    { href: '#/player/practice', label: 'Practice' },
    { href: '#/player/compare', label: 'Global Comparison' },
  ];
  const hostLinks = [
    { href: '#/host/sessions/compare', label: 'Compare Sessions' },
  ];

  const renderLinks = (items: typeof links) =>
    items
      .map(
        (l) =>
          `<a href="${l.href}" class="nav-link${activeRoute === l.href ? ' active' : ''}">${l.label}</a>`,
      )
      .join('');

  return `
    <nav class="sidebar">
      <div class="sidebar-brand"><a href="#/player/dashboard">📊 Analytics</a></div>
      <div class="nav-section">
        <div class="nav-section-title">Player</div>
        ${renderLinks(links)}
      </div>
      <div class="nav-section">
        <div class="nav-section-title">Host</div>
        ${renderLinks(hostLinks)}
      </div>
    </nav>`;
}

export function pageLayout(activeRoute: string, title: string, content: string): string {
  return `
    <div class="layout">
      <button class="sidebar-toggle" aria-label="Toggle menu">☰</button>
      <div class="sidebar-overlay"></div>
      ${navSidebar(activeRoute)}
      <main class="main-content">
        <h1 class="page-title">${title}</h1>
        ${content}
      </main>
    </div>`;
}

/** Attach sidebar toggle behavior. Call after rendering a page layout. */
export function attachSidebarToggle(): void {
  const toggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (!toggle || !sidebar || !overlay) return;

  const open = () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  };
  const close = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  };

  toggle.addEventListener('click', () => {
    sidebar.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);

  // Close sidebar when a nav link is clicked
  sidebar.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', close);
  });
}
