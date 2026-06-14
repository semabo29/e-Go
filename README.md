
## 🌐 Idioma / Language
* Español (Versión actual)
* [English (English version)](README.en.md)
---

<div align="center">
  <h1>e-Go: Movilidad Eléctrica Inteligente</h1>
  <p><em>Aplicación móvil nativa para la optimización y gestión de la movilidad eléctrica en Cataluña.</em></p>

  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Coverage_>80%25-4MIN1G?style=flat-square&logo=sonarcloud&logoColor=white" alt="SonarCloud Coverage" />
</div>

**e-Go** es una app diseñada para la gestión de movilidad urbana sostenible y el reporte de incidencias. Permite a los conductores de vehículos eléctricos planificar sus rutas de forma inteligente segun su vehículo y autonomía, localizar puntos de recarga en tiempo real y participar en una comunidad activa mediante dinámicas de gamificación.

---

## 📲 Descargar la app e-Go

Landing page oficial del proyecto e-Go donde se detalla el funcionamiento de la aplicación móvil y se proporciona el enlace de descarga directa de la APK para dispositivos Android.

<div align="center">
  <br />
  <a href="https://www.paupedrejon.com/es/proyectos/ego" target="_blank">
    <img src="https://img.shields.io/badge/Visitar_Landing_Page-00875A?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Landing Page" />
  </a>
  <a href="../../releases/latest" target="_blank">
    <img src="https://img.shields.io/badge/Descargar_APK_(Android)-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Descargar APK" />
  </a>
  <br />
</div>

> ℹ️ **Nota para la instalación de la APK:** Al no estar en Google Play Store, la primera vez que abras el archivo `.apk` tu dispositivo Android te pedirá activar el permiso de *"Instalar aplicaciones de fuentes desconocidas"*. Es completamente seguro.

---

## ✨ Características y Funcionalidades Principales

* 🗺️ **Mapa Interactivo en Tiempo Real:** Visualización y filtrado de más de 2.300 puntos de recarga activos en Cataluña, integrados directamente con el dataset de *Dades Obertes* (ICAEN).
* 🚗 **Rutas Inteligentes y Autonomía:** Planificación de trayectos con cálculo dinámico basado en la autonomía restante del vehículo. Desvía la ruta automáticamente hacia un cargador compatible si es necesario.
* 🛠️ **Gestión de Incidencias:** Sistema comunitario para reportar averías, vandalismo o mal funcionamiento en las estaciones de carga, manteniendo la información actualizada para todos los usuarios.
* 🎮 **Gamificación y Ránking:** Mecánica de recompensas donde los usuarios acumulan puntos al realizar cargas o validar incidencias. Los puntos permiten desbloquear skins (cosméticos) para el vehículo virtual y competir en un ránking global.
* 💳 **Suscripción Premium:** Modelo freemium integrado con anuncios (AdMob) y una opción de suscripción de pago (vía Stripe) para eliminar la publicidad y obtener ventajas exclusivas.
* 🌍 **Multiidioma (i18n):** Interfaz completamente localizada en Catalán, Español, Inglés e Italiano.
* 🎫 **Integración Cultural (API Aplec):** Conexión con eventos culturales locales para sugerir actividades cercanas al usuario mientras espera que su vehículo se cargue.

### 👥 Roles del Ecosistema
1. **Conductor:** Búsqueda de rutas eficientes, carga, reporte de incidencias y participación en el sistema de puntuación.
2. **Empresa:** Gestión de sus propias estaciones, monitorización de incidencias reportadas en su infraestructura y visualización de analíticas de demanda.
3. **Administrador:** Moderación global de la plataforma, validación de incidencias críticas, control de usuarios y mantenimiento del catálogo de estaciones.

---

## 🏗️ Arquitectura del Proyecto

El repositorio está dividido en dos microservicios principales que separan el Frontend móvil nativo de un Backend robusto y desacoplado:

### 📱 Frontend (`/frontend`)
* **Framework:** React Native con [Expo](https://expo.dev/) (TypeScript).
* **Navegación:** Estructura basada en directorios mediante Expo Router (Tabs & Stack).
* **Gestión de Estado:** `AuthContext` para el ciclo de vida del usuario y persistencia de sesión.
* **Vistas Clave:**
    * `(tabs)/index.tsx`: Pantalla principal dinámica (Bienvenida adaptativa vs. Dashboard de usuario).
    * `login.tsx`: Flujo de autenticación nativa con Google.
    * `explore.tsx`: Exploración avanzada de servicios, rutas y estaciones sobre mapas.

### ⚙️ Backend (`/backend`)
* **Entorno:** Node.js + Express (JavaScript/JSX).
* **Base de Datos:** PostgreSQL (Relacional) estructurado para entornos Cloud (AWS RDS).
* **Autenticación y Seguridad:** Validación de Google OAuth 2.0 y uso de JSON Web Tokens (JWT) para control de acceso basado en roles.
* **Estructura Interna:**
    * `routes/`: Endpoints modulares y desacoplados (auth, stations, cars, etc.).
    * `lib/`: Configuración centralizada de la base de datos (`db.js`) y utilidades auxiliares.

---

## 🗄️ Gestión de Base de Datos (SQL)

La base de datos se inicializa y actualiza mediante scripts secuenciales numerados que se encuentran en la carpeta `backend/sql/`. Deben ejecutarse en orden estricto para generar correctamente las tablas, relaciones y datos semilla (seeders):

1. `001_create_users.sql`: Estructura de la tabla de usuarios y esquemas base.
2. `002_create_admins.sql`: Estructura y privilegios de la tabla de administradores.
3. `003_create_stations.sql`: Definición geométrica y lógica de estaciones de carga y servicios.
4. `...` *(Siguientes scripts automatizados para el despliegue continuo en la infraestructura de AWS en producción).*

---

## 🚀 Guía de Instalación y Configuración Local

### 1. Requisitos Previos
* **Node.js** (v18 o superior).
* **PostgreSQL** instalado y ejecutándose localmente.
* Credenciales configuradas en **Google Cloud Console**.
* **Android Studio** instalado con la siguiente configuración en el *SDK Manager*:
    * *SDK Platforms:* Android 14.0 ("UpsideDownCake").
    * *SDK Tools:* Android SDK Build-Tools, NDK (Side by side), Android SDK Command-line Tools (latest), CMake y Android Emulator.

### 2. Configuración de Variables de Entorno de Sistema
#### 2.1 Configuración de las Variables de Entorno (Linux): (.bashrc  o .zshrc)
nano ~/.bashrc     
Añadir el bloque de Android: (copiar todo y pegar al final) :
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

Aplicar los cambios: (.bashrc  o .zshrc)
source ~/.bashrc

#### 2.1 Configuración de las Variables de Entorno (Windows):
Buscar en Windows: "Editar las variables de entorno del sistema".
Botón "Variables de entorno".
En "Variables de usuario" darle a Nueva:
Nombre: ANDROID_HOME
Valor: %LOCALAPPDATA%\Android\Sdk
En "Variables del sistema" buscar "Path", darle a Editar y añadir estas 3 rutas:
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin

#### Actualizar .env en base al archivo compartido 

### 3. Configuración del Backend
```bash
cd backend
```
```bash
npm install
```
```bash
npx nodemon index.jsx
```

### 4. Configuración del Frontend (puede tardar la primera vez)
```bash
cd frontend
```
```bash
npm install
```
```bash
npx expo run:android 
```

---
## 🧪 Calidad y Testing
El repositorio cuenta con flujos automatizados de CI/CD (GitHub Actions) y monitorización mediante SonarCloud (manteniendo un estado de Quality Gate A y 0 Bugs). Aseguramos de manera estricta una cobertura de código superior al 80%.

* **Frontend:** Pruebas unitarias y de extremo a extremo (E2E) mediante Vitest, Jest y React Testing Library.
* **Backend:** Pruebas unitarias y de integración robustas con Jest y Supertest.

### 🔌 Ejecutar Tests de Integración (Backend)
Las pruebas de integración interactúan con una instancia real de PostgreSQL. Para evitar la mutación accidental de datos en entornos locales de desarrollo o producción, estas pruebas requieren una confirmación explícita.

PowerShell:

```powershell
cd backend
$env:RUN_DB_INTEGRATION="true"
npm run test:integration
```
---

- `GET /` (health check completo con conexión a DB).
- Flujo real de `POST /car`, `GET /car`, `DELETE /car` usando datos de prueba aislados.

---

## 🧪 E2E Testing (Frontend)

Desde la terminal (Jest, sin emulador ni backend en marcha):

```bash
cd frontend
npm run test:e2e
```

Un solo test:

```bash
npm run test:e2e -- searchStationPanel
npm run test:e2e -- eventNavigationFlow
```

Archivos en `frontend/tests/e2e/`:
- `searchStationPanel.e2e.test.tsx` — búsqueda → panel de estación
- `eventNavigationFlow.e2e.test.tsx` — panel → eventos → mapa → navegación


## 👥 Equipo de Desarrollo


**e-Go Project** — Creado con 💚 por todo nuestro equipo:

* ⚡ **Adrià Aguilar**
* ⚡ **Denis Roca**
* ⚡ **Jordi Pérez**
* ⚡ **Pau Pedrejón**
* ⚡ **Paula Torreblanca**
* ⚡ **Sergi Malaguilla**
* ⚡ **Xavier Juanico**

