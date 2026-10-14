import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			alias: { $lib: 'src/lib' },
			preprocess: vitePreprocess(),
			adapter: adapter(),
			prerender: {
				entries: ['/admin/users/', '/admin/wip']
			},
			paths: {
				base: '/admin',
				relative: false
			}
		})
	],
	server: {
		host: true,
		port: 5175,
		origin: 'http://localhost:5174'
	}
});
