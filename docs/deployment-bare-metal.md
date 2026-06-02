# Deploying QuizzQuizz without Docker

This guide covers running QuizzQuizz directly on a host machine using Node.js and Caddy as the reverse proxy. This approach suits situations where Docker is unavailable or when you want full control over the process lifecycle.

## How it works

```
Browser
  ↓
Caddy (port 80/443)
  ├── /api*        → Node.js API server (port 3010)
  ├── /ws*         → Node.js API server (Yjs WebSocket)
  ├── /host*       → static files (host-app/dist)
  ├── /analytics*  → static files (analytics-ui/dist)
  ├── /flashcard*  → static files (flashcard-app/dist)
  └── /*           → static files (player-app/dist)
```

The Node.js API server handles REST requests and Yjs WebSocket connections. Caddy serves the pre-built frontend static files directly from the filesystem and reverse-proxies only the API and WebSocket traffic.

## Prerequisites

- **Node.js 22 LTS** and **npm 10+**
- **Caddy 2** — https://caddyserver.com/docs/install
- A clone of the repository

## 1. Install dependencies

```bash
git clone https://github.com/ciberado/quizzquizz.git
cd quizzquizz
npm install
```

## 2. Build all packages

```bash
npm run build
```

This compiles every workspace package in the correct dependency order (`common` → `question-bank` → `api-server`, then the frontend apps). The built assets land in:

| Package | Output |
|---------|--------|
| `packages/api-server/dist/` | Node.js server (entry: `index.js`) |
| `packages/host-app/dist/` | Host UI static files |
| `packages/player-app/dist/` | Player UI static files |
| `packages/analytics-ui/dist/` | Analytics UI static files |
| `packages/flashcard-app/dist/` | Flashcard UI static files |

## 3. Set up the database

Run Prisma migrations to create (or update) the SQLite database:

```bash
cd packages/api-server
npx prisma migrate deploy
cd ../..
```

The database file is created at the path in `DATABASE_URL` (default: `./data/quiz.db`). Create the directory if it does not exist:

```bash
mkdir -p data
```

## 4. Configure environment variables

Create a `.env` file at the repo root (or export the variables in your shell / systemd unit):

```dotenv
NODE_ENV=production
PORT=3010
DATABASE_URL=file:/absolute/path/to/data/quiz.db
QUESTION_BANKS_PATH=/absolute/path/to/quizzquizz/question-banks
SESSION_EXPIRY_HOURS=24
LOG_LEVEL=info
MAX_UPLOAD_KB=500

# Auth (required for login/signup features)
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_BASE_URL=https://your-domain.com

# CORS (set when Caddy and the API are on different origins)
CORS_ORIGIN=https://your-domain.com
PRODUCTION_HTTPS=true

# IMAP sign-in (optional — enables the IMAP login toggle on all sign-in screens)
# IMAP_HOST=mail.example.com
# IMAP_PORT=993
# IMAP_TLS=true

# Admin bootstrap (optional — creates an admin account on first startup)
# ADMIN_EMAIL=admin@example.com
# ADMIN_PASSWORD=ChangeMe!
```

> **Note**: The API server runs on port `3010` here to avoid conflict with Caddy, which will listen on port `80`/`443`. Adjust the port in the Caddy configuration below if you use a different value.

### Environment variable reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `3000` | API server port |
| `DATABASE_URL` | `file:./data/quiz.db` | SQLite database path |
| `QUESTION_BANKS_PATH` | `./question-banks` | Path to Markdown quiz banks |
| `SESSION_EXPIRY_HOURS` | `24` | Game session lifetime |
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `MAX_UPLOAD_KB` | `500` | Max quiz bank upload size in KB |
| `BETTER_AUTH_SECRET` | *(must set in production)* | Random secret for auth token signing |
| `BETTER_AUTH_BASE_URL` | `http://localhost:3000` | Public base URL seen by the auth library |
| `CORS_ORIGIN` | *(empty)* | Allowed CORS origin |
| `PRODUCTION_HTTPS` | `false` | Set to `true` when serving over HTTPS |
| `IMAP_HOST` | *(empty)* | IMAP server hostname — enables IMAP sign-in when set |
| `IMAP_PORT` | `993` | IMAP port |
| `IMAP_TLS` | `true` | `false` for STARTTLS or plain IMAP |
| `ADMIN_EMAIL` | *(empty)* | Bootstrap admin email — creates admin account on first startup if no admin exists |
| `ADMIN_PASSWORD` | *(empty)* | Bootstrap admin password — auto-generated and printed to stdout if omitted |

See [`docs/authentication.md`](../docs/authentication.md) for a full authentication configuration guide.

## 5. Start the API server

For a quick test:

```bash
node packages/api-server/dist/index.js
```

For production, use a process manager so the server restarts automatically.

### Option A — systemd (Linux)

Create `/etc/systemd/system/quizzquizz.service`:

```ini
[Unit]
Description=QuizzQuizz API Server
After=network.target

[Service]
Type=simple
User=quizzquizz
WorkingDirectory=/opt/quizzquizz
EnvironmentFile=/opt/quizzquizz/.env
ExecStart=/usr/local/bin/node packages/api-server/dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now quizzquizz
sudo systemctl status quizzquizz
```

### Option B — pm2

```bash
npm install -g pm2
pm2 start packages/api-server/dist/index.js --name quizzquizz
pm2 save
pm2 startup   # follow the printed instructions to enable on boot
```

## 6. Configure Caddy

Caddy acts as the single entry point: it serves the pre-built frontend static files from disk and reverse-proxies API and WebSocket traffic to the Node.js server.

### Local / HTTP-only (development or LAN)

Create or edit your Caddyfile (you can use the repo's `Caddyfile` as a starting point):

```caddyfile
{
    auto_https off
    admin off
}

:80 {
    encode gzip

    handle /api* {
        reverse_proxy localhost:3010
    }

    @ws {
        header Connection *Upgrade*
        header Upgrade websocket
        path /ws/*
    }
    handle @ws {
        reverse_proxy localhost:3010
    }

    handle /ws* {
        reverse_proxy localhost:3010
    }

    handle /health {
        reverse_proxy localhost:3010
    }

    handle /host* {
        root * /opt/quizzquizz/packages/host-app/dist
        uri strip_prefix /host
        try_files {path} /index.html
        file_server
    }

    handle /analytics* {
        root * /opt/quizzquizz/packages/analytics-ui/dist
        uri strip_prefix /analytics
        try_files {path} /index.html
        file_server
    }

    handle /flashcard* {
        root * /opt/quizzquizz/packages/flashcard-app/dist
        uri strip_prefix /flashcard
        try_files {path} /index.html
        file_server
    }

    handle /* {
        root * /opt/quizzquizz/packages/player-app/dist
        try_files {path} /index.html
        file_server
    }

    log {
        output stdout
        format console
    }
}
```

### Production HTTPS (public domain)

Caddy obtains Let's Encrypt certificates automatically when you specify a real domain name. Remove `auto_https off`, specify the domain, and point the static file roots at the build output:

```caddyfile
your-domain.com {
    encode gzip zstd

    handle /api* {
        reverse_proxy localhost:3010
    }

    @ws {
        header Connection *Upgrade*
        header Upgrade websocket
        path /ws/*
    }
    handle @ws {
        reverse_proxy localhost:3010
    }

    handle /ws* {
        reverse_proxy localhost:3010
    }

    handle /health {
        reverse_proxy localhost:3010
    }

    handle /host* {
        root * /opt/quizzquizz/packages/host-app/dist
        uri strip_prefix /host
        try_files {path} /index.html
        file_server
    }

    handle /analytics* {
        root * /opt/quizzquizz/packages/analytics-ui/dist
        uri strip_prefix /analytics
        try_files {path} /index.html
        file_server
    }

    handle /flashcard* {
        root * /opt/quizzquizz/packages/flashcard-app/dist
        uri strip_prefix /flashcard
        try_files {path} /index.html
        file_server
    }

    handle /* {
        root * /opt/quizzquizz/packages/player-app/dist
        try_files {path} /index.html
        file_server
    }

    log {
        output file /var/log/caddy/quizzquizz.log
        format json
    }
}
```

Adjust the absolute paths to match your actual installation directory.

### Starting Caddy

```bash
# Validate the configuration first
caddy validate --config /etc/caddy/Caddyfile

# Start (if running as a systemd service, the package installs this automatically)
sudo systemctl enable --now caddy

# Reload configuration without downtime
sudo systemctl reload caddy

# Check status and logs
sudo systemctl status caddy
sudo journalctl -u caddy -f
```

Caddy must be able to bind port 80 and 443. On Linux, either run as root, use `setcap`, or configure the systemd unit with `AmbientCapabilities=CAP_NET_BIND_SERVICE`.

## 7. Verify the deployment

```bash
# Health check
curl http://localhost/api/health           # HTTP
curl https://your-domain.com/api/health   # HTTPS

# List question banks
curl https://your-domain.com/api/question-banks

# Open in browser
https://your-domain.com/        # player app
https://your-domain.com/host    # host app
```

## Updating

After pulling new code, rebuild and restart:

```bash
git pull
npm install
npm run build
cd packages/api-server && npx prisma migrate deploy && cd ../..
sudo systemctl restart quizzquizz
```

The Caddy configuration does not need to change because it reads the static files from disk at request time.

## Reloading question banks

After editing files in `question-banks/`, tell the running API server to reload without restarting:

```bash
./reload-question-banks.sh
# or manually:
curl -X POST http://localhost/api/question-banks/reload
```

## Development mode

For local development all services can be started with a single command. A lightweight Node.js proxy (mirrors the Caddy routing) runs on port 3000 and forwards to individual Vite dev servers:

```bash
npm run dev
```

| Service | Port |
|---------|------|
| Dev proxy (single entry point) | 3000 |
| API server | 3010 |
| Host app (Vite) | 3001 |
| Player app (Vite) | 3002 |
| Analytics UI (Vite) | 3003 |
| Flashcard app (Vite) | 3004 |

Hot-module replacement works on all frontend apps. The dev proxy is not needed in Docker — Caddy handles routing there.
