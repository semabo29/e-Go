/**
 * adb reverse para Metro (8081–8090) y backend típico (3000).
 */
const { reverseTcpPort, printReverseList } = require('./adb-reverse-util.cjs');

const API_PORT =
  Number(process.env.EXPO_PUBLIC_API_PORT || process.env.EXPO_ADB_REVERSE_API_PORT || '3000', 10) ||
  3000;
const METRO_FROM = 8081;
const METRO_TO = 8090;

const ports = [API_PORT];
for (let p = METRO_FROM; p <= METRO_TO; p++) {
  if (!ports.includes(p)) ports.push(p);
}

(async () => {
  let ok = 0;
  for (const p of ports) {
    const r = await reverseTcpPort(p);
    if (r.ok) {
      console.log(`adb reverse tcp:${p} tcp:${p} — OK (${r.via})`);
      ok++;
    }
  }

  if (ok === 0) {
    console.error(
      'No se aplicó ningún reverse. Comprueba: USB, depuración USB, dispositivo visible (adb devices), adb en PATH.\n' +
        'Si hay emulador abierto, ciérralo o usa: adb -s <SERIAL_del_móvil> reverse tcp:3000 tcp:3000'
    );
    process.exit(1);
  }

  await printReverseList();
  console.log(`\nListo: ${ok} reglas reverse (API ${API_PORT} + Metro ${METRO_FROM}–${METRO_TO}).`);
})();
