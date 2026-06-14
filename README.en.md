## 🌐 Idioma / Language
* [Español (Versión actual)](README.md)
* English (English version)
---

<div align="center">
  <h1>e-Go: Smart Electric Mobility</h1>
  <p><em>Native mobile application for the optimization and management of electric mobility in Catalonia.</em></p>

  <img src="https://img.shields.io/badge/React_Native-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Coverage_>80%25-4MIN1G?style=flat-square&logo=sonarcloud&logoColor=white" alt="SonarCloud Coverage" />
</div>

**e-Go** is an app designed for sustainable urban mobility management and incident reporting. It allows EV drivers to intelligently plan routes based on their vehicle and battery range, locate charging stations in real-time, and actively participate in a community driven by gamification dynamics.

---

## 📲 Download the e-Go app

Official landing page for the e-Go project, detailing the mobile application's features and providing the direct APK download link for Android devices.

<div align="center">
  <br />
  <a href="https://www.paupedrejon.com/es/proyectos/ego" target="_blank">
    <img src="https://img.shields.io/badge/Visit_Landing_Page-00875A?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Landing Page" />
  </a>
  <a href="../../releases/latest" target="_blank">
    <img src="https://img.shields.io/badge/Download_APK_(Android)-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Download APK" />
  </a>
  <br />
</div>

> ℹ️ **Note for APK installation:** Since it is not hosted on the Google Play Store, the first time you open the `.apk` file, your Android device will ask you to enable the *"Install apps from unknown sources"* permission. It is completely safe.

---

## ✨ Core Features & Functionalities

* 🗺️ **Real-Time Interactive Map:** Display and filter over 2,300 active charging stations in Catalonia, integrated directly with the *Dades Obertes* (ICAEN) dataset.
* 🚗 **Smart Routing & Battery Range:** Trip planning with dynamic calculations based on the vehicle's remaining battery level. It automatically reroutes to a compatible charger if necessary.
* 🛠️ **Incident Management:** A crowdsourced community system to report malfunctions, vandalism, or breakdowns at charging stations, keeping information up to date for all users.
* 🎮 **Gamification & Leaderboard:** A reward mechanics system where users accumulate points by charging their vehicles or validating incidents. Points unlock virtual vehicle skins (cosmetics) and allow users to compete on a global leaderboard.
* 💳 **Premium Subscription:** Integrated freemium model featuring ads (AdMob) and a paid subscription alternative (via Stripe) to remove advertising and unlock exclusive benefits.
* 🌍 **Multi-language (i18n):** User interface fully localized in Catalan, Spanish, English, and Italian.
* 🎫 **Cultural Integration (Aplec API):** Connection with local cultural events to suggest nearby activities while users wait for their vehicle to charge.

### 👥 Ecosystem Roles
1. **Driver:** Search for efficient routes, charge, report incidents, and participate in the scoring system.
2. **Company:** Manage their own stations, monitor incidents reported on their infrastructure, and view demand analytics.
3. **Administrator:** Global platform moderation, critical incident validation, user access control, and maintenance of the station catalog.

---

## 🏗️ Project Architecture

The repository is divided into two main microservices, decoupling the native mobile Frontend from a robust Backend architecture:

### 📱 Frontend (`/frontend`)
* **Framework:** React Native with [Expo](https://expo.dev/) (TypeScript).
* **Navigation:** Directory-based structure utilizing Expo Router (Tabs & Stack).
* **State Management:** `AuthContext` managing user lifecycle and session persistence.
* **Key Views:**
    * `(tabs)/index.tsx`: Main dynamic screen (Adaptive Welcome vs. User Dashboard).
    * `login.tsx`: Native authentication flow with Google.
    * `explore.tsx`: Advanced map-based discovery for services, routes, and stations.

### ⚙️ Backend (`/backend`)
* **Environment:** Node.js + Express (JavaScript/JSX).
* **Database:** PostgreSQL (Relational) optimized for cloud deployment (AWS RDS).
* **Authentication & Security:** Google OAuth 2.0 validation and JSON Web Tokens (JWT) for role-based access control.
* **Internal Structure:**
    * `routes/`: Modular, decoupled endpoints (auth, stations, cars, etc.).
    * `lib/`: Centralized database configuration (`db.js`) and helper utilities.

---

## 🗄️ Database Management (SQL)

The database is initialized and updated using sequential numbered scripts located in the `backend/sql/` folder. They must be executed in strict numerical order to correctly generate tables, relationships, and seeders:

1. `001_create_users.sql`: User table structure and base schemas.
2. `002_create_admins.sql`: Admin table structure and privileges.
3. `003_create_stations.sql`: Geometric and logical definition of charging stations and services.
4. `...` *(Succeeding automated scripts for continuous deployment to the production AWS infrastructure).*

---

## 🚀 Local Installation & Setup Guide

### 1. Prerequisites
* **Node.js** (v18 or higher).
* **PostgreSQL** installed and running locally.
* Credentials configured in the **Google Cloud Console**.
* **Android Studio** installed with the following setup inside the *SDK Manager*:
    * *SDK Platforms:* Android 14.0 ("UpsideDownCake").
    * *SDK Tools:* Android SDK Build-Tools, NDK (Side by side), Android SDK Command-line Tools (latest), CMake, and Android Emulator.

### 2. System Environment Variables Configuration
#### 2.1 System Environment Variables Setup (Linux): (.bashrc or .zshrc)
nano ~/.bashrc     
Add the Android block (copy and paste everything at the end):
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools

Apply changes: (.bashrc or .zshrc)
source ~/.bashrc

#### 2.2 System Environment Variables Setup (Windows):
Search in Windows: "Edit the system environment variables".
Click the "Environment Variables..." button.
Under "User variables", click New:
Name: ANDROID_HOME
Value: %LOCALAPPDATA%\Android\Sdk
Under "System variables", locate "Path", click Edit, and add these 3 paths:
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin

#### Update .env based on the shared file

### 3. Backend Setup
```bash
cd backend
```
```bash
npm install
```
```bash
npx nodemon index.jsx
```

### 4. Frontend Setup (May take longer on first run))
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
## 🧪 Quality & Testing
The repository features automated CI/CD workflows (GitHub Actions) and monitoring via SonarCloud (maintaining a Quality Gate A status and 0 Bugs). We strictly enforce a code coverage standard of over 80%.
* **Frontend:** Unit and end-to-end (E2E) testing powered by Vitest, Jest, and React Testing Library.
* **Backend:** Robust unit and integration testing with Jest and Supertest.


### 🔌 Running Integration Tests (Backend)
Integration tests interact with a real PostgreSQL instance. To prevent accidental data mutation in local development or production environments, these tests require explicit confirmation.
PowerShell:

```powershell
cd backend
$env:RUN_DB_INTEGRATION="true"
npm run test:integration
```
---

## 👥 Development Team

**e-Go Project** — Created with 💚 by our whole team:

* ⚡ **Adrià Aguilar**
* ⚡ **Denis Roca**
* ⚡ **Jordi Pérez**
* ⚡ **Pau Pedrejón**
* ⚡ **Paula Torreblanca**
* ⚡ **Sergi Malaguilla**
* ⚡ **Xavier Juanico**
