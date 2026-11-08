# MyArad pe Debian într-un container Proxmox

Pregătit pentru instalare ulterioară. Nu am instalat pe un Proxmox real în această sesiune. Configurația folosește servicii systemd în LXC, fără Docker și fără tunel. Include webul Expo, API-ul Node/SQLite, Vasile Python și Caddy pentru HTTPS. Codul și catalogul public sunt în Git; datele utilizatorilor și cheile sunt separat, în pachetul privat.

## 1. Container și rețea

În Proxmox creează un CT LXC **unprivileged**, Debian 13, 2–4 vCPU, 6 GB RAM pentru build (4 GB pentru început după instalare), 20 GB disc și IP fix/rezervare DHCP pe bridge-ul LAN. Nu este necesar Docker sau nesting pentru această configurație. Activează pornirea CT-ului la boot. Dacă hostul nu permite serviciile systemd, folosește o VM Debian; nu modifica profilul de securitate al hostului la întâmplare.

Alege un domeniu stabil, de exemplu `myarad.exemplu.ro`. DNS A trebuie să indice IP-ul public; dacă publici și AAAA, IPv6 trebuie să ajungă la container. Pe router redirecționează TCP 80 și 443 către IP-ul CT. Firewallul CT/Proxmox trebuie să permită 80/443, iar SSH doar din rețeaua de administrare; nu expune 3001, 8000, 8080 sau 8082. Cu CGNAT și fără IP public accesibil, simpla redirecționare nu funcționează: este necesar un IP public ori un server public/reverse proxy. Nu porni alt quick tunnel pentru acest deployment.

Pentru test LAN fără domeniu public folosește HTTPS cu o CA internă instalată pe dispozitive. Nu prezenta HTTP pe IP ca echivalent pentru geolocație și autentificarea de producție: aplicația cere HTTPS. Exemplul automat de mai jos este pentru domeniu public și certificat Caddy.

## 2. Transferă și instalează dependențele

Comenzile se execută ca root **în CT**, nu în shell-ul hostului Proxmox. Transferă arhiva source din Downloads prin SCP/Proxmox upload. De exemplu, pe laptop:

```bash
scp ~/Downloads/MyArad-debian-source.tar.gz root@IP_CT:/root/
```

În CT:

```bash
apt update
apt install -y ca-certificates curl xz-utils git python3 python3-venv python3-pip build-essential gnupg debian-keyring debian-archive-keyring apt-transport-https sqlite3
mkdir -p /opt/myarad
tar -xzf /root/MyArad-debian-source.tar.gz -C /opt/myarad
```

Instalează Node.js **24**, aceeași serie verificată local. Nu folosi Node 20/22: backendul folosește SQLite integrat și import TypeScript. Exemplu pentru versiunea 24.22.2:

```bash
NODE_VERSION=v24.22.2
case "$(dpkg --print-architecture)" in
  amd64) NODE_ARCH=x64 ;;
  arm64) NODE_ARCH=arm64 ;;
  *) echo 'Arhitectură nesuportată de acest exemplu'; exit 1 ;;
esac
NODE_DIR=$(mktemp -d)
cd "$NODE_DIR"
NODE_FILE="node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
curl -fSLO "https://nodejs.org/dist/$NODE_VERSION/$NODE_FILE"
curl -fSLO "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt"
awk -v file="$NODE_FILE" '$2 == file' SHASUMS256.txt > CHECKSUM
[ -s CHECKSUM ] && sha256sum -c CHECKSUM
tar -xJf "$NODE_FILE" --strip-components=1 -C /usr/local
node --version
npm --version
```

Caddy, conform instrucțiunilor oficiale pentru Debian:

```bash
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install -y caddy
```

## 3. Configurează aplicația

```bash
cd /opt/myarad
bash deploy/debian/install.sh myarad.exemplu.ro
nano /etc/myarad.env
```

Installerul creează userul `myarad`, instalează dependențele npm/Python, construiește webul cu API relativ `/api`, instalează serviciile și configurează Caddy. Domeniul din argument trebuie înlocuit cu domeniul tău real. La prima rulare se generează `/etc/myarad.env`; la rerulare acesta NU este suprascris. Dacă schimbi domeniul ulterior, actualizează și PUBLIC_BASE_URL, WEB_ORIGIN și WEB_ORIGINS din acest fișier.

Configurație esențială:

```dotenv
NODE_ENV=production
PORT=3001
PUBLIC_BASE_URL=https://myarad.exemplu.ro
WEB_ORIGIN=https://myarad.exemplu.ro
WEB_ORIGINS=https://myarad.exemplu.ro
DATABASE_PATH=/var/lib/myarad/myarad.sqlite
EVENT_POSTING=signed-in
GROQ_API_KEY=completeaza_pe_server
GROQ_MODEL=openai/gpt-oss-20b
```

Completează cheile reale numai în `/etc/myarad.env`. Google OAuth și email sunt opționale: configurația trebuie adaptată noului domeniu, iar în Google trebuie autorizat `https://DOMENIU/auth/google/callback`. Vasile necesită cheia Groq; fără ea pagina se deschide, dar nu poate genera răspunsuri. Descoperirea suplimentară de evenimente folosește opțional Brave/Tavily. Limitele și tarifele acestor servicii sunt ale conturilor configurate.

```bash
systemctl restart myarad-api myarad-vasile
systemctl status myarad-api myarad-web myarad-vasile myarad-gateway caddy --no-pager
```

## 4. Datele existente: migrare privată, opțională

Pachetul source nu conține conturi. Pentru a le păstra, transferă separat `MyArad-private-migration.tar.gz` de pe laptop. Conține baza SQLite și configurarea serverului, inclusiv secrete: nu îl încărca pe GitHub și nu îl pune într-un director servit web.

```bash
# În CT, după transferul arhivei private în /root:
install -d -m 700 /root/myarad-migration
tar -xzf /root/MyArad-private-migration.tar.gz -C /root/myarad-migration
systemctl stop myarad-api
install -o myarad -g myarad -m 600 /root/myarad-migration/myarad.sqlite /var/lib/myarad/myarad.sqlite
```

Restaurarea se face înainte de folosirea serverului nou. Dacă ai folosit deja noul server, salvează mai întâi baza sa prin backup; nu suprascrie WAL/SHM de la o bază activă. Copia privată este creată cu SQLite backup, nu prin copierea unui fișier SQLite aflat în scriere.

Din `server.env` copiază în `/etc/myarad.env` numai cheile serviciilor și opțiunile necesare; nu înlocui domeniul, căile sau porturile Debian cu cele ale laptopului. Pachetul privat include separat backupul semnării Android, dacă există; păstrează-l offline, nu îl instala pe serverul web.

```bash
systemctl start myarad-api
```

**Comportament existent:** la cererile către API sunt șterse fizic evenimentele și planurile expirate. Restaurarea nu schimbă această politică. Decideți o politică de arhivare înainte de a cere păstrarea istoricului.

## 5. Verificarea instalării

```bash
curl --fail http://127.0.0.1:3001/health
curl --fail http://127.0.0.1:8000/health
curl --fail https://myarad.exemplu.ro/api/health
curl --fail -I https://myarad.exemplu.ro/map
journalctl -u myarad-api -u myarad-web -u myarad-vasile -u myarad-gateway -u caddy -n 100 --no-pager
```

Apoi verificați din alt dispozitiv: autentificare, hartă, evenimente, Particip → Program, prieteni, mesaje și răspunsul lui Vasile. Acordarea locației depinde și de browser/dispozitiv. Push cu aplicația închisă încă nu este configurat prin FCM.

## 6. APK pentru noul domeniu

APK-urile vechi au URL-ul temporar Cloudflare încorporat. Nu sunt portabile automat pe domeniul nou și NU sunt incluse ca release valid în acest pachet.

Pe laptopul cu Android SDK/JDK și cheia ORIGINALĂ:

```bash
cd ~/Projects/MyArad
bash scripts/build-android-release.sh https://myarad.exemplu.ro
```

Crește versiunea/versionCode înainte de distribuție. Pentru schimbări doar în DOM/CSS, Gradle a reutilizat uneori bundle-uri vechi: mută directorul generat `android/app/build/generated/assets/react/release` într-un backup din `.cache` înainte de compilare. Verifică certificatul și URL-ul API în APK, apoi instalează-l pe telefon. Nu genera o altă cheie dacă vrei actualizare peste instalările vechi.

```bash
scp android/app/build/outputs/apk/release/app-release.apk root@IP_CT:/tmp/MyArad.apk
# În CT:
install -o myarad -g myarad -m 600 /tmp/MyArad.apk /opt/myarad/.cache/releases/MyArad.apk
```

Actualizează versiunea din `public/download/index.html`. `/download` și `/downloads/MyArad.apk` sunt servite de gateway; până când copiezi un APK nou, endpointul poate răspunde 503, ceea ce este intenționat.

## 7. Update și rollback

Păstrează un backup al `/var/lib/myarad/myarad.sqlite` înainte de modificări de schemă sau schimbări de retenție. Actualizează codul prin Git sau o arhivă nouă, fără a șterge `/var/lib/myarad`, `/etc/myarad.env` ori cheia Android. Rulează `npm ci`, reinstalează cerințele Python dacă s-au schimbat și reconstruiește webul cu EXPO_PUBLIC_API_URL=/api și EXPO_NO_DOTENV=1. Pentru un update fără a distruge webul activ, exportă într-un director nou, păstrează vechile resurse client și schimbă `dist` doar după succes. Repornește serviciile care s-au schimbat; nu trebuie tunel.

Pentru rollback păstrează codul + dist al versiunii anterioare și backupul bazei. Revino la codul precedent; restaurarea bazei se face numai cu API-ul oprit și poate pierde date introduse după backup. Nu face force-push pentru rollback.

## 8. Backup

```bash
install -d -m 700 /root/myarad-backups
sqlite3 /var/lib/myarad/myarad.sqlite ".backup '/root/myarad-backups/myarad.sqlite'"
cp /etc/myarad.env /root/myarad-backups/server.env
chmod 600 /root/myarad-backups/*
```

Copiază backupurile și în altă locație. Un snapshot Proxmox ajută pentru rollback, dar nu înlocuiește verificarea restaurării bazei și a secretelor.

## Context pentru alt agent

Citește `WhatWeLearnt.md`, `docs/ui-polish-nov8.md`, `docs/android-release.md` și `deploy/debian/STATE.md`. Branchul de dezvoltare folosit este `bia`; nu presupune că main are ultimele modificări. Respectă `AGENTS.md`.

Surse de instalare: [Node.js](https://nodejs.org/en/download), [Caddy Debian](https://caddyserver.com/docs/install#debian-ubuntu-raspbian), [Proxmox containers](https://pve.proxmox.com/pve-docs/chapter-pct.html).
