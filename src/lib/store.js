import { writable } from 'svelte/store';

/** @typedef {{ permissions?: string[] } & Record<string, unknown>} UserData */

/** @type {import('svelte/store').Writable<UserData | null>} */
export const userdata = writable(null);

// Lightweight cross-page event bus for UI refreshes
// Usage:
//  - triggerTableRefresh('spending') from anywhere
//  - components can subscribe or use Table.svelte's refreshTopic prop
export const tableRefresh = writable({ topic: null, at: 0, payload: null });
export function triggerTableRefresh(topic, payload = null) {
	tableRefresh.set({ topic, at: Date.now(), payload });
}
