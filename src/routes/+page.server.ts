import { myItems } from '$lib/server/cash';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Chargement serveur plutôt que <Table dbInfo> côté navigateur : la liste doit
// s'afficher de manière déterministe (TRANS-NF-10) et rester cohérente après
// chaque action (TRANS-NF-11). Une expiration de session se traduit ici par une
// redirection propre du layout, jamais par un tableau qui disparaît (TRANS-NF-02).

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('cash:items');

	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return { items: [] };
	}

	return { items: await myItems(locals.supabase, user.id) };
};

export const actions: Actions = {
	/**
	 * Suppression d'un item par son auteur.
	 *
	 * On ne vérifie pas l'état ici : la policy `items_delete` n'autorise déjà que
	 * `pending_cdp`, `refused_cdp` et `refused_treso`. Redoubler la règle côté
	 * application la ferait diverger le jour où elle change en base.
	 */
	delete: async ({ locals, request }) => {
		const { user } = await locals.safeGetSession();
		if (!user?.id) {
			error(401, 'Session expirée.');
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!Number.isInteger(id)) {
			return fail(400, { message: 'Item invalide.' });
		}

		const { error: deleteError, count } = await locals.supabase
			.schema('cash')
			.from('items')
			.delete({ count: 'exact' })
			.eq('id', id);

		if (deleteError) {
			return fail(400, { message: "Cet item n'a pas pu être supprimé." });
		}
		if (count === 0) {
			return fail(403, {
				message: "Cet item n'est plus supprimable : il a déjà été traité."
			});
		}

		return { deleted: id };
	}
};
