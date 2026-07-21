# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 依赖
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

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
