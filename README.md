# e-Go

App para incidencias y movilidad sostenible. Frontend con Expo (React Native), backend con Node, Express y PostgreSQL.

## Qué hay donde
En frontend/app está todo lo de pantallas. La pestaña Inicio es (tabs)/index.tsx: si no hay usuario muestra la bienvenida y el botón de Google; si hay usuario, el menú de tres barras y la pantalla principal. La otra pestaña es Explorar (explore.tsx). El login está en login.tsx. Los datos del usuario (quién está logueado, cerrar sesión) están en contexts/AuthContext.tsx y se usa con useAuth().

En backend, index.jsx arranca el servidor y monta las rutas. La base de datos se configura en lib/db.js. El tema de login con Google está en lib/authHelpers.js y routes/auth.js (POST /auth/google y /auth/register).

## Dónde editar la pantalla principal

Abre frontend/app/(tabs)/index.tsx y busca el comentario que dice PANTALLA PRINCIPAL. Ahí dentro está el contenido que se ve cuando el usuario ya ha iniciado sesión (ahora solo un texto). Cambia eso por lo que quieras: mapa, listas, lo que sea. El menú de tres barras y cerrar sesión ya están hechos, no los toques.

Los estilos de esa zona están al final del mismo archivo (mainContent, mainLabel). Si añades cosas, puedes añadir más estilos ahí.

## Otras cosas

Para cambiar el login o el registro, frontend/app/login.tsx. Para otra pestaña, (tabs)/explore.tsx y si añades una nueva, créala en (tabs)/ y ponla en (tabs)/_layout.tsx. Para un endpoint nuevo en la API, crea un archivo en backend/routes/ y en index.jsx haz app.use('/ruta', require('./routes/xxx')).

## Cómo arrancar

Backend: cd backend, npm install, npx nodemon index.jsx. Necesitas un .env con PORT, DB_*, GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET, y haber ejecutado el SQL de backend/sql/001_create_users.sql en tu base de datos.

Frontend: cd frontend, npm install, npx expo start. Necesitas un .env con EXPO_PUBLIC_API_URL y EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (mira .env.example).

DEPENDENCIAS.md tiene la lista de qué hay que tener instalado en desarrollo y en producción.
