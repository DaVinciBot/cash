import { createConfig } from '@davincibot/config/eslint';
import { fileURLToPath } from 'node:url';
import svelteConfig from './svelte.config.js';

export default createConfig({
	tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
	svelteConfig
});
