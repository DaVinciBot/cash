FROM node:24.11.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

FROM base AS deps

# Le navigateur du rendu PDF est installé DANS /app et non dans le cache du
# compte : c'est la seule façon de le copier tel quel dans l'image finale.
# `chromium-headless-shell` et non `chromium` : ~115 Mo au lieu de ~170, et il
# n'a de toute façon aucune interface à afficher.
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN --mount=type=secret,id=npm_token,env=NPM_TOKEN pnpm install --frozen-lockfile --prod \
    && node node_modules/playwright/cli.js install chromium-headless-shell

FROM base AS build

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN --mount=type=secret,id=npm_token,env=NPM_TOKEN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:24.11.0-slim AS runner

ENV NODE_ENV=production

# Patch system packages to pick up security fixes (e.g. libgnutls30
# CVE-2026-33845 / CVE-2026-42010) not yet in the base image.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

COPY --chown=node:node package.json ./
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/.playwright ./.playwright

# Bibliothèques système dont Chromium a besoin. La liste est demandée à
# Playwright lui-même plutôt qu'écrite en dur : elle change d'une version de
# Debian à l'autre, et une bibliothèque manquante ne se voit qu'au premier PDF.
RUN apt-get update \
    && node node_modules/playwright/cli.js install-deps chromium-headless-shell \
    && rm -rf /var/lib/apt/lists/*

# Runtime = `node build` uniquement : retirer npm/npx/corepack supprime leur
# outillage vendored (ex. tar CVE-2026-59873) du périmètre des scans d'image.
# Ce retrait vient APRÈS l'installation des bibliothèques, qui a besoin d'apt.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Utilisateur node : non privilégié fourni par l'image officielle.
USER 1000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "build"]
