# What We Learnt — MyArad

Retrospectivă după hackathon, 8 noiembrie 2026.

## Ce știm și ce nu știm

Bogdan a spus că prezentarea a ieșit prost și că proiectul nu a părut suficient de unic. Nu avem aici înregistrarea prezentării, punctajele sau explicațiile juriului. Observațiile despre implementare sunt bazate pe lucrul din repo și pe problemele raportate; explicațiile despre reacția juriului sunt ipoteze, nu verdicte despre echipă.

## Lecția principală

Am construit multe funcții înainte să stabilizăm o experiență centrală și un motiv clar pentru care cineva ar alege MyArad. Numărul de funcții a crescut mai repede decât timpul disponibil pentru integrare, testare pe telefon și pregătirea demonstrației.

Pentru următorul proiect vrem să putem termina fraza: „Pentru [un utilizator concret], rezolvăm [o problemă observată], iar față de alternativa folosită azi oferim [un avantaj demonstrabil].” Dacă această frază rămâne vagă, nu adăugăm încă un modul.

## Ce am făcut bine

- Am livrat un produs funcțional pe web și Android, cu hartă, catalog local, rute, evenimente și funcții sociale.
- Am reacționat la feedback real: prieteni în loc de urmăritori, rute interne, participare legată de program, formular adaptat telefonului și uniformizarea interfeței.
- Am folosit date și servicii existente ca să ajungem repede la un prototip utilizabil.
- Am păstrat cheia originală de semnare Android, am verificat APK-uri instalabile și am introdus teste utile pentru participare, date și program.
- Am identificat transportul public local ca o posibilă direcție centrală. Valoarea acestei alegeri trebuie confirmată cu utilizatori și exemple concrete.

## Ce ne-a costat timp și claritate

### 1. Domeniul proiectului a devenit prea mare

Am pornit de la o hartă cu locuri și evenimente, apoi am adăugat școli, transport, program public, prieteni, mesaje, notificări, AI, favorite și distribuție de APK. Fiecare funcție a adus și stări suplimentare: vizitator/autentificat, permisiuni, ecran mic, date lipsă, eroare de rețea.

**Data viitoare:** alegem un singur traseu principal și cel mult două funcții care îl susțin. Un exemplu pentru MyArad: aleg un eveniment → văd un traseu real cu tramvaiul și mers pe jos → confirm participarea și îl găsesc în program. Chatul și restul rămân în backlog până când acest traseu merge complet.

### 2. Diferențierea nu era suficient de demonstrabilă

Hărți, recomandări AI, evenimente și chat există deja în multe produse. Reunirea lor poate fi utilă, dar nu explică singură de ce o aplicație nouă merită folosită.

**Ipoteză pentru prezentare:** este posibil ca juriul să fi văzut o listă de funcții familiare, fără să rețină avantajul local. Nu putem confirma asta fără feedbackul lor.

**Data viitoare:** alegem o nevoie locală verificată. De exemplu, accesul la evenimente folosind transportul public poate fi direcția, dacă demonstrăm că găsirea traseului și a informațiilor este dificilă în soluțiile actuale. Nu pretindem că această combinație este unică înainte să comparăm alternativele.

### 3. Webul, previzualizarea și APK-ul nu erau mereu aceeași versiune

Unele schimbări existau doar în cod sau în previzualizare. Uneori APK-ul ori site-ul public rămâneau în urmă. Gradle a reutilizat inclusiv resurse DOM/CSS vechi, deși buildul raporta succes. Asta a făcut greu de răspuns la întrebarea „ce versiune testăm?”.

**Data viitoare:** afișăm versiunea și commitul în aplicație; fiecare release are un manifest cu commit, API și hash. După schimbări în interfața DOM verificăm că resursele noi sunt efectiv în APK. Nu numim o funcție „publicată” până când nu este în canalul folosit de colegi.

### 4. Infrastructura temporară a devenit o dependență a produsului

Site-ul depindea de laptop și de un tunel temporar. La schimbarea rețelei sau pierderea tunelului, accesul public putea cădea. Adresa API inclusă în APK obliga apoi la reconstruirea lui dacă domeniul se schimba.

**Data viitoare:** stabilim devreme un backend accesibil la un domeniu stabil. Pregătim înainte de prezentare un scenariu de rezervă cu date locale marcate clar ca demonstrație și o înregistrare scurtă a fluxului real. Nu repornim servicii sau schimbăm rețeaua în ultimele minute fără să știm efectul.

### 5. Datele aveau nevoie de reguli, nu doar de import

Am întâlnit coordonate inexacte, locații lipsă, linkuri nedorite, evenimente expirate și date neconfirmate. O dată incompletă precum un an poate fi interpretată de JavaScript ca 1 ianuarie. Datele salvate ale evenimentelor comunității pe care le-am verificat erau însă în noiembrie; cauza tuturor afișărilor reclamate ca „1 ianuarie” nu a fost reprodusă complet.

**Data viitoare:** păstrăm separat data publicării, data evenimentului și data importului. Nu inventăm date pentru surse incomplete. Fiecare loc are sursă și stare de verificare. Expirarea și politica de păstrare se decid explicit: ascundere, arhivare sau ștergere; nu le tratăm ca fiind același lucru.

### 6. Verificarea pe telefon a venit prea târziu pentru unele fluxuri

Au apărut nume afișate aproape vertical, controale care se suprapuneau, un selector prea mare, probleme la tastatură și un indicator de scară rămas în mijlocul hărții. O pagină corectă pe desktop nu confirma comportamentul pe telefon.

**Data viitoare:** testăm din prima zi la lățime de telefon, cu tastatura deschisă și texte lungi. Verificăm explicit lista, formularul și harta cu panoul minimizat. Emulatorul ajută; telefonul real rămâne necesar pentru tastatură, permisiuni și rețea.

### 7. Am confundat uneori progresul spus cu progresul făcut

În conversație au existat răspunsuri repetate de tipul „fac acum”, fără modificări efective. Asta a consumat timp și a făcut utilizatorul să nu mai știe dacă se lucrează. Este o problemă a modului în care a fost folosit și condus agentul, nu o dovadă că echipa nu a muncit.

**Data viitoare:** fiecare task are rezultat verificabil: fișier schimbat, commit, captură sau build instalat. Raportăm „implementat”, „verificat” și „publicat” separat. Dacă un agent repetă planul fără un diff, intervenim imediat și micșorăm taskul.

## Ce cred că am fi putut greși la prezentare

Acestea sunt ipoteze de verificat, pentru că nu am asistat la prezentare:

- **Prea multe lucruri de explicat.** Dacă am încercat să arătăm toate modulele, problema utilizatorului putea să se piardă. Alegem un singur personaj și un singur drum prin produs.
- **Avantajul putea să nu fie spus înainte de demonstrație.** În primele 20–30 de secunde trebuie să fie clar pentru cine este aplicația și ce îi ușurează.
- **Lipsa unei comparații concrete.** În loc de „avem hartă, AI și evenimente”, arătăm ce pași face utilizatorul azi și ce pași îi scurtăm. Folosim timpi măsurați, nu estimări prezentate ca rezultate.
- **Prea multă promisiune față de ce era stabil.** Distinguem funcțiile demonstrate de cele incomplete: participarea la evenimente externe, push când aplicația este închisă și acoperirea transportului nu trebuie prezentate ca rezolvate integral dacă nu sunt.
- **Demo prea dependent de noroc.** Contul, permisiunile, evenimentul, ruta și rețeaua trebuie pregătite și repetate pe dispozitivul de prezentare.

O prezentare slabă nu dovedește singură că ideea nu poate avea valoare. Nici un prototip cu multe funcții nu dovedește că utilizatorii au nevoie de el. Feedbackul juriului și câteva discuții cu utilizatori ne-ar ajuta să separăm cele două probleme.

## Cum abordăm următorul hackathon

1. Citim criteriile și alegem utilizatorul și problema înainte de lista de funcții.
2. Discutăm, dacă timpul permite, cu câțiva utilizatori relevanți și notăm problema în cuvintele lor. Comparăm cu alternativa pe care o folosesc deja.
3. Scriem într-o propoziție avantajul pe care îl vom demonstra și alegem o măsurătoare simplă.
4. Construim un flux complet minim pe dispozitivul țintă și pe un mediu public stabil.
5. Împărțim munca pe componente clare; folosim branchuri separate, commituri mici și integrăm regulat.
6. Fixăm din start câteva reguli vizuale: culori, fonturi, dimensiuni și tipuri de butoane. Componentele comune primesc aceleași stiluri.
7. Rezervăm explicit ultima parte a timpului pentru integrare și prezentare. Oprim funcțiile noi când începem repetiția; acceptăm doar corecții care blochează demo-ul.
8. Repetăm o prezentare scurtă: problema → un exemplu real → demonstrația → avantajul verificat → ce urmează. Pregătim o înregistrare de rezervă.
9. După jurizare cerem două răspunsuri concrete: „Ce v-a lipsit ca să credeți în utilitate?” și „Ce criteriu ne-a tras cel mai mult în jos?”.

## Ce merită făcut cu MyArad de aici

Înainte de noi funcții, alegem între două direcții de validat: deplasarea la activități locale cu transportul public sau descoperirea activităților și coordonarea unui grup. Discutăm cu utilizatori și măsurăm un flux real înainte să alegem.

Pentru o următoare iterație aș prioritiza un domeniu stabil, aceeași versiune pe web și Android, verificarea surselor și a datelor, apoi o demonstrație de două minute care merge cap-coadă. Vasile poate ajuta la alegerea unui loc, dar diferențierea trebuie să vină dintr-un rezultat util și corect pentru utilizator, nu doar din prezența unui chat AI.
