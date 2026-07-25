import { getSupabaseBrowserClient } from '@davincibot/lib/supabase';

export type ReportType = 'bug' | 'data' | 'access' | 'idea' | 'other';

export const REPORT_TYPES: readonly { value: ReportType; label: string }[] = [
	{ value: 'bug', label: 'Bug' },
	{ value: 'data', label: 'Erreur de données' },
	{ value: 'access', label: "Problème d'accès" },
	{ value: 'idea', label: "Suggestion d'amélioration" },
	{ value: 'other', label: 'Autre' }
];

export const MAX_REPORT_IMAGES = 4;
export const MAX_REPORT_IMAGE_BYTES = 5 * 1024 * 1024;
// les images partent en pièces jointes du message Discord : 8 Mo max par webhook
export const MAX_REPORT_TOTAL_BYTES = 8 * 1024 * 1024;

const IMAGE_EXTENSIONS: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp'
};
const INVALID_TYPE_MESSAGE = 'Formats acceptés : PNG, JPEG ou WebP';
const INVALID_SIZE_MESSAGE = 'Chaque image doit faire moins de 5 Mo';
export const TOTAL_SIZE_MESSAGE = 'Les images ne doivent pas dépasser 8 Mo au total';

export interface ReportInput {
	type: ReportType;
	title: string;
	description: string;
	images: File[];
	anonymous?: boolean;
}

export function validateReportImage(file: File): string | null {
	if (!(file.type in IMAGE_EXTENSIONS)) {
		return INVALID_TYPE_MESSAGE;
	}
	if (file.size > MAX_REPORT_IMAGE_BYTES) {
		return INVALID_SIZE_MESSAGE;
	}
	return null;
}

export async function submitReport(userId: string, input: ReportInput): Promise<void> {
	const supabase = getSupabaseBrowserClient();
	if (input.images.length > MAX_REPORT_IMAGES) {
		throw new Error(`${String(MAX_REPORT_IMAGES)} images maximum`);
	}
	if (input.images.reduce((sum, file) => sum + file.size, 0) > MAX_REPORT_TOTAL_BYTES) {
		throw new Error(TOTAL_SIZE_MESSAGE);
	}

	const uploadedPaths: string[] = [];
	const imageUrls: string[] = [];
	try {
		for (const file of input.images) {
			const ext = IMAGE_EXTENSIONS[file.type];
			if (!ext) {
				throw new Error(INVALID_TYPE_MESSAGE);
			}
			if (file.size > MAX_REPORT_IMAGE_BYTES) {
				throw new Error(INVALID_SIZE_MESSAGE);
			}
			const path = `${userId}/${crypto.randomUUID()}.${ext}`;
			const { error } = await supabase.storage.from('reports').upload(path, file, {
				cacheControl: '3600',
				upsert: false,
				contentType: file.type
			});
			if (error) {
				throw new Error("Une erreur est survenue lors de l'envoi des images");
			}
			uploadedPaths.push(path);
			imageUrls.push(supabase.storage.from('reports').getPublicUrl(path).data.publicUrl);
		}

		const { error } = await supabase.rpc('submit_report', {
			p_type: input.type,
			p_title: input.title,
			p_description: input.description,
			p_image_urls: imageUrls,
			p_anonymous: input.anonymous ?? false
		});
		if (error) {
			throw new Error("Une erreur est survenue lors de l'envoi du signalement");
		}
	} catch (error) {
		// nettoyage best-effort des images déjà envoyées ; son échec est ignoré
		if (uploadedPaths.length > 0) {
			void supabase.storage.from('reports').remove(uploadedPaths);
		}
		throw error;
	}
}
