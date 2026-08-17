// Rapports, statistiques et documents générés (jalon 7).
//
// Tout se lit sous `locals.supabase` : `documents_read` / `documents_write`
// (finance.read / finance.documents.generate) et `organization_read` /
// `organization_write` (finance.read / finance.write) tranchent.

import type { InvoiceOperationKind, OfficerGender } from '$lib/documents';
import type { Database } from '@davincibot/database-types';
import type { DocumentKind } from '@davincibot/lib';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

const num = (value: number | null): number => value ?? 0;
const round = (value: number): number => Math.round(value * 100) / 100;

// Alias de type et non `interface` : une interface n'a pas d'index signature
// implicite, et cet objet part tel quel dans une colonne `jsonb`. Le déclarer en
// interface le rendrait inassignable à `Json`, alors que sa forme convient.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- voir ci-dessus
export type Organization = {
	legalName: string | null;
	addressLine: string | null;
	postalCode: string | null;
	city: string | null;
	country: string;
	rna: string | null;
	siret: string | null;
	vatNumber: string | null;
	email: string | null;
	website: string | null;
	/**
	 * Les deux membres du bureau qui signent. Le titre n'est pas stocké : il se
	 * déduit du poste et du genre, et reste donc toujours accordé au nom.
	 */
	presidentName: string | null;
	presidentGender: OfficerGender;
	treasurerName: string | null;
	treasurerGender: OfficerGender;
	/** Le bureau atteste que l'association peut délivrer des reçus fiscaux. */
	taxReceiptsAllowed: boolean;
	taxCategory: string | null;
	taxArticles: string | null;
	/** Coordonnées de règlement, portées par la facture. */
	bankName: string | null;
	iban: string | null;
	bic: string | null;
};

/** L'émetteur des documents. Une seule ligne, créée vide par le semis. */
export async function organization(supabase: Client): Promise<Organization> {
	const { data } = await supabase
		.schema('cash')
		.from('organization')
		.select(
			'legal_name, address_line, postal_code, city, country, rna, siret, vat_number, email, website, president_name, president_gender, treasurer_name, treasurer_gender, tax_receipts_allowed, tax_category, tax_articles, bank_name, iban, bic'
		)
		.eq('id', 1)
		.maybeSingle();

	return {
		legalName: data?.legal_name ?? null,
		addressLine: data?.address_line ?? null,
		postalCode: data?.postal_code ?? null,
		city: data?.city ?? null,
		country: data?.country ?? 'France',
		rna: data?.rna ?? null,
		siret: data?.siret ?? null,
		vatNumber: data?.vat_number ?? null,
		email: data?.email ?? null,
		website: data?.website ?? null,
		presidentName: data?.president_name ?? null,
		// La colonne est NOT NULL en base ; le repli ne couvre que la ligne absente.
		presidentGender: data?.president_gender ?? 'epicene',
		treasurerName: data?.treasurer_name ?? null,
		treasurerGender: data?.treasurer_gender ?? 'epicene',
		taxReceiptsAllowed: data?.tax_receipts_allowed ?? false,
		taxCategory: data?.tax_category ?? null,
		taxArticles: data?.tax_articles ?? null,
		bankName: data?.bank_name ?? null,
		iban: data?.iban ?? null,
		bic: data?.bic ?? null
	};
}

/**
 * Ce qui manque à l'émetteur pour qu'un document de ce type tienne debout.
 *
 * Un document part chez un tiers : émettre avec un siège vide ou sans
 * signataire produit une pièce inutilisable, qu'il faudra réémettre — et une
 * série comptable ne se réécrit pas, elle s'annule. Mieux vaut refuser avant.
 *
 * Le reçu fiscal exige davantage : le Cerfa 11580 n'a de valeur que si
 * l'organisme relève bien du mécénat et le dit. Cette éligibilité ne se déduit
 * d'aucune donnée — elle se déclare, et elle engage l'association.
 */
export function missingIssuerFields(org: Organization, kind: DocumentKind): string[] {
	const missing: string[] = [];
	if (!org.legalName) {
		missing.push('le nom légal');
	}
	if (!org.addressLine || !org.postalCode || !org.city) {
		missing.push("l'adresse du siège");
	}
	if (!org.presidentName) {
		missing.push('le nom de la présidence');
	}
	if (kind === 'expense_report' && !org.treasurerName) {
		missing.push('le nom de la trésorerie');
	}
	if (kind === 'tax_receipt') {
		if (!org.taxReceiptsAllowed) {
			missing.push("l'autorisation de délivrer des reçus fiscaux");
		}
		if (!org.taxCategory) {
			missing.push("la catégorie d'organisme (Cerfa 11580)");
		}
		if (!org.taxArticles) {
			missing.push('les articles du CGI applicables');
		}
		if (!org.rna && !org.siret) {
			missing.push('le numéro RNA ou SIRET');
		}
	}
	return missing;
}

// Même raison que pour Organization : ces lignes sont sérialisées dans `payload`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- voir ci-dessus
export type DocumentLine = {
	label: string;
	quantity: number;
	unitPriceTtc: number;
};

// Même raison que pour DocumentLine : ces lignes partent dans `payload`, et une
// interface n'a pas l'index signature implicite qu'attend `Json`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- voir ci-dessus
export type ExpenseLine = {
	/** Date de la dépense, distincte de la date d'émission de la note. */
	occurredOn: string;
	label: string;
	amountHt: number;
	amountTtc: number;
};

export interface GeneratedDocument {
	id: number;
	kind: DocumentKind;
	number: string;
	issuedOn: string;
	recipientName: string;
	recipientAddress: string | null;
	amountTtc: number;
	subject: string | null;
	flowId: number | null;
	lines: DocumentLine[];
	/** Dépenses détaillées — propre à la note de frais. */
	expenseLines: ExpenseLine[];
	/** Identité de l'émetteur figée à l'émission — un document ne se réécrit pas. */
	issuer: Organization | null;
	/** Champs propres au reçu fiscal (nature et mode du don). */
	donation: { nature: string | null; method: string | null } | null;
	/** Compte à rembourser — propre à la note de frais. */
	beneficiaryIban: string | null;
	/** Date de réalisation de la prestation ou de livraison — propre à la facture. */
	serviceOn: string | null;
	/** Référence du bon de commande du client — propre à la facture. */
	purchaseOrder: string | null;
	/** SIREN du client facturé — propre à la facture. */
	recipientSiren: string | null;
	/** Nature de l'opération facturée — propre à la facture. */
	operationKind: InvoiceOperationKind | null;
}

interface Payload {
	lines?: DocumentLine[];
	expenseLines?: ExpenseLine[];
	issuer?: Organization;
	donation?: { nature: string | null; method: string | null };
	beneficiaryIban?: string | null;
	serviceOn?: string | null;
	purchaseOrder?: string | null;
	recipientSiren?: string | null;
	operationKind?: InvoiceOperationKind | null;
}

function toDocument(
	row: Database['cash']['Tables']['generated_documents']['Row']
): GeneratedDocument {
	const payload = (row.payload ?? {}) as Payload;
	return {
		id: row.id,
		kind: row.kind,
		number: row.number,
		issuedOn: row.issued_on,
		recipientName: row.recipient_name,
		recipientAddress: row.recipient_address,
		amountTtc: row.amount_ttc,
		subject: row.subject,
		flowId: row.flow_id,
		lines: payload.lines ?? [],
		expenseLines: payload.expenseLines ?? [],
		issuer: payload.issuer ?? null,
		beneficiaryIban: payload.beneficiaryIban ?? null,
		donation: payload.donation ?? null,
		serviceOn: payload.serviceOn ?? null,
		purchaseOrder: payload.purchaseOrder ?? null,
		recipientSiren: payload.recipientSiren ?? null,
		operationKind: payload.operationKind ?? null
	};
}

/** Documents émis, du plus récent au plus ancien. */
export async function documentList(supabase: Client): Promise<GeneratedDocument[]> {
	const { data } = await supabase
		.schema('cash')
		.from('generated_documents')
		.select('*')
		.order('issued_on', { ascending: false })
		.order('id', { ascending: false });

	return (data ?? []).map(toDocument);
}

export async function documentById(
	supabase: Client,
	id: number
): Promise<GeneratedDocument | null> {
	const { data } = await supabase
		.schema('cash')
		.from('generated_documents')
		.select('*')
		.eq('id', id)
		.maybeSingle();

	return data ? toDocument(data) : null;
}

export interface Quarter {
	label: string;
	from: string;
	to: string;
	credit: number;
	debit: number;
	balance: number;
	/** Cumul depuis le début de l'exercice — ce que le trésorier lit en fin de trimestre. */
	cumulative: number;
	count: number;
}

/**
 * Rapport trimestriel d'un exercice (TRESO-F-62).
 *
 * Les bornes viennent de l'exercice lui-même et non de l'année civile : les deux
 * coïncident aujourd'hui (§7.1bis), mais l'exercice est ce qui fait foi, et le
 * jour où il changera ce rapport suivra sans qu'on y touche.
 */
export async function quarterlyReport(
	supabase: Client,
	fiscalYearId: number
): Promise<{ label: string; quarters: Quarter[] } | null> {
	const { data: year } = await supabase
		.schema('cash')
		.from('fiscal_years')
		.select('label, starts_on, ends_on')
		.eq('id', fiscalYearId)
		.maybeSingle();

	if (!year) {
		return null;
	}

	const { data: flows } = await supabase
		.schema('cash')
		.from('flows')
		.select('direction, amount_ttc, occurred_on')
		.eq('fiscal_year_id', fiscalYearId);

	const start = new Date(year.starts_on);
	const quarters: Quarter[] = [];
	let cumulative = 0;

	for (let q = 0; q < 4; q += 1) {
		const from = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + q * 3, 1));
		const to = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (q + 1) * 3, 0));
		const fromIso = from.toISOString().slice(0, 10);
		const toIso = to.toISOString().slice(0, 10);

		let credit = 0;
		let debit = 0;
		let count = 0;
		for (const f of flows ?? []) {
			if (f.occurred_on < fromIso || f.occurred_on > toIso) {
				continue;
			}
			count += 1;
			if (f.direction === 'credit') {
				credit += f.amount_ttc;
			} else {
				debit += f.amount_ttc;
			}
		}
		const balance = round(credit - debit);
		cumulative = round(cumulative + balance);
		quarters.push({
			label: `T${String(q + 1)}`,
			from: fromIso,
			to: toIso,
			credit: round(credit),
			debit: round(debit),
			balance,
			cumulative,
			count
		});
	}

	return { label: year.label, quarters };
}

export interface ProjectReportRow {
	projectId: number;
	projectName: string;
	/** Demandé : tous les items non refusés, quel que soit leur avancement. */
	requestedTtc: number;
	/** Engagé : items imputés, donc passés par une commande. */
	committedTtc: number;
	receivedTtc: number;
	refusedTtc: number;
	itemCount: number;
}

/**
 * Rapport par projet d'une année scolaire (TRESO-F-62).
 *
 * Trois colonnes qui ne disent pas la même chose : ce qu'on a demandé, ce qui
 * est engagé auprès d'un fournisseur, ce qui est arrivé. Les confondre est
 * exactement ce qui rendait l'ancien suivi illisible.
 */
export async function projectReport(
	supabase: Client,
	schoolYearId: number
): Promise<ProjectReportRow[]> {
	const [{ data: items }, { data: projects }, { data: allocations }] = await Promise.all([
		supabase
			.schema('cash')
			.from('items')
			.select('id, project_id, total_ttc, state')
			.eq('school_year_id', schoolYearId),
		supabase.from('projects').select('id, name'),
		supabase.schema('cash').from('item_budget_allocations').select('item_id, amount_ttc')
	]);

	const names = new Map((projects ?? []).map((p) => [p.id, p.name ?? '']));
	const committedByItem = new Map<number, number>();
	for (const a of allocations ?? []) {
		committedByItem.set(a.item_id, (committedByItem.get(a.item_id) ?? 0) + a.amount_ttc);
	}

	const rows = new Map<number, ProjectReportRow>();
	for (const i of items ?? []) {
		const row = rows.get(i.project_id) ?? {
			projectId: i.project_id,
			projectName: names.get(i.project_id) ?? '—',
			requestedTtc: 0,
			committedTtc: 0,
			receivedTtc: 0,
			refusedTtc: 0,
			itemCount: 0
		};
		const total = num(i.total_ttc);
		const refused = i.state === 'refused_cdp' || i.state === 'refused_treso';

		row.itemCount += 1;
		if (refused) {
			row.refusedTtc += total;
		} else {
			row.requestedTtc += total;
			row.committedTtc += committedByItem.get(i.id) ?? 0;
			if (i.state === 'received') {
				row.receivedTtc += total;
			}
		}
		rows.set(i.project_id, row);
	}

	return [...rows.values()]
		.map((r) => ({
			...r,
			requestedTtc: round(r.requestedTtc),
			committedTtc: round(r.committedTtc),
			receivedTtc: round(r.receivedTtc),
			refusedTtc: round(r.refusedTtc)
		}))
		.sort((a, b) => b.requestedTtc - a.requestedTtc);
}

export interface Charts {
	/** Solde cumulé, mois par mois, sur l'exercice. */
	balanceByMonth: { label: string; value: number }[];
	monthly: { label: string; credit: number; debit: number }[];
	/** Racines de l'arbre budgétaire : alloué contre consommé. */
	budgetRoots: { label: string; allocated: number; consumed: number }[];
	byProject: { label: string; value: number }[];
	byMerchant: { label: string; value: number }[];
}

const MONTH_LABELS = [
	'jan',
	'fév',
	'mar',
	'avr',
	'mai',
	'juin',
	'juil',
	'août',
	'sep',
	'oct',
	'nov',
	'déc'
];

/**
 * Les cinq lectures que les données permettent (TRESO-F-50).
 *
 * Chacune répond à une question qu'on se pose vraiment : où en est le solde, à
 * quel rythme entre et sort l'argent, quelle branche du budget se consomme, quel
 * projet dépense, et chez qui l'on achète. Un graphique de plus qui n'aurait pas
 * sa question n'apprendrait rien.
 */
export async function charts(
	supabase: Client,
	fiscalYearId: number,
	schoolYearId: number
): Promise<Charts> {
	const [{ data: year }, { data: flows }, { data: budgets }, { data: consumption }] =
		await Promise.all([
			supabase
				.schema('cash')
				.from('fiscal_years')
				.select('starts_on')
				.eq('id', fiscalYearId)
				.maybeSingle(),
			supabase
				.schema('cash')
				.from('flows')
				.select('direction, amount_ttc, occurred_on')
				.eq('fiscal_year_id', fiscalYearId),
			supabase
				.schema('cash')
				.from('budgets')
				.select('id, name, parent_id')
				.eq('school_year_id', schoolYearId)
				.is('parent_id', null),
			supabase
				.schema('cash')
				.from('budget_consumption')
				.select('budget_id, allocated_ttc, consumed_ttc')
				.eq('school_year_id', schoolYearId)
		]);

	const firstMonth = year ? new Date(year.starts_on).getUTCMonth() : 0;

	const monthly = Array.from({ length: 12 }, (_, i) => ({
		label: MONTH_LABELS[(firstMonth + i) % 12] ?? '',
		credit: 0,
		debit: 0
	}));

	for (const f of flows ?? []) {
		const month = new Date(f.occurred_on).getUTCMonth();
		const slot = (month - firstMonth + 12) % 12;
		const entry = monthly[slot];
		if (!entry) {
			continue;
		}
		if (f.direction === 'credit') {
			entry.credit += f.amount_ttc;
		} else {
			entry.debit += f.amount_ttc;
		}
	}

	let running = 0;
	const balanceByMonth = monthly.map((m) => {
		running = round(running + m.credit - m.debit);
		return { label: m.label, value: running };
	});

	const usage = new Map((consumption ?? []).map((c) => [num(c.budget_id), c]));
	const budgetRoots = (budgets ?? []).map((b) => ({
		label: b.name,
		allocated: num(usage.get(b.id)?.allocated_ttc ?? 0),
		consumed: num(usage.get(b.id)?.consumed_ttc ?? 0)
	}));

	// Dépenses par projet et par marchand : lues sur les items imputés, seul
	// périmètre où « dépensé » a un sens — un item demandé n'a rien coûté.
	const [{ data: items }, { data: projects }, { data: allocations }] = await Promise.all([
		supabase
			.schema('cash')
			.from('items')
			.select('id, project_id, domain')
			.eq('school_year_id', schoolYearId),
		supabase.from('projects').select('id, name'),
		supabase.schema('cash').from('item_budget_allocations').select('item_id, amount_ttc')
	]);

	const spentByItem = new Map<number, number>();
	for (const a of allocations ?? []) {
		spentByItem.set(a.item_id, (spentByItem.get(a.item_id) ?? 0) + a.amount_ttc);
	}
	const names = new Map((projects ?? []).map((p) => [p.id, p.name ?? '']));

	const perProject = new Map<string, number>();
	const perMerchant = new Map<string, number>();
	for (const i of items ?? []) {
		const spent = spentByItem.get(i.id) ?? 0;
		if (spent === 0) {
			continue;
		}
		const project = names.get(i.project_id) ?? '—';
		perProject.set(project, (perProject.get(project) ?? 0) + spent);
		const merchant = i.domain ?? 'sans lien';
		perMerchant.set(merchant, (perMerchant.get(merchant) ?? 0) + spent);
	}

	const toSorted = (m: Map<string, number>) =>
		[...m.entries()]
			.map(([label, value]) => ({ label, value: round(value) }))
			.sort((a, b) => b.value - a.value);

	return {
		balanceByMonth,
		monthly: monthly.map((m) => ({
			label: m.label,
			credit: round(m.credit),
			debit: round(m.debit)
		})),
		budgetRoots,
		byProject: toSorted(perProject),
		byMerchant: toSorted(perMerchant)
	};
}
