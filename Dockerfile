FROM node:20-slim AS base
WORKDIR /app

# Für Prisma nötig (OpenSSL)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY prisma ./prisma

RUN npm install

COPY . .

RUN npm run build

CMD ["sh", "-c", "npm run prisma:migrate && npm start"]
