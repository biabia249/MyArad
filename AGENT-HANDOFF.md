# Start here — MyArad

Ultima cerere: proiectul este împachetat pentru deployment **ulterior** pe Debian LXC/Proxmox. Nu porni tuneluri, nu face deployment și nu începe noi funcții fără o cerere nouă. Păstrează această stare ca punct de reluare.

## Repository-ul corect

Fork personal: https://github.com/iceworld009/MyArad . Versiunea de lucru este **bia**, nu presupune că branchul implicit/main este actualizat.

```bash
git clone --branch bia git@github.com:iceworld009/MyArad.git
```

Pe laptopul original: `/home/bogdan/Projects/MyArad`, remote `iceworld` = fork personal, `origin` = `biabia249/MyArad`. Push-ul viitor cerut de utilizator este în forkul personal. Nu face force-push și nu suprascrie modificările altcuiva.

## Citește în această ordine

1. `AGENTS.md` — convenții și documentație Expo înainte de schimbări native.
2. `WhatWeLearnt.md` — retrospectivă și reducerea domeniului proiectului.
3. `deploy/debian/STATE.md` — funcții, limitări și probleme încă neconfirmate.
4. `deploy/debian/README.md` — instalare, migrare, HTTPS, APK și backup.

## Ce există pe laptop, dar nu în Git

- `~/Downloads/MyArad-debian-source.tar.gz`: codul comis și catalogul public, fără node_modules/dist, conturi sau secrete. Necesită internet pentru instalarea dependențelor și un build nou.
- `~/Downloads/MyArad-private-migration.tar.gz`: snapshot SQLite, `server.env` și backupul semnării Android, dacă exista. Acest fișier conține informații private reale; nu îl publica. Copie în proiect, ignorată de Git: `.cache/deployment-private/`.
- `~/Desktop/MyArad-Deploy-Debian.md`: copie a ghidului; varianta din Git este sursa actuală.
- `~/Desktop/MyArad-handoff.txt`: istoric local lung, unele URL-uri/statusuri vechi. Preferă fișierele de aici pentru deployment.

Arhiva privată este un snapshot la data împachetării, nu un backup care se actualizează singur. Dacă aplicația mai este folosită, generează un snapshot nou înainte de migrarea finală. La mutarea configurației schimbă domeniul și căile pentru Debian; nu copia setările laptopului integral peste cele generate pe server.

## Lucruri care nu trebuie considerate gata

- Instalarea pe un Debian/Proxmox nou NU a fost executată aici; scripturile au fost verificate sintactic, iar arhivele au fost inspectate.
- APK-ul are versiunea 1.2.2/code6, dar recuperarea ultimului tunel a eșuat la verificarea URL-ului în APK și a fost întreruptă când s-a cerut împachetarea. Nu distribui fișierul local/public ca release valid pentru un domeniu nou. Reconstruiește cu domeniul stabil și verifică URL-ul în bundle, certificatul original și instalarea reală.
- Schimbarea variabilei EXPO_PUBLIC_API_URL sau a CSS-ului nu garantează că Gradle/Metro regenerează resursele. Verifică conținutul APK-ului; build reușit nu înseamnă interfață actuală.
- „Toate datele sunt 1 ianuarie” nu a fost reprodus integral. Datele comunității verificate în SQLite erau în noiembrie; am respins datele parțiale importate. Cere evenimentul și ecranul exact dacă problema reapare.
- Participarea la evenimente importate din surse externe, push cu aplicația închisă prin FCM și release-ul iOS rămân de făcut.
- „Signed-in” pentru publicarea evenimentelor înseamnă autentificat, nu email verificat. Nu prezenta această politică de prototip ca verificare de identitate.
- La accesarea API-ului se șterg fizic evenimentele și planurile expirate. Salvează baza înainte de restaurare/migrare dacă se dorește păstrarea istoricului.

Cheia Android originală: `~/.local/share/myarad-release/credentials.env` și keystore-ul asociat. Nu afișa conținutul și nu genera altă cheie pentru actualizări peste instalările existente.
