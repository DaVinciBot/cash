FROM node:24.11.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc pnpm-workspace.yaml ./
RUN --mount=type=secret,id=npm_token,env=NPM_TOKEN pnpm install --frozen-lockfile --prod

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

# Runtime = `node build` uniquement : retirer npm/npx/corepack supprime leur
# outillage vendored (ex. tar CVE-2026-59873) du périmètre des scans d'image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

WORKDIR /app

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build

EXPOSE 3000

CMD ["node", "build"]
