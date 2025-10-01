// @ts-nocheck
import { supabase } from '$lib/supabaseClient.js';


function stripMarkdown(md = '') {
    return (
        md
            // remove code fences/blocks
            .replace(/```[\s\S]*?```/g, '')
            // remove inline code
            .replace(/`([^`]+)`/g, '$1')
            // remove images ![alt](url)
            .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
            // links [text](url) -> text
            .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
            // headings, blockquotes, lists markers
            .replace(/^\s{0,3}(#+|>|[-*+] )\s?/gm, '')
            // emphasis
            .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
            .replace(/\*([^*]+)\*|_([^_]+)_/g, '$1$2')
            // extra whitespace
            .replace(/\s+/g, ' ') // collapse spaces
            .trim()
    );
}

function toExcerpt(text = '', len = 180) {
    if (!text) return '';
    const clean = stripMarkdown(text);
    return clean.length > len ? clean.slice(0, len).trimEnd() + '…' : clean;
}

export async function load({ setHeaders }) {
    const { data, error } = await supabase
        .from('blog')
        .select('*')
        .order('publish_date', { ascending: false, nullsFirst: false });

    if (error) {
        console.error('Error loading blog posts:', error);
        return { posts: [] };
    }

    const posts = (data || []).map((row) => {
        const meta = row.data || {};
        const cover = meta?.heroImage || '/assets/article/precoupe.jpg';
        const description = meta.excerpt || toExcerpt(row.body || '');
        const date = row.publish_date || row.last_update || null;
        // normalize tags from multiple potential sources
        let tags = [];
        const rawTags = meta.tag;
        if (typeof rawTags === 'string') {
            tags = rawTags
                .split(/[#;,|\n\t ]+/)
                .map((t) => t.trim())
                .filter((t) => !!t);
        }
        // dedupe, keep order
        const seen = new Set();
        tags = tags.filter((t) => {
            const k = t.toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
        return {
            title: row.title,
            slug: row.slug,
            cover,
            description,
            date,
            tags
        };
    });

    // Short cache
    setHeaders({ 'cache-control': 'public, max-age=60' });

    return { posts };
}
