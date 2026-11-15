// Synchronisation des membres sur un CSV complet (cash#79).
//
// Le CSV fait foi : qui y figure est membre, avec le nom et le campus du
// fichier ; qui n'y figure plus redevient invité (rôle `guest`). Les autres
// rôles globaux d'un profil ne sont pas touchés.

export interface AbsentMember {
	id: string;
	email: string;
}

/**
 * Membres actifs absents du CSV. Celui qui lance la synchronisation n'en fait
 * jamais partie (il se retirerait ses propres droits), ni un profil sans email
 * connu, qu'on ne saurait pas comparer.
 */
export function absentMembers(
	memberIds: Iterable<string>,
	emailById: ReadonlyMap<string, string>,
	csvEmails: ReadonlySet<string>,
	selfId: string | null
): AbsentMember[] {
	const absent: AbsentMember[] = [];
	const seen = new Set<string>();
	for (const id of memberIds) {
		if (seen.has(id) || id === selfId) {
			continue;
		}
		seen.add(id);
		const email = emailById.get(id)?.trim().toLowerCase();
		if (!email || csvEmails.has(email)) {
			continue;
		}
		absent.push({ id, email });
	}
	return absent.sort((a, b) => a.email.localeCompare(b.email));
}

/** Texte de la confirmation, avec au plus `shown` adresses citées. */
export function demotionPrompt(absent: AbsentMember[], shown = 10): string {
	if (absent.length === 0) {
		return '';
	}
	const listed = absent
		.slice(0, shown)
		.map((member) => `- ${member.email}`)
		.join('\n');
	const more = absent.length > shown ? `\n... et ${String(absent.length - shown)} autre(s).` : '';
	const subject =
		absent.length === 1
			? '1 membre absent du CSV va redevenir invité'
			: `${String(absent.length)} membres absents du CSV vont redevenir invités`;
	return `${subject} :\n${listed}${more}\n\nContinuer ?`;
}
