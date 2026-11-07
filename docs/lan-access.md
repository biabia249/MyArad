# Open MyArad from another laptop

Run these steps on the **hosting laptop**, currently `172.20.10.8`.
Both laptops must be on the same LAN/hotspot, with client isolation disabled by
the network administrator if that network uses it. Keep the firewall enabled.

1. Pull the current `bia` branch and run `npm install`.
2. In `.env.local`, set `EXPO_PUBLIC_API_URL=http://172.20.10.8:3001`.
3. In `server/.env`, set `WEB_ORIGIN=http://172.20.10.8:8081`.
4. In separate terminals, run `npm run backend` and `npm run web:lan`.
5. On the other laptop open `http://172.20.10.8:8081/map`.

Do not run Expo with `--localhost` when sharing it over the network.
Restart the backend after changing server settings; restart Expo after changing
`.env.local`. If the hosting IP changes, update these addresses and restart both.
Development automatically permits this server's private interface addresses on
web ports 8081/8082. `WEB_ORIGIN` is always honored; extra exact origins can be
listed in `WEB_ORIGINS`, separated by commas. Production only uses explicit
origins and still requires an HTTPS API.

## Windows Firewall on the hosting laptop

Check which profile the hosting Wi-Fi uses:

```powershell
Get-NetConnectionProfile
```

Preview the project rule (no changes):

```powershell
.\scripts\allow-lan-access.ps1 -LocalAddress 172.20.10.8
```

In an **Administrator PowerShell**, apply it for a Private network:

```powershell
.\scripts\allow-lan-access.ps1 -LocalAddress 172.20.10.8 -Profile Private -Apply
```

If the hosting network is reported as Public, explicitly use `-Profile Public`
instead. The rule is restricted to Node.js, this local IP, TCP ports 3001/8081,
and computers on the local subnet. It does not disable the firewall or change
the network profile. If Node.js is reinstalled at a different path, rerun the rule.

To remove this project's rule later:

```powershell
Remove-NetFirewallRule -Name MyArad-Development-LAN-TCP
```

## Diagnose the two independent failures

From the other laptop, open `http://172.20.10.8:3001/health`. It should return
`{"ok":true}`. If that address times out, check the server process, firewall,
network connection, and hotspot/client isolation; CORS cannot fix a blocked TCP
connection. For Windows clients you can also run:

```powershell
Test-NetConnection 172.20.10.8 -Port 3001
Test-NetConnection 172.20.10.8 -Port 8081
```

If health works but the app reports CORS, check that the origin (scheme, host,
and web port) is allowed and restart the backend. Allowed preflights return 204
with the exact `Access-Control-Allow-Origin`; blocked origins now return 403.

Browser geolocation needs HTTPS or localhost. Opening the LAN site over plain
HTTP allows ordinary app testing but does not enable browser GPS; use a trusted
HTTPS deployment/tunnel for location testing on the other laptop.
