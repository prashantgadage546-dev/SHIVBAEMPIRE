FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Create log and database directories with permissions
RUN mkdir -p /app/database /var/log/shivbaempire && chown -R node:node /app /var/log/shivbaempire

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

EXPOSE 5000

USER node

CMD ["node", "src/index.js"]
