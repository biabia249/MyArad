#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
CREDENTIALS="${MYARAD_RELEASE_CREDENTIALS_FILE:-$HOME/.local/share/myarad-release/credentials.env}"
[[ -f "$CREDENTIALS" ]] || { echo "Missing private release credentials: $CREDENTIALS" >&2; exit 1; }
set -a
source "$CREDENTIALS"
set +a
export JAVA_HOME="${JAVA_HOME:-$HOME/.local/opt/jdk17}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$JAVA_HOME/bin:$HOME/.local/bin:$PATH"
export EXPO_NO_DOTENV=1
export EXPO_PUBLIC_API_URL="${1:-$(cat .cache/public-preview/public-url.txt)}"
EXPO_PUBLIC_API_URL="${EXPO_PUBLIC_API_URL%/}"
[[ "$EXPO_PUBLIC_API_URL" == */api ]] || EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL/api"
[[ "$EXPO_PUBLIC_API_URL" == https://* ]] || { echo 'A reachable HTTPS API URL is required.' >&2; exit 1; }
[[ "$(curl --silent --fail --max-time 15 "$EXPO_PUBLIC_API_URL/health")" == '{"ok":true}' ]] || { echo 'The API is unavailable; start MyArad first.' >&2; exit 1; }
npx expo prebuild --platform android --no-install
(cd android && ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64 --max-workers=2 --console=plain)
"$ANDROID_HOME/build-tools/37.0.0/apksigner" verify android/app/build/outputs/apk/release/app-release.apk
printf '\nRelease built: %s/android/app/build/outputs/apk/release/app-release.apk\nTest it before copying it to .cache/releases/MyArad.apk.\n' "$ROOT"
