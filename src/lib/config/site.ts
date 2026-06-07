export interface SiteConfig {
	name: string;
	domain: string;
	origin: string;
	description: string;
	twitter: string;
	ogImage: string;
	locale: string;
}

export const SITE: SiteConfig = {
	name: 'DaVinciBot',
	domain: 'davincibot.fr',
	origin: 'https://davincibot.fr',
	description: "DaVinciBot. L'association de robotique étudiante.",
	twitter: '@DaVinciBot',
	ogImage: '/dvb_og_img.png',
	locale: 'fr_FR'
};

export function canonicalFor(pathname: string | null | undefined = '/'): string {
	try {
		if (typeof pathname !== 'string') {
			throw new TypeError('pathname must be a string');
		}
		// Ensure leading slash
		const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
		// Trailing slash as per project setting
		const url = new URL(p.endsWith('/') ? p : `${p}/`, SITE.origin);
		return url.toString();
	} catch {
		return `${SITE.origin}/`;
	}
}
