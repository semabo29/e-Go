# App en el móvil (resumen rápido)

**Primera vez (o tras `git pull` con cambios nativos):** en `frontend`:

1. `npm install`
2. `npm run android:keystore` (keystore del equipo → Google Sign-In)
3. `npx expo prebuild --platform android --clean` (regenera `android/`; no va en git)
4. Desinstala apps viejas en el móvil: `adb uninstall com.ego.app` y `adb uninstall com.ego2.app`
5. `npx expo run:android` (instala **E-Go**, package `com.ego.app`)

**Cada día:**

1. **Backend** en el PC: en `backend` → `npm start` (puerto **3000**).
2. **Cable USB** al móvil, depuración USB activada.
3. En `frontend` → **`npm run start:usb`** (Metro + `adb reverse` para el API).
4. Abre **E-Go** en el móvil (no una build antigua llamada “frontend”).

**Si no tenéis `adb` en el PATH:** suele bastar con tener el SDK en el sitio típico; el script lo localiza. Si no, en PowerShell:  
`$env:ADB_PATH='C:/Users/TU_USUARIO/AppData/Local/Android/Sdk/platform-tools/adb.exe'`

**Sin cable / misma Wi‑Fi que el PC:** `npm start` y que el móvil esté en la misma red; si peta, probad `npm run start:tunnel`.

**`.env` en `frontend`:** API keys / `EXPO_PUBLIC_*` como siempre; sin eso el login Google / mapas pueden fallar.

**Google Sign-In (SHA-1 del equipo):** `npm run android:keystore` antes de compilar. SHA-1: `48:5D:FB:2C:91:EB:8C:35:4D:0E:53:8D:46:EF:F0:50:96:CC:AC:49` · package `com.ego.app`.

### “E-Go” / “frontend” keeps stopping

Casi siempre es **build nativa vieja** en el móvil o en `frontend/android/` (carpeta local, no en git):

| Síntoma | Qué hacer |
|--------|-----------|
| Tras pull, la app cierra al abrir | Pasos “Primera vez” de arriba (`prebuild --clean` + `run:android`) |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | `adb uninstall com.ego.app` y reinstalar |
| Icono “frontend” en lugar de E-Go | Desinstalar esa app; solo usar `com.ego.app` |
| Abrís la app sin Metro | Primero `npm run start:usb`, luego abrir E-Go |

Log del crash (opcional): `adb logcat *:E | findstr -i "AndroidRuntime FATAL"`

