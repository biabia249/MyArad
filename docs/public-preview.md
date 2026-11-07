# Public HTTPS testing

On the Linux development laptop, run:

```bash
~/start-myarad.sh
```

The home-folder wrapper runs `scripts/start-public-preview.sh` in this checkout.
Each run stops this launcher's old services and existing MyArad development servers,
builds the production web app with `EXPO_PUBLIC_API_URL=/api`, starts Vasile, the API and
production web server, then prints a public HTTPS Cloudflare Quick Tunnel URL.
Use that URL on the laptop, phones, and computers on other networks. No local CA
installation or inbound router/firewall port forwarding is needed.

```bash
~/start-myarad.sh --status
~/start-myarad.sh --stop
```

The public link changes on restart. Keep the laptop connected and awake. This is a
temporary test preview, not permanent hosting. The launcher preserves the SQLite
database and source files. It never kills unrelated processes holding its ports.
Services and logs are recorded under `.cache/public-preview/`; a PID's recorded
start time is checked before stopping its process group.

The frontend and API share the public HTTPS origin. The gateway routes `/api/*`,
OAuth/reset callback paths and `/health` to the backend; it serves a production
web build rather than exposing Metro's debugger. Authentication uses existing
accounts. Google OAuth needs its public callback URL registered with Google;
rotating test hostnames do not update the Google console automatically.

First run downloads cloudflared from Cloudflare's official GitHub release and
verifies GitHub's SHA-256 digest before making it executable. It requires Linux,
Node 24+, npm, curl, flock, setsid and ss. The wrapper expects this checkout at
`~/Projects/MyArad`.

Reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

Vasile requires a server-side `GROQ_API_KEY` in `server/.env`; see `vasile.md`.
