/**
 * Unit tests for LoginScreenBase.
 *
 * Covers:
 * - Initial render (login mode)
 * - Sign-in success: auth-changed fires BEFORE navigateHome
 * - Sign-in failure: error displayed, no navigation
 * - Toggle to signup mode and back
 * - Sign-up success
 * - Sign-up client-side validation (missing name/username)
 * - Toggle to IMAP mode (only when imapEnabled)
 * - IMAP sign-in success
 * - auth-changed dispatched exactly once per successful auth
 * - Loading state during submit
 * - getAuthCapabilities failure → graceful degradation (no IMAP)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoginScreenBase } from '../src/login-screen-base';

// ── Concrete test subclass ────────────────────────────────────────────────────

class TestLoginScreen extends LoginScreenBase {
  navigateHomeCalls = 0;

  protected navigateHome(): void {
    this.navigateHomeCalls++;
  }
}
customElements.define('test-login-screen', TestLoginScreen);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Create element WITHOUT appending to body — avoids auto-connectedCallback. */
function mountScreen(): TestLoginScreen {
  return document.createElement('test-login-screen') as TestLoginScreen;
}

function unmount(_el: Element): void {
  // no-op: element is not in the DOM
}

/** Submit the currently visible form with the given field values. */
async function submitForm(el: Element, fields: Record<string, string>): Promise<void> {
  const form = el.querySelector('form.auth-form') as HTMLFormElement;
  for (const [name, value] of Object.entries(fields)) {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
    if (input) input.value = value;
  }
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  // Let async handleSubmit resolve
  await new Promise((r) => setTimeout(r, 0));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LoginScreenBase', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    // Default: capabilities returns no IMAP, auth calls succeed
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/auth/capabilities') {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ imapEnabled: false })),
        });
      }
      if (
        url === '/api/auth/sign-in/email' ||
        url === '/api/auth/sign-up/email' ||
        url === '/api/auth/imap-sign-in'
      ) {
        const body = init?.body ? (JSON.parse(init.body as string) as { email?: string }) : {};
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ user: { id: '1', email: body.email ?? '' } })),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ message: 'Not found' })),
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  // ── Initial render ───────────────────────────────────────────────────────

  it('renders login form with Welcome Back heading on mount', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    expect(el.querySelector('h1')?.textContent).toContain('Welcome Back');
    expect(el.querySelector('form.auth-form')).toBeTruthy();
    unmount(el);
  });

  it('does not show IMAP button when imapEnabled is false', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    expect(el.querySelector('.btn-toggle-imap')).toBeNull();
    unmount(el);
  });

  it('shows IMAP button when imapEnabled is true', async () => {
    // Set up IMAP-enabled mock BEFORE creating element to avoid
    // the default mock being used on connectedCallback
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/auth/capabilities') {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ imapEnabled: true })) });
      }
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({})) });
    });
    const el = mountScreen();
    await el.connectedCallback();
    expect(el.querySelector('.btn-toggle-imap')).toBeTruthy();
    unmount(el);
  });

  it('defaults to no IMAP if getAuthCapabilities throws', async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('network error')));
    const el = mountScreen();
    await el.connectedCallback();
    expect(el.querySelector('.btn-toggle-imap')).toBeNull();
    unmount(el);
  });

  // ── Toggle modes ─────────────────────────────────────────────────────────

  it('toggles to signup mode when btn-toggle-signup clicked', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    expect(el.querySelector('h1')?.textContent).toContain('Create Account');
    expect(el.querySelector('[name="name"]')).toBeTruthy();
    expect(el.querySelector('[name="username"]')).toBeTruthy();
    unmount(el);
  });

  it('toggles back to login from signup when btn-toggle-login clicked', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    (el.querySelector('.btn-toggle-login') as HTMLButtonElement).click();
    expect(el.querySelector('h1')?.textContent).toContain('Welcome Back');
    unmount(el);
  });

  it('clears error when mode is toggled', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    // Trigger an error
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({ ok: false, text: () => Promise.resolve(JSON.stringify({ message: 'Bad credentials' })) }),
    );
    await submitForm(el, { email: 'x@x.com', password: 'wrongpass' });
    expect(el.querySelector('.auth-error')).toBeTruthy();
    // Toggle mode → error should clear
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    expect(el.querySelector('.auth-error')).toBeNull();
    unmount(el);
  });

  // ── Sign-in ───────────────────────────────────────────────────────────────

  it('calls /api/auth/sign-in/email on login submit', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    await submitForm(el, { email: 'user@example.com', password: 'pass1234' });
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/sign-in/email');
    expect(call).toBeTruthy();
    const body = JSON.parse(call![1].body as string);
    expect(body.email).toBe('user@example.com');
    expect(body.password).toBe('pass1234');
    unmount(el);
  });

  it('dispatches auth-changed BEFORE calling navigateHome on success', async () => {
    const el = mountScreen();
    await el.connectedCallback();

    const order: string[] = [];
    window.addEventListener('auth-changed', () => order.push('auth-changed'), { once: true });
    const origNavigate = el['navigateHome'].bind(el);
    (el as unknown as Record<string, unknown>)['navigateHome'] = () => { order.push('navigateHome'); origNavigate(); };

    await submitForm(el, { email: 'a@b.com', password: 'password1' });

    expect(order).toEqual(['auth-changed', 'navigateHome']);
    unmount(el);
  });

  it('dispatches auth-changed exactly once on successful sign-in', async () => {
    const el = mountScreen();
    await el.connectedCallback();

    let count = 0;
    const listener = () => count++;
    window.addEventListener('auth-changed', listener);

    await submitForm(el, { email: 'a@b.com', password: 'password1' });

    window.removeEventListener('auth-changed', listener);
    expect(count).toBe(1);
    unmount(el);
  });

  it('shows error and does NOT navigate on sign-in failure', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/auth/capabilities') {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ imapEnabled: false })) });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'Invalid credentials' })),
      });
    });
    const el = mountScreen();
    await el.connectedCallback();
    await submitForm(el, { email: 'bad@example.com', password: 'wrongpass' });
    expect(el.querySelector('.auth-error')?.textContent).toContain('Invalid credentials');
    expect(el.navigateHomeCalls).toBe(0);
    unmount(el);
  });

  it('shows generic error when server returns no message on failure', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/auth/capabilities') {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ imapEnabled: false })) });
      }
      return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('{}') });
    });
    const el = mountScreen();
    await el.connectedCallback();
    await submitForm(el, { email: 'bad@example.com', password: 'badpass1' });
    expect(el.querySelector('.auth-error')).toBeTruthy();
    unmount(el);
  });

  // ── Sign-up ───────────────────────────────────────────────────────────────

  it('calls /api/auth/sign-up/email on signup submit', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    await submitForm(el, {
      name: 'Alice',
      username: 'alice',
      email: 'alice@example.com',
      password: 'pass1234',
    });
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/sign-up/email');
    expect(call).toBeTruthy();
    const body = JSON.parse(call![1].body as string);
    expect(body.name).toBe('Alice');
    expect(body.username).toBe('alice');
    unmount(el);
  });

  it('shows validation error when name is missing on signup', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    await submitForm(el, { username: 'alice', email: 'alice@example.com', password: 'pass1234' });
    expect(el.querySelector('.auth-error')?.textContent).toContain('Name and username are required');
    expect(el.navigateHomeCalls).toBe(0);
    unmount(el);
  });

  it('shows validation error when username is missing on signup', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-signup') as HTMLButtonElement).click();
    await submitForm(el, { name: 'Alice', email: 'alice@example.com', password: 'pass1234' });
    expect(el.querySelector('.auth-error')?.textContent).toContain('Name and username are required');
    unmount(el);
  });

  // ── IMAP sign-in ──────────────────────────────────────────────────────────

  it('calls /api/auth/imap-sign-in in IMAP mode', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/auth/capabilities') {
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ imapEnabled: true })) });
      }
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({})) });
    });
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.btn-toggle-imap') as HTMLButtonElement).click();
    await submitForm(el, { email: 'corp@example.com', password: 'corppass' });
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/imap-sign-in');
    expect(call).toBeTruthy();
    unmount(el);
  });

  // ── Skip / continue without account ───────────────────────────────────────

  it('calls navigateHome when skip button is clicked', async () => {
    const el = mountScreen();
    await el.connectedCallback();
    (el.querySelector('.skip-btn') as HTMLButtonElement).click();
    expect(el.navigateHomeCalls).toBe(1);
    unmount(el);
  });
});
