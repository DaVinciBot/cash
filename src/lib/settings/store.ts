import type { SettingsCategory } from '$lib/settings/categories';
import { writable, type Writable } from 'svelte/store';

export interface SettingsModalState {
	// null = ouvert sans catégorie ciblée (mobile → liste, desktop → défaut)
	category: SettingsCategory | null;
}

export const settingsModal: Writable<SettingsModalState | null> = writable(null);

export function openSettings(category: SettingsCategory | null = null): void {
	settingsModal.set({ category });
}

export function closeSettings(): void {
	settingsModal.set(null);
}
