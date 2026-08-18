# syntax=docker/dockerfile:1

FROM node:24.19.0-trixie-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=secret,id=npm_token,env=NPM_TOKEN \
    pnpm install --frozen-lockfile --prod \
    && node node_modules/playwright/cli.js install chromium-headless-shell \
    && rm -rf /app/.playwright/ffmpeg-*

FROM base AS build

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=secret,id=npm_token,env=NPM_TOKEN \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:24.19.0-trixie-slim AS runner

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

WORKDIR /app

COPY --chown=node:node package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/.playwright ./.playwright

RUN node node_modules/playwright/cli.js install-deps chromium-headless-shell \
    && apt-get purge -y --auto-remove \
        xvfb \
        libgl1-mesa-dri \
        fonts-wqy-zenhei \
        fonts-ipafont-gothic \
        fonts-unifont \
        fonts-tlwg-loma-otf \
    && rm -rf \
        /usr/local/lib/node_modules/npm \
        /usr/local/lib/node_modules/corepack \
        /usr/local/bin/npm \
        /usr/local/bin/npx \
        /usr/local/bin/corepack \
        /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/build ./build

# Utilisateur node : non privilégié fourni par l'image officielle.
USER 1000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/admin/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "build"]
