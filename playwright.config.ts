import { defineConfig } from '@playwright/test';

const PORT = 4173;
const HOST = `http://127.0.0.1:${String(PORT)}`;

export default defineConfig({
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: HOST,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${String(PORT)}`,
		port: PORT,
		reuseExistingServer: !process.env.CI,
		timeout: 120000
	}
});
