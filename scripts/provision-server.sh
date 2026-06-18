#!/usr/bin/env bash
# First-time provisioning for the Tranquil Haven VPS. Runs over SSH from
# the provision-server GitHub workflow. Idempotent — safe to re-run.
#
# Env vars expected:
#   DOMAIN  — e.g. tranquilhaven.coach
#   EMAIL   — Let's Encrypt contact email
#
# Run as the deploy user ("rootor"). Privileged steps are wrapped in
# sudo so this works whether the deploy user is UID 0 or a sudoer.
set -euo pipefail

: "${DOMAIN:?DOMAIN env var required}"
: "${EMAIL:?EMAIL env var required}"

# Detect whether sudo is required (skip sudo prefix when we're already
# uid 0 — running `sudo` as root works too, but this keeps logs clean).
if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo -n"
  # Sanity-check passwordless sudo so we fail fast with a clear message.
  if ! $SUDO true 2>/dev/null; then
    echo "ERROR: this user needs passwordless sudo to provision the box."
    echo "Either run the workflow as root, or grant: ${USER} ALL=(ALL) NOPASSWD:ALL"
    exit 1
  fi
fi

export DEBIAN_FRONTEND=noninteractive
WEB_ROOT="/var/www/tranquilhaven"
DEPLOY_USER="${USER:-$(id -un)}"

echo "==> Updating package index"
$SUDO apt-get update -y

echo "==> Installing nginx, certbot, ufw, rsync, curl"
$SUDO apt-get install -y --no-install-recommends \
  nginx \
  certbot python3-certbot-nginx \
  ufw rsync curl ca-certificates

echo "==> Configuring firewall"
# Don't lock ourselves out of the SSH session in progress.
$SUDO ufw allow OpenSSH || true
$SUDO ufw allow 'Nginx Full' || true
$SUDO ufw --force enable
$SUDO ufw status

echo "==> Creating web root ${WEB_ROOT}/dist (owned by ${DEPLOY_USER})"
$SUDO mkdir -p "${WEB_ROOT}/dist"
if [ ! -f "${WEB_ROOT}/dist/index.html" ]; then
  $SUDO tee "${WEB_ROOT}/dist/index.html" >/dev/null <<'PLACEHOLDER'
<!doctype html>
<html><head><meta charset="utf-8"><title>Tranquil Haven Coaching</title></head>
<body><p>Tranquil Haven Coaching is being prepared. Please come back in a moment.</p></body>
</html>
PLACEHOLDER
fi
# Let the deploy user write the dist/ directory directly (so rsync from
# CI doesn't need sudo). nginx (www-data) reads files via world-execute
# on parents, which is the default.
$SUDO chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${WEB_ROOT}"
$SUDO chmod 755 "${WEB_ROOT}" "${WEB_ROOT}/dist"

echo "==> Writing nginx site config for ${DOMAIN}"
$SUDO tee "/etc/nginx/sites-available/${DOMAIN}" >/dev/null <<NGINX
server {
  listen 80;
  listen [::]:80;
  server_name ${DOMAIN} www.${DOMAIN};

  root ${WEB_ROOT}/dist;
  index index.html;

  server_tokens off;

  location / {
    try_files \$uri \$uri/ \$uri/index.html \$uri.html =404;
  }

  location ^~ /_astro/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
  }

  location ~* \.(png|jpe?g|webp|svg|ico|woff2?|gif|css|js)\$ {
    expires 30d;
    add_header Cache-Control "public";
  }

  location ~* \.html\$ {
    expires 5m;
    add_header Cache-Control "public, must-revalidate";
  }

  location = /robots.txt   { expires off; add_header Cache-Control "no-cache"; }
  location = /llms.txt     { expires off; add_header Cache-Control "no-cache"; }
  location ~* /sitemap.*\.xml\$ { expires off; add_header Cache-Control "no-cache"; }

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

  location ~ /\.(?!well-known) { deny all; }
}
NGINX

$SUDO ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
$SUDO rm -f /etc/nginx/sites-enabled/default

echo "==> Testing nginx config"
$SUDO nginx -t
$SUDO systemctl reload nginx

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
if $SUDO certbot certificates 2>/dev/null | grep -q "Domains:.*${DOMAIN}"; then
  echo "Cert already exists; ensuring renewal hook is in place."
  $SUDO certbot renew --dry-run || true
else
  $SUDO certbot --nginx \
    --non-interactive --agree-tos \
    --redirect \
    --email "${EMAIL}" \
    -d "${DOMAIN}" -d "www.${DOMAIN}"
fi

echo "==> Done. nginx is serving https://${DOMAIN}"
