import type { SettingsCategory } from '$lib/settings/categories';
import type { UserProfile } from '$lib/types/profile';
import { writable, type Writable } from 'svelte/store';

export interface TableRefreshEvent {
	topic: string | null;
	at: number;
	payload: unknown;
}

export type UserData = UserProfile | null;

export const userdata: Writable<UserData> = writable(null);

// Lightweight cross-page event bus for UI refreshes
// Usage:
//  - triggerTableRefresh('spending') from anywhere
//  - components can subscribe or use Table.svelte's refreshTopic prop
export const tableRefresh: Writable<TableRefreshEvent> = writable({
	topic: null,
	at: 0,
	payload: null
});

export function triggerTableRefresh(topic: string, payload: unknown = null): void {
	tableRefresh.set({ topic, at: Date.now(), payload });
}

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
