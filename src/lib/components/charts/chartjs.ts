// Socle Chart.js partagé : enregistrement des modules, palette lue dans le
// thème, options d'axes.
//
// Rien ici ne connaît la grandeur mesurée. L'écriture des nombres arrive par un
// `ValueFormat`, la géométrie des axes par un `ChartLayout` : des euros, des
// effectifs, des heures ou des pourcentages se dessinent avec le même socle, et
// c'est l'écran qui dit lequel des trois il montre.
//
// Chart.js est modulaire depuis la v3 : rien n'est enregistré par défaut, et un
// contrôleur manquant ne lève pas d'erreur — le canevas reste simplement vide.
// On enregistre donc ici, une fois, ce que les écrans utilisent ; un nouveau
// type de graphique s'ajoute à cette liste avant d'être utilisable.
//
// Les couleurs sont LUES DANS LE THÈME, pas recopiées. Chart.js peint dans un
// canevas : il ne voit ni les classes Tailwind ni les variables CSS, il faut
// donc les lui résoudre à la main. Les recopier en dur marcherait aujourd'hui et
// mentirait au premier changement de charte.

import type { ChartOptions, TooltipItem } from 'chart.js';
import {
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	Filler,
	Legend,
	LineController,
	LineElement,
	LinearScale,
	PointElement,
	Tooltip
} from 'chart.js';

/** Les types de graphiques que ce socle sait habiller. */
export type SupportedChart = 'bar' | 'line';

let registered = false;

/** À appeler avant le premier rendu, côté navigateur uniquement. */
export function registerChartJs(): void {
	if (registered) {
		return;
	}
	Chart.register(
		BarController,
		LineController,
		BarElement,
		LineElement,
		PointElement,
		CategoryScale,
		LinearScale,
		Filler,
		Legend,
		Tooltip
	);
	registered = true;
}

/**
 * Les rôles de couleur d'un graphique, indépendants de ce qu'il mesure.
 *
 * Un rôle décrit une RELATION entre séries — une rampe de catégories, un couple
 * qui s'oppose, un couple qui se compare — jamais un métier. C'est l'écran qui
 * sait que la série qui monte est une recette ou un effectif.
 */
export interface ChartPalette {
	/**
	 * Rampe catégorielle, dans l'ordre d'usage : on prend les couleurs à la
	 * suite, autant que de séries, et on recommence au début si elles manquent.
	 * L'ordre compte — deux teintes voisines ne doivent jamais se suivre, sans
	 * quoi les deux premières parts d'un classement se confondent.
	 */
	series: string[];
	/**
	 * Deux séries qui s'opposent : ce qui entre contre ce qui sort, un gain
	 * contre une perte. Turquoise contre corail, jamais deux bleus.
	 */
	signedPair: [string, string];
	/**
	 * Deux mesures d'une même grandeur : prévu contre réalisé, avant contre
	 * après. Deux teintes distinctes mais de même poids, parce qu'il ne s'agit
	 * pas d'un bien et d'un mal.
	 */
	neutralPair: [string, string];
	/** Aplat sous une courbe tracée dans `series[0]`. */
	areaFill: string;
	/** Survol : la même barre, un cran plus claire. */
	highlight: string;
	/** Habillage : libellés, grille, fond d'infobulle. */
	text: string;
	textStrong: string;
	grid: string;
	surface: string;
}

/**
 * Palette du thème DaVinciBot (`@davincibot/components/theme.css`).
 *
 * Les jetons `--color-chart-*` sont dédiés aux graphiques. Les jetons métier
 * (`--color-registered`, `--color-complete`) décrivent l'état d'une inscription
 * à une formation : les réemployer ici tenait de l'emprunt, et leur saturation
 * — juste sur une pastille — devenait criarde sur un aplat de courbe.
 */
export function chartPalette(): ChartPalette {
	const token = themeReader();
	const primary = token('--color-chart-primary', '#4b83ff');
	const accent = token('--color-chart-accent', '#f3b16d');
	const violet = token('--color-chart-violet', '#9b8cfa');
	const light = token('--color-chart-neutral', '#b3c2ff');
	const positive = token('--color-chart-positive', '#2ed3b7');
	const negative = token('--color-chart-negative', '#f4635f');

	return {
		series: [primary, positive, accent, violet, light, negative],
		signedPair: [positive, negative],
		neutralPair: [primary, accent],
		areaFill: token('--color-chart-primary-soft', '#1c2a63'),
		highlight: light,
		text: token('--color-chart-label', '#828ab6'),
		textStrong: token('--color-chart-label-strong', '#b3c2ff'),
		grid: token('--color-chart-grid', '#232a55'),
		surface: token('--color-chart-surface', '#0a0f3a')
	};
}

/**
 * Lecteur de variables de thème, avec repli.
 *
 * Le repli n'est pas de la prudence gratuite : au premier rendu côté serveur il
 * n'y a pas de `document`, et une couleur absente donnerait un graphique noir
 * sur noir plutôt qu'une erreur visible. Le style calculé est résolu une seule
 * fois : le relire jeton par jeton fait recalculer la mise en page au
 * navigateur autant de fois qu'il y a de couleurs.
 */
function themeReader(): (name: string, fallback: string) => string {
	const style = typeof document === 'undefined' ? null : getComputedStyle(document.documentElement);
	return (name, fallback) => {
		const value = style?.getPropertyValue(name).trim();
		return value === undefined || value === '' ? fallback : value;
	};
}

/**
 * Comment écrire une valeur : `tick` le long de l'axe, où la place manque, et
 * `value` dans l'infobulle, où l'on peut être exact.
 */
export interface ValueFormat {
	tick: (value: number) => string;
	value: (value: number) => string;
}

const LOCALE = 'fr-FR';

/**
 * Une somme d'argent : arrondie à l'unité sur l'axe, au centime dans
 * l'infobulle. C'est la grandeur où l'écart entre les deux se justifie — un axe
 * au centime déborde de sa gouttière, une infobulle arrondie perd la seule
 * information qu'on est venu y chercher.
 */
export function currencyFormat(currency: string, locale = LOCALE): ValueFormat {
	const rounded = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: 0
	});
	const exact = new Intl.NumberFormat(locale, { style: 'currency', currency });
	return { tick: (value) => rounded.format(value), value: (value) => exact.format(value) };
}

/**
 * Une grandeur sans devise : des effectifs, des places, des heures, des
 * pourcentages. `unit` s'écrit après le nombre, séparé d'une espace.
 */
export function unitFormat(unit?: string, locale = LOCALE): ValueFormat {
	const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
	const write = (value: number) =>
		unit === undefined ? number.format(value) : `${number.format(value)} ${unit}`;
	return { tick: write, value: write };
}

/** Les formats déjà constitués, pour n'instancier `Intl` qu'une fois. */
export const euroFormat: ValueFormat = currencyFormat('EUR');
export const countFormat: ValueFormat = unitFormat();
export const percentFormat: ValueFormat = unitFormat('%');

/** Ce qu'un écran a besoin de décider ; tout le reste est commun. */
export interface ChartLayout {
	/** L'écriture des nombres, sur l'axe des valeurs comme dans l'infobulle. */
	format: ValueFormat;
	/**
	 * L'axe qui porte les valeurs : `y` par défaut, `x` pour des barres
	 * horizontales. L'autre porte les catégories, et le graphique bascule avec
	 * lui — infobulle, grille et libellés suivent.
	 */
	valueAxis?: 'x' | 'y';
	/** Légende : indispensable dès deux séries, du bruit quand il n'y en a qu'une. */
	legend?: boolean;
	/** Séries cumulées sur l'axe des valeurs : aires ou barres empilées. */
	stacked?: boolean;
	/** Bornes imposées : une échelle en pourcentage tient de 0 à 100, quoi qu'il arrive. */
	range?: { min?: number; max?: number };
}

/**
 * Options partagées : thème sombre, axes discrets, infobulle formatée.
 *
 * Le type du graphique est un paramètre générique parce que Chart.js type ses
 * options par type de graphique ; il ne change rien à ce qui est produit ici.
 */
export function chartOptions<T extends SupportedChart>(
	palette: ChartPalette,
	layout: ChartLayout
): ChartOptions<T> {
	const { format, valueAxis = 'y', legend = true, stacked = false, range } = layout;
	const categoryAxis = valueAxis === 'y' ? 'x' : 'y';

	const values = {
		stacked,
		...range,
		ticks: {
			color: palette.text,
			font: { size: 10 },
			callback: (value: number | string) => format.tick(Number(value))
		},
		grid: { color: palette.grid },
		border: { display: false }
	};

	// Quand les catégories passent à la verticale, leurs libellés deviennent la
	// seule clé de lecture du graphique — plus de mois sous les barres, des noms
	// entiers en regard de chacune. Ils passent donc au premier plan.
	const upright = categoryAxis === 'y';
	const categories = {
		ticks: {
			color: upright ? palette.textStrong : palette.text,
			font: { size: upright ? 11 : 10 }
		},
		grid: { display: false },
		border: { color: palette.grid }
	};

	const options = {
		indexAxis: categoryAxis,
		responsive: true,
		maintainAspectRatio: false,
		interaction: { mode: 'index', intersect: false },
		plugins: {
			legend: {
				display: legend,
				labels: {
					color: palette.text,
					boxWidth: 10,
					boxHeight: 10,
					usePointStyle: true,
					font: { size: 11 }
				}
			},
			tooltip: {
				backgroundColor: palette.surface,
				borderColor: palette.grid,
				borderWidth: 1,
				titleColor: palette.textStrong,
				bodyColor: palette.textStrong,
				padding: 10,
				usePointStyle: true,
				callbacks: {
					label: (item: TooltipItem<SupportedChart>) => {
						// La valeur se lit sur l'axe des valeurs, pas sur `y` : en barres
						// horizontales elle est en `x`. Elle est nullable côté Chart.js —
						// une barre sans valeur ferait tomber l'infobulle.
						const written = format.value(item.parsed[valueAxis] ?? 0);
						// Le nom de la série ne se répète que si la légende le nomme : seul,
						// un graphique à une série n'apprend rien de plus que son titre.
						return legend && item.dataset.label !== undefined
							? ` ${item.dataset.label} : ${written}`
							: ` ${written}`;
					}
				}
			}
		},
		scales: { [valueAxis]: values, [categoryAxis]: categories }
	};

	return options as ChartOptions<T>;
}
