# cash

Panneau d'administration DaVinciBot (SvelteKit + Svelte 5) : trésorerie, commandes, gestion des membres et réglages de
compte. Servi sous le base path **`/admin`** du domaine `davincibot.fr`.

Apps voisines : [`davincibot.fr`](https://github.com/DaVinciBot/davincibot.fr)
(`/`), [`formation`](https://github.com/DaVinciBot/formation) (`/formation`),
[`auth`](https://github.com/davincibot/auth) (`auth.davincibot.fr`).

## Prérequis

- Node `24.11.0` (`.nvmrc`), pnpm ≥ 10
- Un `NPM_TOKEN` (PAT GitHub avec `read:packages`) exporté dans le shell : les dépendances `@davincibot/*` viennent de
  GitHub Packages (privé). Voir
  [DaVinciBot/packages](https://github.com/DaVinciBot/packages).

## Configuration

Copier `.env.example` en `.env` :

```sh
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=local-anon-key
# Clé secrète Supabase (service role) — serveur uniquement
SUPABASE_SECRET_KEY=
AUTH_PROXY_TARGET=http://localhost:5174
# Service auth central (prod : https://auth.davincibot.fr)
PUBLIC_AUTH_BASE_URL=http://localhost:5177
# Préfixe optionnel des noms de cookies, vide en prod
PUBLIC_COOKIE_PREFIX=
```

L'authentification est déléguée au service `auth` : pour un parcours de login complet en local, faire tourner l'app
`auth` sur le port 5177. L'enrôlement des passkeys et le step-up MFA tournent sur l'origine de cash — penser à lister
`http://localhost:5175` dans `WEBAUTHN_ORIGINS` côté `auth`, sinon l'attestation est rejetée.

## Développement

```sh
pnpm install
pnpm dev            # http://localhost:5175/admin
pnpm dev -- --open
```

Pour lancer les 3 sites d'un coup, utiliser `pnpm dev:all` depuis
`../davincibot.fr`.

## Qualité et build

```sh
pnpm check        # svelte-check
pnpm lint         # prettier --check + eslint --max-warnings=0
pnpm format       # eslint --fix + prettier --write
pnpm test:unit    # vitest run --coverage
pnpm test:e2e     # playwright
pnpm build        # svelte-kit sync && vite build
pnpm preview      # 127.0.0.1:4173
pnpm ci           # check + lint + test:unit + build (ce que fait la CI)
```

## Déploiement

Build `adapter-node` avec `paths.base = '/admin'`, image Docker publiée sur GHCR puis déployée par Dokploy (service
Swarm derrière Traefik). Les workflows de
`.github/workflows` appellent les workflows réutilisables de
[DaVinciBot/shared-workflows](https://github.com/DaVinciBot/shared-workflows).

## Notes métier

- L'année scolaire commence le **1ᵉʳ septembre** : « CDR 2025 » = 1ᵉʳ septembre 2024 → 31 août 2025.
