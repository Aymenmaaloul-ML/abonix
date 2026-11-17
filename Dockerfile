# Image simple pour VPS. Non testée dans l'environnement de développement de ce projet : validez-la avant la mise en production.
FROM node:22-bookworm-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Le build n'a besoin d'aucun secret : les variables sont lues au démarrage.
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
# Applique les migrations (idempotent) puis démarre le serveur.
CMD ["sh", "-c", "npm run db:migrate && npm run start"]
