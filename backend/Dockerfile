# 1. Base de Node.js estable
FROM node:20-alpine

# 2. Directorio de trabajo
WORKDIR /app

# 3. Copiar archivos de dependencias e instalarlas
COPY package*.json ./
RUN npm ci --only=production

# 4. Copiar el código fuente del backend
COPY src ./src

# Exponer el puerto del backend (definido por PORT en tu .env, normalmente 3000)
EXPOSE 3000

# 5. Comando para iniciar
CMD ["node", "src/index.js"]