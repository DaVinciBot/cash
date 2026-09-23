import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/* Le contraste de l'intranet, rendu exécutable.

   En septembre 2026 l'interface a basculé d'un contraste par remplissage à un
   contraste par bordure translucide. Chaque commit était défendable ; leur somme
   a fait tomber les bordures entre 1,24 et 2,31:1 et les placeholders à 3,46:1,
   sous le seuil de lisibilité. Rien ne l'a signalé : `svelte-check` et ESLint
   sont indifférents aux valeurs, et Tailwind v4 ne se plaint pas d'une classe
   dont le jeton n'existe pas — elle disparaît simplement du CSS produit.

   D'où cette liste noire. Les niveaux d'avant-plan ont des noms désormais
   (`text-muted`, `border-rule`, `border-rule-strong`, définis dans le thème de
   @davincibot/components) : écrire une opacité à la main, c'est rouvrir la
   brèche. */

const SRC = resolve(process.cwd(), 'src');

/* Thème clair imposé par l'impression PDF : les gris y sont posés sur du blanc
   et n'ont rien à voir avec l'échelle sombre. */
const EXEMPT = join('lib', 'components', 'cash', 'documents');

interface Interdit {
	motif: RegExp;
	raison: string;
}

const INTERDITS: Interdit[] = [
	{
		motif: /\b(?:border|divide|ring)-light-blue\/(?:10|20|30)\b/,
		raison: 'bordure sous le seuil de perception — utiliser border-rule ou border-rule-strong'
	},
	{
		motif: /\btext-dark-light-blue\/(?:[1-5]\d|\d)\b/,
		raison: 'texte sous 4.5:1 — utiliser text-muted'
	},
	{
		motif: /\btext-(?:gray|slate|zinc|neutral|stone)-[4-7]00\b/,
		raison: 'gris neutre hors charte, illisible sur fond sombre — utiliser text-muted'
	},
	{
		/* `placeholder-<couleur>` est de la syntaxe Tailwind v3 : en v4 la classe
		   ne produit rien et le placeholder tombe sur la couleur du navigateur. */
		motif: /\bplaceholder-(?!opacity\b)[a-z][a-z-]*-[a-z0-9/]+/,
		raison: 'syntaxe Tailwind v3 morte — écrire placeholder:text-muted'
	},
	{
		/* Idem : `bg-opacity-*` / `text-opacity-*` ont disparu en v4. */
		motif: /\b(?:bg|text|border)-opacity-\d+\b/,
		raison: 'syntaxe Tailwind v3 morte — écrire la couleur avec son opacité (bg-x/20)'
	},
	{
		motif: /\bbg-\[#060a2c\]/,
		raison: 'couleur de modale codée en dur — utiliser bg-surface-modal'
	}
];

function sources(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) {
			out.push(...sources(p));
		} else if (/\.(svelte|ts)$/.test(name) && !relative(SRC, p).startsWith(EXEMPT)) {
			out.push(p);
		}
	}
	return out;
}

const FICHIERS = sources(SRC);

describe('contraste des classes écrites à la main', () => {
	it('trouve bien les sources à inspecter', () => {
		expect(FICHIERS.length).toBeGreaterThan(50);
	});

	it.each(INTERDITS)('$raison', ({ motif }) => {
		const fautifs: string[] = [];
		for (const f of FICHIERS) {
			readFileSync(f, 'utf8')
				.split('\n')
				.forEach((ligne, i) => {
					if (motif.test(ligne)) fautifs.push(`${relative(SRC, f)}:${i + 1}`);
				});
		}
		expect(fautifs).toEqual([]);
	});

	/* `focus:outline-none` retire le repère du navigateur. Seul, il rend la
	   navigation au clavier aveugle — c'était le cas sur les 77 champs écrits à
	   la main, pendant que les primitives de la lib posaient déjà un anneau. */
	it('ne supprime jamais le focus sans le remplacer', () => {
		const fautifs: string[] = [];
		for (const f of FICHIERS) {
			readFileSync(f, 'utf8')
				.split('\n')
				.forEach((ligne, i) => {
					if (ligne.includes('focus:outline-none') && !ligne.includes('focus-visible:ring')) {
						fautifs.push(`${relative(SRC, f)}:${i + 1}`);
					}
				});
		}
		expect(fautifs).toEqual([]);
	});
});
