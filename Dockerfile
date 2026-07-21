# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 依赖
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG LIVEBLOCKS_SECRET_KEY
ARG CLERK_SECRET_KEY
ARG CLERK_ISSUER_DOMAIN

ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV LIVEBLOCKS_SECRET_KEY=$LIVEBLOCKS_SECRET_KEY
ENV CLERK_SECRET_KEY=$CLERK_SECRET_KEY
ENV CLERK_ISSUER_DOMAIN=$CLERK_ISSUER_DOMAIN

# 复制源码并构建
COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM node:20-alpine AS runner

WORKDIR /app

# 复制构建产物和运行时所需文件
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]
