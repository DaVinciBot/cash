<script>
	import { onMount } from 'svelte';
	import { userdata } from '$lib/store';
	import { loadUserdata } from '$lib/utils';
	import { supabase } from '$lib/supabaseClient';
	import { statusText, updateText } from '$lib/utils';

	import Table from '$lib/components/admin/Table.svelte';
	import ReadDrawer from '$lib/components/drawers/ReadDrawer.svelte';

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
				{ name: 'En attente', value: 'pendingCDP","pendingTreso' },
				{ name: 'Validé par le CDP', value: 'approvedCDP', active: true },
				{ name: 'A commander', value: 'approvedTreso' },
				{ name: 'Commandé', value: 'ordered' },
				{ name: 'Terminé', value: 'completed' },
				{ name: 'Refusé', value: 'canceled","refusedTreso","refusedCDP' }
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
					.select('id, creationDate, projectId, status, lastUpdate, items(*), comment, price, name')
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
								title: 'Supprimer',
								type: 'delete',
								handler: async (e) => {
									const { data, error } = await supabase
										.from('orders')
										.delete()
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
		key: 'id, creationDate, projectId, status, lastUpdate, items(*), name'
	};

	function parseItems(data) {
		let items = [];
		data.forEach((el) => {
			const price =
				Math.round(el.items.reduce((acc, item, i) => acc + item.price * item.quantity, 0) * 100) /
				100;
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
		<Table {headers} {dbInfo} {parseItems} {actions} {filters} type="commande" type_accord="une" />
	</div>
</div>
