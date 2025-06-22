# Stage 1: Build dependencies
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Stage 2: Create production image
FROM node:20-slim

ENV NODE_ENV=production
ENV PORT=15000

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

RUN apt-get update && apt-get install -y curl && apt-get clean

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:15000/health || exit 1

EXPOSE 15000

CMD ["npm", "start"]
