FROM node:20-alpine AS builder

WORKDIR /app

# Copy package lock and install dependencies
COPY package*.json ./
RUN npm ci

# Copy remainder of code
COPY . .

# Generate Prisma Client & Build
RUN npx prisma generate
RUN npm run build

# Stage 2: Production execution
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]
