import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const authTarget = env.AUTH_PROXY_TARGET || 'http://localhost:5174';

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: {
			port: 5175,
			origin: authTarget,
			proxy: {
				'/auth': {
					target: authTarget,
					changeOrigin: true
				}
			}
		}
	};
});
