# cash

Panneau d'administration DaVinciBot (SvelteKit + Svelte 5) : trésorerie, commandes, gestion des membres et réglages de
compte. Servi sous le base path **`/admin`** du domaine `davincibot.fr`.

Apps voisines : [`davincibot.fr`](https://github.com/DaVinciBot/davincibot.fr)
(`/`), [`formation`](https://github.com/DaVinciBot/formation) (`/formation`),
[`auth`](https://github.com/DaVinciBot/auth) (`auth.davincibot.fr`).

## Prérequis

- Node `24.11.0` (`.nvmrc`), pnpm `11.5.2` (épinglé par `packageManager`)
- Un `NPM_TOKEN` (PAT GitHub avec `read:packages`) exporté dans le shell : les dépendances `@davincibot/*` viennent de
  GitHub Packages (privé, registre déclaré dans `.npmrc`). Sans lui, `pnpm install` échoue. Voir
  [DaVinciBot/packages](https://github.com/DaVinciBot/packages).

## Configuration

Copier `.env.example` en `.env` — il est commenté variable par variable :

```sh
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xx
# Clé secrète Supabase (service role) — serveur uniquement
SUPABASE_SECRET_KEY=
# Service auth central (prod : https://auth.davincibot.fr)
PUBLIC_AUTH_BASE_URL=http://localhost:5177
# Préfixe optionnel des noms de cookies, vide en prod
PUBLIC_COOKIE_PREFIX=
```

Les variables obligatoires sont vérifiées au démarrage : s'il en manque une, le serveur refuse de démarrer en listant
lesquelles. Variables facultatives :

- `PDF_INTERNAL_BASE` — adresse par laquelle le serveur s'atteint lui-même pour produire les PDF. Par défaut
  `http://127.0.0.1:${PORT}` (`PORT` vaut `3000` par défaut), ce qui convient à `node build` comme au conteneur ; à ne
  renseigner que si le serveur écoute ailleurs que sur la boucle locale.
- `DEV_RBAC_*` — panneau RBAC de développement (`/api/dev/rbac`), jamais en staging ni en prod.
- En prod derrière le proxy : `ORIGIN`, `ADDRESS_HEADER=x-forwarded-for`, `XFF_DEPTH=1`.

Le téléchargement d'un document en PDF passe par un **navigateur embarqué** : le serveur ouvre sa propre page de
document et l'imprime. C'est le seul moyen d'imposer le nom du fichier — la boîte « Enregistrer au format PDF » d'un
navigateur n'obéit à aucun standard. En développement, `pnpm dev` suffit ; le navigateur, lui, doit exister :

```sh
node node_modules/playwright/cli.js install chromium-headless-shell
```

L'image de production l'installe elle-même (voir `Dockerfile`) et pèse environ 650 Mo de plus pour cette raison. Si le
navigateur manque, le téléchargement répond 503 et la pièce reste imprimable depuis le navigateur de l'utilisateur.

L'authentification est déléguée au service `auth` : pour un parcours de login complet en local, faire tourner l'app
`auth` sur le port 5177. L'enrôlement des passkeys et le step-up MFA tournent sur l'origine de cash — penser à lister
`http://localhost:5175` dans `WEBAUTHN_ORIGINS` côté `auth`, sinon l'attestation est rejetée.

## Développement

```sh
pnpm install
pnpm dev            # http://localhost:5175/admin
pnpm dev -- --open
```

Pour lancer toutes les apps d'un coup (site, cash, formation et auth), utiliser `pnpm dev:all` depuis
`../davincibot.fr`.

## Pages

Toutes sous `/admin` :

- Commandes et projets : `/items/new` (faire une commande), `/orders`, `/review` (items à valider), `/bundle` (items à regrouper),
  `/my-project`, `/projects`
- Trésorerie : `/treasury`, `/treasury/documents`, `/treasury/flows` (dépenses et recettes), `/treasury/reports`,
  `/budgets`, `/partners`
- Membres et formations : `/users`, `/absences` (demandes d'excuse), `/trainings`, `/trainings/stats`
- `/audit`, `/blog` (articles), `/profile`, `/health`

## Qualité et build

```sh
pnpm check         # svelte-kit sync + svelte-check
pnpm lint          # prettier --check + eslint --max-warnings=0
pnpm format        # eslint --fix + prettier --write
pnpm build         # svelte-kit sync && vite build
pnpm preview       # 127.0.0.1:4173
pnpm ci-workflow   # check + lint + test:unit + build (les étapes de la CI)
```

## Tests

```sh
pnpm test:unit     # vitest run --coverage
pnpm test:e2e      # playwright test
pnpm test          # les deux
```

- **Unitaires** (Vitest, jsdom) : `tests/unit/` et `src/**/*.{test,spec}.ts`. Couvrent la logique des commandes, de la
  revue, de la trésorerie, des documents et de l'audit, les absences, les statistiques et formulaires de formation, les
  permissions et le catalogue RBAC, le cache de session et le client du service auth, ainsi que les composants de
  réglages du compte (MFA, passkeys, sessions, step-up). Rapport de couverture v8 dans `coverage/`, avec des seuils à
  50 % sur les fichiers listés dans `vitest.config.ts`.
- **E2E** (Playwright, `tests/e2e/*.e2e.ts`) : un smoke test qui vérifie que `/admin` répond, contre
  `pnpm build && pnpm preview` sur le port 4173. En local, installer le navigateur une fois :
  `pnpm exec playwright install chromium`.

## CI

Les workflows de `.github/workflows` appellent les workflows réutilisables de
[DaVinciBot/shared-workflows](https://github.com/DaVinciBot/shared-workflows), épinglés en `@v7.2.0` :

- `ci.yml` — push et PR vers `dev`, `staging`, `main`, `release/**`, `hotfix/**` : `pnpm check`, `pnpm lint`,
  `pnpm test:unit`, `pnpm build` (ignoré quand seuls des `.md` changent).
- `e2e.yml` — `pnpm test:e2e` sur push vers `staging` / `main` et sur les PR vers `staging`, `main`, `release/**`,
  `hotfix/**`.
- `container.yml` — build, lint et scan de l'image Docker à chaque push / PR ; publiée sur GHCR seulement sur push.
- `security-scan.yml` — revue des dépendances, Trivy et Checkov sur push / PR, et chaque lundi.
- `deploy.yml` — déploiement manuel de staging et de prod (voir plus bas).

Les dépendances privées sont installées avec le secret d'organisation `PACKAGES_READ_TOKEN` (`secrets: inherit`), passé
comme `NPM_TOKEN` à `pnpm install` et comme secret BuildKit `npm_token` au build Docker. Pour construire l'image en
local :

```sh
docker build --secret id=npm_token,env=NPM_TOKEN -t cash .
```

## Branches et déploiement

On travaille sur une branche, PR vers `dev`, puis on promeut `dev` → `staging` → `main`.

Build `adapter-node` avec `paths.base = '/admin'`, image publiée sur GHCR (`ghcr.io/davincibot/cash`) avec deux tags
par push : le nom de la branche et `sha-<commit>`. L'image tourne sur le VPS de Helsinki, derrière Caddy, et c'est
**Watchtower** qui la met à jour : le workflow réutilisable `deploy.yml` appelle son API HTTP pour l'image visée, puis
attend que `/admin/health` réponde 200. Personne ne se connecte au VPS pour déployer (voir
[DaVinciBot/vps-helsinki-srv](https://github.com/DaVinciBot/vps-helsinki-srv)).

| Environnement | Image          | URL                                   | Déclenchement                                        |
| ------------- | -------------- | ------------------------------------- | ---------------------------------------------------- |
| dev           | `cash:dev`     | `https://dev.davincibot.fr/admin`     | automatique après un push sur `dev`                  |
| staging       | `cash:staging` | `https://staging.davincibot.fr/admin` | manuel : workflow **Deploy**, `environment: staging` |
| prod          | `cash:main`    | `https://davincibot.fr/admin`         | manuel : workflow **Deploy**, `environment: prod`    |

Staging tape le projet Supabase de production : c'est une répétition de déploiement, pas un bac à sable. Le workflow
**Deploy** accepte un `image_tag` explicite (ex. `sha-<commit>`) ; Watchtower ne met à jour que les conteneurs dont
l'image correspond au tag du `docker-compose.yml` sur le VPS.

## Notes métier

- L'année scolaire commence le **1ᵉʳ septembre** : « CDR 2025 » = 1ᵉʳ septembre 2024 → 31 août 2025.
- [`docs/Cahier des charges - Refonte des plateformes de commande et de trésorerie.md`](docs/Cahier%20des%20charges%20-%20Refonte%20des%20plateformes%20de%20commande%20et%20de%20tr%C3%A9sorerie.md)
  — cahier des charges de la refonte commande / trésorerie.
