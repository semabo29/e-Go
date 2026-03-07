# 1. Partim d'una imatge oficial de Node.js versió 20 (lleugera)
FROM node:20-alpine

# 2. Definim on treballarem dins del contenidor
WORKDIR /app

# 3. Copiem els fitxers de configuració de dependències
COPY package.json package-lock.json ./

# 4. Instal·lem NOMÉS les dependències de producció
# (--omit=dev evita instal·lar jest, nodemon, etc. per estalviar espai)
RUN npm ci --omit=dev

# 5. Copiem la resta del codi del backend (rutes, llibres, sql, etc.)
COPY . .

# 6. Informem a Docker quin port farà servir el backend (poso 3000 per defecte)
EXPOSE 3000

# 7. La comanda que s'executarà quan el contenidor arrenqui
CMD ["node", "index.jsx"]