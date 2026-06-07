import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
		exclude: ['tests/e2e/**'],
		coverage: {
			provider: 'v8',
			include: [
				'src/lib/permissions.ts',
				'src/lib/helpers/parisTime.ts',
				'src/lib/helpers/trainingForms.ts',
				'src/lib/utils.ts',
				'src/lib/config/site.ts'
			],
			reporter: ['text', 'html', 'lcov'],
			thresholds: {
				lines: 50,
				functions: 50,
				branches: 50,
				statements: 50
			}
		}
	}
});
