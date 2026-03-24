/**
 * Elige el primer puerto libre entre 8081–8090 y arranca Metro.
 * Evita que `expo start` se quede sin servidor cuando 8081 está ocupado
 * y el terminal no es interactivo (no puede preguntar por otro puerto).
 *
 * REACT_NATIVE_PACKAGER_HOSTNAME: fuerza el host en la URL del packager (misma Wi‑Fi que el PC).
 */
const net = require('net');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  reverseTcpPort,
  printReverseList,
  printAdbDevices,
  printAdbSetupHelp,
  resolveAdbPath,
} = require('./adb-reverse-util.cjs');

function canBindPort(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, () => {
      s.close(() => resolve(true));
    });
  });
}

async function firstFreePort(from = 8081, to = 8090) {
  for (let p = from; p <= to; p++) {
    if (await canBindPort(p)) return p;
  }
  return null;
}

(async () => {
  const port = await firstFreePort();
  if (port == null) {
    console.error('No hay puerto libre entre 8081 y 8090. Cierra otros Metro/Expo o procesos en esos puertos.');
    process.exit(1);
  }
  if (port !== 8081) {
    console.log(`Puerto 8081 ocupado; usando ${port} (vuelve a abrir el enlace o el QR con el puerto ${port}).`);
  }

  const projectRoot = path.join(__dirname, '..');
  const passThrough = process.argv.slice(2);
  const useLocalhost = passThrough.includes('--localhost');
  const useTunnel = passThrough.includes('--tunnel');

  if (useLocalhost) {
    console.log(
      `\n[Dev client] Modo --localhost: el móvil usará 127.0.0.1 en el puerto ${port} (túnel USB).\n` +
        'Asegúrate de tener la app nativa "frontend" (com.ego.app) y USB depuración activada.\n'
    );

    const adbExe = resolveAdbPath();
    if (!adbExe) {
      printAdbSetupHelp();
    } else {
      console.log(`[adb] Usando: ${adbExe}\n`);
      console.log('[adb] Iniciando servidor y reverse (Metro)…');
      const rev = await reverseTcpPort(port);
      if (rev.ok) {
        console.log(`[adb] reverse tcp:${port} tcp:${port} — OK (Metro, vía ${rev.via}).`);
      } else if (!rev.adbMissing) {
        console.warn(
          '[adb] reverse Metro falló (¿USB depuración, dispositivo autorizado?).\n' +
            (rev.timedOut ? '    (Timeout: prueba `adb kill-server` y vuelve a ejecutar.)\n' : '') +
            `    Manual: "${path.basename(adbExe)}" reverse tcp:${port} tcp:${port}\n`
        );
        if (rev.stderr?.trim()) console.warn(rev.stderr.trim());
      }

      const apiPort =
        Number(process.env.EXPO_PUBLIC_API_PORT || process.env.EXPO_ADB_REVERSE_API_PORT || '3000', 10) ||
        3000;
      console.log('[adb] Reverse backend (API)…');
      const revApi = await reverseTcpPort(apiPort);
      if (revApi.ok) {
        console.log(`[adb] reverse tcp:${apiPort} tcp:${apiPort} — OK (backend API, vía ${revApi.via}).\n`);
      } else if (!revApi.adbMissing) {
        console.warn(
          `[adb] reverse del backend (puerto ${apiPort}) falló.\n` +
            (revApi.timedOut ? '    (Timeout → adb kill-server)\n' : '') +
            `    Manual: … reverse tcp:${apiPort} tcp:${apiPort}\n`
        );
        if (revApi.stderr?.trim()) console.warn(revApi.stderr.trim());
      }

      await printReverseList();
      await printAdbDevices();
    }
  } else if (!useTunnel) {
    console.log(
      '\n[Red] Modo LAN: el móvil y el PC deben estar en la misma Wi‑Fi (no solo datos 5G).\n' +
        '    Si usas datos u otra red: npm run start:tunnel\n' +
        '    Si usas USB: npm run start:usb\n' +
        '    Para fijar la IP del packager: REACT_NATIVE_PACKAGER_HOSTNAME en el entorno.\n'
    );
  }

  const args = ['expo', 'start', '--port', String(port), ...passThrough];

  const env = { ...process.env };
  if (!env.EXPO_KEEP_CI) delete env.CI;
  // Metro inyecta esto en el bundle: el cliente usará siempre 127.0.0.1 para el API (adb reverse).
  if (useLocalhost) {
    env.EXPO_PUBLIC_DEV_USE_USB = '1';
    console.log(
      '[USB] EXPO_PUBLIC_DEV_USE_USB=1 → el bundle usará http://127.0.0.1:<API>. Recarga la app en el móvil (Reload) si ya estaba abierta.\n'
    );
  }

  const r = spawnSync('npx', args, {
    stdio: 'inherit',
    cwd: projectRoot,
    env,
    shell: true,
  });
  process.exit(r.status ?? 1);
})();
