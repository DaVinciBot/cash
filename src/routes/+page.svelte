<script>
	import { userdata } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { loadUserdata, statusText } from '$lib/utils';
	import { onMount } from 'svelte';

	import Table from '$lib/components/admin/Table.svelte';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';

	export let data;

	let skip = false;
	let user;

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			skip = true;
		}
	});

	let headers = ['Objets', 'Date de création', 'Dernière mise à jour', 'Prix', 'Status', 'Actions'];

	let filters = [
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
			options: [{ name: 'current_user', value: user?.id, active: true }]
		}
	];

	$: {
		filters[1].options[0].value = user?.id;
	}

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
						'id, creationDate, projectId, status, status_reason, lastUpdate, items(*), comment, price, name'
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
						name: item.name.length > 30 ? item.name.slice(0, 30) + '...' : item.name,
						quantity: item.quantity,
						price: `${item.price} €`,
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
							data.status
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

				// fetch the updates for the order
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
									label: 'Raison statut',
									value: data.status_reason?.trim() || 'Aucune'
								},
								{
									label: 'Historique',
									value: {
										list: updatesList.map((update) => ({
											message: update.message,
											date: update.date,
											type: update.type,
											user: update.author?.username || 'Système'
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
								handler: async (e) => {
									const reason = prompt("Raison d'annulation (optionnelle)")?.trim() || null;
									const { data, error } = await supabase
										.from('orders')
										.update({ status: 'canceled_user', status_reason: reason })
										.eq('id', id)
										.select()
										.single();
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

	let dbInfo = {
		table: 'orders',
		key: 'id, creationDate, projectId, status, lastUpdate, items(*), name, price, shipping_cost',
		ordering: 'lastUpdate:desc'
	};

	function parseItems(data) {
		let items = [];
		data.forEach((el) => {
			const price = Math.round((el.price + el.shipping_cost || 0) * 100) / 100;
			const name = el.name.length > 30 ? el.name.slice(0, 30) + '...' : el.name;
			items.push([
				{ value: name, data: el.id },
				{ value: el.creationDate.toLocaleString().split('T')[0] },
				{ value: el.lastUpdate.toLocaleString().split('T')[0] },
				{ value: price + ' €' },
				{ value: statusText[el.status] }
			]);
		});
		return items;
	}

	onMount(async () => {
		if (skip) return;
		await loadUserdata();
	});
</script>

<div class="flex items-center justify-between w-full sm:px-8 lg:px-16">
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
	<div class="bg-gray-800 rounded-lg">
		<Table
			{headers}
			{dbInfo}
			{parseItems}
			{actions}
			{filters}
			supabase={data.supabase}
			type="commande"
			type_accord="une"
		/>
	</div>
</div>
