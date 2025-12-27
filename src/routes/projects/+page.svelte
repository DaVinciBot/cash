<script>
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	import { loadUserdata } from '$lib/utils';
	import { userdata } from '$lib/store';

	import { Pie, Bar } from 'svelte-chartjs';

	import {
		Chart as ChartJS,
		Title,
		Tooltip,
		Legend,
		ArcElement,
		CategoryScale,
		LinearScale,
		BarElement
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement);

	let selectedProjectId;
	let project = {};
	let stats = { websites: [], users: [], tags: [], banks: [] };
	let skip = false;
	let user;
	let showDropdown = false;
	let isLoading = false;
	let dropdownEl;
	let selectedYear;
	let budgets = [];

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

	function fmt(n) {
		if (n == null) return '0';
		try {
			return Number(n).toLocaleString('fr-FR');
		} catch {
			return String(n);
		}
	}

	let year = new Date().getFullYear();

	userdata.subscribe(async (value) => {
		if (value) {
			user = value;
			selectedProjectId = user.projects.length > 0 ? user.projects[0].id : undefined;

			if (user.allProjects) {
				user.allProjects.forEach((p) => {
					if (!user.projects.some((proj) => proj.id === p.value)) {
						// Only add projects that are not already in the user's projects
						user.projects.push({
							id: p.value,
							name: p.name,
							debut: p.debut
						});
					}
				});
			}

			if (selectedProjectId) {
				await loadPage();
			}
			skip = true;
		}
	});

	let data = {
		labels: ['Budget restant', 'Dépenses'],
		datasets: [
			{
				data: [1, 1],
				backgroundColor: ['#36A2EB', '#FF6384'],
				hoverBackgroundColor: ['#36A2EB', '#FF6384']
			}
		]
	};
	$: data.datasets[0].data = [
		project.budget?.budget - project.budget?.cost < 0
			? 0
			: project.budget?.budget - project.budget?.cost,
		project.budget?.cost
	];

	async function fetchProject() {
		if (!selectedProjectId) {
			return { name: 'Aucun projet sélectionné', budget: { budget: 0, year: 0 } };
		}
		let { data, error } = await supabase
			.from('projects')
			.select('id, name, debut, budget(budget, year, current)')
			.eq('id', selectedProjectId)
			.single();

		if (error) {
			console.error(error);
			return;
		}
		budgets = (data.budget || []).sort((a, b) => String(b.year).localeCompare(String(a.year)));
		const current = budgets.find((b) => b.current);
		selectedYear = selectedYear ?? current?.year ?? budgets[0]?.year ?? String(year);
		data.budget = budgets.find((b) => b.year === selectedYear) ||
			budgets[0] || { budget: 0, year: selectedYear };
		return data;
	}

	onMount(async () => {
		await loadPage();
		if (!skip) {
			await loadUserdata();
		}
	});

	async function loadPage() {
		isLoading = true;
		project = await fetchProject();
		if (selectedProjectId == 0) {
			project.budget = { budget: 0, year: year, cost: 0 };
		}
		const { data: costData, error: costErr } = await supabase.rpc('get_project_cost', {
			projectid: selectedProjectId,
			year: selectedYear || project?.budget?.year
		});
		if (costErr) {
			console.error(costErr);
			isLoading = false;
			return;
		}
		project.budget.cost = costData;

		// Fetch aggregated stats in one call (try with year, fallback without)
		let statsData, statsErr;
		({ data: statsData, error: statsErr } = await supabase.rpc('get_project_stats', {
			projectid: selectedProjectId,
			year: selectedYear || project?.budget?.year
		}));
		if (statsErr) {
			console.warn(
				'get_project_stats with year failed, retrying without year',
				statsErr?.message || statsErr
			);
			({ data: statsData, error: statsErr } = await supabase.rpc('get_project_stats', {
				projectid: selectedProjectId
			}));
		}
		if (statsErr) {
			console.error(statsErr);
		} else {
			stats = statsData ?? { websites: [], users: [], tags: [], banks: [] };
		}
		isLoading = false;
	}
	async function handleSelect(event) {
		selectedProjectId = event.target.value;
		selectedYear = undefined; // reset to current/default for new project
		await loadPage();
	}

	async function handleYearChange(e) {
		selectedYear = e.target.value;
		// update displayed budget object to match selected year
		if (budgets?.length) {
			project.budget = budgets.find((b) => b.year === selectedYear) || project.budget;
		}
		await loadPage();
	}

	function handleWindowClick(e) {
		if (!showDropdown) return;
		if (dropdownEl && !dropdownEl.contains(e.target)) {
			showDropdown = false;
		}
	}
</script>

<svelte:window on:click={handleWindowClick} />

<div class="flex flex-col items-start justify-center w-full gap-6 px-4 py-8 mx-auto max-w-7xl">
	<div class="flex items-center justify-between w-full h-14">
		<h2 class="self-center w-full h-full text-3xl font-bold tracking-tight text-white align-middle">
			{#if user?.projects?.length > 1}
				<div class="relative inline-block h-full min-w-64 md:min-w-72" bind:this={dropdownEl}>
					<button
						class="flex items-center justify-between w-full h-full px-6 py-2 text-2xl font-bold text-white bg-gray-900 border border-gray-800 rounded-md hover:bg-gray-800"
						on:click={() => (showDropdown = !showDropdown)}
						type="button"
					>
						{user.projects.find((p) => p.id === selectedProjectId)?.name ||
							'Sélectionner un projet'}
						<svg class="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
							class="absolute z-20 w-full mt-1 overflow-hidden bg-gray-800 border border-gray-700 shadow-xl rounded-xl"
						>
							{#each user.projects as p}
								<li>
									<button
										class="w-full px-4 py-2 text-left text-white hover:bg-gray-700"
										on:click={() => {
											selectedProjectId = p.id;
											showDropdown = false;
											handleSelect({ target: { value: p.id } });
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
				<span class="text-xl italic text-gray-400">({project.debut?.split('-')[0]})</span>
			{/if}
		</h2>
		<div class="flex items-center h-full gap-2">
			<select
				id="year"
				class="h-full px-3 py-2 text-white bg-gray-900 border border-gray-800 rounded-md"
				on:change={handleYearChange}
				bind:value={selectedYear}
				aria-label="Sélection de l'année du budget"
			>
				{#if budgets?.length}
					{#each budgets as b}
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
		<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
			<div class="flex items-center justify-between">
				<h3 class="text-2xl font-bold tracking-tight text-white">Budget</h3>
				<div class="flex items-center space-x-3 text-white/80">
					<span class="text-lg font-semibold">{fmt(project.budget?.budget ?? 0)} €</span>
					<span class="px-2 py-0.5 text-sm rounded bg-gray-800 border border-gray-700"
						>{project.budget?.year ?? 0}</span
					>
				</div>
			</div>
			<div class="grid items-center gap-4 mt-4 sm:grid-cols-2">
				<div class="h-56">
					<Pie {data} options={{ responsive: true, maintainAspectRatio: false }} />
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
					{#if project.budget?.budget - project.budget?.cost < 0}
						<p class="text-sm font-semibold text-red-400">Dépassement de budget !</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Quick facts card -->
		<div class="grid grid-cols-2 gap-4">
			<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
				<p class="text-sm text-white/70">Nombre de sites</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.websites.length}</p>
			</div>
			<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
				<p class="text-sm text-white/70">Tags</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.tags.length}</p>
			</div>
			<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
				<p class="text-sm text-white/70">Utilisateurs</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.users.length}</p>
			</div>
			<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
				<p class="text-sm text-white/70">Banques</p>
				<p class="mt-1 text-2xl font-bold text-white">{stats.banks.length}</p>
			</div>
		</div>
	</div>

	<!-- Aggregated charts -->
	<div class="grid w-full gap-6 mt-4 md:grid-cols-2">
		<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
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

		<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
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

		<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
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

		<div class="p-5 bg-gray-900 border border-gray-800 rounded-xl">
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
