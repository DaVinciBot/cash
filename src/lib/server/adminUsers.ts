// Socle commun des routes /api/admin/users : le client de service et le contrôle
// de permission que les trois endpoints (liste, statut, réinvitation) partagent.

import { appServerEnv } from '$lib/server/env';
import type { Database } from '@davincibot/database-types';
import { publicEnv } from '@davincibot/lib';
import { createServiceClient } from '@davincibot/lib/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Client Supabase à clé de service, hors RLS : réservé aux appels `auth.admin`. */
export const getAdminClient = (): SupabaseClient<Database> =>
	createServiceClient<Database>(publicEnv.PUBLIC_SUPABASE_URL, appServerEnv.SUPABASE_SECRET_KEY);

/**
 * Vrai si l'appelant peut éditer les membres, c'est-à-dire s'il détient au moins
 * l'une des deux permissions : modifier une fiche ou en changer le statut.
 */
export const requireEditMembers = async (locals: App.Locals): Promise<boolean> => {
	const [{ data: canUpdate }, { data: canStatusUpdate }] = await Promise.all([
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.update.all' }),
		locals.supabase.rpc('has_permission', { p_permission: 'members.profile.status.update' })
	]);
	return canUpdate === true || canStatusUpdate === true;
};
