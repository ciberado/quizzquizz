# EC2 Public Proxy Setup Guide

## Overview
This setup allows public access to QuizzQuizz via a public domain (EC2) while the application runs on Tailscale.

## Architecture
```
Internet → your-domain.com (EC2 + Caddy)
              ↓ (reverse proxy)
         your-app.your-tailnet.ts.net (Tailscale)
              ↓
         QuizzQuizz containers
```

## Prerequisites

### 1. Install Tailscale on EC2
Your EC2 instance must be on the Tailnet to reach `*.ts.net` domains:

```bash
# On your EC2 instance
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Install Caddy (if not already installed)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

## Configuration

### 1. Deploy Caddy Config on EC2

Copy the contents of `Caddyfile.proxy` to your EC2 instance.

**Option A: Using Environment Variables (Recommended)**

```bash
# On your EC2 instance, set environment variables
export PUBLIC_DOMAIN=your-domain.com
export TAILSCALE_HOST=your-app.your-tailnet.ts.net

# Create systemd override to set environment variables
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo tee /etc/systemd/system/caddy.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="PUBLIC_DOMAIN=your-domain.com"
Environment="TAILSCALE_HOST=your-app.your-tailnet.ts.net"
EOF

# Copy Caddyfile
sudo nano /etc/caddy/Caddyfile
# (paste the contents of Caddyfile.proxy)

# Reload systemd and Caddy
sudo systemctl daemon-reload
sudo systemctl reload caddy
```

**Option B: Direct Substitution**

Edit the Caddyfile and replace the placeholders:

```bash
# On your EC2 instance
sudo nano /etc/caddy/Caddyfile
```

Replace:
- `{$PUBLIC_DOMAIN:quizzquizz.aprender.cloud}` → `your-domain.com`
- `{$TAILSCALE_HOST:quizzquizz.snow-burbot.ts.net}` → `your-app.your-tailnet.ts.net`

Then reload:

```bash
# Test configuration
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy
```

### 2. Update QuizzQuizz CORS Settings

Add the public domain to CORS allowed origins. On the machine running QuizzQuizz:

**Option A: Using docker-compose.ts.yml**

Edit your `docker-compose.ts.yml`:

```yaml
services:
  quizzquizz:
    environment:
      - CORS_ORIGIN=https://your-domain.com
```

**Option B: Using .env file**

```bash
# Add to .env or set as environment variable
export CORS_ORIGIN=https://your-domain.com
```

Then restart the QuizzQuizz stack:

```bash
docker compose -f docker-compose.ts.yml down
docker compose -f docker-compose.ts.yml up -d
```

### 3. Verify Setup

Test from your local machine:

```bash
# Health check
curl https://your-domain.com/api/health

# Question banks
curl https://your-domain.com/api/question-banks

# Open in browser
https://your-domain.com/host
https://your-domain.com/
```

## DNS Configuration

Ensure your DNS has an A record pointing to your EC2 instance:

```
your-domain.com  →  A  →  <EC2-PUBLIC-IP>
```

## Firewall Rules

Ensure EC2 security group allows:
- **Port 80** (HTTP) - for ACME challenge and HTTP → HTTPS redirect
- **Port 443** (HTTPS) - for public access

## Troubleshooting

### Cannot reach Tailscale endpoint
```bash
# On EC2, verify Tailscale is running
sudo tailscale status

# Test connectivity to Tailscale endpoint
curl https://your-app.your-tailnet.ts.net/api/health
```

### Caddy errors
```bash
# Check Caddy logs
sudo journalctl -u caddy -n 50 -f

# Check application logs
sudo tail -f /var/log/caddy/quizzquizz.log

# Verify environment variables are set (if using Option A)
sudo systemctl show caddy | grep Environment
```

### CORS errors in browser
- Verify `CORS_ORIGIN` is set correctly in QuizzQuizz
- Check browser console for actual CORS error
- Ensure the origin matches exactly (scheme, domain)

## Security Notes

1. **Tailscale provides TLS**: The connection between EC2 and Tailscale is encrypted
2. **Caddy provides TLS**: Caddy automatically obtains Let's Encrypt certificates for your public domain
3. **End-to-end encryption**: Internet → HTTPS → EC2 → HTTPS → Tailscale
4. **Tailnet access control**: Only devices authorized on your Tailnet can access the `.ts.net` endpoint

## Example Configuration

For a complete example, here's a concrete setup:

```bash
# Public domain
PUBLIC_DOMAIN=quizzquizz.aprender.cloud

# Tailscale hostname
TAILSCALE_HOST=quizzquizz.snow-burbot.ts.net

# CORS origin
CORS_ORIGIN=https://quizzquizz.aprender.cloud
```

## Alternative: Direct Tailscale Sharing (Without EC2 Proxy)

If you want to skip the EC2 proxy entirely, you can use Tailscale's sharing feature:

```bash
# On the machine running QuizzQuizz
tailscale serve / https://localhost:80
tailscale serve --set-path=/share/my-quiz-link
```

This creates a public link but requires Tailscale-managed access control.
