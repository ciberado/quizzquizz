# Admin App

The QuizzQuizz admin app is a standalone single-page application served at `/admin/`. It provides a UI for managing user accounts: promoting/demoting admins, resetting passwords, and deleting users.

> **Authentication overview** — For environment variables, IMAP setup, admin bootstrap, and the full auth API reference, see [`docs/authentication.md`](authentication.md).

---

## Accessing the App

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3005/admin/` (Vite dev server proxies `/api` to `localhost:3010`) |
| Docker / production | `https://your-domain.com/admin/` (Caddy routes `/admin*` to the admin-app container) |

Only accounts with `isAdmin = true` can sign in. Regular user credentials are rejected at the login screen.

---

## Screens

### Login (`/admin/login`)

Standard email + password form. On successful sign-in the app calls `GET /api/auth/get-session` to fetch the augmented session (which includes `isAdmin` and `mustChangePassword` from the database).

**Routing after login:**

| Condition | Redirects to |
|-----------|-------------|
| `isAdmin` is `false` | Stay on `/login` with "Access denied" error |
| `mustChangePassword` is `true` | `/change-password` |
| Normal admin | `/users` |

---

### Change Password (`/admin/change-password`)

Shown when `mustChangePassword` is `true` — the user cannot reach any other screen while this flag is set. This applies to:

- Newly bootstrapped admin accounts (flag set at creation time).
- Any user whose password was reset by another admin.

The form requires the **current** password plus a **new** password (min 8 characters) and a confirmation field. On success the server clears `mustChangePassword` and the app navigates to `/users`.

The route is also accessible directly by any authenticated user (admin or not), so regular users who have had their password reset can change it via the admin app URL.

---

### User List (`/admin/users`)

The main user management table. Protected by `isAdmin` guard — unauthenticated or non-admin requests are redirected to `/login`.

**Table columns:**

| Column | Description |
|--------|-------------|
| Email | User's email address |
| Username | Unique username |
| Name | Display name (shown as `—` if blank) |
| Status | Badges: `Admin` (blue), `Reset req.` (yellow — `mustChangePassword` is set) |
| Actions | Per-row action buttons (see below) |

**Toolbar:**

- **Search** — live substring filter across email, username, and name. Resets to page 1 on each keystroke.
- **Refresh** — manually re-fetches the current page.
- **User count** — total matching users shown at the right.

**Pagination:** 20 users per page. Previous / Next buttons are disabled at the first/last page.

---

## User Actions

### Make Admin / Revoke Admin

Toggles `isAdmin` on the target user via `PATCH /api/admin/users/:id`. The button label changes depending on current state.

**Server-side guard:** If this would leave zero admins in the system the server returns `400 Cannot remove the last admin`. The error appears in the alert banner above the table.

---

### Reset Password

Calls `POST /api/admin/users/:id/reset-password`. The server:

1. Generates a random temporary password.
2. Hashes and stores it.
3. Sets `mustChangePassword = true` on the account.
4. Returns `{ tempPassword, message }`.

A modal then displays the **temporary password**. The admin must share it out-of-band with the user. The user will be forced to change it on their next login.

Closing the modal (Done button) dismisses it — the password is not stored anywhere in the UI after that point.

---

### Delete User

Clicking Delete opens a **confirmation modal** with the target user's email and a warning that the action is permanent.

**Guards:**

| Condition | Behaviour |
|-----------|-----------|
| Target is the last admin | Server returns `400 Cannot delete the last admin`; error shown in alert banner |
| Target is the logged-in user | Delete button is **disabled** in the UI (tooltip: "Cannot delete yourself"); backend also returns `403` |

Confirming calls `DELETE /api/admin/users/:id` and reloads the table.

---

## Auth Guards (Router Level)

The client-side router in `packages/admin-app/src/main.ts` applies guards before mounting any screen:

```
GET /admin/         → redirect to /users
GET /admin/login    → mount login screen (no guard)
GET /admin/change-password → session required; mustChangePassword redirect skipped here
GET /admin/users    → session required + isAdmin required; mustChangePassword forces /change-password
GET /admin/<other>  → redirect to /users
```

All API routes also enforce server-side guards independently of the client router.

---

## Development

### Start the admin app in dev mode

```bash
# Terminal 1 — API server (required)
cd packages/api-server
npx tsx src/index.ts

# Terminal 2 — Admin app
npm run dev -w @quizzquizz/admin-app
# Opens at http://localhost:3005/admin/
```

Or with the root dev script (starts all services):

```bash
npm run dev
# Admin app: http://localhost:3005/admin/
```

### Build

```bash
npm run build -w @quizzquizz/admin-app
# Output: packages/admin-app/dist/
```

The `dist/` folder is copied into the Docker image and served by Caddy under `/admin/`.

---

## Package Structure

```
packages/admin-app/
├── src/
│   ├── main.ts                      # App entry point, router setup, auth guards
│   ├── router.ts                    # Hash-free client-side router (strips /admin prefix)
│   ├── api-client.ts                # Typed fetch wrappers for auth + admin REST endpoints
│   ├── styles.css                   # Global styles (variables, layout, auth cards, tables)
│   └── components/
│       ├── base-component.ts        # BaseComponent (extends HTMLElement, setContent helper)
│       ├── login-screen.ts          # <admin-login-screen>
│       ├── change-password-screen.ts # <admin-change-password-screen>
│       └── user-list-screen.ts      # <admin-user-list-screen> — table, search, modals
├── index.html
├── vite.config.ts                   # base: /admin/, port: 3005, proxy /api → :3010
└── package.json
```

---

## API Calls Made by the Admin App

| Screen | Method | Endpoint | Purpose |
|--------|--------|----------|---------|
| Login | `POST` | `/api/auth/sign-in/email` | Authenticate |
| Login, router guard | `GET` | `/api/auth/get-session` | Fetch `isAdmin` + `mustChangePassword` |
| Login | `POST` | `/api/auth/sign-out` | Sign out |
| Change Password | `POST` | `/api/auth/change-password` | Change password + clear flag |
| User List | `GET` | `/api/admin/users` | List users (paginated + search) |
| User List | `PATCH` | `/api/admin/users/:id` | Toggle admin |
| User List | `POST` | `/api/admin/users/:id/reset-password` | Reset password |
| User List | `DELETE` | `/api/admin/users/:id` | Delete user |
