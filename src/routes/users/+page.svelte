<script lang="ts">
	import { Button } from '@davincibot/components';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import RecordModal from '$lib/components/modals/RecordModal.svelte';
	import SucessModal from '$lib/components/modals/InfoModal.svelte';
	import {
		buildProfileFields,
		PROFILE_FIELD_KEYS,
		readProfileEdits
	} from '$lib/helpers/profileForm';
	import { GLOBAL_ROLE_CATEGORIES, OVERRIDE_PERMISSION_CATEGORIES } from '$lib/rbacCatalog';
	import {
		Table,
		UserImportModal,
		type Filter,
		type TableCell,
		type TableColumn,
		type TableRow
	} from '@davincibot/components';
	import {
		CAMPUS_BADGES,
		GLOBAL_ROLES,
		GLOBAL_ROLE_LABELS,
		hasAnyPermission,
		mountClosable,
		PROJECT_ROLE_LABELS,
		triggerTableRefresh,
		userdata,
		type Campus,
		type GlobalPermission,
		type GlobalRole,
		type ProjectRole
	} from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { unmount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	interface AuthUser {
		id: string;
		email: string | undefined;
		email_confirmed_at: string | null;
		invited_at: string | null;
		last_sign_in_at: string | null;
	}

	interface ApiPayload {
		error?: string;
		users?: AuthUser[];
		user?: { id: string };
	}

	interface ProjectOption {
		name: string;
		value: string;
	}

	interface ProfileRow {
		id: string;
		username: string;
		avatar_url: string | null;
		campus: Campus | null;
		status: string;
		member_of: MemberOfRow[];
		profile_global_roles: GlobalRoleRow[];
	}

	interface MemberOfRow {
		role: string;
		revoked_at: string | null;
		project: { id: number; name: string } | null;
	}

	interface GlobalRoleRow {
		role: string;
		revoked_at: string | null;
	}

	interface ProjectRoleEntry {
		project_id: string | number | null | undefined;
		role: string;
	}

	interface ImportUser {
		email: string;
		name: string;
		project?: string;
		campus?: string;
	}

	interface FailureEntry {
		email: string;
		message: string;
	}

	/** Le campus et les rôles s'affichent en badges : le CSV, lui, reprend les libellés. */
	function campusOf(value: unknown): Campus | null {
		return typeof value === 'string' && value in CAMPUS_BADGES ? (value as Campus) : null;
	}

	function globalRolesOf(value: unknown): GlobalRole[] {
		return Array.isArray(value) ? (value as GlobalRole[]) : [];
	}

	function globalRoleOf(value: unknown): GlobalRole | null {
		return typeof value === 'string' && GLOBAL_ROLES.includes(value as GlobalRole)
			? (value as GlobalRole)
			: null;
	}

	const columns: TableColumn[] = [
		{ key: 'username', label: 'Nom', sortable: true },
		{
			key: 'campus',
			label: 'Campus',
			sortable: true,
			csv: (row) => {
				const campus = campusOf(row[1]?.value);
				return campus ? CAMPUS_BADGES[campus].label : '';
			}
		},
		{ key: 'projects', label: 'Projets' },
		{
			key: 'roles',
			label: 'Rôles globaux',
			csv: (row) =>
				globalRolesOf(row[3]?.value)
					.map((role) => GLOBAL_ROLE_LABELS[role])
					.join(', ')
		},
		{ key: 'status', label: 'Statut', sortable: true }
	];

	// Recharger la table par son topic plutôt que la page entière : la recherche, les filtres, le
	// tri et la page en cours survivent à une édition.
	const usersTableTopic = 'users';
	let recordModalInstance: ReturnType<typeof mountClosable> | null = null;

	function closeDrawer() {
		if (!recordModalInstance) {
			return;
		}
		void unmount(recordModalInstance);
		recordModalInstance = null;
	}

	/** Après une écriture : le tiroir se ferme et la table se recharge là où l'utilisateur en était. */
	function refreshAfterWrite() {
		closeDrawer();
		triggerTableRefresh(usersTableTopic);
	}

	// `project_filter` et `role_filter` ne servent qu'aux filtres Projets et Rôles globaux :
	// filtrer l'embed affiché masquerait les autres projets et rôles des membres retenus.
	const dbInfo = {
		table: 'profiles',
		key: 'id, username, avatar_url, campus, status, member_of!membre_projet_profile_fkey(project!inner(id, name), revoked_at), project_filter:member_of!membre_projet_profile_fkey(project, revoked_at), profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at), role_filter:profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at)'
	};

	let canEditProfile = $state<boolean>(false);
	let canManageRoles = $state<boolean>(false);
	let canManageProjects = $state<boolean>(false);
	let canInviteMembers = $state<boolean>(false);
	let canUpdateStatus = $state<boolean>(false);
	const canReinvite = $derived(canEditProfile || canUpdateStatus);
	// Le trigger `create_user_profile` pose le profil et son rôle de base dans la
	// transaction d'invitation : l'import n'a plus besoin d'`iam.roles.manage`,
	// qui réservait l'écran au seul super_admin alors que c'est le secrétariat qui
	// saisit les arrivées. Attribuer un rôle en plus reste possible, et c'est ce
	// surplus — pas l'import — qui demande `iam.roles.manage` (`canManageRoles`).
	const canImportMembers = $derived(canInviteMembers && canManageProjects && canEditProfile);
	let pendingInvites = $state<AuthUser[]>([]);
	let pendingInvitesLoading = $state<boolean>(false);
	let pendingInvitesError = $state('');
	let reinvitingUserId = $state<string | null>(null);
	let cancelingUserId = $state<string | null>(null);
	let pendingInvitesInitialized = $state<boolean>(false);

	async function listAuthUsers(page: number, perPage: number): Promise<AuthUser[]> {
		const res = await fetch(
			`${resolve('/api/admin/users')}?page=${String(page)}&perPage=${String(perPage)}`
		);
		const body = await res.text();
		let payload: ApiPayload;
		try {
			payload = body ? (JSON.parse(body) as ApiPayload) : {};
		} catch {
			payload = {};
		}
		if (!res.ok) {
			const fallback = body.trim()
				? body.trim()
				: `Impossible de charger la liste des utilisateurs (status ${String(res.status)}).`;
			const message = payload.error ?? fallback;
			throw new Error(`${message} (status ${String(res.status)})`);
		}
		return payload.users ?? [];
	}

	async function inviteAuthUser(email: string): Promise<ApiPayload> {
		const res = await fetch(resolve('/api/admin/users'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		if (!res.ok) {
			const payload = (await res.json().catch(() => ({}))) as ApiPayload;
			throw new Error(payload.error ?? `Invitation impossible pour ${email}.`);
		}
		return (await res.json()) as ApiPayload;
	}

	async function deleteAuthUser(id: string): Promise<ApiPayload> {
		const res = await fetch(`${resolve('/api/admin/users')}/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			const payload = (await res.json().catch(() => ({}))) as ApiPayload;
			throw new Error(payload.error ?? 'Suppression impossible côté auth.');
		}
		return (await res.json()) as ApiPayload;
	}

	async function updateAuthUserStatus(id: string, status: string): Promise<ApiPayload> {
		const res = await fetch(`${resolve('/api/admin/users')}/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status })
		});
		if (!res.ok) {
			const payload = (await res.json().catch(() => ({}))) as ApiPayload;
			throw new Error(payload.error ?? 'Mise à jour du statut impossible.');
		}
		return (await res.json()) as ApiPayload;
	}

	async function reinviteAuthUser(id: string): Promise<ApiPayload> {
		const res = await fetch(`${resolve('/api/admin/users')}/${id}/reinvite`, { method: 'POST' });
		const body = await res.text();
		let payload: ApiPayload;
		try {
			payload = body ? (JSON.parse(body) as ApiPayload) : {};
		} catch {
			payload = {};
		}
		if (!res.ok) {
			const fallback = body.trim()
				? body.trim()
				: `Réinvitation impossible pour cet utilisateur (status ${String(res.status)}).`;
			const message = payload.error ?? fallback;
			throw new Error(message);
		}
		return payload;
	}

	async function cancelAuthUserInvite(id: string): Promise<ApiPayload> {
		const res = await fetch(`${resolve('/api/admin/users')}/${id}/cancel-invite`, {
			method: 'POST'
		});
		const body = await res.text();
		let payload: ApiPayload;
		try {
			payload = body ? (JSON.parse(body) as ApiPayload) : {};
		} catch {
			payload = {};
		}
		if (!res.ok) {
			const fallback = body.trim()
				? body.trim()
				: `Annulation impossible pour cette invitation (status ${String(res.status)}).`;
			const message = payload.error ?? fallback;
			throw new Error(message);
		}
		return payload;
	}

	function isPendingInvitedUser(authUser: AuthUser): boolean {
		return Boolean(authUser.email) && !authUser.email_confirmed_at && Boolean(authUser.invited_at);
	}

	function formatDate(value: string | null | undefined): string {
		if (!value) {
			return 'Jamais';
		}
		const dt = new Date(value);
		if (Number.isNaN(dt.getTime())) {
			return value;
		}
		return dt.toLocaleString('fr-FR');
	}

	// La liste des invitations vient de l'API admin, pas de PostgREST : `devData` court-circuite la
	// requête Supabase et `dbInfo` ne sert plus qu'à identifier la table côté composant.
	const pendingInvitesDbInfo = { table: 'pending_invites', key: 'id' };
	// Aligné sur le `perPage` de l'API : `devData` rend toutes les lignes d'un coup, la pagination
	// du composant n'aurait aucune page suivante à servir.
	const PENDING_INVITES_PAGE_SIZE = 25;
	const pendingInvitesColumns: TableColumn[] = [
		{ key: 'email', label: 'Email' },
		{ key: 'invited_at', label: 'Invité·e le' },
		{ key: 'actions', label: 'Actions', csv: () => '' }
	];

	function parsePendingInvites(data: unknown[]): TableRow[] {
		return (data as AuthUser[]).map((authUser) => [
			{ value: authUser.email ?? '', data: authUser.id },
			{ value: formatDate(authUser.invited_at) },
			{ value: authUser, cell: inviteActionsCell }
		]);
	}

	async function loadPendingInvites() {
		if (!canReinvite) {
			pendingInvites = [];
			pendingInvitesError = '';
			return;
		}

		pendingInvitesLoading = true;
		pendingInvitesError = '';
		try {
			const users: AuthUser[] = [];
			const perPage = 100;
			let page = 1;
			for (;;) {
				const fetched = await listAuthUsers(page, perPage);
				users.push(...fetched);
				if (fetched.length < perPage) {
					break;
				}
				page += 1;
			}

			pendingInvites = users.filter(isPendingInvitedUser).sort((a, b) => {
				const aDate = new Date(a.invited_at ?? 0).getTime();
				const bDate = new Date(b.invited_at ?? 0).getTime();
				return bDate - aDate;
			});
		} catch (error) {
			pendingInvites = [];
			pendingInvitesError =
				(error as Error | null)?.message ??
				'Impossible de charger les invitations en attente pour le moment.';
		} finally {
			pendingInvitesLoading = false;
		}
	}

	async function reinvitePendingUser(authUser: AuthUser) {
		if (!canReinvite) {
			alert("Vous n'avez pas les permissions requises pour réinviter un utilisateur.");
			return;
		}
		if (!authUser.id || !authUser.email) {
			alert('Utilisateur invalide, impossible de renvoyer une invitation.');
			return;
		}

		reinvitingUserId = authUser.id;
		try {
			await reinviteAuthUser(authUser.id);
			mountClosable(SucessModal, {
				target: document.body,
				props: {
					message: `Invitation renvoyée à ${authUser.email}.`,
					onClose: () => {
						/* no-op */
					}
				}
			});
			await loadPendingInvites();
		} catch (error) {
			alert((error as Error | null)?.message ?? 'Impossible de renvoyer cette invitation.');
		} finally {
			reinvitingUserId = null;
		}
	}

	async function cancelPendingInvite(authUser: AuthUser) {
		if (!canReinvite) {
			alert("Vous n'avez pas les permissions requises pour annuler une invitation.");
			return;
		}
		if (!authUser.id || !authUser.email) {
			alert("Utilisateur invalide, impossible d'annuler cette invitation.");
			return;
		}
		if (
			!confirm(
				`Voulez-vous vraiment annuler l'invitation de ${authUser.email} ? Le compte en attente sera supprimé.`
			)
		) {
			return;
		}

		cancelingUserId = authUser.id;
		try {
			await cancelAuthUserInvite(authUser.id);
			mountClosable(SucessModal, {
				target: document.body,
				props: {
					message: `Invitation annulée pour ${authUser.email}.`,
					onClose: () => {
						/* no-op */
					}
				}
			});
			await loadPendingInvites();
		} catch (error) {
			alert((error as Error | null)?.message ?? "Impossible d'annuler cette invitation.");
		} finally {
			cancelingUserId = null;
		}
	}

	let allProjects: ProjectOption[] = $state([
		{ name: 'CDR', value: '1' },
		{ name: 'Travelers', value: '2' },
		{ name: 'Exodus', value: '3' },
		{ name: 'Bureau', value: '8' },
		{ name: 'SmartScreen', value: '10' },
		{ name: 'BallBalancing', value: '11' },
		{ name: 'Mur Végétal', value: '12' },
		{ name: 'E-Dog', value: '13' },
		{ name: 'CDR Nantes', value: '14' }
	]);

	const filters = $derived<Filter[]>([
		{
			category: 'Campus',
			value: 'campus',
			options: (Object.keys(CAMPUS_BADGES) as Campus[]).map((value) => ({
				name: CAMPUS_BADGES[value].label,
				value
			}))
		},
		{
			category: 'Projets',
			value: 'project',
			relation: 'project_filter',
			where: [{ column: 'revoked_at', operator: 'is', value: 'null' }],
			options: allProjects
		},
		{
			category: 'Rôles globaux',
			value: 'role',
			relation: 'role_filter',
			where: [{ column: 'revoked_at', operator: 'is', value: 'null' }],
			wide: true,
			// L'ordre du catalogue (Direction, responsables, membres) plutôt que celui de l'enum.
			options: Object.values(GLOBAL_ROLE_CATEGORIES)
				.flat()
				.map((role) => ({ name: role.label, value: role.value }))
		},
		{
			category: 'Statut',
			value: 'status',
			options: [
				{ name: 'Activé', value: 'active', active: true },
				{ name: 'Désactivé', value: 'disabled' }
			]
		}
	]);

	function normalizeProjectOption(project: {
		value?: string | number;
		id?: number;
		name?: string;
	}): ProjectOption {
		const value = String(project.value ?? project.id ?? '');
		const name = project.name ?? value;
		return { name, value };
	}

	userdata.subscribe((user) => {
		if (user?.allProjects) {
			allProjects = user.allProjects.map(normalizeProjectOption);
		}
		const permissions = user?.permissions ?? [];
		canEditProfile = hasAnyPermission(permissions, ['members.profile.update.all']);
		canManageRoles = hasAnyPermission(permissions, ['iam.roles.manage']);
		canManageProjects = hasAnyPermission(permissions, ['members.projects.update.all']);
		canInviteMembers = hasAnyPermission(permissions, ['members.invite.send']);
		canUpdateStatus = hasAnyPermission(permissions, ['members.profile.status.update']);
	});

	$effect(() => {
		if (canReinvite && !pendingInvitesInitialized) {
			pendingInvitesInitialized = true;
			void loadPendingInvites();
		}
	});

	$effect(() => {
		if (!canReinvite) {
			pendingInvitesInitialized = false;
			pendingInvites = [];
			pendingInvitesError = '';
		}
	});

	function parseItems(data: unknown[]) {
		const typedData = data as ProfileRow[];
		const items: TableRow[] = [];
		for (const el of typedData) {
			const project = el.member_of
				.filter((m) => !m.revoked_at)
				.map((m) => m.project?.name ?? '')
				.join(', ');
			// PostgREST ne garantit pas l'ordre de l'embed : on le fige sur le rang de l'enum,
			// sans quoi les badges dansent d'un chargement à l'autre.
			const roles = el.profile_global_roles
				.filter((r) => !r.revoked_at)
				.map((r) => r.role as GlobalRole)
				.sort((a, b) => GLOBAL_ROLES.indexOf(a) - GLOBAL_ROLES.indexOf(b));
			const status = el.status === 'disabled' ? 'Désactivé' : 'Activé';
			items.push([
				{ value: el.username, data: el.id, avatar: el.avatar_url },
				{ value: el.campus, cell: campusCell },
				{ value: project },
				{ value: roles, cell: rolesCell },
				{ value: status }
			]);
		}
		return items;
	}

	/**
	 * Nom et campus issus du CSV, posés sur le profil que le trigger
	 * `create_user_profile` vient de créer à l'invitation. La RPC lit `undefined`
	 * comme « ne touche pas » : un CSV sans campus laisse la colonne vide.
	 */
	async function applyImportedProfile(
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
		profileId: string,
		username: string,
		campus: Campus | null
	): Promise<void> {
		// Le profil naît dans la transaction d'invitation, jamais ici. S'il manque,
		// la RPC mettrait zéro ligne à jour sans rien signaler : on préfère l'échec
		// visible, qui déclenche le rollback de l'invitation.
		const { count, error: lookupError } = await supabase
			.from('profiles')
			.select('id', { count: 'exact', head: true })
			.eq('id', profileId);
		if (lookupError) {
			throw new Error((lookupError as { message: string }).message);
		}
		if ((count ?? 0) === 0) {
			throw new Error('Profil introuvable après invitation.');
		}

		if (!username && !campus) {
			return;
		}
		const { error } = await supabase.rpc('admin_update_profile', {
			p_profile: profileId,
			p_username: username || undefined,
			p_campus: campus ?? undefined
		});
		if (error) {
			throw new Error(error.message);
		}
	}

	/**
	 * Rôle global choisi pour l'import, posé sur chaque membre traité. La base
	 * attribue déjà son rôle de base à la création : celui-ci s'y ajoute.
	 */
	async function assignImportedRole(
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
		profileId: string,
		role: GlobalRole | null
	): Promise<void> {
		if (!role) {
			return;
		}
		const { error } = await supabase.rpc('assign_global_role', {
			p_profile: profileId,
			p_role: role
		});
		if (error) {
			throw new Error(
				`Attribution du rôle ${GLOBAL_ROLE_LABELS[role]} impossible : ${error.message}`
			);
		}
	}

	/** Rattache au projet si aucune ligne active ne le fait déjà. */
	async function attachToProject(
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
		profileId: string,
		projectId: number
	): Promise<boolean> {
		const { count, error: checkError } = await supabase
			.from('member_of')
			.select('project', { count: 'exact', head: true })
			.eq('profile', profileId)
			.eq('project', projectId)
			.is('revoked_at', null);
		if (checkError) {
			throw new Error((checkError as { message: string }).message);
		}
		if ((count ?? 0) > 0) {
			return false;
		}
		const { error: attachError } = await supabase.from('member_of').insert({
			profile: profileId,
			project: projectId,
			role: 'project_member' satisfies ProjectRole
		});
		if (attachError) {
			throw new Error((attachError as { message: string }).message);
		}
		return true;
	}

	function addNew() {
		mountClosable(UserImportModal, {
			target: document.body,
			props: {
				projectOptions: allProjects,
				// Attribuer un rôle relève d'`iam.roles.manage` : sans elle, le
				// sélecteur ne s'affiche pas et la base pose son rôle de base.
				roleOptions: canManageRoles
					? Object.values(GLOBAL_ROLE_CATEGORIES)
							.flat()
							.map((role) => ({ name: role.label, value: role.value }))
					: [],
				title: 'Importer des utilisateurs',
				onSubmit: async ({
					campus,
					project,
					role,
					users
				}: {
					campus: string;
					project: string;
					role: string;
					users: ImportUser[];
				}) => {
					if (!canImportMembers) {
						throw new Error(
							"Vous n'avez pas les permissions requises pour cette action (members.invite.send, members.projects.update.all et members.profile.update.all nécessaires)."
						);
					}

					const supabase = getSupabaseBrowserClient();
					const createdUsers: string[] = [];
					const updatedUsers: string[] = [];
					const alreadyLinked: string[] = [];
					const failures: FailureEntry[] = [];
					const defaultProject = project !== '' && project !== 'NULL' ? project : '';
					const defaultCampus = campusOf(campus);
					const importedRole = globalRoleOf(role);

					// Le rang décide : `can_manage_role` refuse un rôle au moins aussi haut
					// que le sien. On le demande une fois, avant d'inviter qui que ce soit —
					// sinon chaque membre serait créé puis supprimé par le rollback.
					if (importedRole) {
						const { data: allowed, error: roleCheckError } = await supabase.rpc('can_manage_role', {
							p_target_role: importedRole
						});
						if (roleCheckError) {
							throw new Error(
								'Vérification du rôle impossible : ' +
									(roleCheckError as { message: string }).message
							);
						}
						if (!allowed) {
							throw new Error(
								`Vous ne pouvez pas attribuer le rôle ${GLOBAL_ROLE_LABELS[importedRole]} : il faut un rôle strictement supérieur au sien.`
							);
						}
					}

					const existingAuthUsers = new SvelteMap<string, AuthUser>();
					try {
						const perPage = 100;
						let page = 1;
						for (;;) {
							const fetched = await listAuthUsers(page, perPage);
							for (const authUser of fetched) {
								if (!authUser.email) {
									continue;
								}
								existingAuthUsers.set(authUser.email.toLowerCase(), authUser);
							}
							if (fetched.length < perPage) {
								break;
							}
							page += 1;
						}
					} catch {
						throw new Error('Impossible de récupérer la liste des utilisateurs existants.');
					}

					for (const user of users) {
						const email = user.email.trim().toLowerCase();
						const username = user.name.trim();
						const projectRaw =
							user.project && user.project !== 'NULL' ? user.project : defaultProject;
						const resolvedProjectValue = projectRaw.trim();
						if (!resolvedProjectValue) {
							failures.push({
								email,
								message: 'Aucun projet associé pour cet utilisateur.'
							});
							continue;
						}
						const projectId = parseInt(resolvedProjectValue, 10);
						if (!Number.isInteger(projectId) || projectId < 0) {
							failures.push({
								email,
								message: 'Projet invalide ou introuvable pour cet utilisateur.'
							});
							continue;
						}
						const userCampus = campusOf(user.campus) ?? defaultCampus;
						const existingAuth = existingAuthUsers.get(email);
						let createdUserId: string | null = existingAuth?.id ?? null;
						let isNewlyCreated = false;

						try {
							if (!existingAuth) {
								const inviteData = await inviteAuthUser(email);
								createdUserId = inviteData.user?.id ?? null;
								if (!createdUserId) {
									throw new Error('Invitation échouée : ID utilisateur manquant.');
								}
								isNewlyCreated = true;
								// Le profil et le rôle de base existent déjà (trigger
								// `create_user_profile`) : l'import ne fait que remplacer le nom
								// déduit de l'email par celui du CSV, et poser le campus.
								await applyImportedProfile(supabase, createdUserId, username, userCampus);
								await assignImportedRole(supabase, createdUserId, importedRole);
								await attachToProject(supabase, createdUserId, projectId);
								createdUsers.push(email);
								existingAuthUsers.set(email, {
									id: createdUserId,
									email,
									email_confirmed_at: null,
									invited_at: null,
									last_sign_in_at: null
								});
							} else {
								// Membre déjà connu : on ne réécrit ni son nom ni son campus, qu'il
								// a pu corriger lui-même. Le rôle demandé vaut pour tout l'import,
								// lui compris ; `assign_global_role` est idempotent.
								await assignImportedRole(supabase, existingAuth.id, importedRole);
								const attached = await attachToProject(supabase, existingAuth.id, projectId);
								if (attached) {
									updatedUsers.push(email);
								} else {
									alreadyLinked.push(email);
								}
							}
						} catch (error) {
							failures.push({
								email,
								message: (error as Error | null)?.message ?? 'Erreur inconnue'
							});
							// La suppression du compte auth emporte profil, rôles et
							// rattachements (ON DELETE CASCADE) : rien à nettoyer en amont.
							if (isNewlyCreated && createdUserId) {
								try {
									await deleteAuthUser(createdUserId);
								} catch {
									// cleanup best-effort
								}
							}
						}
					}

					if (
						createdUsers.length === 0 &&
						updatedUsers.length === 0 &&
						alreadyLinked.length === 0
					) {
						const firstFailure = failures[0];
						throw new Error(
							firstFailure?.message
								? `Impossible de traiter ${firstFailure.email} : ${firstFailure.message}`
								: 'Impossible de traiter les utilisateurs.'
						);
					}

					const messageParts: string[] = [];
					if (createdUsers.length > 0) {
						const createdLabel =
							createdUsers.length === 1
								? `Utilisateur invité : ${createdUsers[0] ?? ''}`
								: `${String(createdUsers.length)} nouveaux utilisateurs invités.`;
						messageParts.push(createdLabel);
					}
					if (updatedUsers.length > 0) {
						const updatedLabel =
							updatedUsers.length === 1
								? `Projet ajouté pour ${updatedUsers[0] ?? ''}.`
								: `Projet ajouté pour ${String(updatedUsers.length)} utilisateurs.`;
						messageParts.push(updatedLabel);
					}
					if (alreadyLinked.length > 0) {
						messageParts.push(`Déjà associés à ce projet : ${alreadyLinked.join(', ')}`);
					}
					if (
						importedRole &&
						createdUsers.length + updatedUsers.length + alreadyLinked.length > 0
					) {
						messageParts.push(`Rôle ${GLOBAL_ROLE_LABELS[importedRole]} attribué à tout l'import.`);
					}
					if (failures.length > 0) {
						const failureEmails = failures.map((f) => f.email).join(', ');
						messageParts.push(
							`Échec pour : ${failureEmails}. Consultez la console pour plus de détails.`
						);
					}

					const message = messageParts.join('\n');

					mountClosable(SucessModal, {
						target: document.body,
						props: {
							message,
							onClose: () => {
								triggerTableRefresh(usersTableTopic);
								void loadPendingInvites();
							}
						}
					});
				}
			}
		});
	}

	/**
	 * Applique un diff de rôles globaux via les RPC assign/revoke (immuabilité de
	 * profile_global_roles respectée côté DB). `current` = rôles actifs, `next` =
	 * sélection cible.
	 */
	async function applyGlobalRoleDiff(
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
		profileId: string,
		current: GlobalRole[],
		next: GlobalRole[]
	): Promise<void> {
		const currentSet = new Set(current);
		const nextSet = new Set(next);
		const toAssign = next.filter((r) => !currentSet.has(r));
		const toRevoke = current.filter((r) => !nextSet.has(r));

		for (const role of toAssign) {
			const { error } = await supabase.rpc('assign_global_role', {
				p_profile: profileId,
				p_role: role
			});
			if (error) {
				throw new Error(`Attribution du rôle ${role} impossible : ${error.message}`);
			}
		}
		for (const role of toRevoke) {
			const { error } = await supabase.rpc('revoke_global_role', {
				p_profile: profileId,
				p_role: role
			});
			if (error) {
				throw new Error(`Révocation du rôle ${role} impossible : ${error.message}`);
			}
		}
	}

	/**
	 * Applique un diff de rattachements projet. `member_of` est immuable : un
	 * retrait ou un changement de rôle pose `revoked_at` sur la ligne active, la
	 * nouvelle attribution arrivant derrière sous forme de ligne neuve.
	 */
	async function applyProjectRoleDiff(
		supabase: ReturnType<typeof getSupabaseBrowserClient>,
		profileId: string,
		next: ProjectRoleEntry[]
	): Promise<void> {
		const { data: memberData, error: memberError } = (await supabase
			.from('member_of')
			.select('project, role')
			.eq('profile', profileId)
			.is('revoked_at', null)) as {
			data: { project: string | number; role: string }[] | null;
			error: unknown;
		};
		if (memberError) {
			throw new Error(
				'Récupération des projets existants impossible : ' +
					(memberError as { message: string }).message
			);
		}

		const memberRows = memberData ?? [];
		const currentProjectIds = memberRows.map((m) => m.project.toString());
		// Une ligne sans projet est une ligne que l'utilisateur a ajoutée puis
		// laissée vide : elle ne compte ni comme ajout ni comme conservation.
		const nextEntries = next.filter(
			(p) => p.project_id !== null && p.project_id !== undefined && p.project_id !== ''
		);
		const nextProjectIds = nextEntries.map((p) => String(p.project_id));
		const toAdd = nextEntries.filter((p) => !currentProjectIds.includes(String(p.project_id)));
		const toRemove = currentProjectIds.filter((pid) => !nextProjectIds.includes(pid));
		const toReassign = nextEntries.filter((p) => {
			const existing = memberRows.find((m) => m.project.toString() === String(p.project_id));
			return existing !== undefined && existing.role !== p.role;
		});

		const projectIdsToRevoke = [...toRemove, ...toReassign.map((p) => String(p.project_id))]
			.map((pid) => Number(pid))
			.filter((pid) => Number.isInteger(pid));
		if (projectIdsToRevoke.length > 0) {
			const { error: revokeError } = await supabase
				.from('member_of')
				.update({ revoked_at: new Date().toISOString() })
				.eq('profile', profileId)
				.is('revoked_at', null)
				.in('project', projectIdsToRevoke);
			if (revokeError) {
				throw new Error(
					'Révocation des rattachements impossible : ' +
						(revokeError as { message: string }).message
				);
			}
		}

		const rowsToInsert = [...toAdd, ...toReassign]
			.map((p) => ({
				profile: profileId,
				project: Number(p.project_id),
				role: (p.role || 'project_member') as ProjectRole
			}))
			.filter((row) => Number.isInteger(row.project));
		if (rowsToInsert.length > 0) {
			const { error: addError } = await supabase.from('member_of').insert(rowsToInsert);
			if (addError) {
				throw new Error(
					'Rattachement aux projets impossible : ' + (addError as { message: string }).message
				);
			}
		}
	}

	async function viewUser(row: TableRow) {
		const id = row[0]?.data;
		if (typeof id !== 'string' || !id) {
			return;
		}
		const supabase = getSupabaseBrowserClient();
		const { data, error } = (await supabase
			.from('profiles')
			.select(
				'id, username, campus, permissions, status, profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at), member_of!membre_projet_profile_fkey(role, revoked_at, project(id,name)), avatar_url'
			)
			.eq('id', id)
			.single()) as {
			data: (ProfileRow & { permissions: string[] | null }) | null;
			error: unknown;
		};
		if (error || !data) {
			return;
		}

		// Rôles globaux actifs (non révoqués) — servent d'état de départ au diff.
		const activeGlobalRoles = data.profile_global_roles
			.filter((r) => !r.revoked_at)
			.map((r) => r.role as GlobalRole);

		const overridePermissions = (data.permissions ?? []).filter(Boolean);

		const projectsData = data.member_of
			.filter((m) => !m.revoked_at)
			.map((m) => ({
				project_id: m.project === null ? undefined : String(m.project.id),
				role: (m.role || 'project_member') as ProjectRole
			}))
			.filter((m) => m.project_id !== undefined);

		const roleBadges = activeGlobalRoles.map((role) => ({
			text: GLOBAL_ROLE_LABELS[role],
			color: 'bg-dark-blue border border-light-blue/70 text-light-blue'
		}));

		const flatOverride = Object.values(OVERRIDE_PERMISSION_CATEGORIES).flat();
		const permBadges = overridePermissions.map((p: string) => {
			const label = flatOverride.find((fp) => fp.value === p)?.label ?? p;
			return { text: label, color: 'bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-100' };
		});

		const projectBadges = data.member_of
			.filter((m) => !m.revoked_at)
			.map((m) => {
				if (!m.project) {
					return null;
				}
				const roleColor =
					m.role === 'cdp'
						? 'bg-amber-900 border border-amber-500 text-amber-100'
						: 'bg-blue-900 border border-blue-500 text-blue-100';
				const roleLabel = PROJECT_ROLE_LABELS[(m.role || 'project_member') as ProjectRole];
				return { text: `${m.project.name} (${roleLabel})`, color: roleColor };
			})
			.filter((b): b is { text: string; color: string } => b !== null);

		const values = {
			header: {
				title: 'Utilisateur',
				sub: `${String(activeGlobalRoles.length)} rôle(s) · ${String(overridePermissions.length)} override(s)`
			},
			body: [
				{
					label: 'Nom',
					id: PROFILE_FIELD_KEYS.username,
					value: data.username,
					avatar: data.avatar_url
				},
				{ label: 'Campus', id: PROFILE_FIELD_KEYS.campus, value: data.campus ?? 'NULL' },
				{
					label: 'Rôles globaux',
					value: { type: 'badges', list: roleBadges },
					id: 'roles',
					data: activeGlobalRoles
				},
				{
					label: 'Permissions supplémentaires',
					value: { type: 'badges', list: permBadges },
					id: 'permissions',
					data: overridePermissions
				},
				{
					label: 'Projets et rôles',
					value: { type: 'badges', list: projectBadges },
					id: 'projects',
					data: projectsData
				}
			]
		};

		// Un champ n'est présenté que si l'appelant peut réellement l'enregistrer.
		// Sa présence commande aussi l'écriture correspondante à la soumission :
		// un champ absent ne doit jamais être lu comme « sélection vide », faute
		// de quoi ouvrir la fiche révoquerait rôles et rattachements.
		const fields = [
			...(canEditProfile ? buildProfileFields() : []),
			...(canManageRoles
				? [
						{
							name: 'Rôles globaux',
							id: 'roles',
							type: 'permissions_grouped',
							categories: GLOBAL_ROLE_CATEGORIES,
							packages: [],
							bulkActions: false,
							wide: true
						},
						{
							name: 'Permissions supplémentaires',
							id: 'permissions',
							type: 'permissions_grouped',
							categories: OVERRIDE_PERMISSION_CATEGORIES,
							packages: [],
							wide: true
						}
					]
				: []),
			...(canManageProjects
				? [
						{
							name: 'Projets et rôles',
							id: 'projects',
							type: 'project_roles',
							projects: allProjects,
							roles: [
								{ value: 'cdp', text: PROJECT_ROLE_LABELS.cdp },
								{ value: 'project_member', text: PROJECT_ROLE_LABELS.project_member }
							],
							defaultRole: 'project_member' satisfies ProjectRole,
							wide: true
						}
					]
				: [])
		];
		recordModalInstance = mountClosable(RecordModal, {
			target: document.body,
			props: {
				values,
				fields,
				onSubmit: async (
					_e: Event,
					forms: HTMLFormElement,
					newFields: { name?: string; id?: string; value?: unknown }[]
				) => {
					const formData = new FormData(forms);

					const rolesField = newFields.find((f) => f.id === 'roles');
					const permsField = newFields.find((f) => f.id === 'permissions');
					const projectsField = newFields.find((f) => f.id === 'projects');

					const { username: nom, campus } = readProfileEdits(formData, {
						username: newFields.some((f) => f.id === PROFILE_FIELD_KEYS.username),
						campus: newFields.some((f) => f.id === PROFILE_FIELD_KEYS.campus)
					});

					const extractedPermissions =
						permsField && Array.isArray(permsField.value)
							? (permsField.value as GlobalPermission[])
							: undefined;

					// Nom, campus et override : la RPC lit `undefined` comme « ne touche
					// pas », donc l'appel n'a lieu que si un des trois a été présenté.
					if (nom !== undefined || campus !== undefined || extractedPermissions !== undefined) {
						const { error: profileError } = await supabase.rpc('admin_update_profile', {
							p_profile: id,
							p_username: nom,
							p_permissions: extractedPermissions,
							p_campus: campus
						});
						if (profileError) {
							alert(
								'Erreur lors de la mise à jour du profil : ' +
									(profileError as { message: string }).message
							);
							return;
						}
					}

					// rôles globaux : diff via les RPC assign/revoke (immuabilité DB).
					if (rolesField) {
						const nextGlobalRoles = Array.isArray(rolesField.value)
							? (rolesField.value as GlobalRole[])
							: [];
						try {
							await applyGlobalRoleDiff(supabase, id, activeGlobalRoles, nextGlobalRoles);
						} catch (roleError) {
							alert(
								'Erreur lors de la mise à jour des rôles : ' +
									((roleError as Error | null)?.message ?? 'Erreur inconnue')
							);
							return;
						}
					}

					// rattachements projet : même principe de diff, sur member_of.
					if (projectsField) {
						const projectsRoles = Array.isArray(projectsField.value)
							? (projectsField.value as ProjectRoleEntry[])
							: [];
						try {
							await applyProjectRoleDiff(supabase, id, projectsRoles);
						} catch (projectError) {
							alert(
								'Erreur lors de la mise à jour des projets : ' +
									((projectError as Error | null)?.message ?? 'Erreur inconnue')
							);
							return;
						}
					}

					mountClosable(SucessModal, {
						target: document.body,
						props: {
							message: 'Utilisateur mis à jour avec succès',
							open: true,
							onClose: refreshAfterWrite
						}
					});
				},
				id,
				actions: canUpdateStatus
					? [
							data.status === 'disabled'
								? { title: 'Réactiver', type: 'validate', handler: reactivateUser }
								: { title: 'Désactiver', type: 'delete', handler: deleteUser }
						]
					: []
			}
		});
	}

	async function deleteUser(e: Event) {
		e.preventDefault();
		if (!canUpdateStatus) {
			alert("Vous n'avez pas les permissions requises pour désactiver un utilisateur.");
			return;
		}
		if (!confirm('Voulez-vous vraiment désactiver cet utilisateur ?')) {
			return;
		}
		const card = document.querySelector('div[id^=record-]');
		const recordId = card instanceof HTMLElement ? card.id.split('record-')[1] : '';
		if (!recordId) {
			return;
		}
		try {
			await deleteAuthUser(recordId);
		} catch (error) {
			alert((error as Error | null)?.message ?? 'Erreur lors de la désactivation du compte.');
			return;
		}
		refreshAfterWrite();
	}

	async function reactivateUser(e: Event) {
		e.preventDefault();
		if (!canUpdateStatus) {
			alert("Vous n'avez pas les permissions requises pour réactiver un utilisateur.");
			return;
		}
		if (!confirm('Voulez-vous vraiment réactiver cet utilisateur ?')) {
			return;
		}
		const card = document.querySelector('div[id^=record-]');
		const recordId = card instanceof HTMLElement ? card.id.split('record-')[1] : '';
		if (!recordId) {
			return;
		}
		try {
			await updateAuthUserStatus(recordId, 'active');
		} catch (error) {
			alert((error as Error | null)?.message ?? 'Erreur lors de la réactivation du compte.');
			return;
		}
		refreshAfterWrite();
	}
</script>

{#snippet campusCell(cell: TableCell)}
	{@const campus = campusOf(cell.value)}
	{#if campus}
		<CampusBadge {campus} compact />
	{:else}
		<span class="text-gray-500">—</span>
	{/if}
{/snippet}

{#snippet rolesCell(cell: TableCell)}
	{@const roles = globalRolesOf(cell.value)}
	{#if roles.length > 0}
		<div class="flex min-w-0 flex-wrap gap-1">
			{#each roles as role (role)}
				<span
					class="bg-dark-blue border-light-blue/70 text-light-blue inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap"
				>
					{GLOBAL_ROLE_LABELS[role]}
				</span>
			{/each}
		</div>
	{:else}
		<span class="text-gray-500">—</span>
	{/if}
{/snippet}

{#snippet inviteActionsCell(cell: TableCell)}
	{@const authUser = cell.value as AuthUser}
	<div class="flex w-full flex-wrap justify-end gap-2">
		<Button
			disabled={reinvitingUserId !== null || cancelingUserId !== null}
			onclick={() => {
				void reinvitePendingUser(authUser);
			}}
			size="sm"
			variant="primary"
		>
			{reinvitingUserId === authUser.id ? 'Envoi...' : 'Réinviter'}
		</Button>
		<Button
			disabled={reinvitingUserId !== null || cancelingUserId !== null}
			onclick={() => {
				void cancelPendingInvite(authUser);
			}}
			size="sm"
			variant="danger"
		>
			{cancelingUserId === authUser.id ? 'Annulation...' : 'Annuler'}
		</Button>
	</div>
{/snippet}

<svelte:head><title>Membres — DaVinciBot</title></svelte:head>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<h1 class="text-light-blue m-0 text-2xl font-bold">Utilisateurs</h1>
		{#if canReinvite}
			<span
				class="inline-flex items-center rounded-full border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-amber-300 uppercase ring-1 ring-amber-500/30"
			>
				{pendingInvitesLoading
					? 'Chargement...'
					: `${String(pendingInvites.length)} ${pendingInvites.length > 1 ? 'membres non validés' : 'membre non validé'}`}
			</span>
		{/if}
	</div>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="bg-blue-gray/15 rounded-lg">
		<Table
			addNew={canImportMembers ? addNew : null}
			{columns}
			{dbInfo}
			{filters}
			onRowClick={(row) => void viewUser(row)}
			pageSize={15}
			{parseItems}
			refreshTopic={usersTableTopic}
			searchable="username"
		/>
	</div>
</div>

{#if canReinvite}
	<div class="w-full py-2 sm:px-8 lg:px-16">
		<div class="bg-blue-gray/15 rounded-lg p-4">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-xl font-semibold text-white">Invitations en attente</h3>
				<Button
					disabled={pendingInvitesLoading || reinvitingUserId !== null || cancelingUserId !== null}
					onclick={() => {
						void loadPendingInvites();
					}}
					size="sm"
					variant="secondary"
				>
					Rafraîchir
				</Button>
			</div>

			{#if pendingInvitesError}
				<p
					class="mb-3 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/30"
				>
					{pendingInvitesError}
				</p>
			{/if}

			{#if pendingInvitesLoading}
				<p class="text-dark-light-blue text-sm">Chargement des invitations en attente...</p>
			{:else if pendingInvites.length === 0}
				<p class="text-dark-light-blue text-sm">Aucune invitation expirée/en attente détectée.</p>
			{:else}
				<Table
					columns={pendingInvitesColumns}
					dbInfo={pendingInvitesDbInfo}
					devData={pendingInvites}
					pageSize={PENDING_INVITES_PAGE_SIZE}
					parseItems={parsePendingInvites}
					searchable="email"
				/>
			{/if}
		</div>
	</div>
{/if}
