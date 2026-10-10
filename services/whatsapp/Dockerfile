FROM node:20-alpine

# Security: run as non-root
RUN addgroup -g 1001 whatsapp && adduser -u 1001 -G whatsapp -s /bin/sh -D whatsapp

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY server.js ./

# Auth directory (persisted by named volume in compose / EFS in ECS)
RUN mkdir -p /app/auth_baileys /app/data && \
    chown -R whatsapp:whatsapp /app

USER whatsapp

EXPOSE 3001

ENV NODE_ENV=production
ENV WHATSAPP_PORT=3001
ENV WHATSAPP_HOST=0.0.0.0

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health 2>&1 | grep -q '"healthy"' || exit 1

CMD ["node", "server.js"]
