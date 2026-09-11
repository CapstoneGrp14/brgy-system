# Single-EC2 PoC deployment

## Why the API is served from `brgy591.site/api` and not `api.brgy591.site`

`apps/web/src/api/client.ts` uses `baseURL: '/api/v1'`, the silent-refresh call
is `axios.post('/api/v1/auth/refresh')`, and `realtime/socket.ts` uses `io('/')`.
All relative, and none of them set `withCredentials`. Pointing the SPA at a
different subdomain would mean the httpOnly refresh cookie is never sent, so
every page reload logs the user out. Same-origin also sidesteps CORS entirely.

`api.brgy591.site` still resolves (see its vhost) for Postman/integrations.

## Install

    sudo cp deploy/nginx/*.conf /etc/nginx/sites-available/
    sudo ln -s /etc/nginx/sites-available/brgy591.site.conf       /etc/nginx/sites-enabled/
    sudo ln -s /etc/nginx/sites-available/api.brgy591.site.conf   /etc/nginx/sites-enabled/
    sudo ln -s /etc/nginx/sites-available/minio.brgy591.site.conf /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx

## Build and publish the SPA

    npm ci
    npm run build -w @brgy/shared
    npm run build -w @brgy/web
    sudo mkdir -p /var/www/brgy591
    sudo rsync -a --delete apps/web/dist/ /var/www/brgy591/dist/

Re-run the last two lines on every deploy.

## Required env (api + worker containers)

    NODE_ENV=production                   # makes the refresh cookie Secure
    WEB_URL=https://brgy591.site          # used in outbound emails

    MINIO_ENDPOINT=minio                  # internal, inside the compose network
    MINIO_PORT=9000
    MINIO_USE_SSL=false
    MINIO_PUBLIC_ENDPOINT=minio.brgy591.site
    MINIO_PUBLIC_PORT=443
    MINIO_PUBLIC_USE_SSL=true             # added in storage.service.ts

    JWT_ACCESS_SECRET=<32+ random bytes>
    JWT_REFRESH_SECRET=<different 32+ random bytes>

Generate secrets with:  openssl rand -hex 32

## Lock the container ports to loopback

docker-compose publishes on 0.0.0.0, which bypasses nginx and exposes MySQL,
Redis, RabbitMQ and the MinIO console to the internet. In a compose override:

    services:
      api:     { ports: ["127.0.0.1:3000:3000"] }
      minio:   { ports: ["127.0.0.1:9002:9000", "127.0.0.1:9003:9001"] }
      mysql:   { ports: [] }
      redis:   { ports: [] }
      rabbitmq:{ ports: [] }
      web:     { ports: [] }          # nginx serves the built SPA instead

EC2 security group: inbound 80/443 only (ideally limited to Cloudflare ranges),
plus 22 from your IP.

## Cloudflare

- SSL/TLS mode **Full (strict)**, with a Cloudflare Origin Certificate installed
  at the `ssl_certificate` paths above. "Flexible" will cause a redirect loop.
- WebSockets: on (Network tab) — needed for SOS alerts and staff chat.
- `minio` subdomain: add a Cache Rule to **Bypass cache**. Presigned URLs carry
  per-user signatures and expire; caching them serves stale or cross-user files.
- Free plan caps uploads at 100 MB — fine here (photos 5 MB, CSV 2 MB).
