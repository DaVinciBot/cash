// Codes promotionnels des fournisseurs (#92, #98) — règles communes au serveur
// et à l'écran.
//
// Un code est rattaché au DOMAINE de son marchand, au format de `items.domain`
// (« mouser », jamais « eu.mouser.com »). C'est ce rapprochement qui permet
// d'avertir, au moment de saisir un lien, qu'un code existe pour ce site.

export interface PromoCode {
	id: number;
	supplier: string;
	domain: string;
	code: string;
	discount: string;
	conditions: string | null;
	expiresOn: string | null;
	archivedAt: string | null;
}

/**
 * Domaine enregistrable d'un lien, calculé comme la colonne `items.domain` :
 * l'hôte, sans sous-domaine ni extension, en tenant compte des extensions à deux
 * segments (« .co.uk », « .com.au »).
 */
export function domainOf(link: string): string | null {
	const host = /^(?:https?:\/\/)?([^/:?#]+)/i.exec(link.trim())?.[1]?.toLowerCase();
	if (!host) {
		return null;
	}
	const match = /([^.]+)\.(?:(?:co|com|net|org|gov|edu|ac|asso|gouv|nom|tm)\.[a-z]{2}|[^.]+)$/.exec(
		host
	);
	return match?.[1] ?? null;
}

/** Un code s'applique tant qu'il n'est ni archivé ni expiré (jour d'expiration compris). */
export function isPromoActive(code: PromoCode, today: string): boolean {
	return code.archivedAt === null && (code.expiresOn === null || code.expiresOn >= today);
}

export type PromoStatus = 'active' | 'expired' | 'archived';

export function promoStatus(code: PromoCode, today: string): PromoStatus {
	if (code.archivedAt !== null) {
		return 'archived';
	}
	return isPromoActive(code, today) ? 'active' : 'expired';
}

export const PROMO_STATUS_LABELS: Record<PromoStatus, string> = {
	active: 'Actif',
	expired: 'Expiré',
	archived: 'Archivé'
};

/** Codes actifs qui concernent le lien donné. */
export function promoCodesFor(
	link: string,
	codes: readonly PromoCode[],
	today: string
): PromoCode[] {
	const domain = domainOf(link);
	if (!domain) {
		return [];
	}
	return codes.filter((code) => code.domain === domain && isPromoActive(code, today));
}
