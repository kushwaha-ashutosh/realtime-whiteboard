# ---- build client ----
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- build server ----
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

# ---- production image ----
FROM node:20-alpine
WORKDIR /app

# Copy compiled server
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/package.json ./server/package.json

# Copy built client (server serves it as static files)
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["node", "dist/index.js"]
