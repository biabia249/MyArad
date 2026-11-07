#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PATH="$HOME/.local/bin:$PATH"
STATE="$ROOT/.cache/public-preview"
mkdir -p "$STATE"
exec 9>"$STATE/launcher.lock"
flock -x 9
NODE="$(command -v node)"
CLOUDFLARED="$ROOT/.cache/tools/cloudflared"
stop_managed() {
  local file pid saved current
  for file in "$STATE"/*.pid; do
    [[ -f "$file" ]] || continue
    read -r pid saved < "$file" || continue
    current="$(awk '{print $22}' "/proc/$pid/stat" 2>/dev/null || true)"
    if [[ "$current" == "$saved" && -n "$saved" ]]; then kill -TERM -- "-$pid" 2>/dev/null || true; fi
    rm -f "$file"
  done
}
stop_legacy() {
  local pid cwd command
  while read -r pid; do
    [[ -n "$pid" && -d "/proc/$pid" ]] || continue
    cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
    [[ "$cwd" == "$ROOT" ]] || continue
    command="$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)"
    case "$command" in
      *'server/index.mjs'*|*'scripts/https-dev.mjs'*|*'node_modules/.bin/expo start'*|*'node_modules/expo/bin/cli start'*) kill -TERM "$pid" 2>/dev/null || true;;
    esac
  done < <(ss -ltnpH 2>/dev/null | awk '$4 ~ /:(3001|8080|8081|8082|8083|8443)$/ {while(match($0,/pid=[0-9]+/)){print substr($0,RSTART+4,RLENGTH-4);$0=substr($0,RSTART+RLENGTH)}}' | sort -u)
}
if [[ "${1:-}" == --status ]]; then cat "$STATE/public-url.txt" 2>/dev/null || true; ss -ltnpH | awk '$4 ~ /:(3001|8080|8082)$/'; exit 0; fi
stop_managed
stop_legacy
if [[ "${1:-}" == --stop ]]; then echo 'MyArad stopped.'; exit 0; fi
rm -f "$STATE/public-url.txt"
success=0
trap 'if [[ "$success" != 1 ]]; then stop_managed; echo "Startup failed. See logs in $STATE" >&2; fi' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
for attempt in {1..40}; do
 if ! ss -ltnH | awk '$4 ~ /:(3001|8080|8082)$/' | grep -q .; then break; fi
 sleep .25
done
if ss -ltnH | awk '$4 ~ /:(3001|8080|8082)$/' | grep -q .; then echo 'A required port is held by another process; it was not killed.' >&2; exit 1; fi
if [[ ! -x "$CLOUDFLARED" ]]; then "$NODE" --use-system-ca scripts/download-cloudflared.mjs "$CLOUDFLARED"; fi
[[ -d node_modules ]] || npm ci
printf '\nBuilding MyArad with a same-origin HTTPS API…\n'
EXPO_PUBLIC_API_URL=/api "$NODE" --use-system-ca node_modules/expo/bin/cli export --platform web --output-dir dist --max-workers 2 --clear > "$STATE/build.log" 2>&1 || { tail -30 "$STATE/build.log"; exit 1; }
launch() {
 local name="$1"; shift
 nohup setsid "$@" < /dev/null > "$STATE/$name.log" 2>&1 9>&- &
 local pid=$!
 printf '%s %s\n' "$pid" "$(awk '{print $22}' "/proc/$pid/stat")" > "$STATE/$name.pid"
}
launch web env EXPO_PUBLIC_API_URL=/api "$NODE" --use-system-ca node_modules/expo/bin/cli serve --port 8082
launch gateway env MYARAD_PUBLIC_URL_FILE="$STATE/public-url.txt" "$NODE" server/public-preview.mjs
launch tunnel "$CLOUDFLARED" tunnel --url http://127.0.0.1:8080 --protocol http2 --no-autoupdate
for attempt in {1..120}; do
 url="$(sed -nE 's/.*(https:\/\/[a-z0-9-]+\.trycloudflare\.com).*/\1/p' "$STATE/tunnel.log" | head -1)"
 [[ -z "$url" ]] || break
 sleep 1
done
if [[ -z "${url:-}" ]]; then tail -20 "$STATE/tunnel.log"; exit 1; fi
printf '%s\n' "$url" > "$STATE/public-url.txt"
launch api env NODE_ENV=production PUBLIC_BASE_URL="$url" WEB_ORIGIN="$url" WEB_ORIGINS="$url" PORT=3001 "$NODE" --use-system-ca --env-file-if-exists=server/.env server/index.mjs
ready=0
for attempt in {1..120}; do
 if curl --silent --fail --max-time 3 http://127.0.0.1:8080/api/health > /dev/null && curl --silent --fail --max-time 3 http://127.0.0.1:8080/map > /dev/null; then ready=1; break; fi
 sleep 1
done
[[ "$ready" == 1 ]] || { tail -15 "$STATE/api.log" "$STATE/web.log"; exit 1; }
success=1
printf '\nMyArad is running. Share this HTTPS link on any network:\n\n  %s/map\n\n' "$url"
printf 'Logs: %s\nRerun ~/start-myarad.sh to restart; --stop to stop; --status to show the URL.\n' "$STATE"
printf 'Keep this laptop online. The public URL changes on restart.\n'
