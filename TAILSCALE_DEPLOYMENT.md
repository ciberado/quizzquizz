# Tailscale Deployment Guide

This configuration deploys QuizzQuizz with Tailscale integration, making it accessible on your Tailnet.

## Architecture

- **quizzquizz**: API server (Node.js)
- **caddy**: Reverse proxy serving static files and proxying API requests
- **quizzquizz-ts**: Tailscale sidecar exposing Caddy on your Tailnet

The Caddy container uses Tailscale's network namespace (`network_mode: service:quizzquizz-ts`), making it directly accessible via Tailscale.

## Prerequisites

1. **Tailscale Auth Key**: Generate an auth key at https://login.tailscale.com/admin/settings/keys
   - Recommended: Use a reusable key with the `tag:container` tag
   - Set expiration as needed

2. **Tailscale ACL**: Add a tag for containers (if using `--advertise-tags=tag:container`)
   ```json
   {
     "tagOwners": {
       "tag:container": ["your-email@example.com"]
     }
   }
   ```

## Setup

1. **Set your Tailscale auth key and domain**:
   ```bash
   export TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
   export TAILNET_DOMAIN=tail1234.ts.net
   ```

   Or create a `.env` file:
   ```bash
   cat > .env << EOF
   TS_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
   TAILNET_DOMAIN=tail1234.ts.net
   EOF
   ```

   > **Note**: Your Tailnet domain can be found at https://login.tailscale.com/admin/dns
   > It's usually in the format `tail<numbers>.ts.net`

2. **Start the services**:
   ```bash
   docker compose -f docker-compose.ts.yml up -d
   ```

3. **Check the status**:
   ```bash
   docker compose -f docker-compose.ts.yml ps
   docker compose -f docker-compose.ts.yml logs -f quizzquizz-ts
   ```

4. **Find your Tailscale hostname**:
   ```bash
   docker exec quizzquizz_ts tailscale status
   ```

5. **Access your app**:
   - Via Tailscale: `http://quizzquizz` or `https://quizzquizz.<your-tailnet>.ts.net`
   - Player app: `http://quizzquizz/`
   - Host app: `http://quizzquizz/host`

## Tailscale Serve Configuration

The `ts-config/quizzquizz.json` file configures Tailscale Serve to expose port 80 with HTTPS:

```json
{
  "TCP": {
    "80": {
      "HTTPS": true
    }
  },
  "Web": {
    "quizzquizz:80": {
      "Handlers": {
        "/": {
          "Proxy": "http://127.0.0.1:80"
        }
      }
    }
  }
}
```

This configuration:
- Enables HTTPS on port 80 (Tailscale provides TLS certificates)
- Proxies all requests to Caddy (running on localhost:80 in the same network namespace)

## Volumes

- `quiz-data-ts`: SQLite database
- `caddy-data-ts`: Caddy data
- `caddy-config-ts`: Caddy config
- `app-dist-ts`: Built frontend files
- `tailscale-data-quizzquizz`: Tailscale state

## Commands

```bash
# Start
docker compose -f docker-compose.ts.yml up -d

# Stop
docker compose -f docker-compose.ts.yml down

# View logs
docker compose -f docker-compose.ts.yml logs -f

# Restart a service
docker compose -f docker-compose.ts.yml restart caddy

# Remove everything including volumes
docker compose -f docker-compose.ts.yml down -v
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose -f docker-compose.ts.yml logs quizzquizz-ts

# Ensure environment variables are set
echo $TS_AUTHKEY
echo $TAILNET_DOMAIN

# Check Tailscale status
docker exec quizzquizz_ts tailscale status
```

### Can't access from Tailnet
```bash
# Verify Tailscale is authenticated
docker exec quizzquizz_ts tailscale status

# Check if serve config is loaded
docker exec quizzquizz_ts tailscale serve status

# Test locally
docker exec quizzquizz_ts wget -qO- http://127.0.0.1:80/health
```

### Database persistence
The SQLite database is stored in the `quiz-data-ts` volume. To backup:
```bash
docker cp quizzquizz-app:/data/quiz.db ./backup-quiz.db
```

## Security Notes

- **Never commit your `TS_AUTHKEY`**: Add it to `.env` file and add `.env` to `.gitignore`
- **Use reusable keys**: For easier rotation
- **Set expiration**: Auth keys should expire
- **Use ACL tags**: Restrict access with Tailscale ACLs
- **Monitor access**: Check Tailscale admin console regularly

## Integration with External Caddy

If you want to use an external Caddy server (e.g., for custom domains):

1. **Remove the Tailscale serve config** (or disable it)
2. **Configure your external Caddy** to reverse proxy to the Tailscale hostname:
   ```caddyfile
   quizzquizz.aprender.cloud {
       reverse_proxy http://quizzquizz:80
   }
   ```

The internal Caddy will still handle routing to the API server and serving static files.
