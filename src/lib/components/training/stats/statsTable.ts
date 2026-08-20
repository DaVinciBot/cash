// Habillage partagé des tableaux de statistiques.
//
// Quatre tableaux différents, une seule grammaire visuelle — celle des tableaux
// de la trésorerie : cadre gris, en-tête sur fond plus sombre, chiffres alignés
// à droite, ligne de total détachée par une bordure haute. Recopier ces chaînes
// dans chaque composant les aurait fait diverger dès le premier ajustement
// d'espacement.

export const TABLE = 'w-full min-w-[36rem] border-collapse text-sm';

export const SCROLLER = 'overflow-x-auto rounded-lg border border-gray-700';

export const HEAD_CELL =
	'border-b border-gray-700 bg-gray-800 px-4 py-2 text-left text-xs font-normal tracking-wide text-gray-400 uppercase';

/** Les nombres se lisent alignés à droite, les libellés à gauche. */
export const HEAD_CELL_NUMBER = `${HEAD_CELL} text-right`;

export const CELL = 'border-b border-gray-700 px-4 py-2 text-gray-300';

export const CELL_NUMBER = `${CELL} text-right tabular-nums`;

export const CELL_LABEL = `${CELL} font-medium text-gray-100`;

export const TOTAL_CELL =
	'border-t border-gray-600 bg-gray-800/60 px-4 py-2 font-semibold text-gray-200';

export const TOTAL_CELL_NUMBER = `${TOTAL_CELL} text-right tabular-nums text-white`;

/** Le message d'un tableau sans une seule ligne à montrer. */
export const EMPTY = 'px-4 py-12 text-center text-sm text-gray-400';
