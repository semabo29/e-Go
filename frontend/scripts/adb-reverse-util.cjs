/**
 * adb reverse. Resuelve adb.exe sin PATH; evita bloqueos de `adb -d` en Windows (spawnSync colgado).
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';

/** @type {string | null | undefined} */
let cachedAdbPath;

function parseSdkDirFromLocalProperties() {
  try {
    const lp = path.join(__dirname, '..', 'android', 'local.properties');
    if (!fs.existsSync(lp)) return null;
    const text = fs.readFileSync(lp, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*sdk\.dir\s*=\s*(.+)$/);
      if (!m) continue;
      let v = m[1].trim().replace(/^["']|["']$/g, '');
      v = v.replace(/\\\:/g, ':').replace(/\\\\/g, '\\');
      if (v && fs.existsSync(v)) return v;
    }
  } catch (_) {}
  return null;
}

function resolveAdbPath() {
  if (cachedAdbPath !== undefined) return cachedAdbPath;

  const candidates = [];

  if (process.env.ADB_PATH) {
    const p = process.env.ADB_PATH.trim().replace(/^["']|["']$/g, '');
    candidates.push(p);
  }

  for (const envName of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
    const root = process.env[envName];
    if (root) candidates.push(path.join(root.trim(), 'platform-tools', exe));
  }

  if (process.env.LOCALAPPDATA) {
    candidates.push(
      path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', exe)
    );
  }

  const sdkFromProps = parseSdkDirFromLocalProperties();
  if (sdkFromProps) {
    candidates.push(path.join(sdkFromProps, 'platform-tools', exe));
  }

  if (process.env.HOME) {
    candidates.push(
      path.join(process.env.HOME, 'Library', 'Android', 'sdk', 'platform-tools', exe)
    );
    candidates.push(path.join(process.env.HOME, 'Android', 'Sdk', 'platform-tools', exe));
  }

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      cachedAdbPath = p;
      return cachedAdbPath;
    }
  }

  cachedAdbPath = null;
  return null;
}

function printAdbSetupHelp() {
  const localSdk = parseSdkDirFromLocalProperties();
  const win = process.platform === 'win32';
  const defaultWin = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe')
    : '';

  console.error('\n[adb] No se encontró adb (platform-tools). Sin adb no hay reverse USB.\n');
  if (win) {
    console.error('Opciones (Windows):');
    console.error('  1) Añade al PATH la carpeta platform-tools del Android SDK.');
    console.error('  2) O en PowerShell (ruta con / o \\):');
    if (defaultWin) {
      console.error(`     $env:ADB_PATH='${defaultWin.replace(/\\/g, '/')}'`);
    } else {
      console.error("     $env:ADB_PATH='$env:LOCALAPPDATA\\Android\\Sdk\\platform-tools\\adb.exe'");
    }
    if (localSdk) {
      const adb = path.join(localSdk, 'platform-tools', 'adb.exe');
      console.error('  3) Según android/local.properties:');
      console.error(`     $env:ADB_PATH='${adb.replace(/\\/g, '/')}'`);
    }
  } else {
    console.error('  export ANDROID_HOME=~/Library/Android/sdk   # o tu ruta');
    console.error('  export PATH="$ANDROID_HOME/platform-tools:$PATH"');
  }
  console.error('');
}

/**
 * Ejecuta adb con tope de tiempo (spawnSync puede colgarse con -d en Windows).
 */
function runAdb(adbPath, args, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const child = spawn(adbPath, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill('SIGKILL');
      } catch (_) {}
      resolve({ code: -2, stdout, stderr: `${stderr}\n[adb: timeout ${timeoutMs}ms]`, timedOut: true });
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(err), timedOut: false });
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 0, stdout, stderr, timedOut: false });
    });
  });
}

async function reverseTcpPort(port) {
  const adbPath = resolveAdbPath();
  if (!adbPath) {
    return { ok: false, via: null, adbMissing: true, stderr: '', stdout: '' };
  }

  await runAdb(adbPath, ['start-server'], 8000);

  // Primero sin -d: en Windows `adb -d reverse` a veces bloquea spawnSync si no hay USB puro.
  let r = await runAdb(adbPath, ['reverse', `tcp:${port}`, `tcp:${port}`], 12000);
  if (r.code === 0) {
    return { ok: true, via: 'default', stderr: r.stderr, stdout: r.stdout, timedOut: false };
  }

  r = await runAdb(adbPath, ['-d', 'reverse', `tcp:${port}`, `tcp:${port}`], 12000);
  if (r.code === 0) {
    return { ok: true, via: 'usb (-d)', stderr: r.stderr, stdout: r.stdout, timedOut: false };
  }

  return {
    ok: false,
    via: null,
    adbMissing: false,
    stderr: r.stderr,
    stdout: r.stdout,
    timedOut: r.timedOut,
  };
}

async function printReverseList() {
  const adbPath = resolveAdbPath();
  if (!adbPath) return;
  const r = await runAdb(adbPath, ['reverse', '--list'], 8000);
  const out = (r.stdout || '').trim();
  if (out) console.log('[adb reverse --list]\n' + out + '\n');
  else if ((r.stderr || '').trim()) console.log('[adb]', r.stderr.trim());
  if (r.timedOut) console.warn('[adb] reverse --list tardó demasiado (timeout).\n');
}

async function printAdbDevices() {
  const adbPath = resolveAdbPath();
  if (!adbPath) return;
  const r = await runAdb(adbPath, ['devices', '-l'], 8000);
  const text = (r.stdout || r.stderr || '').trim();
  if (text) console.log('[adb devices -l]\n' + text + '\n');
  if (r.timedOut) console.warn('[adb] devices -l timeout.\n');
}

module.exports = {
  resolveAdbPath,
  reverseTcpPort,
  printReverseList,
  printAdbDevices,
  printAdbSetupHelp,
};
