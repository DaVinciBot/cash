// @ts-nocheck
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient.js';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { parseMarkdownToAst } from '$lib/markdown/parse.js';


// Render markdown to safe HTML on the server
function renderMarkdown(md) {
    const rawHtml = marked.parse(md ?? '');
    return sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            'img',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'pre',
            'code',
            'table',
            'thead',
            'tbody',
            'tr',
            'th',
            'td'
        ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            a: ['href', 'name', 'target', 'rel'],
            img: ['src', 'alt', 'title'],
            code: ['class']
        },
        // basic link target/rel
        transformTags: {
            a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
        }
    });
}

export async function load({ params, setHeaders }) {
    const { slug } = params;

    const { data, error: dbError } = await supabase
        .from('blog')
        .select('*')
        .eq('slug', slug)
        .single();

    if (dbError && dbError.code !== 'PGRST116') {
        throw error(500, dbError.message);
    }

    if (!data) {
        console.error('Article introuvable');
        console.error(data);
        throw error(404, 'Article introuvable');
    }

    const markdown = data.body || (data.data && (data.data.content || data.data.body)) || '';
    const html = renderMarkdown(markdown);
    const ast = await parseMarkdownToAst(markdown);

    // Cache for a short period (adjust as needed)
    setHeaders({ 'cache-control': 'public, max-age=60' });

    return {
        post: {
            title: data.title,
            slug: data.slug,
            meta: data.data || {},
            body: data.body || '',
            html,
            ast,
            updatedAt: data.last_update,
            publishedAt: data.publish_date
        }
    };
}
