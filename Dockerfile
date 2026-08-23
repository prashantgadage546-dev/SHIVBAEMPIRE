FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

RUN npm install --omit=dev

COPY backend/ .

# Create log and database directories with permissions
RUN mkdir -p /app/database /var/log/shivbaempire && chown -R node:node /app /var/log/shivbaempire

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

USER node

CMD ["node", "src/index.js"]
