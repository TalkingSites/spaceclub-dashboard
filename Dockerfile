# Mission Control for Coolify. Node 22 LTS is pinned here because Prisma 7 needs
# 22.12 or newer, which Coolify's automatic (nixpacks) builder didn't have.
FROM docker.io/node:22-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

# sets up the database tables, adds missing seed sites, then serves (see package.json)
CMD ["npm", "start"]
