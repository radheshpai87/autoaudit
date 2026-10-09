FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p /app/auth_baileys

EXPOSE 3001

ENV NODE_ENV=production
ENV WHATSAPP_PORT=3001

CMD ["node", "server.js"]
