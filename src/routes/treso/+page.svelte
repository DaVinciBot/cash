<script lang="ts">
	import Table from '$lib/components/admin/Table.svelte';
	import CrudForm from '$lib/components/modals/CrudForm.svelte';
	import SucessModal from '$lib/components/modals/InfoModal.svelte';
	import ReadModal from '$lib/components/modals/ReadModal.svelte';

	import { triggerTableRefresh } from '$lib/store';
	import { supabase } from '$lib/supabaseClient';
	import { mountClosable } from '$lib/utils';
	import { onMount, unmount } from 'svelte';
	import { Bar } from 'svelte5-chartjs';

	import {
		BarElement,
		CategoryScale,
		Chart as ChartJS,
		Legend,
		LinearScale,
		Title,
		Tooltip
	} from 'chart.js';

	ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

	/** @type {{data: any}} */
	const { data } = $props();

	// Bank accounts overview state
	let banks = $state([]);
	let banksLoading = $state(true);
	let banksError = $state('');
	let banksOpen = $state(false); // collapsed by default

	// Tabs
	let selectedTab = $state('detail'); // 'detail' | 'cashflow'

	// Cashflow state
	let isLoadingCashflow = $state(false);
	let startDate = $state('');
	let endDate = $state('');
	let cashflowChartData = $state({
		labels: [],
		datasets: [
			{ label: 'Recettes', data: [], backgroundColor: '#36A2EB' },
			{ label: 'Dépenses', data: [], backgroundColor: '#FF6384' }
		]
	});

	const barOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: { legend: { display: true, labels: { color: '#cbd5e1' } }, title: { display: false } },
		scales: {
			x: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(148,163,184,0.15)' } },
			y: { ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(148,163,184,0.15)' } }
		}
	};

	function getCurrentQuarterRange() {
		const now = new Date();
		const q = Math.floor(now.getMonth() / 3);
		const start = new Date(now.getFullYear(), q * 3, 1);
		// day 0 of next quarter month gives last day of current quarter
		const end = new Date(now.getFullYear(), q * 3 + 3, 0);
		const fmt = (d) => {
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${d.getFullYear()}-${mm}-${dd}`;
		};
		return { start: fmt(start), end: fmt(end) };
	}

	function weekStart(dateStr) {
		const d = new Date(dateStr);
		// Normalize to local midnight
		d.setHours(0, 0, 0, 0);
		const day = d.getDay(); // 0=Sun .. 6=Sat
		const diff = (day === 0 ? -6 : 1) - day; // move to Monday
		const monday = new Date(d);
		monday.setDate(d.getDate() + diff);
		const key = monday.toISOString().slice(0, 10);
		const label = `Semaine du ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
		return { key, label, date: monday };
	}

	async function loadCashflow() {
		isLoadingCashflow = true;
		try {
			const { data, error } = await supabase
				.from('spending')
				.select('id, amount, is_positive, date')
				.gte('date', startDate)
				.lte('date', endDate);
			if (error) {
				throw error;
			}

			// Group by week
			const buckets = new Map();
			for (const row of data || []) {
				if (!row?.date) {
					continue;
				}
				const { key, label, date } = weekStart(row.date);
				if (!buckets.has(key)) {
					buckets.set(key, { label, date, in: 0, out: 0 });
				}
				const b = buckets.get(key);
				const amt = parseFloat(row.amount ?? 0) || 0;
				if (row.is_positive) {
					b.in += amt;
				} else {
					b.out += amt;
				}
			}
			const sorted = Array.from(buckets.values()).sort((a, b) => a.date - b.date);
			cashflowChartData = {
				labels: sorted.map((b) => b.label),
				datasets: [
					{ label: 'Recettes', data: sorted.map((b) => b.in), backgroundColor: '#36A2EB' },
					// Display dépenses as negative values so it shows below axis
					{
						label: 'Dépenses',
						data: sorted.map((b) => -Math.abs(b.out)),
						backgroundColor: '#FF6384'
					}
				]
			};
		} finally {
			isLoadingCashflow = false;
		}
	}

	function formatEUR(value) {
		const num = typeof value === 'number' ? value : parseFloat(value ?? 0);
		if (Number.isNaN(num)) {
			return '0,00 €';
		}
		return (
			num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
		);
	}

	const totalBanks = $derived(
		banks.reduce((acc, b) => acc + (parseFloat(b.current_amount ?? 0) || 0), 0)
	);

	async function loadBanks() {
		// fetch all bank accounts with their current amounts
		const { data, error } = await supabase
			.from('bank')
			.select('id, name, description, current_amount, category')
			.order('name', { ascending: true });
		if (error) {
			banksError = 'Impossible de charger les comptes bancaires';
		} else {
			banks = data || [];
		}
		banksLoading = false;
	}

	onMount(() => {
		// Set default period to current quarter then load banks and cashflow
		const q = getCurrentQuarterRange();
		startDate = q.start;
		endDate = q.end;
		loadBanks();
		loadCashflow();
	});

	async function addNew() {
		const { data: banks, error: bankErr } = await supabase
			.from('bank')
			.select('id, name')
			.order('name');
		if (bankErr) {
			alert('	Impossible de charger la liste des banques.');
			return;
		}

		const crud = mountClosable(CrudForm, {
			target: document.body,
			props: {
				fields: [
					{
						name: 'Valeur',
						type: 'number',
						id: 'amount',
						required: true,
						placeholder: '0.00',
						wide: false
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
					},
					{
						name: 'Justificatif',
						type: 'document',
						required: true,
						wide: true,
						multiple: true,
						value: []
					},
					{
						name: 'Date effective',
						type: 'date',
						id: 'date',
						required: true
					},
					{
						name: 'Type',
						type: 'select',
						id: 'is_positive',
						required: true,
						options: [
							{ value: 'true', text: 'Bénéfice' },
							{ value: 'false', text: 'Perte' }
						]
					},
					{
						name: 'Description',
						type: 'textarea',
						id: 'description',
						required: true,
						wide: true
					}
				],
				type_accord: 'une',
				type: 'ligne',
				onSubmit: async (e) => {
					// get forms data
					e.preventDefault();
					const form_data = new FormData(e.target.closest('form'));
					const data = {};
					for (const [key, value] of form_data.entries()) {
						if (key.startsWith('justificatif')) {
							const files = form_data.getAll('justificatif').filter((v) => v instanceof File);
							if (files[0]?.name == '') {
								files.pop();
							}
							data.justificatif = files;
						} else {
							data[key.toLowerCase()] = value;
						}
					}

					// create spending
					const { data: row, error: error } = await supabase
						.from('spending')
						.insert([
							{
								amount: data.amount,
								date: data.date,
								is_positive: data.is_positive,
								description: data.description,
								bank_id: data.bank_id
							}
						])
						.select('id')
						.single();

					if (error) {
						alert('	Une erreur est survenue lors de la création de la dépense');
						unmount(crud);
						return;
					}

					// upload proof
					const logoFile = Array.isArray(data.justificatif) ? data.justificatif : [];
					let message = `La dépense a bien été ajoutée`;

					if (logoFile.length > 0) {
						for (let i = 0; i < logoFile.length; i++) {
							const { data: _, error: err } = await supabase.storage
								.from('proof')
								.upload(`invoices/${row.id}/${logoFile[i].name}`, logoFile[i], {
									cacheControl: '3600',
									upsert: true
								});
							if (err) {
								alert("	Une erreur est survenue lors de l'envoi des justificatifs");
								unmount(crud);
								return;
							}
						}
					} else {
						message += ' (sans justificatif)';
					}

					mountClosable(SucessModal, {
						target: document.body,
						props: {
							message,
							onClose: () => {
								// Ask any listening table to refresh and update banks overview
								triggerTableRefresh('spending', { resetPage: true });
								loadBanks();
								// Close the creation form modal
								try {
									unmount(crud);
								} catch {}
							}
						}
					});
				}
			}
		});
	}

	async function edit(e) {
		e.preventDefault();
		const id = e.target.closest('tr').querySelector('th').dataset.utils;
		const [current_uid, current_avatar] = e.target
			.closest('tr')
			.querySelector('td:nth-child(3)')
			.dataset.utils.split('+');
		const current_name = e.target.closest('tr').querySelector('td:nth-child(3)').innerText;

		const { data, error } = await supabase.from('spending').select('*').eq('id', id).single();
		if (error) {
			return;
		}
		if (data.description === null || data.description === '') {
			data.description = 'Aucune description';
		}
		// get files names
		const { data: file_data, error: err } = await supabase.storage
			.from('proof')
			.list(`invoices/${id}`, {
				limit: 20,
				offset: 0,
				sortBy: { column: 'name', order: 'asc' }
			});
		if (err) {
		}

		const crud = mountClosable(CrudForm, {
			target: document.body,
			props: {
				fields: [
					{
						name: 'Valeur',
						type: 'number',
						id: 'amount',
						required: true,
						placeholder: data.amount ?? '0.00',
						value: data.amount,
						wide: true
					},
					{
						name: 'Justificatif',
						type: 'document',
						required: true,
						wide: true,
						multiple: true,
						value: file_data,
						onRemove: async (e, value) => {
							const { data, error } = await supabase.storage
								.from('proof')
								.remove([`invoices/${id}/${value}`]);
							if (error) {
								alert('	Une erreur est survenue lors de la suppression du justificatif');
							}
						}
					},
					{
						name: 'Date effective',
						type: 'date',
						id: 'date',
						required: true,
						value: data.date.split('T')[0],
						placeholder: data.date.split('T')[0]
					},
					{
						name: 'Type',
						type: 'select',
						id: 'is_positive',
						required: true,
						options: [
							{ value: 'true', text: 'Bénéfice', selected: data.is_positive },
							{ value: 'false', text: 'Perte', selected: !data.is_positive }
						]
					},
					{
						name: 'Description',
						type: 'textarea',
						id: 'description',
						required: true,
						wide: true,
						value: data.description
					},
					{
						name: 'Auteur',
						type: 'autocomplete',
						id: 'author',
						required: true,
						wide: true,
						value: current_name ?? '',
						data: current_uid,
						image: current_avatar,
						onChange: async (e) => {
							// search through users
							const { data, error } = await supabase
								.from('profiles')
								.select('id, username, avatar_url')
								.ilike('username', `${e.target.value}*`)
								.range(0, 4);
							if (error) {
								return;
							}
							// create options
							const options = [];
							for (let i = 0; i < data.length; i++) {
								const el = data[i];
								const avatar = el.avatar_url;
								options.push({ value: el.id, text: el.username, image: avatar });
							}
							return options;
						}
					}
				],
				type_accord: 'une',
				type: 'ligne',
				onSubmit: async (e) => {
					// get forms data
					e.preventDefault();
					const form_data = new FormData(e.target.closest('form'));
					const fdata = {};
					for (const [key, value] of form_data.entries()) {
						if (key.startsWith('author')) {
							const label = document.querySelector('label[for="author"]');
							const uid = label?.getAttribute('data-utils') || '';
							fdata.author = { uid };
						} else if (key.startsWith('justificatif')) {
							const files = form_data.getAll('justificatif').filter((v) => v instanceof File);
							if (files[0]?.name == '') {
								files.pop();
							}
							fdata.justificatif = files;
						} else {
							fdata[key.toLowerCase()] = value;
						}
					}

					// update spending
					const { data: row, error: error } = await supabase
						.from('spending')
						.update({
							amount: fdata.amount,
							date: fdata.date,
							is_positive: fdata.is_positive,
							description: fdata.description,
							author: fdata.author.uid
						})
						.eq('id', id)
						.select('id')
						.single();
					if (error) {
						alert("	Une erreur est survenue lors de l'édition de la dépense");
					}

					const logoFile = Array.isArray(fdata.justificatif) ? fdata.justificatif : [];

					// upload all files
					for (let i = 0; i < logoFile.length; i++) {
						// remove all special char and space
						const fileName = logoFile[i].name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
						const { data: _, error: err } = await supabase.storage
							.from('proof')
							.upload(`invoices/${row.id}/${fileName}`, logoFile[i], {
								cacheControl: '3600',
								upsert: true
							});
						if (error) {
							alert("	Une erreur est survenue lors de l'envoi des justificatifs");
							return;
						}
					}

					mountClosable(SucessModal, {
						target: document.body,
						props: {
							message: 'La dépense a bien été ajoutée',
							onClose: () => {
								triggerTableRefresh('spending');
								loadBanks();
								// Close the edit form modal
								try {
									unmount(crud);
								} catch {}
							}
						}
					});
				}
			}
		});
	}

	const dbInfo = {
		table: 'spending',
		key: 'id, is_positive, amount, date, description, author(id, username, avatar_url), order_id(id, comment, requestedBy, projectId(name), tags)',
		ordering: 'date:desc'
	};

	const headers = ['Valeur', 'Date', 'Auteur', 'Description', 'Tags', 'Actions'];

	async function parseItems(items) {
		// For each spending, check if at least one proof file exists; mark missing with warn flag
		const checks = await Promise.all(
			(items || []).map(async (it) => {
				try {
					const { data: files, error } = await supabase.storage
						.from('proof')
						.list(`invoices/${it.id}`, {
							limit: 1,
							offset: 0,
							sortBy: { column: 'name', order: 'asc' }
						});
					const hasProof = !error && Array.isArray(files) && files.length > 0;
					return { id: it.id, hasProof };
				} catch (_) {
					return { id: it.id, hasProof: false };
				}
			})
		);
		const byId = new Map(checks.map((c) => [c.id, c.hasProof]));

		const parsedItems = [];
		(items || []).forEach((item) => {
			const hasProof = byId.get(item.id) ?? false;
			// normalize order relation for tags
			const orderRef = Array.isArray(item.order_id) ? item.order_id[0] : item.order_id;
			parsedItems.push([
				{
					value: `${item.is_positive ? '+' : '-'} ${item.amount} €`,
					style: item.is_positive ? 'text-green-300' : 'text-red-300',
					data: item.id,
					warn: !hasProof
				},
				{ value: item.date.split('T')[0] },
				{
					value: item.author?.username ?? 'Aucun',
					data: `${item.author?.id}+${item.author?.avatar_url}`
				},
				{ value: item.description?.length ? item.description : '-' },
				{
					value:
						Array.isArray(orderRef?.tags) && orderRef.tags.length ? orderRef.tags.join(', ') : '-'
				}
			]);
		});
		return parsedItems;
	}

	const actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e) => {
				// get the info from the order
				const id = e.target.closest('tr').querySelector('th').dataset.utils;

				const { data, error } = await supabase
					.from('spending')
					.select(
						'id, description, author(username, id), amount, is_positive, date, order_id(id, comment, requestedBy(username), projectId(name), status, tags), bank_id(name)'
					)
					.eq('id', id)
					.single();

				if (error) {
					return;
				}

				// normalize nested relations (array or object)
				const orderRef = Array.isArray(data.order_id) ? data.order_id[0] : data.order_id;
				const projRef = orderRef
					? Array.isArray(orderRef.projectId)
						? orderRef.projectId[0]
						: orderRef.projectId
					: null;
				if (projRef?.name) {
					if (data.description != null && data.description !== '') {
						data.description += ` - Projet ${projRef.name}`;
					} else {
						data.description = `Projet ${projRef.name}`;
					}
				}
				if (data.description === null || data.description === '') {
					data.description = 'Aucune description';
				}
				let titleName = !data.is_positive ? 'Dépense' : 'Recette';

				// get the proof
				const { data: dat, error: err } = await supabase.storage
					.from('proof')
					.list(`invoices/${id}`, {
						limit: 20,
						offset: 0,
						sortBy: { column: 'name', order: 'asc' }
					});

				if (err) {
				}

				const fileList = Array.isArray(dat) ? dat : [];
				const files = [...fileList.map((file) => `invoices/${id}/${file.name}`)];

				// compute author safely (can be array or object)
				let authorName = 'Aucun';
				if (Array.isArray(data.author)) {
					authorName = data.author[0]?.username ?? 'Aucun';
				} else if (data.author && typeof data.author === 'object') {
					// @ts-ignore - JS runtime check
					authorName = data.author.username ?? 'Aucun';
				}
				if (orderRef) {
					titleName = `Dépense pour la commande #${orderRef.id} (${orderRef.status})`;
					const reqRef = Array.isArray(orderRef.requestedBy)
						? orderRef.requestedBy[0]
						: orderRef.requestedBy;
					if (reqRef?.username && authorName == 'Aucun') {
						authorName = reqRef.username;
					}
				}

				const hasProof = files.length > 0;

				// normalize bank as well
				// normalize bank relation (can be array or object or null)
				let bankName = 'Aucun';
				if (Array.isArray(data.bank_id)) {
					bankName = data.bank_id[0]?.name ?? 'Aucun';
				} else if (data.bank_id && typeof data.bank_id === 'object') {
					// @ts-ignore
					bankName = data.bank_id.name ?? 'Aucun';
				}

				mountClosable(ReadModal, {
					target: document.body,
					props: {
						values: {
							header: {
								title: titleName,
								sub: data.date.split('T')[0]
								// stepper: [] DO NOT ADD A STEPPER HERE
							},
							body: [
								{
									label: 'Valeur',
									value: `${data.amount} €`
								},
								{ label: 'Auteur', value: authorName },
								{ label: 'Compte utilisé', value: bankName ?? 'Aucun' },
								{ label: 'Description', value: data.description },
								{
									label: 'Tags',
									value:
										Array.isArray(orderRef?.tags) && orderRef.tags.length
											? orderRef.tags.join(' • ')
											: 'Aucun'
								},
								{
									label: 'Justification',
									value: hasProof ? `${files.length} fichier(s)` : 'Aucun justificatif'
								}
							]
						},

						files,
						actions: [
							{
								title: 'Modifier',
								type: 'edit',
								handler: async () => {
									edit(e);
								}
							}
						]
					}
				});
			}
		}
	];
</script>

<div class="w-full py-2 sm:px-8 lg:px-16">
	<h2 class="mb-4 text-4xl font-bold tracking-tight text-white">Gestion de la Trésorerie</h2>
	<p class="text-gray-400">
		Overview des comptes, cashflow et liste détaillée des dépenses/recettes
	</p>
	<hr class="mt-2 border-gray-700" />

	<!-- Tabs header -->
	<div class="mt-4 flex gap-2">
		<button
			class="rounded-md border px-4 py-2 text-sm font-medium transition-colors
				{selectedTab === 'detail'
				? 'border-gray-600 bg-gray-700 text-white'
				: 'hover:bg-gray-750 border-gray-700 bg-gray-800 text-gray-300'}"
			onclick={() => (selectedTab = 'detail')}
			aria-pressed={selectedTab === 'detail'}
		>
			Détail
		</button>
		<button
			class="rounded-md border px-4 py-2 text-sm font-medium transition-colors
				{selectedTab === 'cashflow'
				? 'border-gray-600 bg-gray-700 text-white'
				: 'hover:bg-gray-750 border-gray-700 bg-gray-800 text-gray-300'}"
			onclick={() => (selectedTab = 'cashflow')}
			aria-pressed={selectedTab === 'cashflow'}
		>
			Cashflow
		</button>
	</div>

	{#if selectedTab === 'cashflow'}
		<div class="mt-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-end">
				<div class="flex flex-col">
					<label class="text-sm text-gray-400" for="start">Début</label>
					<input
						id="start"
						type="date"
						bind:value={startDate}
						class="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
						onchange={loadCashflow}
					/>
				</div>
				<div class="flex flex-col">
					<label class="text-sm text-gray-400" for="end">Fin</label>
					<input
						id="end"
						type="date"
						bind:value={endDate}
						class="rounded-md border border-gray-800 bg-gray-900 px-3 py-2 text-white"
						onchange={loadCashflow}
					/>
				</div>
			</div>

			<div class="mt-4 h-80 rounded-xl border border-gray-800 bg-gray-900 p-4">
				{#if isLoadingCashflow}
					<div class="text-sm text-gray-400">Chargement du cashflow…</div>
				{:else}
					<Bar data={cashflowChartData} options={barOptions} />
				{/if}
			</div>
		</div>
	{:else}
		<div class="mt-4">
			<!-- Bank accounts aggregate + collapsible details -->
			<div class="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
				<button
					class="hover:bg-gray-750/50 flex w-full items-center justify-between px-4 py-4 focus:outline-none sm:px-6"
					aria-expanded={banksOpen}
					onclick={() => (banksOpen = !banksOpen)}
				>
					<div class="text-left">
						<div class="text-sm text-gray-400">Total comptes</div>
						<div class="text-2xl font-semibold text-white sm:text-3xl">{formatEUR(totalBanks)}</div>
					</div>
					<div class="flex items-center gap-3">
						{#if banksLoading}
							<span class="text-sm text-gray-400">Chargement…</span>
						{:else}
							<span class="text-sm text-gray-400"
								>{banks.length} compte{banks.length > 1 ? 's' : ''}</span
							>
						{/if}
						<svg
							class="h-5 w-5 transform text-gray-400 transition-transform duration-200"
							viewBox="0 0 20 20"
							fill="currentColor"
							style={`transform: rotate(${banksOpen ? 180 : 0}deg)`}
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M5.23 7.21a.75.75 0 011.06.02L10 11.146l3.71-3.915a.75.75 0 111.08 1.04l-4.24 4.47a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</button>

				{#if banksOpen}
					<div class="px-4 pb-4 sm:px-6">
						{#if banksLoading}
							<div class="py-2 text-sm text-gray-400">Chargement des comptes…</div>
						{:else if banksError}
							<div class="py-2 text-sm text-red-400">{banksError}</div>
						{:else if banks.length === 0}
							<div class="py-2 text-sm text-gray-400">Aucun compte enregistré.</div>
						{:else}
							<ul class="divide-y divide-gray-700">
								{#each banks as bank}
									<li class="flex items-start justify-between py-3">
										<div>
											<div class="flex items-center gap-2">
												<span class="font-medium text-white">{bank.name ?? 'Compte sans nom'}</span>
												{#if bank.category}
													<span
														class="rounded-full border border-gray-600 bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
														>{bank.category}</span
													>
												{/if}
											</div>
											{#if bank.description}
												<div class="mt-1 text-xs text-gray-400">{bank.description}</div>
											{/if}
										</div>
										<div
											class="text-right font-semibold {parseFloat(bank.current_amount ?? 0) < 0
												? 'text-red-300'
												: 'text-green-300'}"
										>
											{formatEUR(bank.current_amount ?? 0)}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</div>

			<div class="mt-4 w-full">
				<div class="rounded-lg bg-gray-800">
					<Table
						{addNew}
						{parseItems}
						{dbInfo}
						{headers}
						{actions}
						refreshTopic="spending"
						type="ligne"
						type_accord="une"
						searchable="description"
					/>
				</div>
			</div>
		</div>
	{/if}
</div>
