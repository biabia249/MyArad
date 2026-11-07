import {
  mkdirSync,
  writeFileSync,
  symlinkSync,
  copyFileSync,
  existsSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
const apk = new URL(
  "../android/app/build/outputs/apk/debug/app-debug.apk",
  import.meta.url,
);
const host =
  process.env.MYARAD_DEV_HOST ||
  Object.entries(networkInterfaces())
    .filter(([n]) => !/^(lo|tailscale|docker|veth|br-|tun)/.test(n))
    .flatMap(([, entries]) =>
      (entries || [])
        .filter((a) => a.family === "IPv4" && !a.internal)
        .map((a) => a.address),
    )
    .find((ip) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
if (!host) throw Error("Connect to Wi-Fi or set MYARAD_DEV_HOST.");
statSync(apk);
const metroPort = process.env.MYARAD_METRO_PORT || "8083";
const link = `exp+myarad://?__expo_url=${encodeURIComponent(`http://${host}:${metroPort}`)}`;

const directory = new URL("../public/device-test/", import.meta.url);
mkdirSync(directory, { recursive: true });
const destination = new URL("MyArad-development.apk", directory);
if (existsSync(destination)) unlinkSync(destination);
try {
  symlinkSync(fileURLToPath(apk), fileURLToPath(destination));
} catch {
  copyFileSync(apk, destination);
}
writeFileSync(
  new URL("index.html", directory),
  `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MyArad Android test</title><style>body{font:17px system-ui;max-width:520px;margin:60px auto;padding:24px;background:#f7f8fa;color:#203552}a{display:block;margin:20px 0;padding:18px;background:#214b91;color:white;border-radius:12px;text-align:center;text-decoration:none}p{line-height:1.6}</style><h1>MyArad · Android</h1><p>1. Download and install the development app. Allow installation from your browser when Android asks.</p><a href="./MyArad-development.apk">Download Android APK</a><p>2. Return here after installing, then open the project.</p><a href="${link}">Open MyArad</a><p>Keep this phone on the laptop’s network. The laptop backend and Metro must stay running. This is a development build.</p></html>`,
);
console.log(`Android install page: http://${host}:${metroPort}/device-test/index.html
Keep npm run phones and npm run backend running.
Remove public/device-test before making a release export.`);
