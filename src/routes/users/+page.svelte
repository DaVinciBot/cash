<script>
	import { resolve } from '$app/paths';
	import { hasAnyPermission } from '$lib/permissions';
	import { userdata } from '$lib/store.js';
	import { supabase } from '$lib/supabaseClient';

	import Table from '$lib/components/admin/Table.svelte';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';
	import SucessModal from '$lib/components/modals/InfoModal.svelte';
	import UserImportModal from '$lib/components/modals/UserImportModal.svelte';

	export let data;

	let headers = ['Nom', 'Projets', 'Actions'];

	let dbInfo = {
		table: 'profiles',
		key: 'id, username, avatar_url, member_of(project!inner(id, name))'
	};

	let canEditMembers = false;

	async function listAuthUsers(page, perPage) {
		const res = await fetch(`${resolve('/api/admin/users')}?page=${page}&perPage=${perPage}`);
		const body = await res.text();
		let payload = {};
		try {
			payload = body ? JSON.parse(body) : {};
		} catch {
			payload = {};
		}
		if (!res.ok) {
			const fallback = body?.trim()
				? body.trim()
				: `Impossible de charger la liste des utilisateurs (status ${res.status}).`;
			const message = payload?.error || fallback;
			console.error('Erreur API /api/admin/users', {
				status: res.status,
				body
			});
			throw new Error(`${message} (status ${res.status})`);
		}
		return payload?.users ?? [];
	}

	async function inviteAuthUser(email) {
		const res = await fetch(`${resolve('/api/admin/users')}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		if (!res.ok) {
			const payload = await res.json().catch(() => ({}));
			throw new Error(payload?.error || `Invitation impossible pour ${email}.`);
		}
		return await res.json();
	}

	async function deleteAuthUser(id) {
		const res = await fetch(`${resolve('/api/admin/users')}/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			const payload = await res.json().catch(() => ({}));
			throw new Error(payload?.error || 'Suppression impossible côté auth.');
		}
		return await res.json();
	}

	let allProjects = [
		{ text: 'CDR', value: '1' },
		{ text: 'Travelers', value: '2' },
		{ text: 'Exodus', value: '3' },
		{ text: 'Bureau', value: '8' },
		{ text: 'SmartScreen', value: '10' },
		{ text: 'BallBalancing', value: '11' },
		{ text: 'Mur Végétal', value: '12' },
		{ text: 'E-Dog', value: '13' },
		{ text: 'CDR Nantes', value: '14' }
	];

	let filters = [
		{
			category: 'Projets',
			value: 'member_of.project.id',
			options: allProjects
		}
	];

	userdata.subscribe((user) => {
		if (user && user.allProjects) {
			allProjects = user.allProjects.map((p) => ({ value: p.value, text: p.name }));
			filters[0].options = user.allProjects.map((p) => ({ text: p.name, value: p.id })); // Update the project filter options
		}
		canEditMembers = hasAnyPermission(user?.permissions || [], ['edit_members']);
	});

	function parseItems(data) {
		let items = [];
		data.forEach((el) => {
			const project = el.member_of.map((el) => el.project?.name).join(', ');
			items.push([{ value: el.username, data: el.id, avatar: el.avatar_url }, { value: project }]);
		});
		return items;
	}

	async function addNew() {
		new UserImportModal({
			target: document.body,
			props: {
				projectOptions: allProjects,
				permissionCategories,
				permissionPackages,
				title: 'Importer des utilisateurs',
				onSubmit: async ({ project, users, permissions }) => {
					if (!canEditMembers) {
						throw new Error(
							"Vous n'avez pas les permissions requises pour cette action (edit_members nécessaire)."
						);
					}

					const createdUsers = [];
					const updatedUsers = [];
					const alreadyLinked = [];
					const failures = [];
					const defaultProject =
						project !== undefined && project !== null && project !== '' && project !== 'NULL'
							? project
							: '';
					const incomingPermissions = Array.isArray(permissions) ? permissions.filter(Boolean) : [];

					const existingAuthUsers = new Map();
					try {
						const perPage = 100;
						let page = 1;
						while (true) {
							const fetched = await listAuthUsers(page, perPage);
							for (const authUser of fetched) {
								if (!authUser.email) continue;
								existingAuthUsers.set(authUser.email.toLowerCase(), authUser);
							}
							if (fetched.length < perPage) break;
							page += 1;
						}
					} catch (error) {
						console.error('Impossible de récupérer les utilisateurs existants', error);
						throw new Error('Impossible de récupérer la liste des utilisateurs existants.');
					}

					for (const user of users) {
						const email = user.email.trim().toLowerCase();
						const username = user.name.trim();
						const projectRaw =
							user.project && user.project !== 'NULL' ? user.project : defaultProject;
						const resolvedProjectValue = (projectRaw ?? '').toString().trim();
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
						let createdUserId = existingAuth?.id ?? null;
						let isNewlyCreated = false;

						try {
							if (!existingAuth) {
								const inviteData = await inviteAuthUser(email);
								createdUserId = inviteData?.user?.id;
								if (!createdUserId)
									throw new Error('Invitation échouée : ID utilisateur manquant.');
								isNewlyCreated = true;
								const { error: profileError } = await supabase.from('profiles').insert({
									id: createdUserId,
									username,
									permissions: incomingPermissions
								});
								if (profileError) throw new Error(profileError.message);
								const { error: memberError } = await supabase.from('member_of').insert({
									profile: createdUserId,
									project: projectId
								});
								if (memberError) throw new Error(memberError.message);
								createdUsers.push(email);
								existingAuthUsers.set(email, { id: createdUserId, email });
							} else {
								const profileId = createdUserId;
								const { data: existingProfileRows, error: existingProfileError } = await supabase
									.from('profiles')
									.select('id, username, permissions')
									.eq('id', profileId)
									.limit(1);
								if (existingProfileError) throw new Error(existingProfileError.message);
								const existingProfile = existingProfileRows?.[0];
								if (!existingProfile) {
									const fallbackUsername = username || email.split('@')[0];
									const { error: profileInsertError } = await supabase.from('profiles').insert({
										id: profileId,
										username: fallbackUsername,
										permissions: incomingPermissions
									});
									if (profileInsertError) throw new Error(profileInsertError.message);
								} else if (incomingPermissions.length > 0) {
									const currentPermissions = Array.isArray(existingProfile.permissions)
										? existingProfile.permissions
										: [];
									const mergedPermissions = Array.from(
										new Set([...currentPermissions, ...incomingPermissions])
									);
									if (mergedPermissions.length !== currentPermissions.length) {
										const { error: permUpdateError } = await supabase
											.from('profiles')
											.update({ permissions: mergedPermissions })
											.eq('id', profileId);
										if (permUpdateError) throw new Error(permUpdateError.message);
									}
								}
								const { count: memberCount, error: memberCheckError } = await supabase
									.from('member_of')
									.select('project', { count: 'exact', head: true })
									.eq('profile', profileId)
									.eq('project', projectId);
								if (memberCheckError) throw new Error(memberCheckError.message);
								if ((memberCount ?? 0) === 0) {
									const { error: attachError } = await supabase.from('member_of').insert({
										profile: profileId,
										project: projectId
									});
									if (attachError) throw new Error(attachError.message);
									updatedUsers.push(email);
								} else {
									alreadyLinked.push(email);
								}
							}
						} catch (error) {
							failures.push({ email, message: error?.message || 'Erreur inconnue' });
							if (isNewlyCreated && createdUserId) {
								const { error: cleanupProfileError } = await supabase
									.from('profiles')
									.delete()
									.eq('id', createdUserId);
								if (cleanupProfileError) {
									console.error('Impossible de nettoyer le profil créé', cleanupProfileError);
								}
								try {
									await deleteAuthUser(createdUserId);
								} catch (cleanupError) {
									console.error('Impossible de supprimer le compte Supabase', cleanupError);
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

					const messageParts = [];
					if (createdUsers.length > 0) {
						const createdLabel =
							createdUsers.length === 1
								? `Utilisateur invité : ${createdUsers[0]}`
								: `${createdUsers.length} nouveaux utilisateurs invités.`;
						messageParts.push(createdLabel);
					}
					if (updatedUsers.length > 0) {
						const updatedLabel =
							updatedUsers.length === 1
								? `Projet ajouté pour ${updatedUsers[0]}.`
								: `Projet ajouté pour ${updatedUsers.length} utilisateurs.`;
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
						console.error('Import utilisateurs échoué pour certains comptes', failures);
					}

					const message = messageParts.join('\n');

					new SucessModal({
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

	const permissionCategories = {
		Administration: [
			{ label: 'Accès Admin', value: 'view_admin' },
			{ label: 'Voir tous les stats', value: 'view_all_stats' }
		],
		Membres: [
			{ label: 'Voir membres', value: 'view_members' },
			{ label: 'Éditer membres', value: 'edit_members' }
		],
		Projets: [
			{ label: 'Voir projets/commandes', value: 'view_projects_orders' },
			{ label: 'Éditer projets', value: 'edit_projects_orders' },
			{ label: 'Créer commande projet', value: 'make_project_order' },
			{ label: 'Voir stats projet', value: 'view_project_stats' }
		],
		'Commandes (Global)': [
			{ label: 'Voir toutes les commandes', value: 'view_all_orders' },
			{ label: 'Éditer commandes', value: 'edit_orders' },
			{ label: 'Créer commande', value: 'make_order' }
		],
		Trésorerie: [
			{ label: 'Voir la trésorerie', value: 'view_treso' },
			{ label: 'Éditer la trésorerie', value: 'edit_treso' }
		],
		'Site & Blog': [
			{ label: 'Éditer brouillons blog', value: 'edit_blog_draft' },
			{ label: 'Publier blog', value: 'edit_blog' }
		],
		Formation: [
			{ label: 'Accès formations', value: 'view_trainings' },
			{ label: 'Gérer formations', value: 'edit_trainings' }
		]
	};

	const permissionPackages = [
		{
			label: 'Admin Complet',
			perms: [
				'view_admin',
				'view_all_stats',
				'view_members',
				'edit_members',
				'view_projects_orders',
				'edit_projects_orders',
				'make_project_order',
				'view_project_stats',
				'view_all_orders',
				'edit_orders',
				'make_order',
				'view_treso',
				'edit_treso',
				'edit_blog_draft',
				'edit_blog',
				'view_trainings',
				'edit_trainings'
			]
		},
		{
			label: 'Membre du Codir',
			perms: [
				'view_admin',
				'view_all_stats',
				'view_members',
				'view_projects_orders',
				'view_project_stats',
				'view_all_orders',
				'view_treso',
				'view_trainings',
				'edit_trainings',
				'edit_blog_draft',
				'edit_blog',
				'make_order'
			]
		},
		{
			label: 'Chef de projet',
			perms: [
				'view_projects_orders',
				'edit_projects_orders',
				'make_project_order',
				'view_project_stats',
				'view_trainings'
			]
		},
		{
			label: 'Membre Projet',
			perms: ['view_admin', 'view_projects_orders', 'make_project_order', 'view_trainings']
		}
	];

	// Action handlers for rows
	async function viewUser(e) {
		e.preventDefault();
		if (!canEditMembers) {
			alert("Vous n'avez pas les permissions requises pour modifier un utilisateur.");
			return;
		}
		const tr = e.currentTarget.closest('tr');
		const id = tr.querySelector('[data-utils]').getAttribute('data-utils');
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, permissions, member_of(role, project(id,name)), avatar_url')
			.eq('id', id)
			.single();
		if (error) return console.error(error);

		const projectsData = data.member_of
			.map((m) => ({
				project_id: m.project?.id,
				role: m.role || 'membre'
			}))
			.filter((m) => m.project_id);

		const flatPerms = Object.values(permissionCategories).flat();
		const permBadges = (data.permissions || []).map((p) => {
			const label = flatPerms.find((fp) => fp.value === p)?.label || p;
			return { text: label, color: 'bg-primary-900 border border-primary-500 text-primary-100' };
		});

		const projectBadges = data.member_of
			.map((m) => {
				if (!m.project) return null;
				let roleColor = 'bg-gray-700 border border-gray-500';
				if (m.role === 'admin' || m.role === 'bureau')
					roleColor = 'bg-rose-900 border border-rose-500 text-rose-100';
				else if (m.role === 'cdp')
					roleColor = 'bg-amber-900 border border-amber-500 text-amber-100';
				else roleColor = 'bg-blue-900 border border-blue-500 text-blue-100';
				return { text: `${m.project.name} (${m.role})`, color: roleColor };
			})
			.filter(Boolean);

		const values = {
			header: {
				title: 'Utilisateur',
				sub: `${(data.permissions || []).length} permission(s)`
			},
			body: [
				{ label: 'Nom', value: data.username, avatar: data.avatar_url },
				{
					label: 'Permissions',
					value: { type: 'badges', list: permBadges },
					id: 'permissions',
					data: data.permissions || []
				},
				{
					label: 'Projets et rôles',
					value: { type: 'badges', list: projectBadges },
					id: 'projects',
					data: projectsData
				}
			]
		};

		const fields = [
			{
				name: 'Nom',
				type: 'text',
				placeholder: 'Rob, aka Robert',
				required: true,
				wide: true
			},
			{
				name: 'Permissions granulaires',
				id: 'permissions',
				type: 'permissions_grouped',
				categories: permissionCategories,
				packages: permissionPackages,
				wide: true
			},
			{
				name: 'Projets et rôles',
				id: 'projects',
				type: 'project_roles',
				projects: allProjects,
				roles: [
					{ value: 'admin', text: 'Admin' },
					{ value: 'bureau', text: 'Bureau' },
					{ value: 'cdp', text: 'Chef de proj' },
					{ value: 'membre', text: 'Membre' },
					{ value: 'guest', text: 'Invité' }
				],
				wide: true
			}
		];
		new ReadDrawer({
			target: document.body,
			props: {
				values,
				fields,
				onSubmit: async (e, forms, newFields) => {
					const formData = new FormData(forms);

					const nom = formData.get('Nom') || newFields.find((f) => f.name === 'Nom').value;

					// permissions
					const permsField = newFields.find((f) => f.id === 'permissions');
					const extractedPermissions = permsField.value || [];

					// projects
					const projectsField = newFields.find((f) => f.id === 'projects');
					const projectsRoles = projectsField.value || [];

					// update the profile
					const { error: profileError } = await supabase
						.from('profiles')
						.update({
							username: nom,
							permissions: extractedPermissions
						})
						.eq('id', id);
					if (profileError) {
						console.error(profileError);
						alert('Erreur lors de la mise à jour du profil : ' + profileError.message);
						return;
					}

					// Fetch existing project links
					const { data: memberData, error: memberError } = await supabase
						.from('member_of')
						.select('project, role')
						.eq('profile', id);
					if (memberError) {
						console.error(memberError);
						alert('Erreur lors de la récupération des projets existants : ' + memberError.message);
						return;
					}

					const currentProjectIds = memberData.map((m) => m.project.toString());
					const newProjectIds = projectsRoles.map((p) => p.project_id?.toString()).filter(Boolean);
					const projectsToAdd = projectsRoles.filter(
						(p) => p.project_id && !currentProjectIds.includes(p.project_id.toString())
					);
					const projectsToRemove = currentProjectIds.filter((pid) => !newProjectIds.includes(pid));
					const projectsToUpdate = projectsRoles.filter((p) => {
						if (!p.project_id) return false;
						const existing = memberData.find(
							(m) => m.project.toString() === p.project_id.toString()
						);
						return existing && existing.role !== p.role;
					});

					// add new projects
					if (projectsToAdd.length > 0) {
						const { error: addError } = await supabase.from('member_of').insert(
							projectsToAdd.map((p) => ({
								profile: id,
								project: p.project_id,
								role: p.role
							}))
						);
						if (addError) {
							console.error(addError);
							alert("Erreur lors de l'ajout aux projets : " + addError.message);
							return;
						}
					}

					// update existing projects where role changed
					for (const p of projectsToUpdate) {
						const { error: updateRoleError } = await supabase
							.from('member_of')
							.update({ role: p.role })
							.eq('profile', id)
							.eq('project', p.project_id);
						if (updateRoleError) {
							console.error(updateRoleError);
							alert(
								'Erreur lors de la mise à jour du rôle pour le projet : ' + updateRoleError.message
							);
							return;
						}
					}

					// remove old projects
					if (projectsToRemove.length > 0) {
						const { error: removeError } = await supabase
							.from('member_of')
							.delete()
							.eq('profile', id)
							.in('project', projectsToRemove);
						if (removeError) {
							console.error(removeError);
							alert('Erreur lors de la suppression des projets : ' + removeError.message);
							return;
						}
					}

					new SucessModal({
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
				id: id,
				actions: canEditMembers ? [{ title: 'Delete', type: 'delete', handler: deleteUser }] : []
			}
		});
	}

	let actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e) => {
				await viewUser(e);
			}
		}
	];

	async function deleteUser(e) {
		e.preventDefault();
		if (!canEditMembers) {
			alert("Vous n'avez pas les permissions requises pour supprimer un utilisateur.");
			return;
		}
		if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
		const drawer = document.querySelector('div[id^=drawer-]');
		const id = drawer.id.split('drawer-')[1]; // Extract the id from the drawer id
		const { error: memberError } = await supabase.from('member_of').delete().eq('profile', id);
		if (memberError) return console.error(memberError);
		const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
		if (profileError) return console.error(profileError);
		try {
			await deleteAuthUser(id);
		} catch (error) {
			console.error(error);
			alert(error?.message || 'Erreur lors de la suppression du compte auth.');
			return;
		}
		window.location.reload();
	}
</script>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">Utilisateurs</h2>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="bg-gray-800 rounded-lg">
		<Table {headers} {parseItems} {filters} {dbInfo} {addNew} {actions} supabase={data.supabase} />
	</div>
</div>

<style></style>
