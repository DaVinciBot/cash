<script lang="ts">

    import type { PageData } from './$types';
    import { ChevronRight } from '@lucide/svelte';

    let { data }: { data: PageData } = $props();

    const healthLabels: Record<string, string> = {
        operational: 'Opérationnel',
        unavailable: 'Indisponible',
        unknown: 'Statut inconnu',
        loading: 'Vérification...',
        pending: 'En attente',
    };

    const badgeClasses: Record<string, string> = {
        operational: 'text-emerald-400 border-emerald-500/20',
        unavailable: 'text-red-400 border-red-500/20',
        unknown: 'text-slate-400 border-slate-500/20',
        loading: 'text-blue-400 border-blue-500/20',
        pending: 'text-orange-400 border-orange-500/20',
        none: 'text-slate-400 border-slate-500/20',

    };

    const dotColors: Record<string, string> = {
        operational: '#34d399',
        none: '#94a3b8',
        unavailable: '#f87171',
        unknown: '#94a3b8',
        loading: '#60a5fa',
        pending: '#fb923c',
    };
</script>

<svelte:head>
    <title>Services — DaVinciBot</title>
</svelte:head>

<section class="mx-auto max-w-6xl">
    <header class="mb-8">
        <h1 class="text-2xl font-bold text-white">Nos services</h1>
        <p class="text-dark-light-blue mt-1 text-sm">
            Retrouvez rapidement les outils utilisés au quotidien par l’association.
        </p>
    </header>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each data.services as service (service.name)}
            <a
                class="border-rule bg-blue-gray/15 hover:border-light-blue/60 hover:bg-blue-gray/30 group flex min-h-48 flex-col rounded-xl border p-5 transition-colors"
                href={service.href}
                rel="noopener noreferrer"
                target="_blank"
            >
                <div class="flex items-start justify-between gap-4">
                    <h2 class="text-xl font-semibold text-white">{service.name}</h2>
                    <ChevronRight 
                        size={32} 
                        strokeWidth={2.5} 
                        class="text-light-blue transition-transform group-hover:translate-x-1.5"
                    />
                </div>

                <p class="text-dark-light-blue my-auto max-w-xs text-sm leading-6 py-4">
                    {service.description}
                </p>

                <div class="relative flex h-8 items-center overflow-hidden">
                    {#await service.healthPromise}
                        <span
                            class={`status-badge ${badgeClasses.loading}`}
                            style={`--dot-color: ${dotColors.loading}`}
                        >
                            <span class="status-dot"></span>
                            {healthLabels.loading}
                        </span>
                    {:then health}
                        {#if health === 'none'}
                            <span
                                class={`status-badge ${badgeClasses.none}`}
                                style={`--dot-color: ${dotColors.none}`}
                            >
                                <span class="status-dot"></span>
                                Pas hébergé par l'association
                            </span>
                        {:else}
                            <span
                                class={`status-badge ${badgeClasses[health] ?? badgeClasses.unknown}`}
                                style={`--dot-color: ${dotColors[health] ?? dotColors.unknown}`}
                            >
                                <span class={['unavailable', 'maintenance', 'unknown'].includes(health) ? 'status-dot-offline' : 'status-dot'}></span>
                                {healthLabels[health] ?? healthLabels.unknown}
                            </span>
                        {/if}
                    {/await}
                </div>
            </a>
        {/each}
    </div>
</section>

<style>
.status-badge {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
}

.status-dot-offline {
    position: relative;
    display: inline-block;
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--dot-color);
}

.status-dot {
    position: relative;
    display: inline-block;
    flex: 0 0 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--dot-color);
}

.status-dot::before {
    content: "";
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    background-color: var(--dot-color);
    animation: status-pulse 1.5s ease-out infinite;
}

@keyframes status-pulse {
    0% {
        transform: scale(0.7);
        opacity: 0.8;
    }
    100% {
        transform: scale(2.5);
        opacity: 0;
    }
}
</style>