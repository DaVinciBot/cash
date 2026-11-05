// Demandes d'excuse d'absence — contrôle d'accès de la vue Secrétaire.
//
// Les listes se lisent depuis le navigateur, dans `cash.absence_request_view`
// (voir `#lib/absenceTable.ts`) : la RLS décide seule de ce que chacun voit.

import type { Database } from '@davincibot/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

/**
 * Le lecteur peut-il traiter les demandes ? Posé à la base plutôt que lu dans
 * `locals.permissions` : celles-ci ne sont remplies que par le load du layout,
 * qui ne tourne pas pour une action de formulaire. Une erreur vaut refus.
 */
export async function isReviewer(supabase: Client): Promise<boolean> {
	const { data, error } = await supabase.rpc('has_permission', {
		p_permission: 'absences.requests.review'
	});
	return !error && data;
}
