<script lang="ts">
	import { Table } from '@davincibot/components';
	import { CrudForm } from '@davincibot/components';
	import { InfoModal as SucessModal } from '@davincibot/components';
	import { ReadModal } from '@davincibot/components';

	import { triggerTableRefresh } from '@davincibot/lib';
	import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';
	import { mountClosable } from '@davincibot/lib';
	import { onMount, unmount } from 'svelte';
	import { SvelteDate, SvelteMap } from 'svelte/reactivity';
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

	interface BankRow {
		id: number;
		name: string | null;
		description: string | null;
		current_amount: number | null;
		category: string | null;
	}

	interface SpendingRow {
		id: number;
		amount: number | null;
		is_positive: boolean;
		date: string;
	}

	interface WeekBucket {
		label: string;
		date: SvelteDate;
		in: number;
		out: number;
	}

	interface SpendingDetail {
		id: number;
		description: string | null;
		author:
			| { username: string | null; id: string }
			| { username: string | null; id: string }[]
			| null;
		amount: number | null;
		is_positive: boolean;
		date: string;
		order_id: OrderRef | OrderRef[] | null;
		bank_id: { name: string | null } | { name: string | null }[] | null;
	}

	interface OrderRef {
		id: number;
		comment: string | null;
		requestedBy: { username: string | null } | { username: string | null }[] | null;
		projectId: { name: string | null } | { name: string | null }[] | null;
		status: string;
		tags: string[] | null;
	}

	interface FileItem {
		id: string;
		name: string;
	}

	interface ParsedSpendingItem {
		id: number;
		is_positive: boolean;
		amount: number | null;
		date: string;
		description: string | null;
		author:
			| { username: string | null; id: string; avatar_url: string | null }
			| { username: string | null; id: string; avatar_url: string | null }[]
			| null;
		order_id: OrderRef | OrderRef[] | null;
	}

	// Bank accounts overview state
	let banks = $state<BankRow[]>([]);
	let banksLoading = $state(true);
	let banksError = $state('');
	let banksOpen = $state<boolean>(false);

	// Tabs
	let selectedTab = $state('detail'); // 'detail' | 'cashflow'

	// Cashflow state
	let isLoadingCashflow = $state(false);
	let startDate = $state('');
	let endDate = $state('');
	let cashflowChartData = $state({
		labels: [] as string[],
		datasets: [
			{ label: 'Recettes', data: [] as number[], backgroundColor: '#36A2EB' },
			{ label: 'Dépenses', data: [] as number[], backgroundColor: '#FF6384' }
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
		const fmt = (d: Date) => {
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			return `${String(d.getFullYear())}-${mm}-${dd}`;
		};
		return { start: fmt(start), end: fmt(end) };
	}

	function weekStart(dateStr: string): { key: string; label: string; date: SvelteDate } {
		const d = new SvelteDate(dateStr);
		// Normalize to local midnight
		d.setHours(0, 0, 0, 0);
		const day = d.getDay(); // 0=Sun .. 6=Sat
		const diff = (day === 0 ? -6 : 1) - day; // move to Monday
		const monday = new SvelteDate(d);
		monday.setDate(d.getDate() + diff);
		const key = monday.toISOString().slice(0, 10);
		const label = `Semaine du ${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
		return { key, label, date: monday };
	}

	async function loadCashflow() {
		isLoadingCashflow = true;
		try {
			const supabase = getSupabaseBrowserClient();
			const { data, error } = (await supabase
				.from('spending')
				.select('id, amount, is_positive, date')
				.gte('date', startDate)
				.lte('date', endDate)) as { data: SpendingRow[] | null; error: unknown };
			if (error) {
				throw new Error('Failed to load cashflow');
			}

			// Group by week
			const buckets = new SvelteMap<string, WeekBucket>();
			for (const row of data ?? []) {
				if (!row.date) {
					continue;
				}
				const { key, label, date } = weekStart(row.date);
				if (!buckets.has(key)) {
					buckets.set(key, { label, date, in: 0, out: 0 });
				}
				const b = buckets.get(key);
				if (!b) {
					continue;
				}
				const amt = parseFloat(String(row.amount ?? 0)) || 0;
				if (row.is_positive) {
					b.in += amt;
				} else {
					b.out += amt;
				}
			}
			const sorted = Array.from(buckets.values()).sort(
				(a, b) => a.date.getTime() - b.date.getTime()
			);
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

	function formatEUR(value: number | string | null | undefined) {
		const num = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
		if (Number.isNaN(num)) {
			return '0,00 €';
		}
		return (
			num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
		);
	}

	const totalBanks = $derived(
		banks.reduce((acc, b) => acc + (parseFloat(String(b.current_amount ?? 0)) || 0), 0)
	);

	async function loadBanks() {
		// fetch all bank accounts with their current amounts
		const supabase = getSupabaseBrowserClient();
		const { data, error } = (await supabase
			.from('bank')
			.select('id, name, description, current_amount, category')
			.order('name', { ascending: true })) as { data: BankRow[] | null; error: unknown };
		if (error) {
			banksError = 'Impossible de charger les comptes bancaires';
		} else {
			banks = data ?? [];
		}
		banksLoading = false;
	}

	onMount(() => {
		// Set default period to current quarter then load banks and cashflow
		const q = getCurrentQuarterRange();
		startDate = q.start;
		endDate = q.end;
		void loadBanks();
		void loadCashflow();
	});

	async function addNew() {
		const supabase = getSupabaseBrowserClient();
		const { data: bankList, error: bankErr } = (await supabase
			.from('bank')
			.select('id, name')
			.order('name')) as { data: { id: number; name: string | null }[] | null; error: unknown };
		if (bankErr || !bankList) {
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
						options: bankList.map((b) => ({
							value: String(b.id),
							text: b.name ?? `Compte ${String(b.id)}`
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
				onSubmit: async (e: SubmitEvent) => {
					// get forms data
					e.preventDefault();
					const form_data = new FormData(
						(e.target as HTMLElement).closest('form') ?? new HTMLFormElement()
					);
					let justificatifFiles: File[] = [];
					let fdAmount: FormDataEntryValue | null = null;
					let fdDate: FormDataEntryValue | null = null;
					let fdIsPositive: FormDataEntryValue | null = null;
					let fdDescription: FormDataEntryValue | null = null;
					let fdBankId: FormDataEntryValue | null = null;
					for (const [key, value] of form_data.entries()) {
						if (key.startsWith('justificatif')) {
							const rawFiles = form_data.getAll('justificatif');
							const files: File[] = [];
							for (const v of rawFiles) {
								if (v instanceof File) {
									files.push(v);
								}
							}
							if (files[0]?.name === '') {
								files.pop();
							}
							justificatifFiles = files;
						} else if (key === 'amount') {
							fdAmount = value;
						} else if (key === 'date') {
							fdDate = value;
						} else if (key === 'is_positive') {
							fdIsPositive = value;
						} else if (key === 'description') {
							fdDescription = value;
						} else if (key === 'bank_id') {
							fdBankId = value;
						}
					}

					// create spending
					const supabase2 = getSupabaseBrowserClient();
					const { data: row, error: createError } = (await supabase2
						.from('spending')
						.insert([
							{
								amount: fdAmount,
								date: fdDate,
								is_positive: fdIsPositive,
								description: fdDescription,
								bank_id: fdBankId
							}
						])
						.select('id')
						.single()) as { data: { id: number } | null; error: unknown };

					if (createError || !row) {
						alert('	Une erreur est survenue lors de la création de la dépense');
						void unmount(crud);
						return;
					}

					// upload proof
					const logoFile = justificatifFiles;
					let message = `La dépense a bien été ajoutée`;

					if (logoFile.length > 0) {
						for (const proofFile of logoFile) {
							const supabase3 = getSupabaseBrowserClient();
							const { error: uploadErr } = await supabase3.storage
								.from('proof')
								.upload(`invoices/${String(row.id)}/${proofFile.name}`, proofFile, {
									cacheControl: '3600',
									upsert: true
								});
							if (uploadErr) {
								alert("	Une erreur est survenue lors de l'envoi des justificatifs");
								void unmount(crud);
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
								void loadBanks();
								// Close the creation form modal
								try {
									void unmount(crud);
								} catch {
									// ignore
								}
							}
						}
					});
				}
			}
		});
	}

	async function edit(e: Event) {
		e.preventDefault();
		const target = e.target as HTMLElement;
		const row = target.closest('tr');
		if (!row) {
			return;
		}
		const id = row.querySelector('th')?.dataset.utils;
		const thirdCellEl = row.querySelector('td:nth-child(3)');
		const thirdCell = thirdCellEl instanceof HTMLElement ? thirdCellEl : null;
		const [current_uid, current_avatar] = (thirdCell?.dataset.utils ?? '+').split('+');
		const current_name = thirdCell?.innerText ?? '';

		const supabase = getSupabaseBrowserClient();
		const { data, error } = (await supabase
			.from('spending')
			.select('*')
			.eq('id', id ?? '')
			.single()) as { data: SpendingDetail | null; error: unknown };
		if (error || !data) {
			return;
		}
		const descVal = data.description;
		const description = descVal === null || descVal === '' ? 'Aucune description' : descVal;

		// get files names
		const { data: file_data, error: fileErr } = (await supabase.storage
			.from('proof')
			.list(`invoices/${id ?? ''}`, {
				limit: 20,
				offset: 0,
				sortBy: { column: 'name', order: 'asc' }
			})) as { data: FileItem[] | null; error: unknown };
		if (fileErr) {
			// continue even if file listing fails
		}

		const spendingDate = (data as unknown as { date: string }).date;
		const spendingAmount: number | null = (data as unknown as { amount: number | null }).amount;
		const spendingIsPositive = (data as unknown as { is_positive: boolean }).is_positive;

		const crud = mountClosable(CrudForm, {
			target: document.body,
			props: {
				fields: [
					{
						name: 'Valeur',
						type: 'number',
						id: 'amount',
						required: true,
						placeholder: String(spendingAmount ?? '0.00'),
						value: spendingAmount,
						wide: true
					},
					{
						name: 'Justificatif',
						type: 'document',
						required: true,
						wide: true,
						multiple: true,
						value: file_data,
						onRemove: async (_e: Event, value: string) => {
							const supabase2 = getSupabaseBrowserClient();
							const { error: removeErr } = await supabase2.storage
								.from('proof')
								.remove([`invoices/${id ?? ''}/${value}`]);
							if (removeErr) {
								alert('	Une erreur est survenue lors de la suppression du justificatif');
							}
						}
					},
					{
						name: 'Date effective',
						type: 'date',
						id: 'date',
						required: true,
						value: spendingDate.split('T')[0],
						placeholder: spendingDate.split('T')[0]
					},
					{
						name: 'Type',
						type: 'select',
						id: 'is_positive',
						required: true,
						options: [
							{ value: 'true', text: 'Bénéfice', selected: spendingIsPositive },
							{ value: 'false', text: 'Perte', selected: !spendingIsPositive }
						]
					},
					{
						name: 'Description',
						type: 'textarea',
						id: 'description',
						required: true,
						wide: true,
						value: description
					},
					{
						name: 'Auteur',
						type: 'autocomplete',
						id: 'author',
						required: true,
						wide: true,
						value: current_name,
						data: current_uid,
						image: current_avatar,
						onChange: async (changeEv: Event) => {
							// search through users
							const input = changeEv.target as HTMLInputElement;
							const supabase2 = getSupabaseBrowserClient();
							const { data: profileData, error: profileErr } = (await supabase2
								.from('profiles')
								.select('id, username, avatar_url')
								.ilike('username', `${input.value}*`)
								.range(0, 4)) as {
								data: { id: string; username: string | null; avatar_url: string | null }[] | null;
								error: unknown;
							};
							if (profileErr || !profileData) {
								return;
							}
							// create options
							const options: { value: string; text: string | null; image: string | null }[] = [];
							for (const el of profileData) {
								options.push({ value: el.id, text: el.username, image: el.avatar_url });
							}
							return options;
						}
					}
				],
				type_accord: 'une',
				type: 'ligne',
				onSubmit: async (submitEv: SubmitEvent) => {
					// get forms data
					submitEv.preventDefault();
					const form_data = new FormData(
						(submitEv.target as HTMLElement).closest('form') ?? new HTMLFormElement()
					);
					let editAuthorUid = '';
					let editJustificatifFiles: File[] = [];
					let editAmount: FormDataEntryValue | null = null;
					let editDate: FormDataEntryValue | null = null;
					let editIsPositive: FormDataEntryValue | null = null;
					let editDescription: FormDataEntryValue | null = null;
					for (const [key, value] of form_data.entries()) {
						if (key.startsWith('author')) {
							const label = document.querySelector('label[for="author"]');
							editAuthorUid = label?.getAttribute('data-utils') ?? '';
						} else if (key.startsWith('justificatif')) {
							const rawFiles = form_data.getAll('justificatif');
							const files: File[] = [];
							for (const v of rawFiles) {
								if (v instanceof File) {
									files.push(v);
								}
							}
							if (files[0]?.name === '') {
								files.pop();
							}
							editJustificatifFiles = files;
						} else if (key === 'amount') {
							editAmount = value;
						} else if (key === 'date') {
							editDate = value;
						} else if (key === 'is_positive') {
							editIsPositive = value;
						} else if (key === 'description') {
							editDescription = value;
						}
					}

					// update spending
					const supabase2 = getSupabaseBrowserClient();
					const { data: updatedRow, error: updateError } = (await supabase2
						.from('spending')
						.update({
							amount: editAmount,
							date: editDate,
							is_positive: editIsPositive,
							description: editDescription,
							author: editAuthorUid
						})
						.eq('id', id ?? '')
						.select('id')
						.single()) as { data: { id: number } | null; error: unknown };
					if (updateError) {
						alert("	Une erreur est survenue lors de l'édition de la dépense");
					}

					// upload all files
					for (const proofFile of editJustificatifFiles) {
						// remove all special char and space
						const fileName = proofFile.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
						const supabase3 = getSupabaseBrowserClient();
						const { error: uploadErr } = await supabase3.storage
							.from('proof')
							.upload(`invoices/${String(updatedRow?.id ?? '')}/${fileName}`, proofFile, {
								cacheControl: '3600',
								upsert: true
							});
						if (uploadErr) {
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
								void loadBanks();
								// Close the edit form modal
								try {
									void unmount(crud);
								} catch {
									// ignore
								}
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

	async function parseItems(items: unknown[]) {
		const typedItems = items as ParsedSpendingItem[];
		// For each spending, check if at least one proof file exists; mark missing with warn flag
		const supabase = getSupabaseBrowserClient();
		const checks = await Promise.all(
			typedItems.map(async (it) => {
				try {
					const { data: files, error } = (await supabase.storage
						.from('proof')
						.list(`invoices/${String(it.id)}`, {
							limit: 1,
							offset: 0,
							sortBy: { column: 'name', order: 'asc' }
						})) as { data: FileItem[] | null; error: unknown };
					const hasProof = !error && Array.isArray(files) && files.length > 0;
					return { id: it.id, hasProof };
				} catch {
					return { id: it.id, hasProof: false };
				}
			})
		);
		const byId = new Map<number, boolean>(checks.map((c) => [c.id, c.hasProof]));

		const parsedItems: {
			value: string | number | boolean;
			style?: string;
			data?: string | number;
			warn?: boolean;
		}[][] = [];
		typedItems.forEach((item) => {
			const hasProof = byId.get(item.id) ?? false;
			// normalize order relation for tags
			const orderRef = Array.isArray(item.order_id) ? item.order_id[0] : item.order_id;
			const authorObj = Array.isArray(item.author) ? item.author[0] : item.author;
			parsedItems.push([
				{
					value: `${item.is_positive ? '+' : '-'} ${String(item.amount)} €`,
					style: item.is_positive ? 'text-green-300' : 'text-red-300',
					data: item.id,
					warn: !hasProof
				},
				{ value: item.date.substring(0, 10) },
				{
					value: authorObj?.username ?? 'Aucun',
					data: `${authorObj?.id ?? ''}+${authorObj?.avatar_url ?? ''}`
				},
				{ value: (item.description?.length ?? 0) > 0 ? (item.description ?? '-') : '-' },
				{
					value:
						Array.isArray(orderRef?.tags) && orderRef.tags.length > 0
							? orderRef.tags.join(', ')
							: '-'
				}
			]);
		});
		return parsedItems;
	}

	const actions = [
		{
			title: 'Voir',
			type: 'view',
			handler: async (e: Event) => {
				// get the info from the order
				const target = e.target as HTMLElement;
				const id = target.closest('tr')?.querySelector('th')?.dataset.utils;

				const supabase = getSupabaseBrowserClient();
				const { data, error } = (await supabase
					.from('spending')
					.select(
						'id, description, author(username, id), amount, is_positive, date, order_id(id, comment, requestedBy(username), projectId(name), status, tags), bank_id(name)'
					)
					.eq('id', id ?? '')
					.single()) as { data: SpendingDetail | null; error: unknown };

				if (error || !data) {
					return;
				}

				// normalize nested relations (array or object)
				const orderRef = Array.isArray(data.order_id) ? data.order_id[0] : data.order_id;
				const projRef = orderRef
					? Array.isArray(orderRef.projectId)
						? orderRef.projectId[0]
						: orderRef.projectId
					: null;
				let description = data.description;
				if (projRef?.name) {
					if (description !== null && description !== '') {
						description = `${description} - Projet ${projRef.name}`;
					} else {
						description = `Projet ${projRef.name}`;
					}
				}
				if (description === null || description === '') {
					description = 'Aucune description';
				}
				let titleName = !data.is_positive ? 'Dépense' : 'Recette';

				// get the proof
				const { data: dat, error: proofErr } = (await supabase.storage
					.from('proof')
					.list(`invoices/${id ?? ''}`, {
						limit: 20,
						offset: 0,
						sortBy: { column: 'name', order: 'asc' }
					})) as { data: FileItem[] | null; error: unknown };

				if (proofErr) {
					// continue even if proof listing fails
				}

				const fileList = Array.isArray(dat) ? dat : [];
				const files = [...fileList.map((file) => `invoices/${id ?? ''}/${file.name}`)];

				// compute author safely (can be array or object)
				let authorName = 'Aucun';
				const authorObj = Array.isArray(data.author) ? data.author[0] : data.author;
				if (authorObj) {
					authorName = authorObj.username ?? 'Aucun';
				}
				if (orderRef) {
					titleName = `Dépense pour la commande #${String(orderRef.id)} (${orderRef.status})`;
					const reqRef = Array.isArray(orderRef.requestedBy)
						? orderRef.requestedBy[0]
						: orderRef.requestedBy;
					if (reqRef?.username && authorName === 'Aucun') {
						authorName = reqRef.username;
					}
				}

				const hasProof = files.length > 0;

				// normalize bank relation (can be array or object or null)
				let bankName = 'Aucun';
				const bankObj = Array.isArray(data.bank_id) ? data.bank_id[0] : data.bank_id;
				if (bankObj) {
					bankName = bankObj.name ?? 'Aucun';
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
									value: `${String(data.amount)} €`
								},
								{ label: 'Auteur', value: authorName },
								{ label: 'Compte utilisé', value: bankName },
								{ label: 'Description', value: description },
								{
									label: 'Tags',
									value:
										Array.isArray(orderRef?.tags) && orderRef.tags.length > 0
											? orderRef.tags.join(' • ')
											: 'Aucun'
								},
								{
									label: 'Justification',
									value: hasProof ? `${String(files.length)} fichier(s)` : 'Aucun justificatif'
								}
							]
						},

						files,
						actions: [
							{
								title: 'Modifier',
								type: 'edit',
								handler: async () => {
									await edit(e);
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
							style={`transform: rotate(${banksOpen ? '180' : '0'}deg)`}
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
								{#each banks as bank (bank.id)}
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
											class="text-right font-semibold {parseFloat(
												String(bank.current_amount ?? 0)
											) < 0
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
