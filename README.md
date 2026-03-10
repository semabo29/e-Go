# ⚡ e-Go: Movilidad Sostenible e Incidencias

e-Go es una plataforma integral para la gestión de movilidad urbana y reporte de incidencias. Construida con una arquitectura moderna que separa un **Frontend móvil nativo** de un **Backend robusto con PostgreSQL**.

---

## 🏗️ Arquitectura del Proyecto

El repositorio está dividido en dos microservicios principales:

### 📱 Frontend (`/frontend`)
* **Framework:** [Expo](https://expo.dev/) (React Native) con **Expo Router**.
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

La base de datos se inicializa mediante scripts numerados en `backend/sql/`. **Deben ejecutarse en orden cronológico:**

1.  `001_create_users.sql`: Estructura de la tabla de usuarios y esquemas base.
2.  `002_create_stations.sql`: Definición de estaciones de carga y servicios.
3.  *(Siguientes scripts se añadirán siguiendo esta nomenclatura: 00X_nombre.sql)*

---

## 🚀 Guía de Inicio Rápido

### 1. Requisitos Previos
* Node.js (v18 o superior)
* PostgreSQL corriendo localmente.
* Credenciales de Google Cloud Console.

### 2. Configuración del Backend
```bash
cd backend
npm install
npx nodemon index.jsx
```
### 3. Configuración del Frontend
```bash
cd frontend
npm install
npx expo start
```
