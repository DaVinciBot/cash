<script lang="ts">
	import { resolve } from '$app/paths';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';
	import SucessModal from '$lib/components/modals/InfoModal.svelte';
	import { GLOBAL_ROLE_CATEGORIES, OVERRIDE_PERMISSION_CATEGORIES } from '$lib/rbacCatalog';
	import { Table, UserImportModal } from '@davincibot/components';
	import {
		CAMPUS_BADGES,
		GLOBAL_ROLE_LABELS,
		hasAnyPermission,
		mountClosable,
		PROJECT_ROLE_LABELS,
		userdata,
		type Campus,
		type GlobalPermission,
		type GlobalRole,
		type ProjectRole
	} from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
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
		status: string;
		member_of: MemberOfRow[];
	}

	interface MemberOfRow {
		role: string;
		revoked_at: string | null;
		project: { id: number; name: string } | null;
	}

	interface ProjectRoleEntry {
		project_id: string | number | null | undefined;
		role: string;
	}

	interface ImportUser {
		email: string;
		name: string;
		project?: string;
	}

	interface FailureEntry {
		email: string;
		message: string;
	}

	const headers = ['Nom', 'Projets', 'Statut', 'Actions'];

	const dbInfo = {
		table: 'profiles',
		key: 'id, username, avatar_url, status, member_of!membre_projet_profile_fkey(project!inner(id, name), revoked_at)'
	};

	let canEditProfile = $state<boolean>(false);
	let canManageRoles = $state<boolean>(false);
	let canManageProjects = $state<boolean>(false);
	let canInviteMembers = $state<boolean>(false);
	let canUpdateStatus = $state<boolean>(false);
	const canReinvite = $derived(canEditProfile || canUpdateStatus);
	const canImportMembers = $derived(canInviteMembers && canManageRoles && canManageProjects);
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

	interface TableFilter {
		category: string;
		value: string;
		wide?: boolean;
		options: { name: string; value: string; active?: boolean }[];
	}

	const filters = $derived<TableFilter[]>([
		{
			category: 'Projets',
			value: 'member_of.project',
			options: allProjects
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
			const projectFilter = filters[0];
			if (projectFilter) {
				projectFilter.options = allProjects;
			}
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
		const items: { value: string; data?: string; avatar?: string | null }[][] = [];
		for (const el of typedData) {
			const project = el.member_of
				.filter((m) => !m.revoked_at)
				.map((m) => m.project?.name ?? '')
				.join(', ');
			const status = el.status === 'disabled' ? 'Désactivé' : 'Activé';
			items.push([
				{ value: el.username, data: el.id, avatar: el.avatar_url },
				{ value: project },
				{ value: status }
			]);
		}
		return items;
	}

	function addNew() {
		mountClosable(UserImportModal, {
			target: document.body,
			props: {
				projectOptions: allProjects,
				title: 'Importer des utilisateurs',
				onSubmit: async ({ project, users }: { project: string; users: ImportUser[] }) => {
					if (!canImportMembers) {
						throw new Error(
							"Vous n'avez pas les permissions requises pour cette action (members.invite.send, iam.roles.manage et members.projects.update.all nécessaires)."
						);
					}

					const supabase = getSupabaseBrowserClient();
					const createdUsers: string[] = [];
					const updatedUsers: string[] = [];
					const alreadyLinked: string[] = [];
					const failures: FailureEntry[] = [];
					const defaultProject = project !== '' && project !== 'NULL' ? project : '';

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
								const { error: profileError } = await supabase.from('profiles').insert({
									id: createdUserId,
									username
								});
								if (profileError) {
									throw new Error((profileError as { message: string }).message);
								}
								const { error: roleError } = await supabase.rpc('assign_global_role', {
									p_profile: createdUserId,
									p_role: DEFAULT_IMPORT_ROLE
								});
								if (roleError) {
									throw new Error(roleError.message);
								}
								const { error: memberError } = await supabase.from('member_of').insert({
									profile: createdUserId,
									project: projectId,
									role: 'project_member' satisfies ProjectRole
								});
								if (memberError) {
									throw new Error((memberError as { message: string }).message);
								}
								createdUsers.push(email);
								existingAuthUsers.set(email, {
									id: createdUserId,
									email,
									email_confirmed_at: null,
									invited_at: null,
									last_sign_in_at: null
								});
							} else {
								// existingAuth est défini dans cette branche : son id aussi.
								const profileId = existingAuth.id;
								const { data: existingProfileRows, error: existingProfileError } = (await supabase
									.from('profiles')
									.select('id, username')
									.eq('id', profileId)
									.limit(1)) as {
									data: { id: string; username: string }[] | null;
									error: unknown;
								};
								if (existingProfileError) {
									throw new Error((existingProfileError as { message: string }).message);
								}
								const existingProfile = existingProfileRows?.[0];
								if (!existingProfile) {
									const fallbackUsername = username || email.split('@')[0];
									const { error: profileInsertError } = await supabase.from('profiles').insert({
										id: profileId,
										username: fallbackUsername
									});
									if (profileInsertError) {
										throw new Error((profileInsertError as { message: string }).message);
									}
									// Profil créé à la volée : lui garantir le rôle par défaut.
									const { error: roleError } = await supabase.rpc('assign_global_role', {
										p_profile: profileId,
										p_role: DEFAULT_IMPORT_ROLE
									});
									if (roleError) {
										throw new Error(roleError.message);
									}
								}
								const { count: memberCount, error: memberCheckError } = await supabase
									.from('member_of')
									.select('project', { count: 'exact', head: true })
									.eq('profile', profileId)
									.eq('project', projectId)
									.is('revoked_at', null);
								if (memberCheckError) {
									throw new Error((memberCheckError as { message: string }).message);
								}
								if ((memberCount ?? 0) === 0) {
									const { error: attachError } = await supabase.from('member_of').insert({
										profile: profileId,
										project: projectId,
										role: 'project_member' satisfies ProjectRole
									});
									if (attachError) {
										throw new Error((attachError as { message: string }).message);
									}
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
							if (isNewlyCreated && createdUserId) {
								await supabase.rpc('set_profile_status', {
									p_profile: createdUserId,
									p_status: 'disabled',
									p_reason: 'rollback_import_failed'
								});
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
								window.location.reload();
							}
						}
					});
				}
			}
		});
	}

	const DEFAULT_IMPORT_ROLE: GlobalRole = 'guest';

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

	// Action handlers for rows
	async function viewUser(e: Event) {
		e.preventDefault();
		const supabase = getSupabaseBrowserClient();
		const tr = (e.currentTarget as HTMLElement).closest('tr');
		if (!tr) {
			return;
		}
		const dataEl = tr.querySelector('[data-utils]');
		const id = dataEl instanceof HTMLElement ? dataEl.getAttribute('data-utils') : null;
		if (!id) {
			return;
		}
		const { data, error } = (await supabase
			.from('profiles')
			.select(
				'id, username, campus, permissions, status, profile_global_roles!profile_global_roles_profile_fkey(role, revoked_at), member_of!membre_projet_profile_fkey(role, revoked_at, project(id,name)), avatar_url'
			)
			.eq('id', id)
			.single()) as {
			data:
				| (ProfileRow & {
						campus: Campus | null;
						permissions: string[] | null;
						status: string;
						profile_global_roles: { role: string; revoked_at: string | null }[];
				  })
				| null;
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
			color: 'bg-primary-900 border border-primary-500 text-primary-100'
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
				{ label: 'Nom', value: data.username, avatar: data.avatar_url },
				{ label: 'Campus', value: data.campus ?? 'NULL' },
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
			...(canEditProfile
				? [
						{
							name: 'Nom',
							type: 'text',
							placeholder: 'Rob, aka Robert',
							required: true,
							wide: true
						},
						{
							name: 'Campus',
							type: 'select',
							options: (Object.keys(CAMPUS_BADGES) as Campus[]).map((value) => ({
								value,
								text: CAMPUS_BADGES[value].label
							}))
						}
					]
				: []),
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
		mountClosable(ReadDrawer, {
			target: document.body,
			props: {
				initialWidth: 560,
				values,
				fields,
				onSubmit: async (
					_e: Event,
					forms: HTMLFormElement,
					newFields: { name?: string; id?: string; value?: unknown }[]
				) => {
					const formData = new FormData(forms);

					const nomField = newFields.find((f) => f.name === 'Nom');
					const campusField = newFields.find((f) => f.name === 'Campus');
					const rolesField = newFields.find((f) => f.id === 'roles');
					const permsField = newFields.find((f) => f.id === 'permissions');
					const projectsField = newFields.find((f) => f.id === 'projects');

					let nom: string | undefined;
					if (nomField) {
						const nomVal = formData.get('Nom');
						nom =
							typeof nomVal === 'string'
								? nomVal
								: typeof nomField.value === 'string'
									? nomField.value
									: '';
					}

					// Le sélecteur renvoie 'NULL' quand rien n'est choisi ; la RPC traite
					// NULL comme « ne pas toucher », ce qui évite d'effacer un campus déjà
					// posé en rouvrant simplement la fiche.
					let campus: Campus | undefined;
					if (campusField) {
						const campusVal = formData.get('Campus');
						campus =
							typeof campusVal === 'string' && campusVal !== 'NULL'
								? (campusVal as Campus)
								: undefined;
					}

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
							onClose: () => {
								window.location.reload();
							}
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

	const actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e: Event) => {
				await viewUser(e);
			}
		}
	];

	async function deleteUser(e: Event) {
		e.preventDefault();
		if (!canUpdateStatus) {
			alert("Vous n'avez pas les permissions requises pour désactiver un utilisateur.");
			return;
		}
		if (!confirm('Voulez-vous vraiment désactiver cet utilisateur ?')) {
			return;
		}
		const drawer = document.querySelector('div[id^=drawer-]');
		const drawerId = drawer instanceof HTMLElement ? drawer.id.split('drawer-')[1] : '';
		if (!drawerId) {
			return;
		}
		try {
			await deleteAuthUser(drawerId);
		} catch (error) {
			alert((error as Error | null)?.message ?? 'Erreur lors de la désactivation du compte.');
			return;
		}
		window.location.reload();
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
		const drawer = document.querySelector('div[id^=drawer-]');
		const drawerId = drawer instanceof HTMLElement ? drawer.id.split('drawer-')[1] : '';
		if (!drawerId) {
			return;
		}
		try {
			await updateAuthUserStatus(drawerId, 'active');
		} catch (error) {
			alert((error as Error | null)?.message ?? 'Erreur lors de la réactivation du compte.');
			return;
		}
		window.location.reload();
	}
</script>

<svelte:head><title>Membres — DaVinciBot</title></svelte:head>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<h2 class="text-4xl font-bold tracking-tight text-white">Utilisateurs</h2>
		{#if canReinvite}
			<span
				class="inline-flex items-center rounded-full border border-amber-500/60 bg-amber-900/40 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200 uppercase"
			>
				{pendingInvitesLoading
					? 'Chargement...'
					: `${String(pendingInvites.length)} ${pendingInvites.length > 1 ? 'membres non validés' : 'membre non validé'}`}
			</span>
		{/if}
	</div>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="rounded-lg bg-gray-800">
		<Table
			{actions}
			addNew={canImportMembers ? addNew : null}
			{dbInfo}
			{filters}
			{headers}
			{parseItems}
		/>
	</div>
</div>

{#if canReinvite}
	<div class="w-full py-2 sm:px-8 lg:px-16">
		<div class="rounded-lg bg-gray-800 p-4">
			<div class="mb-4 flex items-center justify-between gap-3">
				<h3 class="text-xl font-semibold text-white">Invitations en attente</h3>
				<button
					class="rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={pendingInvitesLoading || reinvitingUserId !== null || cancelingUserId !== null}
					onclick={() => {
						void loadPendingInvites();
					}}
					type="button"
				>
					Rafraîchir
				</button>
			</div>

			{#if pendingInvitesError}
				<p
					class="mb-3 rounded-lg border border-red-600 bg-red-900/30 px-3 py-2 text-sm text-red-100"
				>
					{pendingInvitesError}
				</p>
			{/if}

			{#if pendingInvitesLoading}
				<p class="text-sm text-gray-300">Chargement des invitations en attente...</p>
			{:else if pendingInvites.length === 0}
				<p class="text-sm text-gray-300">Aucune invitation expirée/en attente détectée.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-left text-sm text-gray-300">
						<thead class="border-b border-gray-700 text-xs tracking-wide text-gray-400 uppercase">
							<tr>
								<th class="px-3 py-2">Email</th>
								<th class="px-3 py-2">Invité le</th>
								<th class="px-3 py-2">Dernière connexion</th>
								<th class="px-3 py-2 text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each pendingInvites as authUser (authUser.id)}
								<tr class="border-b border-gray-700">
									<td class="px-3 py-2 text-white">{authUser.email}</td>
									<td class="px-3 py-2">{formatDate(authUser.invited_at)}</td>
									<td class="px-3 py-2">{formatDate(authUser.last_sign_in_at)}</td>
									<td class="px-3 py-2 text-right">
										<div class="flex flex-wrap justify-end gap-2">
											<button
												class="bg-primary-700 hover:bg-primary-800 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
												disabled={reinvitingUserId !== null || cancelingUserId !== null}
												onclick={() => {
													void reinvitePendingUser(authUser);
												}}
												type="button"
											>
												{reinvitingUserId === authUser.id ? 'Envoi...' : 'Réinviter'}
											</button>
											<button
												class="rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
												disabled={reinvitingUserId !== null || cancelingUserId !== null}
												onclick={() => {
													void cancelPendingInvite(authUser);
												}}
												type="button"
											>
												{cancelingUserId === authUser.id ? 'Annulation...' : 'Annuler'}
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{/if}
