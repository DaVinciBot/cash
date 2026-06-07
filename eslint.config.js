import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: ['build/', '.svelte-kit/', 'dist/', 'coverage/', 'playwright-report/', 'test-results/']
	},
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir
			},
			globals: {
				...globals.browser,
				...globals.node
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',

			eqeqeq: ['error', 'always'],
			curly: ['error', 'all'],
			'no-console': 'warn',
			'no-debugger': 'error',
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'warn',
			'no-else-return': 'warn',

			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-empty-object-type': 'error',
			'@typescript-eslint/no-inferrable-types': 'warn',

			'svelte/no-at-html-tags': 'error',
			'svelte/no-target-blank': 'error',
			'svelte/no-useless-mustaches': 'warn',

			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir,
				parser: tseslint.parser,
				extraFileExtensions: ['.svelte'],
				svelteConfig
			}
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			],
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'warn'
		}
	}
];
