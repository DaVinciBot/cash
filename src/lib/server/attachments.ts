// Pièces jointes des items (#63) : BOM Mouser, projet KiCad d'un PCB, devis…
//
// Le fichier vit dans le bucket privé `item-attachments`, sous
// `items/<item_id>/<uuid>.<extension>`, et sa ligne dans `cash.item_attachments`.
// Les policies du bucket lisent l'item dans le chemin : le voit qui voit l'item
// (son auteur, le CDP qui statue, le trésorier), le dépose ou le retire son
// auteur ou qui constitue la commande. Le serveur ne redouble pas ces règles.

import type { Database } from '@davincibot/database-types';
import type { SupabaseClient } from '@supabase/supabase-js';

type Client = SupabaseClient<Database>;

export const ATTACHMENT_BUCKET = 'item-attachments';
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Types acceptés, alignés sur ceux du bucket. `application/octet-stream` est le
 * type que les navigateurs donnent aux fichiers KiCad, faute de mieux.
 */
export const ATTACHMENT_TYPES = [
	'application/pdf',
	'image/png',
	'image/jpeg',
	'image/webp',
	'text/plain',
	'text/csv',
	'application/vnd.ms-excel',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/zip',
	'application/x-zip-compressed',
	'application/octet-stream'
];

/** Champ `accept` des formulaires : extensions, plus parlantes que les types. */
export const ATTACHMENT_ACCEPT =
	'.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.xls,.xlsx,.zip,.kicad_pcb,.kicad_sch,.kicad_pro';

export interface Attachment {
	id: number;
	itemId: number;
	filename: string;
	mimeType: string;
	/** URL signée de dix minutes : le bucket reste privé. */
	url: string | null;
}

/** Un fichier réellement choisi : un champ laissé vide arrive en `File` de taille nulle. */
export function isChosenFile(value: FormDataEntryValue | null | undefined): value is File {
	return value instanceof File && value.size > 0;
}

/** Type retenu pour un fichier : celui du navigateur, ou octet-stream s'il n'en donne pas. */
export function attachmentType(file: File): string {
	return file.type || 'application/octet-stream';
}

/** Problème de forme d'un fichier, `null` s'il est acceptable. */
export function attachmentProblem(file: File): string | null {
	if (file.size > ATTACHMENT_MAX_BYTES) {
		return `« ${file.name} » dépasse 20 Mo.`;
	}
	if (!ATTACHMENT_TYPES.includes(attachmentType(file))) {
		return `« ${file.name} » n'est pas d'un format accepté (PDF, image, tableur, archive, KiCad).`;
	}
	return null;
}

/** Nom de fichier lisible et sûr pour l'affichage : sans chemin, borné en longueur. */
export function displayName(file: File): string {
	const base = file.name.split(/[\\/]/).at(-1) ?? 'fichier';
	return base.trim().slice(0, 200) || 'fichier';
}

/**
 * Dépose un fichier et le rattache à son item. Le nom stocké est aléatoire : un
 * nom saisi par un tiers n'a rien à faire dans un chemin. Si la ligne ne peut
 * pas être écrite, le fichier est retiré pour ne pas rester orphelin.
 */
export async function attachFile(
	supabase: Client,
	itemId: number,
	file: File
): Promise<string | null> {
	const problem = attachmentProblem(file);
	if (problem) {
		return problem;
	}
	const name = displayName(file);
	const extension = /\.([a-z0-9_]{1,12})$/i.exec(name)?.[1]?.toLowerCase() ?? 'bin';
	const path = `items/${String(itemId)}/${crypto.randomUUID()}.${extension}`;
	const type = attachmentType(file);

	const { error: uploadError } = await supabase.storage
		.from(ATTACHMENT_BUCKET)
		.upload(path, file, { contentType: type });
	if (uploadError) {
		return `« ${name} » n'a pas pu être déposé.`;
	}

	const { error } = await supabase
		.schema('cash')
		.from('item_attachments')
		.insert({ item_id: itemId, storage_path: path, filename: name, mime_type: type });
	if (error) {
		await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
		return `« ${name} » n'a pas pu être rattaché à l'item.`;
	}
	return null;
}

/** Pièces jointes des items donnés, avec leur URL signée, indexées par item. */
export async function attachmentsOf(
	supabase: Client,
	itemIds: number[]
): Promise<Map<number, Attachment[]>> {
	const byItem = new Map<number, Attachment[]>();
	if (itemIds.length === 0) {
		return byItem;
	}
	const { data: rows } = await supabase
		.schema('cash')
		.from('item_attachments')
		.select('id, item_id, storage_path, filename, mime_type')
		.in('item_id', itemIds)
		.order('id');
	if (!rows || rows.length === 0) {
		return byItem;
	}

	const { data: urls } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrls(
		rows.map((row) => row.storage_path),
		600
	);
	const signed = new Map<string, string>();
	for (const u of urls ?? []) {
		if (u.path && u.signedUrl) {
			signed.set(u.path, u.signedUrl);
		}
	}

	for (const row of rows) {
		byItem.set(row.item_id, [
			...(byItem.get(row.item_id) ?? []),
			{
				id: row.id,
				itemId: row.item_id,
				filename: row.filename,
				mimeType: row.mime_type,
				url: signed.get(row.storage_path) ?? null
			}
		]);
	}
	return byItem;
}

/** Retire une pièce jointe : la ligne d'abord, le fichier ensuite. */
export async function detachFile(supabase: Client, attachmentId: number): Promise<boolean> {
	const { data: row } = await supabase
		.schema('cash')
		.from('item_attachments')
		.select('storage_path')
		.eq('id', attachmentId)
		.maybeSingle();
	if (!row) {
		return false;
	}
	const { error } = await supabase
		.schema('cash')
		.from('item_attachments')
		.delete()
		.eq('id', attachmentId);
	if (error) {
		return false;
	}
	await supabase.storage.from(ATTACHMENT_BUCKET).remove([row.storage_path]);
	return true;
}
