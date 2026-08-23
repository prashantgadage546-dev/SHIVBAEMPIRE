FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./

RUN npm install --omit=dev

COPY backend/ .

RUN mkdir -p /var/log/shivbaempire

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/index.js"]
