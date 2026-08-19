// Panneau RBAC de développement. Les garde-fous (dev, clé service, opt-in,
// projet autorisé) vivent dans le handler partagé : cette route est inerte
// hors développement.
export { GET, POST } from '@davincibot/lib/server';
