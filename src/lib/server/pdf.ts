import { env } from '$env/dynamic/private';
import { sidCookieName } from '@davincibot/lib/server';
import { chromium, type Browser } from 'playwright';

// Génération de PDF côté serveur.
//
// Pourquoi un navigateur et pas une bibliothèque PDF : la feuille existe déjà en
// HTML, avec son bandeau, ses sauts de page et son `@page`. La redessiner dans
// un modèle de rendu différent créerait une SECONDE mise en page à maintenir, et
// les deux divergeraient au premier ajustement. Ici le PDF est ce que l'écran
// montre, par construction.
//
// Pourquoi côté serveur : c'est le seul moyen d'imposer le nom du fichier. La
// boîte « Enregistrer au format PDF » du navigateur n'obéit à aucun standard —
// un en-tête `Content-Disposition`, si.

/** Adresse par laquelle le serveur s'atteint lui-même. */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
const INTERNAL_BASE = env.PDF_INTERNAL_BASE ?? `http://127.0.0.1:${env.PORT ?? '3000'}`;

/**
 * Le navigateur est démarré une fois et réutilisé : chaque lancement coûte
 * environ une seconde et 150 Mo. C'est le CONTEXTE qui est jeté après chaque
 * rendu — lui seul porte les cookies, et deux trésoriers ne doivent jamais
 * partager une session.
 */
let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
	if (browser?.isConnected()) {
		return browser;
	}
	// Un second appel pendant le démarrage attend le même navigateur au lieu d'en
	// lancer un deuxième.
	launching ??= chromium
		.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
		.then((b) => {
			browser = b;
			launching = null;
			return b;
		})
		.catch((e: unknown) => {
			launching = null;
			throw e;
		});

	return launching;
}

// Deux rendus simultanés au plus : chacun ouvre un onglet, et un pic de
// demandes ferait tomber le conteneur pour épuisement mémoire plutôt que de
// ralentir.
const MAX_CONCURRENT = 2;
let running = 0;
const waiting: (() => void)[] = [];

async function acquire(): Promise<void> {
	if (running < MAX_CONCURRENT) {
		running += 1;
		return;
	}
	await new Promise<void>((resolve) => waiting.push(resolve));
	running += 1;
}

function release(): void {
	running -= 1;
	waiting.shift()?.();
}

/**
 * Rend une page de l'application en PDF, avec la session de l'appelant.
 *
 * Le cookie est celui du trésorier connecté : le rendu passe donc par les mêmes
 * policies que son navigateur. Utiliser une clé de service donnerait au PDF une
 * vue que l'utilisateur n'a pas.
 */
export async function renderPagePdf(path: string, sid: string): Promise<Uint8Array> {
	await acquire();
	const context = await (await getBrowser()).newContext();
	try {
		await context.addCookies([
			{
				// Le nom porte un préfixe configurable selon l'environnement : le lire
				// plutôt que l'écrire en dur, sinon le rendu part sans session et
				// tombe sur la page de connexion.
				name: sidCookieName(),
				value: sid,
				domain: '127.0.0.1',
				path: '/',
				httpOnly: true,
				secure: false
			}
		]);

		const page = await context.newPage();
		const response = await page.goto(`${INTERNAL_BASE}${path}`, {
			waitUntil: 'networkidle',
			timeout: 20_000
		});

		if (!response?.ok()) {
			throw new Error(`rendu impossible : ${String(response?.status() ?? 'aucune réponse')}`);
		}

		// `preferCSSPageSize` fait autorité au `@page` de la feuille — sans lui, le
		// format passé ici l'écraserait et les marges des pages de suite
		// disparaîtraient.
		return await page.pdf({
			printBackground: true,
			preferCSSPageSize: true,
			format: 'A4'
		});
	} finally {
		await context.close();
		release();
	}
}
