FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
RUN apk update && \ 
    apk upgrade && \
    apk add --no-cache libc6-compat
COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

FROM base AS runner
WORKDIR /app
RUN apk add dumb-init ffmpeg

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 core 
USER core


COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=core:nodejs /app/dist ./dist
COPY --from=builder /app/.env.example ./dist/.env.example

WORKDIR /app/dist

ENV NODE_ENV production
CMD ["dumb-init", "node", "src/index.js"]
