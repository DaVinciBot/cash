<script lang="ts">
	import { Button, FilterChip } from '@davincibot/components';
	import { resolve } from '$app/paths';
	import CampusBadge from '$lib/components/cash/CampusBadge.svelte';
	import StateBadge from '$lib/components/cash/StateBadge.svelte';
	import { ORDER_STATE_ICONS } from '$lib/components/cash/stateIcons';
	import { ORDER_STATE_BADGES, ORDER_STATES, type OrderState } from '@davincibot/lib';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const orders = $derived(data.orders);

	let stateFilter = $state<OrderState | 'all'>('all');

	const visible = $derived(
		stateFilter === 'all' ? orders : orders.filter((o) => o.state === stateFilter)
	);

	// CMD-F-81 — délimitation claire par année scolaire. L'ordre des groupes suit
	// celui de la liste, déjà triée par année décroissante puis par date métier.
	const years = $derived.by(() => {
		const groups: { id: number; label: string; orders: typeof visible }[] = [];
		for (const order of visible) {
			const group = groups.find((g) => g.id === order.schoolYearId);
			if (group) {
				group.orders.push(order);
			} else {
				groups.push({ id: order.schoolYearId, label: order.schoolYearLabel, orders: [order] });
			}
		}
		return groups;
	});

	const counts = $derived(
		ORDER_STATES.reduce<Record<string, number>>(
			(acc, state) => {
				acc[state] = orders.filter((o) => o.state === state).length;
				return acc;
			},
			{ all: orders.length }
		)
	);

	const euro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });
</script>

<svelte:head><title>Commandes — DaVinciBot</title></svelte:head>

<section class="mx-auto max-w-6xl">
	<header class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Commandes</h1>
			<p class="text-dark-light-blue mt-1 text-sm">
				Triées par date de passation pour celles qui sont passées, par date de création pour les
				autres.
			</p>
		</div>
		<Button href={resolve('/bundle')} size="md" variant="secondary">Items à regrouper</Button>
	</header>

	<div class="mb-4 flex flex-wrap items-center gap-2">
		<FilterChip onclick={() => (stateFilter = 'all')} pressed={stateFilter === 'all'}>
			Toutes ({counts.all})
		</FilterChip>
		{#each ORDER_STATES as state (state)}
			<FilterChip onclick={() => (stateFilter = state)} pressed={stateFilter === state}>
				{ORDER_STATE_BADGES[state].label} ({counts[state]})
			</FilterChip>
		{/each}
	</div>

	{#if visible.length === 0}
		<p
			class="border-rule text-dark-light-blue/70 rounded-xl border border-dashed px-4 py-12 text-center"
		>
			{orders.length === 0
				? 'Aucune commande. Constituez-en une depuis la file des items à regrouper.'
				: 'Aucune commande ne correspond à ce filtre.'}
		</p>
	{:else}
		{#each years as year (year.id)}
			<div class="mb-8">
				<h2
					class="border-rule text-dark-light-blue mb-3 border-b pb-1 text-sm font-semibold tracking-wide uppercase"
				>
					Année scolaire {year.label}
				</h2>
				<ul class="space-y-2">
					{#each year.orders as order (order.id)}
						<li>
							<a
								class="border-rule bg-blue-gray/15 hover:border-light-blue/60 block rounded-lg border p-4"
								href={resolve('/orders/[id]', { id: String(order.id) })}
							>
								<div class="flex flex-wrap items-center gap-3">
									<span class="font-medium text-white">Commande #{order.id}</span>
									<StateBadge
										badge={ORDER_STATE_BADGES[order.state]}
										icon={ORDER_STATE_ICONS[order.state]}
									/>
									{#if order.campus}
										<CampusBadge campus={order.campus} />
									{/if}
									<span class="text-light-blue ml-auto font-medium">
										{euro.format(order.amountTtc + order.shippingCostTtc)}
									</span>
								</div>
								<p class="text-dark-light-blue mt-1 text-sm">
									{order.itemCount} item(s)
									{#if order.itemCount > 0 && order.state !== 'pending_treso'}
										· {order.receivedCount} / {order.itemCount} reçus
									{/if}
									{#if order.shippingCostTtc > 0}
										· port {euro.format(order.shippingCostTtc)}
									{/if}
									·
									{#if order.orderedAt}
										passée le {day.format(new Date(order.orderedAt))}
									{:else}
										créée le {day.format(new Date(order.createdAt))}
									{/if}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	{/if}
</section>
