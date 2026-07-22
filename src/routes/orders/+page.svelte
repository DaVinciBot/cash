<script lang="ts">
	import type { Enums } from '@davincibot/database-types';
	import type { UserData } from '@davincibot/lib';
	import {
		hasAnyPermission,
		loadUserdata,
		mountClosable,
		statusText,
		userdata
	} from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { onMount } from 'svelte';

	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import { Table } from '@davincibot/components';

	interface OrderRow {
		id: number;
		creationDate: string;
		projectId: { id: number; name: string | null } | null;
		status: string;
		lastUpdate: string;
		requestedBy: { id: string; username: string | null } | null;
		name: string | null;
		tags: string[] | null;
		price: number | null;
		shipping_cost: number | null;
	}

	interface OrderDetail {
		id: number;
		creationDate: string;
		projectId: number | null;
		status: string;
		status_reason: string | null;
		lastUpdate: string;
		items: ItemRow[];
		comment: string | null;
		tags: string[] | null;
		requestedBy:
			| { id: string; username: string | null }
			| { id: string; username: string | null }[]
			| null;
		price: number | null;
		name: string | null;
	}

	interface ItemRow {
		id: number;
		name: string | null;
		quantity: number;
		price: number | null;
		link: string | null;
	}

	interface UpdateRow {
		id: number;
		message: string | null;
		date: string;
		type: string | null;
		author: { username: string | null } | { username: string | null }[] | null;
	}

	interface BankRow {
		id: number;
		name: string | null;
	}

	interface ProjectOption {
		name: string;
		value: string;
	}

	let user = $state<UserData>(null);
	let pendingCount = $state(0);
	let approvedCount = $state(0);
	let deliveryCount = $state(0);
	let completedCount = $state(0);
	let canViewAllOrders = false;
	let canEditProjectOrders = false;
	let canEditOrders = false;

	let project = $state<ProjectOption[]>([]);

	const syncUserContext = (profile: NonNullable<UserData>) => {
		user = profile;
		const permissions = Array.isArray(profile.permissions) ? profile.permissions : [];
		canViewAllOrders = hasAnyPermission(permissions, ['orders.read.all']);
		canEditProjectOrders = profile.projects.some((p) => p.role === 'cdp');
		canEditOrders = hasAnyPermission(permissions, ['orders.lifecycle.update.all']);
		project = profile.projects.map((p) => ({ name: p.name, value: String(p.id) }));
		if (canViewAllOrders) {
			project = (profile.allProjects ?? []).map((p) => ({ name: p.name, value: String(p.value) }));
		}
	};

	userdata.subscribe((value) => {
		if (value) {
			syncUserContext(value);
		}
	});

	const headers = [
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
	const dbInfo = {
		table: 'orders',
		key: 'id, creationDate, projectId(id, name), status, lastUpdate, requestedBy(id, username), name, tags, price, shipping_cost',
		ordering: 'lastUpdate:desc'
	};

	const statusFilters = [
		{ name: 'En revue CDP', value: 'pending_cdp' },
		{ name: 'En revue Tréso', value: 'pending_treso' },
		{ name: 'En attente livraison', value: 'pending_delivery' },
		{ name: 'Terminé', value: 'completed' },
		{ name: 'Refusé', value: 'refused_cdp","refused_treso' },
		{ name: 'Annulé', value: 'canceled_user","canceled_ops' }
	];

	interface TableFilter {
		category: string;
		value: string;
		wide?: boolean;
		options: { name: string; value: string; active?: boolean }[];
	}

	let filters = $derived<TableFilter[]>([
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
	]);

	$effect(() => {
		const projectFilter = filters[0];
		if (projectFilter) {
			projectFilter.options = project;
		}
	});

	function getFormNumber(formData: FormData, key: string): number {
		const val = formData.get(key);
		return parseFloat(typeof val === 'string' ? val : '0');
	}

	function getFormInt(formData: FormData, key: string): number {
		const val = formData.get(key);
		return parseInt(typeof val === 'string' ? val : '0');
	}

	const actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e: Event) => {
				const target = e.target as HTMLElement;
				// L'id de commande transite en string via le dataset : colonne numérique.
				const id = Number(target.closest('tr')?.querySelector('th')?.dataset.utils ?? NaN);
				if (Number.isNaN(id)) {
					return;
				}

				const supabase = getSupabaseBrowserClient();
				const { data, error } = (await supabase
					.from('orders')
					.select(
						'id, creationDate, projectId, status, status_reason, lastUpdate, items(*), comment, tags, requestedBy(id, username), price, name'
					)
					.eq('id', id)
					.single()) as { data: OrderDetail | null; error: unknown };

				if (error || !data) {
					return;
				}
				const price = data.price?.toFixed(2) ?? '0.00';
				const name = data.name;

				const isRequester = (() => {
					if (!data.requestedBy) {
						return false;
					}
					if (Array.isArray(data.requestedBy)) {
						return data.requestedBy[0]?.id === user?.id;
					}
					return data.requestedBy.id === user?.id;
				})();
				let canEditThisOrderItems = false;
				if (data.status === 'pending_cdp' && (canEditProjectOrders || isRequester)) {
					canEditThisOrderItems = true;
				} else if (data.status === 'pending_treso' && canEditOrders) {
					canEditThisOrderItems = true;
				}

				const items: {
					name: string;
					quantity: number;
					price: string;
					rawPrice: number | null;
					id: number;
					link: string | null;
				}[] = [];
				data.items.forEach((item) => {
					items.push({
						name: item.name ?? '',
						quantity: item.quantity,
						price: `${String(item.price)} €`,
						rawPrice: item.price,
						id: item.id,
						link: item.link
					});
				});

				const editItemHandler = (itemToEdit: {
					name: string;
					link: string | null;
					quantity: number;
					rawPrice: number | null;
					id: number;
				}) => {
					mountClosable(CrudForm, {
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
									value: parseFloat(String(itemToEdit.rawPrice ?? 0)),
									required: true,
									step: 0.01
								}
							],
							onSubmit: async (ev: SubmitEvent) => {
								ev.preventDefault();
								const form = (ev.target as HTMLElement).closest('form');
								if (!form) {
									return;
								}
								const fd = new FormData(form);
								const nameVal = fd.get('name');
								const linkVal = fd.get('link');
								const name = typeof nameVal === 'string' ? nameVal : '';
								const link = typeof linkVal === 'string' ? linkVal : null;
								const quantityVal = fd.get('quantity');
								const priceVal = fd.get('price');
								const quantity = parseInt(typeof quantityVal === 'string' ? quantityVal : '0');
								const price = parseFloat(typeof priceVal === 'string' ? priceVal : '0');

								if (Number.isNaN(quantity) || Number.isNaN(price) || !name) {
									alert('Veuillez remplir correctement tous les champs.');
									return;
								}

								const supabase2 = getSupabaseBrowserClient();
								const { error: updateErr } = await supabase2
									.from('items')
									.update({ name, link, quantity, price })
									.eq('id', itemToEdit.id);

								if (updateErr) {
									alert("Échec de la mise à jour de l'objet.");
									return;
								}
								window.location.reload();
							}
						}
					});
				};

				const deleteItemHandler = async (itemToRemove: { id: number }) => {
					if (!confirm('Supprimer cet objet ?')) {
						return;
					}
					const supabase2 = getSupabaseBrowserClient();
					const { error: deleteErr } = await supabase2
						.from('items')
						.delete()
						.eq('id', itemToRemove.id);
					if (deleteErr) {
						alert(`Erreur: ${deleteErr.message}`);
					} else {
						window.location.reload();
					}
				};

				// Stepper logic based on order status
				const stepper = [
					{ done: true, icon: 'link' },
					{ done: data.status !== 'pending_cdp', icon: 'checked-document' },
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
					{ done: data.status === 'completed', icon: 'shipping' },
					{ done: data.status === 'completed', icon: 'done' }
				];

				if (data.status === 'refused_cdp') {
					stepper.splice(2);
					const s1 = stepper[1];
					if (s1) {
						s1.done = true;
						s1.icon = 'cancel';
					}
				} else if (data.status === 'refused_treso') {
					stepper.splice(3);
					const s2 = stepper[2];
					if (s2) {
						s2.done = true;
						s2.icon = 'cancel';
					}
				} else if (data.status === 'canceled_user' || data.status === 'canceled_ops') {
					stepper.splice(4);
					const s3 = stepper[3];
					if (s3) {
						s3.done = true;
						s3.icon = 'cancel';
					}
				}

				let custom_actions: unknown[] = [];

				if (canEditOrders) {
					const lifecycleTransitions: { value: Enums<'order_status'>; name: string }[] = [];
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

					if (lifecycleTransitions.length > 0) {
						custom_actions = [
							{
								title: lifecycleTransitions,
								type: 'selector',
								handler: async (e: Event) => {
									const new_status = (e.target as HTMLSelectElement).value as Enums<'order_status'>;
									const finalPrice = price;

									if (new_status === 'pending_delivery') {
										const supabase2 = getSupabaseBrowserClient();
										const { data: banks, error: bankErr } = (await supabase2
											.from('bank')
											.select('id, name')
											.order('name')) as { data: BankRow[] | null; error: unknown };
										if (bankErr || !banks) {
											alert('Impossible de charger la liste des banques.');
											return;
										}

										mountClosable(CrudForm, {
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
														value: finalPrice,
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
															text: b.name ?? `Compte ${String(b.id)}`
														}))
													}
												],
												onSubmit: async (ev: SubmitEvent) => {
													ev.preventDefault();
													const form = (ev.target as HTMLElement).closest('form');
													if (!form) {
														return;
													}
													const fd = new FormData(form);
													const shipping = getFormNumber(fd, 'shipping_cost');
													const finalP = getFormNumber(fd, 'final_price');
													const bankId = getFormInt(fd, 'bank_id');
													if (
														Number.isNaN(shipping) ||
														Number.isNaN(finalP) ||
														Number.isNaN(bankId)
													) {
														alert('Veuillez remplir correctement tous les champs.');
														return;
													}

													const supabase3 = getSupabaseBrowserClient();
													const { error: updErr } = await supabase3
														.from('orders')
														.update({
															status: new_status,
															shipping_cost: shipping,
															price: finalP,
															status_reason: null
														})
														.eq('id', id);
													if (updErr) {
														alert(`Échec de la mise à jour de la commande: ${updErr.message}`);
														return;
													}

													const total = shipping + finalP;
													const supabase4 = getSupabaseBrowserClient();
													const { error: spendErr } = await supabase4.from('spending').insert([
														{
															amount: total,
															is_positive: false,
															order_id: id,
															bank_id: bankId
														}
													]);
													if (spendErr) {
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

									const supabase2 = getSupabaseBrowserClient();
									const { error: updErr2 } = await supabase2
										.from('orders')
										.update({
											status: new_status,
											shipping_cost: 0,
											price: parseFloat(finalPrice),
											status_reason: null
										})
										.eq('id', id);

									if (updErr2) {
										alert(`Échec de la mise à jour de la commande: ${updErr2.message}`);
										return;
									}
									window.location.reload();
								}
							}
						];
					}
				} else if (canEditProjectOrders && data.status === 'pending_cdp') {
					custom_actions = [
						{
							title: 'Valider',
							type: 'validate',
							handler: async (_e: MouseEvent) => {
								const new_status = 'pending_treso';

								const supabase2 = getSupabaseBrowserClient();
								const { error: updErr } = await supabase2
									.from('orders')
									.update({ status: new_status, status_reason: null })
									.eq('id', id);

								if (updErr) {
									alert(`Échec de la mise à jour de la commande: ${updErr.message}`);
									return;
								}
								window.location.reload();
							}
						}
					];
				}

				const supabase2 = getSupabaseBrowserClient();
				const updates = (await supabase2
					.from('updates')
					.select('id, message, date, author(username), type')
					.eq('order_id', id)
					.order('date', { ascending: false })) as { data: UpdateRow[] | null; error: unknown };

				if (updates.error || !updates.data) {
					return;
				}
				const updatesList: (UpdateRow & { date: string })[] = updates.data.map((u) => ({
					...u,
					date: new Date(u.date).toLocaleString()
				}));

				const canRefuseOrder =
					(canEditProjectOrders && data.status === 'pending_cdp') ||
					(canEditOrders &&
						['pending_cdp', 'pending_treso', 'pending_delivery'].includes(data.status));

				mountClosable(ReadDrawer, {
					target: document.body,
					props: {
						values: {
							header: {
								title: name,
								sub: `${price} €`,
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
									value: data.status_reason?.trim() ?? 'Aucune'
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
												? (update.author[0]?.username ?? 'Système')
												: (update.author?.username ?? 'Système')
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
											handler: async (_e: MouseEvent) => {
												let new_status: Enums<'order_status'> | null = null;
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
												const reason = prompt(reasonPrompt)?.trim() ?? '';
												if (!reason) {
													alert(
														new_status === 'canceled_ops'
															? 'Une raison est obligatoire pour annuler une commande.'
															: 'Une raison est obligatoire pour refuser une commande.'
													);
													return;
												}

												const supabase3 = getSupabaseBrowserClient();
												const { error: refuseErr } = await supabase3
													.from('orders')
													.update({ status: new_status, status_reason: reason })
													.eq('id', id);

												if (refuseErr) {
													alert(`Échec du changement de statut: ${refuseErr.message}`);
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

	function parseItems(data: unknown[]) {
		const rows = data as OrderRow[];
		const items: { value: string | number; data?: string | number }[][] = [];
		rows.forEach((el) => {
			const price = Math.round(((el.price ?? 0) + (el.shipping_cost ?? 0)) * 100) / 100;
			const elName = el.name ?? '';
			const name = elName.length > 30 ? elName.substring(0, 30) + '...' : elName || '-';
			items.push([
				{ value: name, data: el.id },
				{ value: el.creationDate.substring(0, 10) },
				{ value: el.lastUpdate.substring(0, 10) },
				{ value: `${String(price)} €` },
				{ value: el.projectId?.name ?? '-', data: el.projectId?.id ?? '' },
				{ value: el.requestedBy?.username ?? '-', data: el.requestedBy?.id ?? '' },
				{ value: Array.isArray(el.tags) && el.tags.length > 0 ? el.tags.join(', ') : '-' },
				{ value: (statusText as Record<string, string>)[el.status] ?? el.status }
			]);
		});
		return items;
	}

	async function updateCounts() {
		const supabase = getSupabaseBrowserClient();
		const { data, error } = (await supabase.from('orders').select('status')) as {
			data: { status: string }[] | null;
			error: unknown;
		};

		if (!error && data) {
			pendingCount = data.filter((o) => o.status === 'pending_cdp').length;
			approvedCount = data.filter((o) => o.status === 'pending_treso').length;
			deliveryCount = data.filter((o) => o.status === 'pending_delivery').length;
			completedCount = data.filter((o) => o.status === 'completed').length;
		}
	}

	onMount(() => {
		if (!user) {
			loadUserdata();
		}
		if (!canViewAllOrders) {
			filters.splice(0, 1);
			if (user) {
				filters = [
					...filters,
					{
						category: 'hidden',
						value: 'projectId',
						options: [
							{ name: 'CDP project', value: String(user.projects.at(0)?.id ?? ''), active: true }
						]
					}
				];
			}
		}
		void updateCounts();
	});
</script>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">Gestion des Commandes</h2>
	<p class="text-gray-400">Liste des commandes en cours</p>
	<hr class="mt-2 border-gray-700" />
	<div class="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="flex flex-col items-center rounded-lg bg-gray-800 p-6">
			<span class="text-3xl font-bold text-white">{pendingCount}</span>
			<span class="mt-2 text-gray-400">En revue CDP</span>
		</div>
		<div class="flex flex-col items-center rounded-lg bg-gray-800 p-6">
			<span class="text-3xl font-bold text-white">{approvedCount}</span>
			<span class="mt-2 text-gray-400">En revue Tréso</span>
		</div>
		<div class="flex flex-col items-center rounded-lg bg-gray-800 p-6">
			<span class="text-3xl font-bold text-white">{deliveryCount}</span>
			<span class="mt-2 text-gray-400">À livrer</span>
		</div>
		<div class="flex flex-col items-center rounded-lg bg-gray-800 p-6">
			<span class="text-3xl font-bold text-white">{completedCount}</span>
			<span class="mt-2 text-gray-400">Terminées</span>
		</div>
	</div>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="rounded-lg bg-gray-800">
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
