<script lang="ts">
	import type { UserData } from '@davincibot/lib';
	import { userdata } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { loadUserdata, mountClosable, statusText } from '@davincibot/lib';
	import { onMount } from 'svelte';
	import type { ItemRow, OrderRow } from '@davincibot/database-types';

	import { Table } from '@davincibot/components';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';

	let skip = false;
	let user = $state<UserData>(null);

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			skip = true;
		}
	});

	const headers = [
		'Objets',
		'Date de création',
		'Dernière mise à jour',
		'Prix',
		'Status',
		'Actions'
	];

	interface TableFilter {
		category: string;
		value: string;
		wide?: boolean;
		options: { name: string; value: string; active?: boolean }[];
	}

	const filters = $derived<TableFilter[]>([
		{
			category: 'Status',
			value: 'status',
			options: [
				{ name: 'En revue CDP', value: 'pending_cdp' },
				{ name: 'En revue Tréso', value: 'pending_treso' },
				{ name: 'En attente livraison', value: 'pending_delivery' },
				{ name: 'Terminé', value: 'completed' },
				{ name: 'Refusé', value: 'refused_cdp","refused_treso' },
				{ name: 'Annulé', value: 'canceled_user","canceled_ops' }
			]
		},
		{
			category: 'hidden',
			value: 'requestedBy',
			options: [{ name: 'current_user', value: user?.id ?? '', active: true }]
		}
	]);

	$effect(() => {
		const hiddenFilter = filters[1];
		const hiddenOption = hiddenFilter?.options[0];
		if (hiddenOption) {
			hiddenOption.value = user?.id ?? '';
		}
	});

	interface OrderDetail extends OrderRow {
		items: ItemRow[];
		comment: string | null;
		status_reason: string | null;
	}

	interface UpdateRow {
		id: number;
		message: string | null;
		date: string;
		type: string | null;
		author: { username: string | null } | null;
	}

	const actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e: Event) => {
				const target = e.target as HTMLElement;
				const id = target.closest('tr')?.querySelector('th')?.dataset.utils;

				const supabase = getSupabaseBrowserClient();
				const { data, error } = (await supabase
					.from('orders')
					.select(
						'id, creationDate, projectId, status, status_reason, lastUpdate, items(*), comment, price, name'
					)
					.eq('id', id ?? '')
					.single()) as { data: OrderDetail | null; error: unknown };

				if (error || !data) {
					return;
				}
				const price = data.price?.toFixed(2) ?? '0.00';
				const name = data.name;

				const items: {
					name: string;
					quantity: number;
					price: string;
					id: number;
					link: string | null;
				}[] = [];
				data.items.forEach((item) => {
					const itemName = item.name ?? '';
					items.push({
						name: itemName.length > 30 ? itemName.slice(0, 30) + '...' : itemName,
						quantity: item.quantity,
						price: `${String(item.price)} €`,
						id: item.id,
						link: item.link
					});
				});

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
						done: ['completed', 'refused_treso', 'canceled_user', 'canceled_ops'].includes(
							data.status ?? ''
						),
						icon: 'processing'
					},
					{
						done: data.status === 'pending_delivery' || data.status === 'completed',
						icon: 'shipping'
					},
					{
						done: data.status === 'completed',
						icon: 'done'
					}
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

				// fetch the updates for the order
				const updates = (await supabase
					.from('updates')
					.select('id, message, date, author(username), type')
					.eq('order_id', id ?? '')
					.order('date', { ascending: false })) as { data: UpdateRow[] | null; error: unknown };

				if (updates.error || !updates.data) {
					return;
				}
				const updatesList: (UpdateRow & { date: string })[] = updates.data.map((u) => ({
					...u,
					date: new Date(u.date).toLocaleString()
				}));

				mountClosable(ReadDrawer, {
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
									label: 'Raison statut',
									value: data.status_reason?.trim() ?? 'Aucune'
								},
								{
									label: 'Historique',
									value: {
										list: updatesList.map((update) => ({
											message: update.message,
											date: update.date,
											type: update.type,
											user: update.author?.username ?? 'Système'
										})),
										type: 'updates'
									}
								}
							]
						},
						actions: [
							{
								title: 'Annuler',
								type: 'delete',
								handler: async (_e: Event) => {
									const reason = prompt("Raison d'annulation (optionnelle)")?.trim() ?? null;
									const supabaseClient = getSupabaseBrowserClient();
									const { data: cancelData, error: cancelError } = (await supabaseClient
										.from('orders')
										.update({ status: 'canceled_user', status_reason: reason })
										.eq('id', id ?? '')
										.select()
										.single()) as { data: OrderRow | null; error: unknown };
									if (cancelError) {
										return;
									}
									if (cancelData) {
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

	const dbInfo = {
		table: 'orders',
		key: 'id, creationDate, projectId, status, lastUpdate, items(*), name, price, shipping_cost',
		ordering: 'lastUpdate:desc'
	};

	interface OrderListRow {
		id: number;
		price: number | null;
		shipping_cost: number | null;
		name: string | null;
		creationDate: string;
		lastUpdate: string;
		status: string;
	}

	function parseItems(data: unknown[]) {
		const rows = data as OrderListRow[];
		const items: { value: string | number; data?: number }[][] = [];
		rows.forEach((el) => {
			const price = Math.round(((el.price ?? 0) + (el.shipping_cost ?? 0)) * 100) / 100;
			const elName = el.name ?? '';
			const name = elName.length > 30 ? elName.slice(0, 30) + '...' : elName;
			items.push([
				{ value: name, data: el.id },
				{ value: el.creationDate.substring(0, 10) },
				{ value: el.lastUpdate.substring(0, 10) },
				{ value: `${String(price)} €` },
				{ value: (statusText as Record<string, string>)[el.status] ?? el.status }
			]);
		});
		return items;
	}

	onMount(() => {
		if (!skip) {
			loadUserdata();
		}
	});
</script>

<div class="flex w-full items-center justify-between sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">
		Bonjour {user?.name ?? 'utilisateur'}
	</h2>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<p class="text-gray-300">
		Voici la liste de vos commandes. Vous pouvez en ajouter, modifier ou supprimer.
	</p>
</div>
<div class="w-full py-2 sm:px-8 lg:px-16">
	<div class="rounded-lg bg-gray-800">
		<Table {headers} {dbInfo} {parseItems} {actions} {filters} type="commande" type_accord="une" />
	</div>
</div>
