# EC2 Proxy SSL Troubleshooting

## Error: SSL_ERROR_INTERNAL_ERROR_ALERT

This indicates Caddy cannot obtain or serve a valid TLS certificate for your public domain.

## Diagnostic Steps

### 1. Verify DNS Configuration
```bash
# From your local machine, check DNS points to EC2
dig quizzquizz.aprender.cloud

# Should return EC2's public IP address
# Example output:
# quizzquizz.aprender.cloud. 300 IN A 54.123.45.67
```

### 2. Check EC2 Security Group (Firewall)
Caddy needs these ports open:
- **Port 80 (HTTP)**: For Let's Encrypt challenge
- **Port 443 (HTTPS)**: For serving HTTPS traffic

```bash
# On AWS Console:
# EC2 → Security Groups → Select your instance's SG
# Inbound Rules should include:
# - HTTP (80) from 0.0.0.0/0
# - HTTPS (443) from 0.0.0.0/0
```

### 3. Verify Caddy is Running
```bash
# On EC2 instance
sudo systemctl status caddy

# Check if Caddy is listening on ports 80 and 443
sudo netstat -tulpn | grep caddy

# Should show:
# tcp6  0  0 :::80   :::*  LISTEN  1234/caddy
# tcp6  0  0 :::443  :::*  LISTEN  1234/caddy
```

### 4. Check Caddy Logs for Certificate Errors
```bash
# On EC2 instance
sudo journalctl -u caddy -n 100 --no-pager

# Look for errors like:
# - "acme: error: 403"  → DNS not resolving to this server
# - "timeout"           → Port 80 blocked
# - "connection refused" → Firewall blocking
```

### 5. Test Let's Encrypt Challenge Manually
```bash
# On EC2, create test file
sudo mkdir -p /var/www/html/.well-known/acme-challenge
echo "test" | sudo tee /var/www/html/.well-known/acme-challenge/test

# From your local machine, test if accessible
curl http://quizzquizz.aprender.cloud/.well-known/acme-challenge/test

# Should return "test"
# If it doesn't, DNS or firewall issue
```

### 6. Check if Another Service is Using Port 443
```bash
# On EC2 instance
sudo lsof -i :443

# If something other than Caddy is using 443, stop it:
# sudo systemctl stop <other-service>
```

## Common Issues and Fixes

### Issue: DNS Not Pointing to EC2
**Symptom**: `dig` returns wrong IP or no results

**Fix**:
```bash
# In your DNS provider (e.g., AWS Route 53, Cloudflare):
# Create/Update A record:
# Name: quizzquizz.aprender.cloud
# Type: A
# Value: <your-ec2-public-ip>
# TTL: 300

# Find your EC2 public IP:
curl ifconfig.me
```

### Issue: Port 80/443 Blocked
**Symptom**: Caddy logs show timeout or connection refused

**Fix**:
1. Go to AWS Console → EC2 → Security Groups
2. Select security group attached to your instance
3. Edit Inbound Rules
4. Add rules:
   - Type: HTTP, Protocol: TCP, Port: 80, Source: 0.0.0.0/0
   - Type: HTTPS, Protocol: TCP, Port: 443, Source: 0.0.0.0/0
5. Save

### Issue: Caddy Configuration Error
**Symptom**: Caddy fails to start or reload

**Fix**:
```bash
# Validate Caddyfile syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# If errors, check for:
# - Missing closing braces
# - Incorrect environment variable references
# - Invalid directives
```

### Issue: Environment Variables Not Set
**Symptom**: Caddy uses default values instead of your domains

**Fix** (if using systemd environment variables):
```bash
# Verify override file exists
cat /etc/systemd/system/caddy.service.d/override.conf

# Should contain:
# [Service]
# Environment="PUBLIC_DOMAIN=quizzquizz.aprender.cloud"
# Environment="TAILSCALE_HOST=quizzquizz.snow-burbot.ts.net"

# If missing, create it:
sudo mkdir -p /etc/systemd/system/caddy.service.d
sudo tee /etc/systemd/system/caddy.service.d/override.conf <<EOF
[Service]
Environment="PUBLIC_DOMAIN=quizzquizz.aprender.cloud"
Environment="TAILSCALE_HOST=quizzquizz.snow-burbot.ts.net"
EOF

sudo systemctl daemon-reload
sudo systemctl restart caddy
```

## Quick Diagnostic Script

Run this on your EC2 instance:

```bash
#!/bin/bash
echo "=== Caddy Status ==="
sudo systemctl status caddy --no-pager -l

echo -e "\n=== Listening Ports ==="
sudo netstat -tulpn | grep -E ':(80|443)'

echo -e "\n=== Recent Caddy Logs ==="
sudo journalctl -u caddy -n 20 --no-pager

echo -e "\n=== DNS Resolution ==="
dig +short quizzquizz.aprender.cloud

echo -e "\n=== Public IP ==="
curl -s ifconfig.me

echo -e "\n=== Environment Variables ==="
sudo systemctl show caddy | grep Environment
```

Save as `diagnostic.sh`, make executable with `chmod +x diagnostic.sh`, then run `./diagnostic.sh`.

## If Still Not Working

1. **Start with HTTP only** (helps isolate certificate issues):
   ```bash
   # Temporarily edit Caddyfile to use HTTP
   sudo nano /etc/caddy/Caddyfile
   
   # Change first line from:
   # {$PUBLIC_DOMAIN:quizzquizz.aprender.cloud} {
   # to:
   # http://{$PUBLIC_DOMAIN:quizzquizz.aprender.cloud} {
   
   sudo systemctl reload caddy
   
   # Test with:
   curl http://quizzquizz.aprender.cloud
   ```

2. **Check Caddy's data directory permissions**:
   ```bash
   sudo ls -la /var/lib/caddy
   # Should be owned by caddy:caddy
   
   # If not:
   sudo chown -R caddy:caddy /var/lib/caddy
   ```

3. **Enable Caddy debug logging**:
   ```bash
   sudo systemctl edit caddy
   
   # Add:
   [Service]
   Environment="CADDY_DEBUG=1"
   
   sudo systemctl daemon-reload
   sudo systemctl restart caddy
   sudo journalctl -u caddy -f
   ```

## Next Steps After Fix

Once HTTPS is working:
1. Test the full proxy: `curl https://quizzquizz.aprender.cloud/api/health`
2. Verify CORS in browser console
3. Test with actual QuizzQuizz session
