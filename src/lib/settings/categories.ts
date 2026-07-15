export type SettingsCategory = 'profil' | 'securite';

export interface SettingsCategoryEntry {
	id: SettingsCategory;
	label: string;
}

export const SETTINGS_CATEGORIES: readonly SettingsCategoryEntry[] = [
	{ id: 'profil', label: 'Profil' },
	{ id: 'securite', label: 'Sécurité' }
];

const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

export function parseSettingsCategory(raw: string): SettingsCategory | null {
	// tolère « Sécurité » en entrée, mais les slugs émis restent sans accent
	const normalized = raw.trim().toLowerCase().normalize('NFD').replace(COMBINING_DIACRITICS, '');
	return SETTINGS_CATEGORIES.some((category) => category.id === normalized)
		? (normalized as SettingsCategory)
		: null;
}
