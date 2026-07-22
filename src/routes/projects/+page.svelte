<script lang="ts">
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { onMount } from 'svelte';

	import type { UserData } from '@davincibot/lib';
	import { loadUserdata, userdata } from '@davincibot/lib';

	import { Bar, Pie } from 'svelte5-chartjs';

	import {
		ArcElement,
		BarElement,
		CategoryScale,
		Chart as ChartJS,
		Legend,
		LinearScale,
		Title,
		Tooltip
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement);

	interface BudgetData {
		budget: number | null;
		year: string | null;
		current: boolean | null;
		cost?: number;
	}

	interface ProjectData {
		id: number;
		name: string | null;
		debut: string | null;
		budget: BudgetData | null;
	}

	interface StatEntry {
		label: string;
		value: number | string;
	}

	interface StatsData {
		websites: StatEntry[];
		users: StatEntry[];
		tags: StatEntry[];
		banks: StatEntry[];
	}

	let selectedProjectId = $state<number | undefined>(undefined);
	let project = $state<Partial<ProjectData>>({});
	let stats = $state<StatsData>({ websites: [], users: [], tags: [], banks: [] });
	let skip = false;
	let user = $state<UserData>(null);
	let showDropdown = $state<boolean>(false);
	let dropdownEl = $state<HTMLElement | undefined>(undefined);
	let selectedYear = $state<string | undefined>(undefined);
	let budgets = $state<BudgetData[]>([]);

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: false } },
		scales: {
			x: {
				ticks: { color: '#cbd5e1' },
				grid: { color: 'rgba(148,163,184,0.15)' }
			},
			y: {
				ticks: { color: '#cbd5e1' },
				grid: { color: 'rgba(148,163,184,0.15)' }
			}
		}
	};

	function fmt(n: number | null | undefined): string {
		if (n === null || n === undefined) {
			return '0';
		}
		try {
			return n.toLocaleString('fr-FR');
		} catch {
			return String(n);
		}
	}

	const year = new Date().getFullYear();

	userdata.subscribe((value) => {
		if (value) {
			user = value;
			const userProfile = value;
			selectedProjectId =
				userProfile.projects.length > 0 ? userProfile.projects.at(0)?.id : undefined;

			if (userProfile.allProjects) {
				userProfile.allProjects.forEach((p) => {
					if (!userProfile.projects.some((proj) => proj.id === p.value)) {
						// Only add projects that are not already in the user's projects
						userProfile.projects.push({
							id: p.value,
							name: p.name,
							debut: p.debut,
							role: 'membre'
						});
					}
				});
			}

			if (selectedProjectId) {
				void loadPage();
			}
			skip = true;
		}
	});

	const budgetChartData = $derived({
		labels: ['Budget restant', 'Dépenses'],
		datasets: [
			{
				data: [
					(project.budget?.budget ?? 0) - (project.budget?.cost ?? 0) < 0
						? 0
						: (project.budget?.budget ?? 0) - (project.budget?.cost ?? 0),
					project.budget?.cost ?? 0
				],
				backgroundColor: ['#36A2EB', '#FF6384'],
				hoverBackgroundColor: ['#36A2EB', '#FF6384']
			}
		]
	});

	async function fetchProject(): Promise<Partial<ProjectData>> {
		if (!selectedProjectId) {
			return { name: 'Aucun projet sélectionné', budget: { budget: 0, year: '0', current: null } };
		}
		const supabase = getSupabaseBrowserClient();
		const { data, error } = (await supabase
			.from('projects')
			.select('id, name, debut, budget(budget, year, current)')
			.eq('id', selectedProjectId)
			.single()) as { data: ProjectData | null; error: unknown };

		if (error || !data) {
			return {};
		}
		const rawBudgets = (
			Array.isArray(data.budget) ? data.budget : data.budget ? [data.budget] : []
		) as BudgetData[];
		budgets = rawBudgets.sort((a, b) => String(b.year).localeCompare(String(a.year)));
		const current = budgets.find((b) => b.current);
		selectedYear = selectedYear ?? current?.year ?? budgets[0]?.year ?? String(year);
		const fallbackYear = selectedYear;
		const matchedBudget = budgets.find((b) => b.year === fallbackYear) ??
			budgets[0] ?? { budget: 0, year: fallbackYear, current: null };
		return { ...data, budget: matchedBudget };
	}

	onMount(() => {
		void loadPage();
		if (!skip) {
			loadUserdata();
		}
	});

	async function loadPage() {
		project = await fetchProject();
		if (selectedProjectId === 0) {
			project.budget = { budget: 0, year: String(year), current: null, cost: 0 };
		}
		if (selectedProjectId === undefined || !project.budget) {
			return;
		}
		// Les RPC attendent l'année en numérique ; elle circule en string côté UI.
		const rpcYear = Number(selectedYear ?? project.budget.year ?? year);
		const supabase = getSupabaseBrowserClient();
		const { data: costData, error: costErr } = (await supabase.rpc('get_project_cost', {
			projectid: selectedProjectId,
			year: rpcYear
		})) as { data: number | null; error: unknown };
		if (costErr) {
			return;
		}
		project.budget.cost = costData ?? 0;

		// Fetch aggregated stats in one call (try with year, fallback without)
		let statsResult = (await supabase.rpc('get_project_stats', {
			projectid: selectedProjectId,
			year: rpcYear
		})) as { data: StatsData | null; error: unknown };
		if (statsResult.error) {
			statsResult = (await supabase.rpc('get_project_stats', {
				projectid: selectedProjectId
			})) as { data: StatsData | null; error: unknown };
		}
		if (!statsResult.error) {
			stats = statsResult.data ?? { websites: [], users: [], tags: [], banks: [] };
		}
	}

	async function handleYearChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedYear = target.value;
		// update displayed budget object to match selected year
		if (budgets.length) {
			project.budget = budgets.find((b) => b.year === selectedYear) ?? project.budget;
		}
		await loadPage();
	}

	function handleWindowClick(e: MouseEvent) {
		if (!showDropdown) {
			return;
		}
		const target = e.target as Node;
		if (dropdownEl && !dropdownEl.contains(target)) {
			showDropdown = false;
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="mx-auto flex w-full max-w-7xl flex-col items-start justify-center gap-6 px-4 py-8">
	<div class="flex h-14 w-full items-center justify-between">
		<h2 class="h-full w-full self-center align-middle text-3xl font-bold tracking-tight text-white">
			{#if (user?.projects.length ?? 0) > 1}
				<div class="relative inline-block h-full min-w-64 md:min-w-72" bind:this={dropdownEl}>
					<button
						class="flex h-full w-full items-center justify-between rounded-md border border-gray-800 bg-gray-900 px-6 py-2 text-2xl font-bold text-white hover:bg-gray-800"
						onclick={() => (showDropdown = !showDropdown)}
						type="button"
					>
						{user?.projects.find((p) => p.id === selectedProjectId)?.name ??
							'Sélectionner un projet'}
						<svg class="ml-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
					{#if showDropdown}
						<ul
							class="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-xl"
						>
							{#each user?.projects ?? [] as p (p.id)}
								<li>
									<button
										class="w-full px-4 py-2 text-left text-white hover:bg-gray-700"
										onclick={() => {
											selectedProjectId = p.id;
											showDropdown = false;
											void loadPage();
										}}
									>
										{p.name}
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else}
				{project.name}
				<span class="text-xl text-gray-400 italic">({project.debut?.split('-')[0]})</span>
			{/if}
		</h2>
		<div class="flex h-full items-center gap-2">
			<select
				id="year"
				class="h-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
				onchange={handleYearChange}
				bind:value={selectedYear}
				aria-label="Sélection de l'année du budget"
			>
				{#if budgets.length}
					{#each budgets.sort((a, b) => parseInt(b.year ?? '0', 10) - parseInt(a.year ?? '0', 10)) as b (b.year)}
						<option value={b.year}>{b.year}</option>
					{/each}
				{:else}
					<option value={project.budget?.year}>{project.budget?.year}</option>
				{/if}
			</select>
		</div>
	</div>

	<!-- Top summary and budget card -->
	<div class="grid w-full gap-6 md:grid-cols-2">
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<div class="flex items-center justify-between">
				<h3 class="text-2xl font-bold tracking-tight text-white">Budget</h3>
				<div class="flex items-center space-x-3 text-white/80">
					<span class="text-lg font-semibold">{fmt(project.budget?.budget ?? 0)} €</span>
					<span class="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-sm"
						>{project.budget?.year ?? 0}</span
					>
				</div>
			</div>
			<div class="mt-4 grid items-center gap-4 sm:grid-cols-2">
				<div class="h-56">
					<Pie data={budgetChartData} options={{ responsive: true, maintainAspectRatio: false }} />
				</div>
				<div class="space-y-2 text-white">
					<div class="flex items-center justify-between">
						<span class="text-white/70">Dépenses</span>
						<span class="font-semibold">{fmt(project.budget?.cost ?? 0)} €</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-white/70">Restant</span>
						<span class="font-semibold"
							>{fmt(Math.max((project.budget?.budget ?? 0) - (project.budget?.cost ?? 0), 0))} €</span
						>
					</div>
					{#if (project.budget?.budget ?? 0) - (project.budget?.cost ?? 0) < 0}
						<p class="text-sm font-semibold text-red-400">Dépassement de budget !</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Quick facts card -->
		<div class="grid grid-cols-2 gap-4">
			<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
				<p class="text-sm text-white/70">Nombre de sites</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.websites.length}</p>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
				<p class="text-sm text-white/70">Tags</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.tags.length}</p>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
				<p class="text-sm text-white/70">Utilisateurs</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.users.length}</p>
			</div>
			<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
				<p class="text-sm text-white/70">Banques</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.banks.length}</p>
			</div>
		</div>
	</div>

	<!-- Aggregated charts -->
	<div class="mt-4 grid w-full gap-6 md:grid-cols-2">
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<h3 class="mb-2 text-xl font-bold text-white">Sites les plus utilisés</h3>
			<div class="h-72">
				<Bar
					data={{
						labels: stats.websites.map((d) => d.label).slice(0, 10),
						datasets: [
							{
								label: 'Montant',
								data: stats.websites.map((d) => Number(d.value)).slice(0, 10),
								backgroundColor: '#36A2EB'
							}
						]
					}}
					options={barOptions}
				/>
			</div>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<h3 class="mb-2 text-xl font-bold text-white">Plus gros utilisateurs</h3>
			<div class="h-72">
				<Bar
					data={{
						labels: stats.users.map((d) => d.label).slice(0, 10),
						datasets: [
							{
								label: 'Montant',
								data: stats.users.map((d) => Number(d.value)).slice(0, 10),
								backgroundColor: '#FF6384'
							}
						]
					}}
					options={barOptions}
				/>
			</div>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<h3 class="mb-2 text-xl font-bold text-white">Tags les plus utilisés</h3>
			<div class="h-72">
				<Bar
					data={{
						labels: stats.tags.map((d) => d.label).slice(0, 10),
						datasets: [
							{
								label: 'Nombre',
								data: stats.tags.map((d) => Number(d.value)).slice(0, 10),
								backgroundColor: '#4BC0C0'
							}
						]
					}}
					options={barOptions}
				/>
			</div>
		</div>

		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<h3 class="mb-2 text-xl font-bold text-white">Banques les plus utilisées</h3>
			<div class="h-72">
				<Bar
					data={{
						labels: stats.banks.map((d) => d.label).slice(0, 10),
						datasets: [
							{
								label: 'Dépenses',
								data: stats.banks.map((d) => Number(d.value)).slice(0, 10),
								backgroundColor: '#9966FF'
							}
						]
					}}
					options={barOptions}
				/>
			</div>
		</div>
	</div>
</div>
