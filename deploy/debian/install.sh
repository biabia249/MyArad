#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run as root inside the Debian container.'; exit 1; }
[[ $# == 1 && $1 =~ ^[a-zA-Z0-9.-]+$ && $1 == *.* ]] || { echo 'Usage: bash deploy/debian/install.sh app.example.com'; exit 1; }
node -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1)' || { echo 'Install Node.js 24 first; see README.md.'; exit 1; }
for tool in npm python3 caddy; do command -v "$tool" >/dev/null || { echo "Missing $tool; follow README.md first."; exit 1; }; done
ROOT=$(cd -- "$(dirname -- "$0")/../.." && pwd)
[[ "$ROOT" == /opt/myarad ]] || { echo 'Extract the application into /opt/myarad first.'; exit 1; }
cd "$ROOT"
id myarad >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/myarad --shell /usr/sbin/nologin myarad
install -d -o myarad -g myarad /var/lib/myarad /var/lib/myarad/npm .cache/releases .cache/vasile-venv
if [[ ! -f /etc/myarad.env ]]; then
 cp server/.env.example /etc/myarad.env
 cat >> /etc/myarad.env <<CONFIG
NODE_ENV=production
PORT=3001
PUBLIC_BASE_URL=https://$1
WEB_ORIGIN=https://$1
WEB_ORIGINS=https://$1
DATABASE_PATH=/var/lib/myarad/myarad.sqlite
CONFIG
 chown root:myarad /etc/myarad.env; chmod 640 /etc/myarad.env
fi
printf 'https://%s\n' "$1" > /var/lib/myarad/public-url.txt
chown -R myarad:myarad /opt/myarad /var/lib/myarad
runuser -u myarad -- env npm_config_cache=/var/lib/myarad/npm npm ci
runuser -u myarad -- python3 -m venv .cache/vasile-venv
runuser -u myarad -- .cache/vasile-venv/bin/pip install -r server/vasile/requirements.txt
runuser -u myarad -- env EXPO_PUBLIC_API_URL=/api EXPO_NO_DOTENV=1 node --use-system-ca node_modules/expo/bin/cli export --platform web --output-dir dist --max-workers 2
for service in api web vasile gateway; do install -m 644 "deploy/debian/myarad-$service.service" /etc/systemd/system/; done
sed "s/APP_DOMAIN/$1/g" deploy/debian/Caddyfile > /etc/caddy/Caddyfile.myarad
caddy validate --config /etc/caddy/Caddyfile.myarad --adapter caddyfile
if ! grep -qF 'import /etc/caddy/Caddyfile.myarad' /etc/caddy/Caddyfile; then printf '\nimport /etc/caddy/Caddyfile.myarad\n' >> /etc/caddy/Caddyfile; fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl daemon-reload
systemctl enable --now myarad-api myarad-web myarad-vasile myarad-gateway caddy
systemctl restart myarad-api myarad-web myarad-vasile myarad-gateway
systemctl reload caddy
printf 'Configured https://%s/map. Add server keys in /etc/myarad.env, then restart myarad-api and myarad-vasile.\n' "$1"
