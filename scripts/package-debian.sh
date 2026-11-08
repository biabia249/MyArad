#!/usr/bin/env bash
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
out="${1:-$HOME/Downloads}"
mkdir -p "$out"
# Only committed files enter the distributable; ignored runtime data is excluded.
git archive --format=tar.gz HEAD -o "$out/MyArad-debian-source.tar.gz"
if [[ "${2:-}" == --private ]]; then
 stage=$(mktemp -d)
 trap 'rm -rf "$stage"' EXIT
 python3 - "$stage" <<'PY'
import sqlite3,sys,shutil,os
from pathlib import Path
stage=Path(sys.argv[1]); db=Path('server/data/myarad.sqlite')
if db.exists():
 src=sqlite3.connect(f'file:{db}?mode=ro',uri=True); dest=sqlite3.connect(stage/'myarad.sqlite'); src.backup(dest);dest.close();src.close()
if Path('server/.env').exists():shutil.copyfile('server/.env',stage/'server.env')
signing=Path.home()/'.local/share/myarad-release'
if signing.exists():shutil.copytree(signing,stage/'android-signing')
(stage/'README.txt').write_text('PRIVATE migration data. Contains accounts, conversations and server secrets. Do not publish or add to Git. Follow deploy/debian/README.md. Android signing material must stay private/offline.\n')
for root,dirs,files in os.walk(stage):
 for name in files:os.chmod(Path(root)/name,0o600)
PY
 tar -czf "$out/MyArad-private-migration.tar.gz" -C "$stage" .
 chmod 600 "$out/MyArad-private-migration.tar.gz"
fi
sha256sum "$out/MyArad-debian-source.tar.gz" > "$out/MyArad-debian-source.tar.gz.sha256"
printf 'Source package: %s/MyArad-debian-source.tar.gz\n' "$out"
