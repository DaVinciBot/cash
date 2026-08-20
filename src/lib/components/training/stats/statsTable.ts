// Habillage partagé des tableaux de statistiques.
//
// Quatre tableaux différents, une seule grammaire visuelle : en-têtes en
// capitales espacées, chiffres alignés à droite, ligne de total détachée par
// une bordure haute. Recopier ces chaînes dans chaque composant les aurait fait
// diverger dès le premier ajustement d'espacement.

export const TABLE = 'w-full min-w-[36rem] border-collapse text-sm';

export const SCROLLER = 'overflow-x-auto';

export const HEAD_CELL =
	'text-light-blue/60 border-light-blue/10 border-b px-3 py-2 text-left text-[0.65rem] font-medium tracking-[0.2em] uppercase';

/** Les nombres se lisent alignés à droite, les libellés à gauche. */
export const HEAD_CELL_NUMBER = `${HEAD_CELL} text-right`;

export const CELL = 'border-light-blue/5 text-light-blue/80 border-b px-3 py-2';

export const CELL_NUMBER = `${CELL} text-right tabular-nums`;

export const CELL_LABEL = `${CELL} text-white`;

export const TOTAL_CELL = 'border-light-blue/20 border-t-2 px-3 py-2 font-semibold text-white';

export const TOTAL_CELL_NUMBER = `${TOTAL_CELL} text-right tabular-nums`;

/** Le message d'un tableau sans une seule ligne à montrer. */
export const EMPTY = 'text-light-blue/60 px-3 py-6 text-center text-sm';
