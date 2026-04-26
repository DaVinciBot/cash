<script>
	// @ts-nocheck
	import { hasAnyPermission } from '$lib/permissions';
	import { userdata } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { loadUserdata, statusText } from '$lib/utils';
	import { onMount } from 'svelte';

	import Table from '$lib/components/admin/Table.svelte';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';

	export let data;

	let user;
	let pendingCount = 0;
	let approvedCount = 0;
	let deliveryCount = 0;
	let completedCount = 0;
	let canViewAllOrders = false;
	let canEditProjectOrders = false;
	let canEditOrders = false;

	let project = [];

	const syncUserContext = (profile) => {
		if (!profile) return;
		user = profile;
		const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
		canViewAllOrders = hasAnyPermission(permissions, ['orders.read.all']);
		canEditProjectOrders = (profile?.projects || []).some((p) => p?.role === 'cdp');
		canEditOrders = hasAnyPermission(permissions, ['orders.lifecycle.update.all']);
		project = profile?.projects.map((p) => ({ name: p.name, value: p.id })) || [];
		if (canViewAllOrders) {
			project = profile?.allProjects || [];
		}
	};

	syncUserContext(data?.userProfile);

	userdata.subscribe((value) => {
		if (value) {
			syncUserContext(value);
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
		key: 'id, creationDate, projectId(id, name), status, lastUpdate, requestedBy(id, username), name, tags, price, shipping_cost',
		ordering: 'lastUpdate:desc'
	};

	let statusFilters = [
		{ name: 'En revue CDP', value: 'pending_cdp' },
		{ name: 'En revue Tréso', value: 'pending_treso' },
		{ name: 'En attente livraison', value: 'pending_delivery' },
		{ name: 'Terminé', value: 'completed' },
		{ name: 'Refusé', value: 'refused_cdp","refused_treso' },
		{ name: 'Annulé', value: 'canceled_user","canceled_ops' }
	];

	$: filters = [
		{
			category: 'Projet',
			value: 'projectId',
			wide: true,
			options: project
		},
		{
			category: 'Status',
			value: 'status',
			options: statusFilters
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
						'id, creationDate, projectId, status, status_reason, lastUpdate, items(*), comment, tags, requestedBy(id, username), price, name'
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
						rawPrice: item.price,
						id: item.id,
						link: item.link
					});
				});

				const isRequester = data.requestedBy?.id === user?.id;
				let canEditThisOrderItems = false;
				if (data.status === 'pending_cdp' && (canEditProjectOrders || isRequester)) {
					canEditThisOrderItems = true;
				} else if (data.status === 'pending_treso' && canEditOrders) {
					canEditThisOrderItems = true;
				}

				const editItemHandler = (itemToEdit) => {
					new CrudForm({
						target: document.body,
						props: {
							type: 'objet',
							type_accord: 'un',
							action: 'Modifier',
							title: 'Modifier un objet',
							fields: [
								{ name: 'Nom', type: 'text', id: 'name', value: itemToEdit.name, required: true },
								{ name: 'Lien', type: 'text', id: 'link', value: itemToEdit.link },
								{
									name: 'Quantité',
									type: 'number',
									id: 'quantity',
									value: itemToEdit.quantity,
									required: true,
									min: 1
								},
								{
									name: 'Prix unitaire (€)',
									type: 'number',
									id: 'price',
									value: parseFloat(itemToEdit.rawPrice),
									required: true,
									step: 0.01
								}
							],
							onSubmit: async (ev) => {
								ev.preventDefault();
								const form = ev.target.closest('form');
								const fd = new FormData(form);
								const name = fd.get('name');
								const link = fd.get('link');
								const quantity = parseInt(String(fd.get('quantity')));
								const price = parseFloat(String(fd.get('price')));

								if (Number.isNaN(quantity) || Number.isNaN(price) || !name) {
									alert('Veuillez remplir correctement tous les champs.');
									return;
								}

								const { error } = await supabase
									.from('items')
									.update({ name, link, quantity, price })
									.eq('id', itemToEdit.id);

								if (error) {
									console.error(error);
									alert("Échec de la mise à jour de l'objet.");
									return;
								}
								// Trigger a reload or update local state
								window.location.reload();
							}
						}
					});
				};

				const deleteItemHandler = async (itemToRemove) => {
					if (!confirm('Supprimer cet objet ?')) return;
					const { error } = await supabase.from('items').delete().eq('id', itemToRemove.id);
					if (error) {
						alert('Erreur: ' + error.message);
					} else {
						window.location.reload(); // Quick refresh
					}
				};

				console.log(items);

				// Stepper logic based on order status
				const stepper = [
					{
						done: true,
						icon: 'link'
					},
					{
						done: data.status !== 'pending_cdp',
						icon: 'checked-document'
					},
					{
						done: [
							'pending_delivery',
							'completed',
							'refused_treso',
							'canceled_user',
							'canceled_ops'
						].includes(data.status),
						icon: 'processing'
					},
					{
						done: data.status === 'completed',
						icon: 'shipping'
					},
					{
						done: data.status === 'completed',
						icon: 'done'
					}
				];

				if (data.status === 'refused_cdp') {
					stepper.splice(2);
					stepper[1].done = true;
					stepper[1].icon = 'cancel';
				} else if (data.status === 'refused_treso') {
					stepper.splice(3);
					stepper[2].done = true;
					stepper[2].icon = 'cancel';
				} else if (data.status === 'canceled_user' || data.status === 'canceled_ops') {
					stepper.splice(4);
					stepper[3].done = true;
					stepper[3].icon = 'cancel';
				}

				let custom_actions = [];

				if (canEditOrders) {
					const lifecycleTransitions = [];
					if (data.status === 'pending_cdp') {
						lifecycleTransitions.push({ value: 'pending_treso', name: 'Passer en revue Tréso' });
					}
					if (data.status === 'pending_treso') {
						lifecycleTransitions.push({
							value: 'pending_delivery',
							name: 'Valider Tréso / Livraison'
						});
					}
					if (data.status === 'pending_delivery') {
						lifecycleTransitions.push({ value: 'completed', name: 'Terminer' });
					}

					custom_actions =
						lifecycleTransitions.length > 0
							? [
									{
										title: lifecycleTransitions,
										type: 'selector',
										handler: async (e) => {
											let new_status = e.target.value;
											let shippingCost = '0';
											let finalPrice = price.toString();

											if (new_status === 'pending_delivery') {
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

															const { error: updErr } = await supabase
																.from('orders')
																.update({
																	status: new_status,
																	shipping_cost: shipping,
																	price: finalP,
																	status_reason: null
																})
																.eq('id', id);
															if (updErr) {
																console.error(updErr);
																alert(`Échec de la mise à jour de la commande: ${updErr.message}`);
																return;
															}

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
												return;
											}

											const { error } = await supabase
												.from('orders')
												.update({
													status: new_status,
													shipping_cost: parseFloat(shippingCost),
													price: parseFloat(finalPrice),
													status_reason: null
												})
												.eq('id', id);

											if (error) {
												console.error(error);
												alert(`Échec de la mise à jour de la commande: ${error.message}`);
												return;
											}
											window.location.reload();
										}
									}
								]
							: [];
				} else {
					custom_actions =
						canEditProjectOrders && data.status === 'pending_cdp'
							? [
									{
										title: 'Valider',
										type: 'validate',
										handler: async (e) => {
											let new_status = 'pending_treso';

											const { error } = await supabase
												.from('orders')
												.update({ status: new_status, status_reason: null })
												.eq('id', id);

											if (error) {
												console.error(error);
												alert(`Échec de la mise à jour de la commande: ${error.message}`);
												return;
											}
											window.location.reload();
										}
								}
							]
							: [];
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

				const canRefuseOrder =
					(canEditProjectOrders && data.status === 'pending_cdp') ||
					(canEditOrders &&
						['pending_cdp', 'pending_treso', 'pending_delivery'].includes(data.status));

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
									value: {
										list: [...items],
										type: 'items',
										editable: canEditThisOrderItems,
										onEdit: editItemHandler,
										onDelete: deleteItemHandler
									}
								},
								{
									label: 'Détails',
									value: data.comment ?? 'Pas de détails'
								},
								{
									label: 'Raison statut',
									value: data.status_reason?.trim() || 'Aucune'
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
							...(canRefuseOrder
								? [
										{
											title: 'Refuser',
											type: 'delete',
											handler: async (e) => {
												let new_status = null;
												if (data.status === 'pending_cdp') {
													new_status = 'refused_cdp';
												} else if (data.status === 'pending_treso') {
													new_status = 'refused_treso';
												} else if (data.status === 'pending_delivery') {
													new_status = 'canceled_ops';
												}

												if (!new_status) {
													return;
												}

												const reasonPrompt =
													new_status === 'canceled_ops'
														? "Raison d'annulation (obligatoire)"
														: 'Raison du refus (obligatoire)';
												const reason = prompt(reasonPrompt)?.trim() || '';
												if (!reason) {
													alert(
														new_status === 'canceled_ops'
															? 'Une raison est obligatoire pour annuler une commande.'
															: 'Une raison est obligatoire pour refuser une commande.'
													);
													return;
												}

												const { error } = await supabase
													.from('orders')
													.update({ status: new_status, status_reason: reason })
													.eq('id', id);

												if (error) {
													console.error(error);
													alert(`Échec du changement de statut: ${error.message}`);
													return;
												}
												window.location.reload();
											}
										}
								]
								: [])
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
			const price = Math.round((el.price + el.shipping_cost || 0) * 100) / 100;
			items.push([
				{
					value: el.name?.length > 30 ? el.name.substring(0, 30) + '...' : el.name || '-',
					data: el.id
				},
				{ value: el.creationDate?.toLocaleString().split('T')[0] || '-' },
				{ value: el.lastUpdate?.toLocaleString().split('T')[0] || '-' },
				{ value: price + ' €' },
				{ value: el.projectId?.name || '-', data: el.projectId?.id || '' },
				{ value: el.requestedBy?.username || '-', data: el.requestedBy?.id || '' },
				{ value: Array.isArray(el.tags) && el.tags.length ? el.tags.join(', ') : '-' },
				{ value: statusText[el.status] || el.status || '-' }
			]);
		});
		return items;
	}

	async function updateCounts() {
		const { data, error } = await supabase.from('orders').select('status');

		if (!error && data) {
			pendingCount = data.filter((o) => o.status === 'pending_cdp').length;
			approvedCount = data.filter((o) => o.status === 'pending_treso').length;
			deliveryCount = data.filter((o) => o.status === 'pending_delivery').length;
			completedCount = data.filter((o) => o.status === 'completed').length;
		}
	}

	onMount(async () => {
		if (!user) {
			await loadUserdata(data?.userProfile ?? null);
		}
		if (!canViewAllOrders) {
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
			<span class="mt-2 text-gray-400">En revue CDP</span>
		</div>
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{approvedCount}</span>
			<span class="mt-2 text-gray-400">En revue Tréso</span>
		</div>
		<div class="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
			<span class="text-3xl font-bold text-white">{deliveryCount}</span>
			<span class="mt-2 text-gray-400">À livrer</span>
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
			supabase={data.supabase}
			type="commande"
			type_accord="une"
			searchable="name"
		/>
	</div>
</div>

<style></style>
