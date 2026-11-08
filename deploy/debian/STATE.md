# Starea proiectului pentru deployment

Pregătit pe 8 noiembrie 2026, din branch bia. Nu este un deployment verificat pe Debian/Proxmox real. Instalarea folosește Node 24, Python venv și systemd. Nu presupune existența unui domeniu configurat: domeniul este un parametru al instalării.

Catalogul public este în server/data-sources, inclusiv sursele școlilor. Conturile, sesiunile, mesajele, programul, participările și conversațiile AI sunt în SQLite; nu sunt în Git. Configurația privată de pe laptop este server/.env. Copia privată de migrare trebuie transferată separat.

Webul și Android folosesc aceeași interfață DOM în src/features/city. src/app/map.tsx este bridge-ul native/web. ui-system.css conține suprascrierile finale. Catalogul este filtrat la API împotriva URL-urilor de operatori de jocuri, iar locațiile sunt păstrate. Evenimentele expirate și planurile expirate sunt șterse fizic la accesarea API; participarea adaugă automat planuri, fără duplicate.

Datele importate pot fi neconfirmate; respingem ani/luni fără zi. Raportul „toate sunt 1 ianuarie” nu a fost reprodus complet; datele evenimentelor comunității verificate în SQLite erau în noiembrie. Datele publicării nu reprezintă programul evenimentului.

Vasile folosește Groq pe server și catalogul public de locuri. Folosește imaginea pixel wizard din vasile-avatar.json. Butonul flotant este mutabil; există și intrare în meniul web. Istoricul este per utilizator. Nu include datele private ale utilizatorilor în catalogul de recomandări.

APK-ul temporar verificat la ultima pornire este 1.3.1/code9 folosește un hostname temporar. Recompilarea cu domeniul stabil este necesară. Cheia originală se păstrează privat, în afara repo. APK-ul distribuit nu are push închis fără FCM. iOS nu are un release semnat distribuit prin Apple.

Validări anterioare: lint/TypeScript, teste backend pentru planuri, participări idempotente, ștergere/cascade și date parțiale; verificări Chromium și emulator. Au existat corecții pentru carduri de prieteni înghesuite, formularul de locație duplicat, Google Maps extern și scara hărții rămasă în mijloc în map-only. Satelitul este limitat la zoom16 pentru a evita tile-uri indisponibile; alte straturi merg până la19.

Ce urmează: infrastructură cu domeniu stabil; verificare pe container fresh; politici de retenție; surse/date/poze verificate; diagnostic exact pentru datele reclamate; participare la evenimente externe (încă neimplementată); FCM dacă se doresc push când aplicația este închisă; testare reală Android/iOS. Prioritatea de produs și lecțiile hackathonului sunt în WhatWeLearnt.md.

Nu porni quick tunnels pentru deployment. Păstrează conturile și baza existentă. Nu publica server.env, baze SQLite, conversații, parole sau chei Android în Git.
