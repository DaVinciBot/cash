// Coercitions des colonnes nullables du schéma `cash`.
//
// Les vues `cash.*` sont bâties sur des CTE récursives et `total_ttc` est une
// colonne générée : Postgres déclare tout cela nullable, donc les types générés
// aussi, même là où une valeur nulle est impossible en pratique. Ces deux
// coercitions concentrent la conversion en un seul endroit plutôt que d'essaimer
// des `?? 0` que le typage et le lint interprètent différemment.

export const num = (value: number | null): number => value ?? 0;
export const str = (value: string | null): string => value ?? '';
