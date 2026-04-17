import { describe, expect, it } from 'vitest';

import { parseMarkdownToAst } from '../../src/lib/markdown/parse.js';

describe('markdown parser', () => {
	it('parses markdown into a root AST node', async () => {
		const tree = await parseMarkdownToAst('# Title\n\nParagraph');

		expect(tree.type).toBe('root');
		expect(tree.children.length).toBeGreaterThan(0);
		expect(tree.children[0].type).toBe('heading');
	});

	it('parses empty input as an empty root', async () => {
		const tree = await parseMarkdownToAst('');

		expect(tree.type).toBe('root');
		expect(tree.children).toEqual([]);
	});
});
