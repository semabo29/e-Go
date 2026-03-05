# Compartir PostgreSQL con el equipo (red local)

## 1. Tu IP en la red
En PowerShell: `ipconfig`  
Anota la **Dirección IPv4** (ej: `192.168.1.34`). Tus compañeros conectarán a esa IP.

## 2. Que PostgreSQL escuche en la red
- Abre: `C:\Program Files\PostgreSQL\16\data\postgresql.conf`
- Busca: `#listen_addresses = 'localhost'`
- Cámbialo por: `listen_addresses = '*'`
- Guarda el archivo.

## 3. Permitir conexiones en pg_hba.conf
- Abre: `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`
- Al **final del archivo** añade una línea (ajusta la red si tu IP no es 192.168.x.x):
  ```
  host    all    all    192.168.1.0/24    scram-sha-256
  ```
  Si tu IP es tipo 10.x.x.x usa: `10.0.0.0/8`  
  Si es 172.16.x.x usa: `172.16.0.0/12`
- Guarda el archivo.

## 4. Reiniciar PostgreSQL
En PowerShell **como administrador**:
```powershell
Restart-Service postgresql-x64-16
```

## 5. Firewall de Windows
En PowerShell **como administrador** (solo una vez):
```powershell
New-NetFirewallRule -DisplayName "PostgreSQL 16" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
```

## 6. Qué pone el equipo en pgAdmin
- **Host:** tu IPv4 (ej: `192.168.1.34`) — no `localhost`
- **Port:** `5432`
- **Username:** `postgres`
- **Password:** la que configuraste en la instalación

Todos deben estar en la **misma red WiFi/LAN** que tu PC.
