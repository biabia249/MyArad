import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const python = fileURLToPath(
  new URL("../../.cache/vasile-venv/bin/python", import.meta.url),
);
const child = spawn(
  python,
  [
    "-m",
    "uvicorn",
    "server.vasile.agent:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
  ],
  {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: process.env,
    stdio: "inherit",
  },
);
child.on("error", () => {
  console.error(
    "Vasile: Python environment missing. Run the public launcher to install it.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
