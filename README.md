# MyArad

A bilingual Arad city guide built with Expo SDK 58, React Native and TypeScript.
Explore places on satellite, street and cycling maps; plan public-transport journeys;
create community events; and keep a personal schedule that becomes public only by choice.

## Run locally

Requires Node.js 24+, npm, and an Android development client for native testing.

```bash
npm ci
cp -n .env.example .env.local
cp -n server/.env.example server/.env
npm run backend
```

In another terminal:

```bash
npm run web
# or, with the installed development client:
npx expo start --dev-client
```

The Android emulator reaches the API through `http://10.0.2.2:3001`.
The browser uses its own hostname for this development address. Physical phones
need your computer's LAN address in `.env.local` and a reachable development server.

To install or rebuild the Android development client, start an emulator, configure
`JAVA_HOME` and `ANDROID_HOME`, and run `npm run android`. The native build requests
CMake 3.31.1 only on Windows; Linux and EAS use the standard Expo Android toolchain.
Native iOS builds require the appropriate Apple build/signing environment.

## Pages

- **Explore:** places, events, source details, corrections, satellite/street/cycling layers.
- **Get there:** in-app journey plans with walking/transit legs, route geometry, lines and stops.
- **Events:** publish, attend, and ask questions.
- **Schools & UAV:** education locations.
- **My schedule:** save visits with dates/times; private by default.
- **Public profile:** an opted-in schedule at `/citizen/USERNAME`.

Public transport uses the public service behind the official Transport Public Arad
portal. Ticket purchase/validation stays in that official service. Availability and
journey estimates depend on the operator; MyArad does not claim live vehicle tracking.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run test:backend
```

Tests cover authentication, event validation, attendance, comments, private/public
schedule access, plan ownership, and transit request validation/caching.

## Documentation

- [Prototype testing, data sources and limits](docs/hackathon-testing.md)
- [Linux Android development](docs/android-development-linux.md)
- [Authentication and provider credentials](AUTHENTICATION.md)
- [Windows Android build tools](docs/android-development.md)

SQLite data and local environment files are ignored by Git. The prototype permits
any signed-in account to publish events when `EVENT_POSTING=signed-in`; password
signup does not verify email ownership. Production requires an HTTPS backend,
appropriate origins, deployment configuration, and physical-device testing.

## Deploy later to Debian / Proxmox

See [deploy/debian/README.md](deploy/debian/README.md) for a fresh Debian LXC setup with systemd, Caddy HTTPS, SQLite migration and stable-domain APK instructions. Read [WhatWeLearnt.md](WhatWeLearnt.md) and [deployment context](deploy/debian/STATE.md) before continuing development.

Create the source package from the committed revision with `bash scripts/package-debian.sh ~/Downloads`. Add `--private` as the second argument only when creating the separate confidential migration backup; this contains real accounts and keys and must not be uploaded to GitHub.

For another coding agent, begin with [AGENT-HANDOFF.md](AGENT-HANDOFF.md). The current development branch in the personal fork is `bia`.
