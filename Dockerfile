# Soluções Solares — app de propostas (jornada do lead)
# Imagem enxuta, sem dependências de build nativo (usa node:sqlite embutido).

FROM node:22-slim

WORKDIR /app

# Instala apenas dependências de produção (express).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o restante da aplicação.
COPY src ./src
COPY public ./public
COPY template ./template
COPY assets ./assets

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/app.db

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "src/server.js"]
