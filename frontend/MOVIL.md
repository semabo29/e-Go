# App en el móvil (resumen rápido)

**Primera vez:** en `frontend` → `npm install` → `npx expo run:android` (tarda, instala la app “frontend” en el teléfono; hace falta Android Studio / SDK).

**Cada día:**

1. **Backend** en el PC: en `backend` → `npm start` (o lo que uséis; puerto **3000**).
2. **Cable USB** al móvil, depuración USB activada.
3. En `frontend` → **`npm run start:usb`** (Metro + `adb reverse` para el API).
4. Abre la app **frontend** en el móvil y recarga si hace falta.

**Si no tenéis `adb` en el PATH:** suele bastar con tener el SDK en el sitio típico; el script lo localiza. Si no, en PowerShell:  
`$env:ADB_PATH='C:/Users/TU_USUARIO/AppData/Local/Android/Sdk/platform-tools/adb.exe'`

**Sin cable / misma Wi‑Fi que el PC:** `npm start` y que el móvil esté en la misma red; si peta, probad `npm run start:tunnel`.

**`.env` en `frontend`:** API keys / `EXPO_PUBLIC_*` como siempre; sin eso el login Google / mapas pueden fallar.
