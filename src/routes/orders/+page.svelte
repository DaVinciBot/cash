<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { statusText, loadUserdata } from '$lib/utils';
	import { userdata } from '$lib/store';

	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';
	import Table from '$lib/components/admin/Table.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';

	let user;
	let pendingCount = 0;
	let approvedCount = 0;
	let orderedCount = 0;
	let completedCount = 0;

	let project = [];

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			project = value?.projects.map((p) => ({ name: p.name, value: p.id })) || [];
			if (user.role == 'bureau' || user.role == 'admin') {
				project = value?.allProjects || [];
			}
		}
	});

	let headers = [
		'Objet',
		'Date',
		'Dernière MàJ',
		'Prix',
		'Projet',
		'Membre',
		'Tags',
		'Status',
		'Actions'
	];
	let dbInfo = {
		table: 'orders',
		key: 'id, creationDate, projectId(id, name), status, lastUpdate, requestedBy(*), name, tags, price',
		ordering: 'lastUpdate:desc'
	};

	let filters = [
		{
			category: 'Projet',
			value: 'projectId',
			wide: true,
			options: project
		},
		{
			category: 'Status',
			value: 'status',
			options: [
				{ name: 'En attente', value: 'pendingCDP","pendingTreso' },
				{ name: 'Validé par le CDP', value: 'approvedCDP', active: true },
				{ name: 'A commander', value: 'approvedTreso' },
				{ name: 'Commandé', value: 'ordered' },
				{ name: 'Terminé', value: 'completed' },
				{ name: 'Refusé', value: 'canceled","refusedTreso","refusedCDP' }
			]
		}
	];

	let actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e) => {
				// get the info from the order
				const id = e.target.closest('tr').querySelector('th').dataset.utils;

				const { data, error } = await supabase
					.from('orders')
					.select(
						'id, creationDate, projectId, status, lastUpdate, items(*), comment, tags, requestedBy(username), price, name'
					)
					.eq('id', id)
					.single();

				if (error) {
					console.error(error);
					return;
				}
				const price = data.price.toFixed(2);
				const name = data.name;

				let items = [];
				data.items.forEach((item, i) => {
					items.push({
						name: item.name,
						quantity: item.quantity,
						price: `${item.price} €`,
						id: item.id,
						link: item.link
					});
				});

				console.log(items);

				// Stepper logic based on order status
				const stepper = [
					{
						done: true,
						icon: 'link'
					},
					{
						done: ['approvedCDP', 'approvedTreso', 'ordered', 'completed'].includes(data.status),
						icon: 'checked-document'
					},
					{
						done: ['approvedTreso', 'ordered', 'completed'].includes(data.status),
						icon: 'processing'
					},
					{
						done: ['ordered', 'completed'].includes(data.status),
						icon: 'shipping'
					},
					{
						done: data.status === 'completed',
						icon: 'done'
					}
				];

				if (
					data.status === 'canceled' ||
					data.status === 'refusedCDP' ||
					data.status === 'refusedTreso'
				) {
					stepper.pop();
					stepper.pop();
					stepper.pop();
					stepper[1].done = true;
					stepper[1].icon = 'cancel';
				}

				let custom_actions = [];

				if (user.role == 'bureau' || user.role == 'admin') {
					custom_actions = [
						{
							title: [
								{ value: 'approvedTreso', name: 'Valider' },
								{ value: 'processingOrder', name: 'Commande en cours' },
								{ value: 'ordered', name: 'Commandé' },
								{ value: 'completed', name: 'Terminé' }
							],
							type: 'selector',
							handler: async (e) => {
								let new_status = e.target.value;
								let shippingCost = '0';
								let finalPrice = price.toString();
								if (new_status === 'ordered') {
									// Open a form to capture shipping cost, final price and bank
									const { data: banks, error: bankErr } = await supabase
										.from('bank')
										.select('id, name')
										.order('name');
									if (bankErr) {
										console.error(bankErr);
										alert('Impossible de charger la liste des banques.');
										return;
									}

									new CrudForm({
										target: document.body,
										props: {
											type: 'commande',
											type_accord: 'une',
											action: 'Valider',
											title: 'Informations de commande',
											fields: [
												{
													name: 'Frais de port (€)',
													type: 'number',
													id: 'shipping_cost',
													required: true,
													value: '0',
													step: 0.01,
													min: 0
												},
												{
													name: 'Prix final hors port (€)',
													type: 'number',
													id: 'final_price',
													required: true,
													value: price.toString(),
													step: 0.01,
													min: 0
												},
												{
													name: 'Compte',
													type: 'select',
													id: 'bank_id',
													required: true,
													options: banks.map((b) => ({
														value: String(b.id),
														text: b.name || `Compte ${b.id}`
													}))
												}
											],
											onSubmit: async (ev) => {
												ev.preventDefault();
												const form = ev.target.closest('form');
												const fd = new FormData(form);
												const shipping = parseFloat(String(fd.get('shipping_cost') ?? ''));
												const finalP = parseFloat(String(fd.get('final_price') ?? ''));
												const bankId = parseInt(String(fd.get('bank_id') ?? ''));
												if (
													Number.isNaN(shipping) ||
													Number.isNaN(finalP) ||
													Number.isNaN(bankId)
												) {
													alert('Veuillez remplir correctement tous les champs.');
													return;
												}

												// 1) update order with status, shipping and price
												const { data: upd, error: updErr } = await supabase
													.from('orders')
													.update({ status: new_status, shipping_cost: shipping, price: finalP })
													.eq('id', id)
													.select();
												if (updErr) {
													console.error(updErr);
													alert('Échec de la mise à jour de la commande');
													return;
												}

												// 2) create a spending row to reflect the payment
												const total = shipping + finalP;
												const { error: spendErr } = await supabase.from('spending').insert([
													{
														amount: total,
														is_positive: false,
														order_id: id,
														bank_id: bankId
													}
												]);
												if (spendErr) {
													console.error(spendErr);
													alert(
														'URGENT : CONTACTER ADMIN \n Commande mise à jour mais écriture trésorerie échouée'
													);
												}

												window.location.reload();
											}
										}
									});
									return; // stop default flow; we'll reload after submit
								}

								const { data, error } = await supabase
									.from('orders')
									.update({
										status: new_status,
										shipping_cost: parseFloat(shippingCost),
										price: parseFloat(finalPrice)
									})
									.eq('id', id)
									.select();

								if (error) {
									console.error(error);
									return;
								}
								if (data) {
									window.location.reload();
								}
							}
						}
					];
				} else {
					custom_actions = [
						{
							title: 'Valider',
							type: 'validate',
							handler: async (e) => {
								let new_status = 'approvedCDP';
								if (user.role == 'bureau' || user.role == 'admin') {
									new_status = 'approvedTreso';
								}

								const { data, error } = await supabase
									.from('orders')
									.update({ status: new_status })
									.eq('id', id)
									.select();

								if (error) {
									console.error(error);
									return;
								}
								if (data) {
									window.location.reload();
								}
							}
						}
					];
				}

				const updates = await supabase
					.from('updates')
					.select('id, message, date, author(username), type')
					.eq('order_id', id)
					.order('date', { ascending: false });

				if (updates.error) {
					console.error(updates.error);
					return;
				}
				const updatesList = updates.data;
				updatesList.forEach((update) => {
					update.date = new Date(update.date).toLocaleString();
				});

				new ReadDrawer({
					target: document.body,
					props: {
						values: {
							header: {
								title: name,
								sub: price + ' €',
								stepper
							},
							body: [
								{
									label: 'Objets',
									value: { list: [...items], type: 'items' }
								},
								{
									label: 'Détails',
									value: data.comment ?? 'Pas de détails'
								},
								{
									label: 'Tags',
									value:
										Array.isArray(data.tags) && data.tags.length > 0
											? data.tags.join(' • ')
											: 'Aucun'
								},
								{
									label: 'Historique',
									value: {
										list: updatesList.map((update) => ({
											message: update.message,
											date: update.date,
											type: update.type,
											user: Array.isArray(update.author)
												? update.author[0]?.username || 'Système'
												: update.author?.username || 'Système'
										})),
										type: 'updates'
									}
								}
							]
						},
						actions: [
							...custom_actions,
							{
								title: 'Refuser',
								type: 'delete',
								handler: async (e) => {
									let new_status = 'refusedCDP';
									if (user.role == 'bureau' || user.role == 'admin') {
										new_status = 'refusedTreso';
									}

									const { data, error } = await supabase
										.from('orders')
										.update({ status: new_status })
										.eq('id', id)
										.select();

									if (error) {
										console.error(error);
										return;
									}
									if (data) {
										window.location.reload();
									}
								}
							}
						],
						id: 'readModal'
					}
				});
			}
		}
	];
	function parseItems(data) {
		let items = [];
		data.forEach((el) => {
			items.push([
				{ value: el.name.length > 30 ? el.name.substring(0, 30) + '...' : el.name, data: el.id },
				{ value: el.creationDate.toLocaleString().split('T')[0] },
				{ value: el.lastUpdate.toLocaleString().split('T')[0] },
				{ value: el.price + ' €' },
				{ value: el.projectId.name, data: el.projectId.id },
				{ value: el.requestedBy.username, data: el.requestedBy.id },
				{ value: Array.isArray(el.tags) && el.tags.length ? el.tags.join(', ') : '-' },
				{ value: statusText[el.status] }
			]);
		});
		return items;
	}

	async function updateCounts() {
		const { data, error } = await supabase.from('orders').select('status');

		if (!error && data) {
			pendingCount = data.filter(
				(o) => o.status === 'pendingCDP' || o.status === 'pendingTreso'
			).length;
			approvedCount = data.filter(
				(o) => o.status === 'approvedCDP' || o.status === 'approvedTreso'
			).length;
			orderedCount = data.filter((o) => o.status === 'ordered').length;
			completedCount = data.filter((o) => o.status === 'completed').length;
		}
	}

	onMount(async () => {
		if (!user) {
			await loadUserdata();
		}
		if (user.role == 'cdp') {
			filters = filters.splice(1, 1);
			filters = [
				...filters,
				{
					category: 'hidden',
					value: 'projectId',
					options: [{ name: 'CDP project', value: user?.projects[0].id, active: true }]
				}
			];
		}
		await updateCounts();
	});
</script>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">Gestion des Commandes</h2>
	<p class="text-gray-400">Liste des commandes en cours</p>
	<hr class="mt-2 border-gray-700" />
	<div class="grid grid-cols-1 gap-4 my-6 sm:grid-cols-2 lg:grid-cols-4">
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{pendingCount}</span>
			<span class="mt-2 text-gray-400">En attente</span>
		</div>
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{approvedCount}</span>
			<span class="mt-2 text-gray-400">Validées</span>
		</div>
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{orderedCount}</span>
			<span class="mt-2 text-gray-400">Commandées</span>
		</div>
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{completedCount}</span>
			<span class="mt-2 text-gray-400">Terminées</span>
		</div>
	</div>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="bg-gray-800 rounded-lg">
		<Table
			{headers}
			{actions}
			{dbInfo}
			{filters}
			{parseItems}
			type="commande"
			type_accord="une"
			searchable="name"
		/>
	</div>
</div>

<style></style>
