// Configuration commune des graphiques Chart.js.
//
// Chart.js est modulaire depuis la v3 : rien n'est enregistré par défaut, et un
// contrôleur manquant ne lève pas d'erreur — le canevas reste simplement vide.
// On enregistre donc ici, une fois, ce que les écrans utilisent.
//
// Les couleurs sont LUES DANS LE THÈME, pas recopiées. Chart.js peint dans un
// canevas : il ne voit ni les classes Tailwind ni les variables CSS, il faut
// donc les lui résoudre à la main. Les recopier en dur marcherait aujourd'hui et
// mentirait au premier changement de charte.

import {
	ArcElement,
	BarController,
	BarElement,
	CategoryScale,
	Chart,
	DoughnutController,
	Filler,
	Legend,
	LineController,
	LineElement,
	LinearScale,
	PointElement,
	Tooltip
} from 'chart.js';

let registered = false;

/** À appeler avant le premier rendu, côté navigateur uniquement. */
export function registerChartJs(): void {
	if (registered) {
		return;
	}
	Chart.register(
		BarController,
		LineController,
		DoughnutController,
		BarElement,
		LineElement,
		PointElement,
		ArcElement,
		CategoryScale,
		LinearScale,
		Filler,
		Legend,
		Tooltip
	);
	registered = true;
}

/**
 * Valeur d'une variable de thème, avec repli.
 *
 * Le repli n'est pas de la prudence gratuite : au premier rendu côté serveur il
 * n'y a pas de `document`, et une couleur absente donnerait un graphique noir
 * sur noir plutôt qu'une erreur visible.
 */
function token(name: string, fallback: string): string {
	if (typeof document === 'undefined') {
		return fallback;
	}
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value === '' ? fallback : value;
}

export interface ChartPalette {
	/** Série principale : soldes, budgets alloués. */
	primary: string;
	primarySoft: string;
	/** Recettes et dépenses — turquoise contre corail, jamais deux bleus. */
	credit: string;
	debit: string;
	/** Série secondaire : consommé face à l'alloué. */
	secondary: string;
	/** Rampe catégorielle, dans l'ordre d'usage. */
	slices: string[];
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
export function palette(): ChartPalette {
	const primary = token('--color-chart-primary', '#4b83ff');
	const credit = token('--color-chart-credit', '#2ed3b7');
	const debit = token('--color-chart-debit', '#f4635f');
	const accent = token('--color-chart-accent', '#f3b16d');
	const violet = token('--color-chart-violet', '#9b8cfa');
	const neutral = token('--color-chart-neutral', '#b3c2ff');

	return {
		primary,
		primarySoft: token('--color-chart-primary-soft', '#1c2a63'),
		credit,
		debit,
		secondary: accent,
		// L'ordre compte : deux teintes voisines ne doivent jamais se suivre, sans
		// quoi les deux premières parts d'un classement se confondent.
		slices: [primary, credit, accent, violet, neutral, debit],
		text: token('--color-chart-label', '#828ab6'),
		textStrong: token('--color-chart-label-strong', '#b3c2ff'),
		grid: token('--color-chart-grid', '#232a55'),
		surface: token('--color-chart-surface', '#0a0f3a')
	};
}

const euroCompact = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});

const euroExact = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Comment écrire une valeur : `tick` le long de l'axe, où la place manque, et
 * `value` dans l'infobulle, où l'on peut être exact.
 */
export interface ValueFormat {
	tick: (value: number) => string;
	value: (value: number) => string;
}

/** Le format des écrans de trésorerie, et le défaut historique de `baseOptions`. */
export const euroFormat: ValueFormat = {
	tick: (value) => euroCompact.format(value),
	value: (value) => euroExact.format(value)
};

const decimal = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** Des effectifs, des heures : tout ce qui se compte sans devise. */
export const countFormat: ValueFormat = {
	tick: (value) => decimal.format(value),
	value: (value) => decimal.format(value)
};

/** Un pourcentage déjà exprimé sur cent, comme les aires empilées normalisées. */
export const percentFormat: ValueFormat = {
	tick: (value) => `${decimal.format(Math.round(value))} %`,
	value: (value) => `${decimal.format(value)} %`
};

/**
 * Options partagées : thème sombre, axes discrets, infobulle formatée.
 *
 * Le format est un argument et non une constante : les mêmes axes servent des
 * euros en trésorerie et des effectifs en formation, et seule l'écriture des
 * nombres change d'un écran à l'autre.
 */
export function baseOptions(
	theme: ChartPalette,
	format: ValueFormat = euroFormat
): Record<string, unknown> {
	return {
		responsive: true,
		maintainAspectRatio: false,
		interaction: { mode: 'index', intersect: false },
		plugins: {
			legend: {
				labels: {
					color: theme.text,
					boxWidth: 10,
					boxHeight: 10,
					usePointStyle: true,
					font: { size: 11 }
				}
			},
			tooltip: {
				backgroundColor: theme.surface,
				borderColor: theme.grid,
				borderWidth: 1,
				titleColor: theme.textStrong,
				bodyColor: theme.textStrong,
				padding: 10,
				usePointStyle: true,
				callbacks: {
					label: (ctx: { dataset: { label?: string }; parsed: { y?: number } | number }) => {
						const raw = typeof ctx.parsed === 'number' ? ctx.parsed : (ctx.parsed.y ?? 0);
						return ` ${ctx.dataset.label ?? ''} : ${format.value(raw)}`;
					}
				}
			}
		},
		scales: {
			x: {
				ticks: { color: theme.text, font: { size: 10 } },
				grid: { display: false },
				border: { color: theme.grid }
			},
			y: {
				ticks: {
					color: theme.text,
					font: { size: 10 },
					callback: (v: number | string) => format.tick(Number(v))
				},
				grid: { color: theme.grid },
				border: { display: false }
			}
		}
	};
}
