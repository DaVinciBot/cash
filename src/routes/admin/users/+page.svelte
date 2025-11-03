<script>
	import { onMount } from 'svelte';
	import { supabase, supabaseUrl } from '$lib/supabaseClient';
	import { createClient } from '@supabase/supabase-js';
	import { userdata } from '$lib/store.js';

	import Table from '$lib/components/admin/Table.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import SucessModal from '$lib/components/modals/InfoModal.svelte';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';

	let headers = ['Nom', 'Rôle', 'Projets', 'Actions'];

	let dbInfo = {
		table: 'profiles',
		key: 'id, username, role, avatar_url, member_of(project!inner(id, name))'
	};

	let service_key = '';
	let admin_supabase = null;

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
		},
		{
			category: 'Rôle',
			value: 'role',
			options: [
				{ name: 'Admin', value: 'admin' },
				{ name: 'Bureau', value: 'bureau' },
				{ name: 'CDP', value: 'cdp' },
				{ name: 'Membre', value: 'membre' }
			]
		}
	];

	userdata.subscribe((user) => {
		if (user && user.allProjects) {
			allProjects = user.allProjects.map((p) => ({ value: p.value, text: p.name }));
			filters[0].options = user.allProjects.map((p) => ({ text: p.name, value: p.id })); // Update the project filter options
		}
	});

	function parseItems(data) {
		let items = [];
		data.forEach((el) => {
			const project = el.member_of.map((el) => el.project?.name).join(', ');
			items.push([
				{ value: el.username, data: el.id, avatar: el.avatar_url },
				{ value: el.role },
				{ value: project }
			]);
		});
		return items;
	}

	async function addNew() {
		new CrudForm({
			target: document.body,
			props: {
				open: true,
				fields: [
					{
						name: 'Nom',
						type: 'text',
						placeholder: 'Rob, aka Robert',
						required: true,
						wide: true
					},
					{
						name: 'Rôle',
						id: 'role',
						type: 'select',
						options: [
							{ value: 'admin', text: 'Admin' },
							{ value: 'bureau', text: 'Bureau' },
							{ value: 'cdp', text: 'Chef de projet' },
							{ value: 'membre', text: 'Membre' }
						],
						required: true
					},
					{
						name: 'Projet',
						id: 'project',
						type: 'select',
						options: allProjects,
						required: true
					},
					{
						name: 'email',
						type: 'email',
						placeholder: 'davincibot@devinci.fr',
						required: true,
						wide: true
					}
				],
				onSubmit: async (e) => {
					e.preventDefault();
					if (admin_supabase === null) {
						console.error('No service key');
						alert(
							'You do not have the required permissions to perform this action (required: admin)'
						);
						return;
					}

					const form = {
						email: document.querySelector('#email').value,
						role: document.querySelector('#role').value,
						username: document.querySelector('#nom').value,
						project: document.querySelector('#project').value || 0
					};

					if (form.project == 'NULL') form.project = 0;

					if (!form.email) {
						alert('No email provided');
						return;
					}
					if (!form.role) {
						alert('No role provided');
						return;
					}
					if (!form.username) {
						alert('No username provided');
						return;
					}

					{
						// invite the user with the email
						const { data, error } = await admin_supabase.auth.admin.inviteUserByEmail(form.email);
						if (error) {
							console.error(error);
							alert('An error occured while inviting the user');
							return;
						} else {
							console.log('User invited');
							form.id = data.user.id;
						}
					}

					{
						const { data, error } = await supabase.from('profiles').insert({
							id: form.id,
							username: form.username,
							role: form.role
						});
						if (error) {
							console.error(error);
							alert('An error occured while updating the user');
							return;
						} else {
							console.log(data);
						}
					}

					{
						const { data, error } = await supabase.from('member_of').insert({
							profile: form.id,
							project: form.project
						});
						if (error) {
							console.error(error);
							alert('An error occured while adding the user to the project');
							return;
						}
					}

					new SucessModal({
						target: document.body,
						props: {
							message: 'Utilisateur ajouté avec succès',
							onClose: () => {
								window.location.reload();
							}
						}
					});
				}
			}
		});
	}

	// Action handlers for rows
	async function viewUser(e) {
		e.preventDefault();
		const tr = e.currentTarget.closest('tr');
		const id = tr.querySelector('[data-utils]').getAttribute('data-utils');
		const { data, error } = await supabase
			.from('profiles')
			.select('id, username, role, member_of!inner(project!inner(id,name)), avatar_url')
			.eq('id', id)
			.single();
		if (error) return console.error(error);
		const projectNames = data.member_of.map((m) => m.project.name).join(', ');
		const projectsData = data.member_of.map((m) => ({
			value: m.project.id,
			text: m.project.name
		}));
		const values = {
			header: { title: 'Utilisateur', sub: data.role },
			body: [
				{ label: 'Nom', value: data.username, avatar: data.avatar_url },
				{ label: 'Rôle', value: data.role, id: 'role' },
				{ label: 'Projets', value: projectNames, data: projectsData, id: 'project' }
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
				name: 'Rôle',
				id: 'role',
				type: 'select',
				options: [
					{ value: 'admin', text: 'Admin' },
					{ value: 'bureau', text: 'Bureau' },
					{ value: 'cdp', text: 'Chef de projet' },
					{ value: 'membre', text: 'Membre' },
					{ value: 'guest', text: 'Invité' }
				],
				wide: true,
				required: true
			},
			{
				name: 'Projet',
				id: 'project',
				type: 'multiselect',
				onChange: (e) => {
					// handle project change
					const userText = e.target.value.toLowerCase();
					const selectedProjects = allProjects.filter((p) =>
						p.text.toLowerCase().includes(userText)
					);
					return selectedProjects;
				},
				required: true,
				wide: true
			}
		];
		new ReadDrawer({
			target: document.body,
			props: {
				values,
				fields,
				onSubmit: async (e, forms, newFields) => {
					// get the diff between the original data and the edited fields
					const updates = {};
					const formData = new FormData(forms);
					for (const [key, value] of formData.entries()) {
						updates[key] = value;
					}
					updates.project = newFields.find((f) => f.id === 'project').value.map((p) => p.value);

					// update the profile
					const { error: profileError } = await supabase
						.from('profiles')
						.update({
							username: updates.nom,
							role: updates.role
						})
						.eq('id', id);
					if (profileError) {
						console.error(profileError);
						alert('An error occurred while updating the user profile');
						return;
					}
					// get the diff of the projects, and update the member_of table accordingly
					const { data: memberData, error: memberError } = await supabase
						.from('member_of')
						.select('project')
						.eq('profile', id);
					if (memberError) {
						console.error(memberError);
						alert('An error occurred while fetching the user projects');
						return;
					}
					const currentProjects = memberData.map((m) => m.project);
					const newProjects = updates.project;
					const projectsToAdd = newProjects.filter((p) => !currentProjects.includes(p));
					const projectsToRemove = currentProjects.filter((p) => !newProjects.includes(p));
					// add new projects
					if (projectsToAdd.length > 0) {
						const { data: addData, error: addError } = await supabase.from('member_of').insert(
							projectsToAdd.map((p) => ({
								profile: id,
								project: p
							}))
						);
						if (addError) {
							console.error(addError);
							alert('An error occurred while adding the user to the projects');
							return;
						}
					}
					// remove old projects
					if (projectsToRemove.length > 0) {
						const { data: removeData, error: removeError } = await supabase
							.from('member_of')
							.delete()
							.eq('profile', id)
							.in('project', projectsToRemove);
						if (removeError) {
							console.error(removeError);
							alert('An error occurred while removing the user from the projects');
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
				actions: [{ title: 'Delete', type: 'delete', handler: deleteUser }]
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
		if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
		const drawer = document.querySelector('div[id^=drawer-]');
		const id = drawer.id.split('drawer-')[1]; // Extract the id from the drawer id
		const { error: memberError } = await supabase.from('member_of').delete().eq('profile', id);
		if (memberError) return console.error(memberError);
		const { error: profileError } = await supabase.from('profiles').delete().eq('id', id);
		if (profileError) return console.error(profileError);
		const { data, error } = await admin_supabase.auth.admin.deleteUser(id);
		if (error) return console.error(error);
		window.location.reload();
	}

	onMount(async () => {
		const { data, error } = await supabase.rpc('get_service_key');
		if (error) {
			console.error(error);
		} else {
			service_key = data;
			// create admin client
			admin_supabase = createClient(supabaseUrl, service_key, {
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			});
		}
	});
</script>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">Utilisateurs</h2>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="bg-gray-800 rounded-lg">
		<Table {headers} {parseItems} {filters} {dbInfo} {addNew} {actions} />
	</div>
</div>

<style></style>
