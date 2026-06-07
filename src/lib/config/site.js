export const SITE = {
	name: 'DaVinciBot',
	domain: 'davincibot.fr',
	origin: 'https://davincibot.fr',
	description: "DaVinciBot. L'association de robotique étudiante.",
	twitter: '@DaVinciBot',
	ogImage: '/dvb_og_img.png',
	locale: 'fr_FR'
};

export function canonicalFor(pathname = '/') {
	try {
		// Ensure leading slash
		const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
		// Trailing slash as per project setting
		const url = new URL(p.endsWith('/') ? p : `${p}/`, SITE.origin);
		return url.toString();
	} catch {
		return `${SITE.origin}/`;
	}
}
