import { networkInterfaces } from "node:os";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const addresses = Object.entries(networkInterfaces())
  .filter(([name]) => !/^(lo|tailscale|docker|veth|br-|tun)/.test(name))
  .flatMap(([, entries]) =>
    (entries || [])
      .filter((a) => a.family === "IPv4" && !a.internal)
      .map((a) => a.address),
  );
const host =
  process.env.MYARAD_DEV_HOST ||
  addresses.find((ip) =>
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip),
  );
if (!host)
  throw new Error(
    "No LAN address found. Connect to Wi-Fi or set MYARAD_DEV_HOST.",
  );
const port = process.env.MYARAD_METRO_PORT || "8083";
console.log(
  `Phone API: http://${host}:3001\nExpo Go (iPhone): exp://${host}:${port}\nAndroid dev build: exp+myarad://?__expo_url=${encodeURIComponent(`http://${host}:${port}`)}\nKeep the backend running (npm run backend).`,
);
const child = spawn(
  process.execPath,
  [require.resolve("expo/bin/cli"), "start", "--go", "--lan", "--port", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      REACT_NATIVE_PACKAGER_HOSTNAME: host,
      EXPO_PUBLIC_API_URL: process.env.MYARAD_API_URL || `http://${host}:3001`,
    },
  },
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
