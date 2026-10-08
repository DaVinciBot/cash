import { createConfig } from '@davincibot/config/eslint';
import { fileURLToPath } from 'node:url';

export default createConfig({
	tsconfigRootDir: fileURLToPath(new URL('.', import.meta.url)),
	svelteConfig: {}
});
