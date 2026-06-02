# Deploying QuizzQuizz with Docker

This guide covers running QuizzQuizz using Docker Compose. Docker is the recommended deployment method because it packages all dependencies and wires up Caddy automatically.

## How it works

```
Browser
  ↓
Caddy (port 3000 → container :80)
  ├── /api*        → Node.js API server (:3000 inside container)
  ├── /ws*         → Node.js API server (Yjs WebSocket)
  ├── /host*       → static files (host-app)
  ├── /analytics*  → static files (analytics-ui)
  ├── /flashcard*  → static files (flashcard-app)
  └── /*           → static files (player-app)
```

The `quizzquizz` container runs the Node.js API server and copies built frontend assets to a shared named volume (`app-static`). The `caddy` container reads those static files from the same volume and proxies `/api*` and `/ws*` traffic to the Node.js process.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Ports 3000 (or your chosen host port) open on the host

## Quick start

```bash
git clone https://github.com/ciberado/quizzquizz.git
cd quizzquizz
docker compose up -d
```

The application is then available at:

| App | URL |
|-----|-----|
| Player app | http://localhost:3000/ |
| Host app | http://localhost:3000/host |
| Flashcard app | http://localhost:3000/flashcard/ |
| Analytics | http://localhost:3000/analytics |
| API | http://localhost:3000/api/ |

## Using a pre-built image

`docker-compose.yml` builds from source by default. To use the published image instead, replace the `build:` block:

```yaml
services:
  quizzquizz:
    image: ciberado/quizzquizz:latest   # replace build: with this line
```

## Environment variables

All variables are set in `docker-compose.yml` under `environment:`. You can override them with a `.env` file in the project root.

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `3000` | Internal API port (do not change unless you also update the Caddyfile) |
| `DATABASE_URL` | `file:/data/quiz.db` | SQLite database path |
| `QUESTION_BANKS_PATH` | `/app/question-banks` | Path to Markdown quiz banks |
| `SESSION_EXPIRY_HOURS` | `24` | Game session lifetime |
| `LOG_LEVEL` | `info` | `error` / `warn` / `info` / `debug` |
| `MAX_UPLOAD_KB` | `500` | Max quiz bank upload size in KB |
| `BETTER_AUTH_SECRET` | *(must set in production)* | Random secret for auth token signing |
| `BETTER_AUTH_BASE_URL` | `http://localhost:3000` | Public base URL seen by the auth library |
| `CORS_ORIGIN` | *(empty)* | Allowed CORS origin, e.g. `https://my-domain.com` |
| `PRODUCTION_HTTPS` | `false` | Set to `true` when serving over HTTPS |
| `IMAP_HOST` | *(empty)* | IMAP server hostname — enables IMAP sign-in when set |
| `IMAP_PORT` | `993` | IMAP port |
| `IMAP_TLS` | `true` | `false` for STARTTLS or plain IMAP |
| `ADMIN_EMAIL` | *(empty)* | Bootstrap admin email — creates admin account on first startup if no admin exists |
| `ADMIN_PASSWORD` | *(empty)* | Bootstrap admin password — auto-generated and printed to stdout if omitted |

See [`docs/authentication.md`](../docs/authentication.md) for a full authentication configuration guide.

### Minimal `.env` for production

```dotenv
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_BASE_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
PRODUCTION_HTTPS=true

# Admin bootstrap (creates an admin account on first startup if no admin exists)
ADMIN_EMAIL=admin@your-domain.com
# ADMIN_PASSWORD=ChangeMe!   # omit to auto-generate and print to stdout

# IMAP sign-in (optional)
# IMAP_HOST=mail.your-domain.com
# IMAP_PORT=993
# IMAP_TLS=true
```

## Data persistence

Three named volumes keep data across container restarts and image upgrades:

| Volume | Contents |
|--------|----------|
| `quiz-data` | SQLite database (`/data/quiz.db`) |
| `app-static` | Built frontend files shared with Caddy |
| `caddy-data` / `caddy-config` | Caddy TLS certificates and config cache |

The `question-banks/` directory is bind-mounted read-only into the container so you can edit question banks without rebuilding the image.

## Caddy configuration

`Caddyfile` is mounted into the Caddy container at `/etc/caddy/Caddyfile`. It:

- Listens on port 80 (auto-HTTPS is disabled; the Docker setup exposes port 80 only)
- Reverse-proxies `/api*`, `/ws*`, and `/health` to `localhost:3000` (the Node.js server)
- Serves frontend static files directly from the `app-static` volume for each path prefix
- Enables gzip compression

If you change the Caddyfile, reload Caddy without downtime:

```bash
docker exec quizzquizz-caddy caddy reload --config /etc/caddy/Caddyfile
```

## Management commands

```bash
# Build the image from source
npm run docker:build

# Start (detached)
npm run docker:up
# or: docker compose up -d

# Follow logs
npm run docker:logs
# or: docker compose logs -f

# Stop containers (keep volumes)
npm run docker:down
# or: docker compose down

# Restart
npm run docker:restart

# Destroy containers AND volumes (full reset)
npm run docker:clean
# or: docker compose down -v && docker rmi quizzquizz:latest
```

## Reloading question banks

After editing files in `question-banks/`, tell the API server to reload without restarting the container:

```bash
./reload-question-banks.sh
# or manually:
curl -X POST http://localhost:3000/api/question-banks/reload
```

You can also click **🔄 Refresh Banks** in the Host UI.

## Building and pushing a versioned image

```bash
npm run docker:build:version   # tags as quizzquizz:<version> and quizzquizz:latest
npm run docker:push            # builds, tags, and pushes to Docker Hub as ciberado/quizzquizz
```

---

## Deployment option: Tailscale (private network)

`docker-compose.ts.yml` adds a Tailscale sidecar so the app is accessible on your private Tailnet with automatic HTTPS, without exposing any ports publicly.

### Prerequisites

1. A Tailscale account with an auth key — generate one at https://login.tailscale.com/admin/settings/keys (use a reusable key with `tag:container`)
2. A Tailscale ACL entry for the `tag:container` tag

### Setup

```bash
export TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxxxxx
export TAILNET_DOMAIN=tail1234.ts.net   # find at https://login.tailscale.com/admin/dns
docker compose -f docker-compose.ts.yml up -d
```

Or put the variables in a `.env` file (see `.env.example`).

After the containers start, find the Tailscale hostname:

```bash
docker exec quizzquizz_ts tailscale status
```

The app will be reachable at `https://quizzquizz.<your-tailnet>.ts.net` from any device on your Tailnet.

### How it works

```
Tailnet device
  ↓ HTTPS (Tailscale TLS)
Tailscale sidecar (quizzquizz-ts)
  ↓ HTTP (shared network namespace)
Caddy
  ↓
Node.js API server
```

The `caddy` and `quizzquizz` containers both run inside the Tailscale container's network namespace (`network_mode: service:quizzquizz-ts`), so Caddy is directly reachable via Tailscale. The Tailscale serve config at `ts-config/quizzquizz.json` terminates TLS and proxies to Caddy on port 80.

---

## Deployment option: EC2 public proxy

If you want a public HTTPS URL while keeping the application running privately (e.g. on Tailscale), deploy a lightweight Caddy reverse proxy on an EC2 instance.

```
Internet → your-domain.com (EC2 + Caddy)
               ↓ HTTPS → HTTPS
          quizzquizz.your-tailnet.ts.net (Tailscale)
               ↓
          QuizzQuizz containers
```

### EC2 setup

1. Install Tailscale on the EC2 instance so it can reach the Tailnet:

   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```

2. Install Caddy:

   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
     | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
     | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update && sudo apt install caddy
   ```

3. Copy `Caddyfile.proxy` to `/etc/caddy/Caddyfile` on the EC2 instance and set environment variables:

   ```bash
   sudo mkdir -p /etc/systemd/system/caddy.service.d
   sudo tee /etc/systemd/system/caddy.service.d/override.conf > /dev/null <<EOF
   [Service]
   Environment="PUBLIC_DOMAIN=your-domain.com"
   Environment="TAILSCALE_HOST=quizzquizz.your-tailnet.ts.net"
   EOF
   sudo systemctl daemon-reload
   sudo systemctl reload caddy
   ```

4. Set `CORS_ORIGIN` on the QuizzQuizz host:

   ```bash
   # In .env or docker-compose.ts.yml:
   CORS_ORIGIN=https://your-domain.com
   ```

5. EC2 security group must allow inbound **TCP 80** and **TCP 443**.

Caddy handles Let's Encrypt certificates automatically. For troubleshooting certificate issues, see [`EC2_TROUBLESHOOTING.md`](../EC2_TROUBLESHOOTING.md).
