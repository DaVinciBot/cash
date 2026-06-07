import { unified } from 'unified';
import remarkParse from 'remark-parse';

export async function parseMarkdownToAst(markdown) {
	const processor = unified().use(remarkParse);
	const tree = processor.parse(markdown || '');
	return tree;
}
