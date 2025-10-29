// @ts-nocheck
import { supabase } from '$lib/supabaseClient.js';

export const csr = true;
export const ssr = false;
export const prerender = false;

function stripMarkdown(md = '') {
    return (
        md
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/!\[[^\]]*\]\([^\)]*\)/g, '')
            .replace(/\[([^\]]*)\]\([^\)]*\)/g, '$1')
            .replace(/^\s{0,3}(#+|>|[-*+] )\s?/gm, '')
            .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
            .replace(/\*([^*]+)\*|_([^_]+)_/g, '$1$2')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function toExcerpt(text = '', len = 160) {
    if (!text) return '';
    const clean = stripMarkdown(text);
    return clean.length > len ? clean.slice(0, len).trimEnd() + '…' : clean;
}

export async function load({ setHeaders }) {
    const { data, error } = await supabase
        .from('blog')
        .select('*')
        .order('publish_date', { ascending: false, nullsFirst: false })
        .limit(10);

    if (error) {
        console.error('Error loading home posts:', error);
        return { posts: [] };
    }

    const posts = (data || []).map((row) => {
        const meta = row.data || {};
        const cover = meta?.heroImage || '/assets/article/precoupe.jpg';
        const description = toExcerpt(row.body || '');
        const date = row.publish_date || row.last_update || null;
        // normalize tags if present
        let tags = [];
        const rawTags = meta.tag;
        if (typeof rawTags === 'string') {
            tags = rawTags
                .split(/[#;,|\n\t ]+/)
                .map((t) => t.trim())
                .filter(Boolean);
            const seen = new Set();
            tags = tags.filter((t) => {
                const k = t.toLowerCase();
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
            });
        }
        return {
            title: row.title,
            slug: row.slug,
            cover,
            description,
            date,
            tags
        };
    });

    // short cache to avoid hammering DB
    setHeaders({ 'cache-control': 'public, max-age=60' });

    return { posts };
}
