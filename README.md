# ⚡ e-Go: Movilidad Sostenible e Incidencias

e-Go es una plataforma integral para la gestión de movilidad urbana y reporte de incidencias. Construida con una arquitectura moderna que separa un **Frontend móvil nativo** de un **Backend robusto con PostgreSQL**.

---

## 🏗️ Arquitectura del Proyecto

El repositorio está dividido en dos microservicios principales:

### 📱 Frontend (`/frontend`)
* **Framework:** [Expo](https://expo.dev/) (React Native).
* **Navegación:** Basada en directorios (Tabs & Stack).
* **Gestión de Estado:** `AuthContext` para el ciclo de vida del usuario.
* **Vistas Clave:**
    * `(tabs)/index.tsx`: Pantalla principal dinámica (Bienvenida vs. Dashboard).
    * `login.tsx`: Flujo de autenticación con Google.
    * `explore.tsx`: Exploración de servicios y estaciones.

### ⚙️ Backend (`/backend`)
* **Entorno:** Node.js + Express.
* **Base de Datos:** PostgreSQL.
* **Autenticación:** Google OAuth 2.0.
* **Estructura:**
    * `routes/`: Endpoints modulares (auth, stations, etc.).
    * `lib/`: Configuración de base de datos (`db.js`) y helpers.

---

## 🗄️ Gestión de Base de Datos (SQL)

La base de datos se inicializa mediante scripts numerados en `backend/sql/`.

1.  `001_create_users.sql`: Estructura de la tabla de usuarios y esquemas base.
2.  `002_create_admins.sql`: Estructura de la tabla de admins.
3.  `003_create_stations.sql`: Definición de estaciones de carga y servicios.
4.  ... (Los scripts son ejecutados en la BBDD de AWS y puestos en producción)

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos
* Node.js (v18 o superior)
* PostgreSQL corriendo localmente.
* Credenciales de Google Cloud Console.

### 2. Guía de Setup: e-Go Nativo 
#### Preparación de Android Studio
Abre Android Studio > SDK Manager.
En la pestaña SDK Platforms: Asegúrate de tener instalado Android 14.0 ("UpsideDownCake")
En la pestaña SDK Tools:
- Android SDK Build-Tools
- NDK (Side by side)
- Android SDK Command-line Tools (latest)
- CMake
- Android Emulator
#### Configuración de las Variables de Entorno (Linux): (.bashrc  o .zshrc)
nano ~/.bashrc     
Añadir el bloque de Android: (copiar todo y pegar al final) :
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

Aplicar los cambios: (.bashrc  o .zshrc)
source ~/.bashrc

#### Configuración de las Variables de Entorno (Windows): 
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
