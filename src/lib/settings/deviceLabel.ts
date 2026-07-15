// Libellé lisible depuis le user-agent stocké par le service auth (device_label).
// Regex volontairement simples, sans dépendance : l'ordre des motifs compte
// (Edge/Opera avant Chrome, iOS avant macOS, Android avant Linux).

const BROWSER_PATTERNS: [RegExp, string][] = [
	[/edg(?:e|a|ios)?\//i, 'Edge'],
	[/opr\/|opera/i, 'Opera'],
	[/firefox\/|fxios\//i, 'Firefox'],
	[/chrome\/|crios\//i, 'Chrome'],
	[/safari\//i, 'Safari']
];

const OS_PATTERNS: [RegExp, string][] = [
	[/windows/i, 'Windows'],
	[/android/i, 'Android'],
	[/iphone|ipad|ipod/i, 'iOS'],
	[/mac os x|macintosh/i, 'macOS'],
	[/linux/i, 'Linux']
];

export function parseDeviceLabel(userAgent: string | null): string {
	if (!userAgent) {
		return 'Appareil inconnu';
	}
	const browser = BROWSER_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
	const os = OS_PATTERNS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
	if (browser && os) {
		return `${browser} · ${os}`;
	}
	return browser ?? os ?? 'Appareil inconnu';
}

export function isMobileUserAgent(userAgent: string | null): boolean {
	return Boolean(userAgent && /android|iphone|ipad|ipod|mobile/i.test(userAgent));
}
