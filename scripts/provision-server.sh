#!/usr/bin/env bash
# First-time provisioning for the Tranquil Haven VPS. Run on the server
# (via SSH from the provision-server GitHub workflow). Idempotent — safe
# to re-run.
#
# Env vars expected:
#   DOMAIN  — e.g. tranquilhaven.coach
#   EMAIL   — Let's Encrypt contact email
set -euo pipefail

: "${DOMAIN:?DOMAIN env var required}"
: "${EMAIL:?EMAIL env var required}"

export DEBIAN_FRONTEND=noninteractive

echo "==> Updating package index"
apt-get update -y

echo "==> Installing nginx, certbot, ufw, rsync, curl"
apt-get install -y --no-install-recommends \
  nginx \
  certbot python3-certbot-nginx \
  ufw rsync curl ca-certificates

echo "==> Configuring firewall"
# Don't lock ourselves out of the SSH session in progress.
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable
ufw status

echo "==> Creating web root /var/www/tranquilhaven/dist"
mkdir -p /var/www/tranquilhaven/dist
if [ ! -f /var/www/tranquilhaven/dist/index.html ]; then
  cat > /var/www/tranquilhaven/dist/index.html <<'PLACEHOLDER'
<!doctype html>
<html><head><meta charset="utf-8"><title>Tranquil Haven Coaching</title></head>
<body><p>Tranquil Haven Coaching is being prepared. Please come back in a moment.</p></body>
</html>
PLACEHOLDER
fi
chown -R www-data:www-data /var/www/tranquilhaven

echo "==> Writing nginx site config for ${DOMAIN}"
cat > "/etc/nginx/sites-available/${DOMAIN}" <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN} www.${DOMAIN};

  root /var/www/tranquilhaven/dist;
  index index.html;

  # Hide nginx version in error headers
  server_tokens off;

  # Astro emits each page as <slug>/index.html. Map clean URLs to those
  # files so /about and /about/ both work without an explicit redirect.
  location / {
    try_files \$uri \$uri/ \$uri/index.html \$uri.html =404;
  }

  # Hashed Astro build assets — fingerprinted, safe to cache aggressively.
  location ^~ /_astro/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  # Other static assets — moderate cache.
  location ~* \.(png|jpe?g|webp|svg|ico|woff2?|gif|css|js)\$ {
    expires 30d;
    add_header Cache-Control "public";
  }

  # HTML pages — short cache so admin edits surface quickly.
  location ~* \.html\$ {
    expires 5m;
    add_header Cache-Control "public, must-revalidate";
  }

  # robots.txt, llms.txt, sitemap — no cache.
  location = /robots.txt   { expires off; add_header Cache-Control "no-cache"; }
  location = /llms.txt     { expires off; add_header Cache-Control "no-cache"; }
  location ~* /sitemap.*\.xml\$ { expires off; add_header Cache-Control "no-cache"; }

  # Security headers
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

  # Block accidental access to dotfiles
  location ~ /\.(?!well-known) { deny all; }
}
NGINX

ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default

echo "==> Testing nginx config"
nginx -t
systemctl reload nginx

echo "==> Verifying DNS for ${DOMAIN}"
got_ip=$(getent ahostsv4 "${DOMAIN}" | awk 'NR==1{print $1}')
want_ip=$(curl -s -4 https://api.ipify.org || true)
echo "  got=${got_ip}  want=${want_ip}"
if [ -z "${got_ip}" ] || [ "${got_ip}" != "${want_ip}" ]; then
  echo "WARN: ${DOMAIN} does not resolve to this server yet (${got_ip} vs ${want_ip})."
  echo "SSL setup will be skipped. Re-run the workflow once DNS has propagated."
  exit 0
fi

echo "==> Obtaining Let's Encrypt certificate"
if certbot certificates 2>/dev/null | grep -q "Domains:.*${DOMAIN}"; then
  echo "Cert already exists; ensuring renewal hook is in place."
  certbot renew --dry-run || true
else
  certbot --nginx \
    --non-interactive --agree-tos \
    --redirect \
    --email "${EMAIL}" \
    -d "${DOMAIN}" -d "www.${DOMAIN}"
fi

echo "==> Done. nginx is serving https://${DOMAIN}"
