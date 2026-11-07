export function locationErrorMessage(error: string, ro = true) {
  const messages: Record<string, [string, string]> = {
    insecure: ['Browserul permite localizarea doar prin HTTPS sau localhost. Deschide aplicația pe o adresă securizată.', 'Location requires HTTPS or localhost. Open the app at a secure address.'],
    unsupported: ['Acest browser nu oferă acces la locație. Încearcă un browser actualizat.', 'This browser does not support location. Try an updated browser.'],
    permission: ['Permite accesul la locație pentru MyArad în setările aplicației sau în permisiunile site-ului din browser, apoi reîncearcă.', 'Allow MyArad location in app settings or browser site permissions, then retry.'],
    'permission-blocked': ['Accesul la locație este blocat. Activează-l din setările aplicației, apoi reîncearcă.', 'Location access is blocked. Enable it in app settings, then retry.'],
    'services-disabled': ['Serviciile de localizare sunt oprite. Activează locația/GPS în setările dispozitivului.', 'Location services are off. Enable location/GPS in device settings.'],
    timeout: ['Localizarea a durat prea mult. Verifică locația dispozitivului și conexiunea, apoi reîncearcă.', 'Location timed out. Check device location services and connection, then retry.'],
    imprecise: ['Dispozitivul oferă doar o poziție aproximativă (marjă peste 500 m sau necunoscută). Activează locația precisă/GPS și reîncearcă. Pe laptop, alege manual punctul de plecare.', 'Your device only provides an approximate position (uncertainty over 500 m or unknown). Enable precise location/GPS and retry. On a laptop, choose your starting point manually.'],
    unavailable: ['Poziția nu este disponibilă momentan. Verifică serviciile de localizare ale dispozitivului și reîncearcă.', 'Your position is currently unavailable. Check device location services and retry.'],
  };
  return (messages[error] || messages.unavailable)[ro ? 0 : 1];
}
