# Authentication & Authorization

QuizzQuizz uses [Better Auth](https://better-auth.com) for session-based authentication. Regular players join quizzes anonymously; only hosts need accounts. A separate **admin app** (served at `/admin/`) lets an admin manage all user accounts.

---

## Auth UI Package

Shared login/signup UI logic lives in **`packages/auth-ui`** (`@quizzquizz/auth-ui`). This package exports `LoginScreenBase`, an abstract `HTMLElement` subclass that provides the complete login/signup/IMAP form, loading states, and error display.

### How to use `LoginScreenBase`

Extend it in your app's login screen and implement the five abstract methods:

```typescript
import { LoginScreenBase } from '@quizzquizz/auth-ui';
import { api } from '../api-client';
import { router } from '../router';

class MyLoginScreen extends LoginScreenBase {
  protected navigateHome(): void { router.navigate('/'); }
  protected async signIn(email: string, password: string): Promise<void> {
    await api.signIn(email, password);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
  protected async signUp(email: string, password: string, username: string, name: string): Promise<void> {
    await api.signUp(email, password, username, name);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
  protected async imapSignIn(email: string, password: string): Promise<void> {
    await api.imapSignIn(email, password);
    window.dispatchEvent(new CustomEvent('auth-changed'));
  }
  protected async getAuthCapabilities(): Promise<{ imapEnabled: boolean }> {
    return api.getAuthCapabilities();
  }
  // Optional: override for app-specific subtitle text
  protected getSignInSubtitle(): string { return 'Sign in to your account'; }
  protected getSignUpSubtitle(): string { return 'Create a new account'; }
}
customElements.define('my-login-screen', MyLoginScreen);
```

Each app dispatches an `auth-changed` CustomEvent on `window` after a successful auth action so nav headers can update their UI without polling.

Apps that use `LoginScreenBase`:

| App | Custom element | Notes |
|-----|----------------|-------|
| `host-app` | `login-screen` | |
| `player-app` | `login-screen` | |
| `flashcard-app` | `flashcard-login-screen` | |

The **admin-app** login is intentionally separate (admin-only, no register, no IMAP option).

---

## Sign-in Methods

| Method | When active | Notes |
|--------|------------|-------|
| Email / password | Always | Credentials stored and bcrypt-hashed by Better Auth |
| IMAP | When `IMAP_HOST` is set | Validates against your mail server; no password stored locally; auto-registers users on first successful login |

The `GET /api/auth/capabilities` endpoint tells frontends which methods are available so the IMAP toggle appears only when configured.

---

## User Roles

| Flag | Meaning |
|------|---------|
| *(none)* | Regular user — can host and play quizzes |
| `isAdmin` | Can access `/admin/` and manage all users |
| `mustChangePassword` | Must change password before any non-auth endpoint will respond (server returns `403 PASSWORD_RESET_REQUIRED`) |

---

## Environment Variables

### Core auth (required in production)

| Variable | Default | Description |
|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | — | Long random string used to sign session tokens. **Generate with `openssl rand -hex 32`.** Must be set in production. |
| `BETTER_AUTH_BASE_URL` | `http://localhost:3000` | Public base URL the auth library uses for cookies and redirects. Set to your domain in production. |

### IMAP sign-in (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAP_HOST` | — | Hostname of your IMAP server (e.g. `mail.example.com`). Setting this enables IMAP login. |
| `IMAP_PORT` | `993` | IMAP port. |
| `IMAP_TLS` | `true` | Set `false` for STARTTLS or plain IMAP. |

### Global admin bootstrap (optional but recommended)

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_EMAIL` | — | Email address for the bootstrap admin account. If this is set and no admin exists in the database, the server creates one automatically on startup. |
| `ADMIN_PASSWORD` | — | Password for the bootstrap admin. If omitted, a random password is generated and printed to stdout. |

---

## Minimal `.env` Example

```dotenv
# Required in production
BETTER_AUTH_SECRET=replace-with-output-of-openssl-rand-hex-32
BETTER_AUTH_BASE_URL=https://quiz.example.com

# Optional: IMAP login
IMAP_HOST=mail.example.com
IMAP_PORT=993
IMAP_TLS=true

# Optional: bootstrap admin account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe!
```

---

## Setting Up the Admin Account

> **Development defaults** — The repository ships a sample `.env` for `packages/api-server` with:
> - `ADMIN_EMAIL=admin@example.com`
> - `ADMIN_PASSWORD=Admin1234!`
>
> These credentials are active when you run `npm run dev`. Change them before deploying to production.

### 1. Set environment variables

Add `ADMIN_EMAIL` (and optionally `ADMIN_PASSWORD`) to `packages/api-server/.env` or your deployment environment before starting the server.

### 2. Start the server

```bash
cd packages/api-server
npx tsx src/index.ts
```

On startup the server logs one of:

```
✅ Admin user created: admin@example.com (password: <generated>)
```
or
```
✓ Admin user already exists — skipping bootstrap
```

The bootstrap is **idempotent**: it only creates the admin user if no admin exists yet. It will never overwrite an existing admin or reset a changed password.

### 3. Sign in to the admin app

Open `http://localhost:3000/admin/` (or your domain's `/admin/` path). Use the credentials from step 1. If `mustChangePassword` was set (it is by default on bootstrap), you will be redirected to a password-change screen before you can access the user list.

---

## Admin App Screens

The admin app is a standalone SPA served at `/admin/`. For a full walkthrough of every screen, all user actions, the router guard logic, and development setup, see **[`docs/admin-app.md`](admin-app.md)**.

Quick summary:

| Route | Screen |
|-------|--------|
| `#/login` | Email + password sign-in |
| `#/change-password` | Forced password change (shown when `mustChangePassword` is set) |
| `#/users` | Paginated user table |

### User management actions

| Action | Behaviour |
|--------|-----------|
| **Toggle admin** | Promotes a regular user to admin or revokes admin from an existing admin. Blocked if it would remove the last admin. |
| **Reset password** | Generates a random temporary password, sets `mustChangePassword=true` on the user, and displays the temporary password to the admin. The user must change it on next login. |
| **Delete** | Permanently deletes the user. Blocked if the user is the last admin or if the admin is trying to delete their own account. |

---

## Auth API Reference

All auth routes are mounted at `/api/auth/`.

### Better Auth built-ins (selected subset)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/sign-up/email` | Create account (`{ email, password, name, username }`) |
| `POST` | `/api/auth/sign-in/email` | Sign in (`{ email, password }`) — sets session cookie |
| `POST` | `/api/auth/sign-out` | Invalidate session |

### Custom endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/capabilities` | Returns `{ imapEnabled: boolean }` |
| `GET` | `/api/auth/get-session` | Augmented session — wraps Better Auth with `isAdmin` and `mustChangePassword` from Prisma; returns `{ session, user }` (or `{ session: null, user: null }` when unauthenticated) |
| `POST` | `/api/auth/imap-sign-in` | IMAP login (`{ email, password }`) — validates against IMAP server, auto-registers on first login, sets session cookie |
| `POST` | `/api/auth/change-password` | Change password and clear `mustChangePassword` (`{ currentPassword, newPassword }`) |

### Admin endpoints (require `isAdmin = true`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/users` | List users. Params: `?page` (default 1), `?limit` (default 20), `?search` (substring match on email / username / name) |
| `PATCH` | `/api/admin/users/:id` | Update user fields: `name`, `email`, `username`, `isAdmin` |
| `DELETE` | `/api/admin/users/:id` | Delete user. Returns `400` if this is the last admin or `403` if deleting self. |
| `POST` | `/api/admin/users/:id/reset-password` | Reset password. Returns `{ tempPassword }` and sets `mustChangePassword=true`. |

---

## `get-session` Response Shape

Better Auth's native session endpoints do not expose custom DB fields. The custom `/api/auth/get-session` interceptor augments the response:

```jsonc
// Authenticated
{
  "session": {
    "id": "...",
    "userId": "...",
    "expiresAt": "2026-...",
    "createdAt": "2026-...",
    "isAdmin": true,           // ← added by interceptor
    "mustChangePassword": false // ← added by interceptor
  },
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "name": "Admin",
    "username": "admin",
    "emailVerified": true,
    "createdAt": "2026-...",
    "updatedAt": "2026-...",
    "isAdmin": true,           // ← added by interceptor
    "mustChangePassword": false // ← added by interceptor
  }
}

// Unauthenticated (or invalid token)
{
  "session": null,
  "user": null
}
```

> **Important for frontends**: Never rely on the `sign-in/email` response for `isAdmin` or `mustChangePassword` — those fields are not present there. Always call `GET /api/auth/get-session` after sign-in to obtain the full session.

---

## Security Notes

- `mustChangePassword` blocks **all non-auth API endpoints** (`POST /api/auth/change-password` is the only exit). This is enforced by `requireAuth` middleware server-side.
- Admin routes (`/api/admin/*`) are guarded by `requireAdmin` middleware, which checks `isAdmin` from the Prisma `User` row — not from the session cache.
- The Delete and "last admin" checks are also enforced server-side; UI guards (disabled buttons) are convenience only.
- Never put the admin bootstrap password or `BETTER_AUTH_SECRET` in committed files. Use `.env` (already in `.gitignore`) or your deployment secret manager.
