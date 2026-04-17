declare module '@supabase/phoenix/priv/static/types/timer' {
	export default class Timer {}
}

declare module '@supabase/phoenix/priv/static/types/types' {
	export type Vsn = string;
}

declare module '@speed-highlight/core/index' {
	export type ShjLanguageDefinition = Record<string, unknown>;
}

declare module 'svelte/internal' {
	import type { SvelteComponent } from 'svelte';
	export { SvelteComponent };
}

declare module 'svelte' {
	export type Snippet<Args extends unknown[] = []> = (...args: Args) => unknown;
}
