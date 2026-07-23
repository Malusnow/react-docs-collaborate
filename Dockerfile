# ===== 构建阶段 =====
FROM node:22-alpine AS builder

WORKDIR /app

# 依赖
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps \
    --no-audit \
    --no-fund \
    --fetch-retries=5 \
    --fetch-retry-factor=2 \
    --fetch-retry-mintimeout=10000 \
    --fetch-retry-maxtimeout=60000 \
    --fetch-timeout=300000

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_COLLABORATION_URL
ARG CLERK_ISSUER_DOMAIN

ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_COLLABORATION_URL=$NEXT_PUBLIC_COLLABORATION_URL
ENV CLERK_ISSUER_DOMAIN=$CLERK_ISSUER_DOMAIN

# 复制源码并构建
COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM node:22-alpine AS runner

WORKDIR /app

# 复制构建产物和运行时所需文件
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/constants ./src/constants
COPY --from=builder /app/src/extensions ./src/extensions
COPY --from=builder /app/convex/_generated ./convex/_generated

EXPOSE 3000 4000

CMD ["npm", "start"]
