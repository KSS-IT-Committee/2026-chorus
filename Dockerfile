# Mirrors 2026-server-ansible/roles/apps/templates/Dockerfile.nextjs.j2 (same
# layout as the other 2026 Next.js apps) so the GHCR `preview` image built by
# .github/workflows/preview-image.yml behaves like the production VPS runtime.

FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The deploy scripts bind-mount a per-app persistent dir at /app/files. Point
# uploads (e.g. song artwork) there so they survive blue/green swaps.
ENV FILES_DIR=/app/files
ENV UPLOADS_DIR=/app/files

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# `output: standalone` (next.config.ts) emits a self-contained server with only
# the traced runtime deps plus a minimal server.js (replaces `next start`). The
# trace does NOT include public/ or .next/static, so copy those in by hand.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Create the files dir owned by the app user so the image is also writable when
# run without the bind mount.
RUN mkdir -p /app/files && chown nextjs:nodejs /app/files

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
