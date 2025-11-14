import { supabase } from '$lib/supabaseClient.js';

export const BLOG_PAGE_SIZE = 20;

export function stripMarkdown(md = '') {
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

export function toExcerpt(text = '', len = 180) {
    if (!text) return '';
    const clean = stripMarkdown(text);
    return clean.length > len ? clean.slice(0, len).trimEnd() + '…' : clean;
}

export function normalizeTags(raw) {
    if (typeof raw !== 'string') return [];
    const seen = new Set();
    return raw
        .split(/[#;,|\n\t ]+/)
        .map((t) => t.trim())
        .filter((t) => {
            if (!t) return false;
            const key = t.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

export function mapRowToPost(row) {
    const meta = row?.data || {};
    const cover = meta?.heroImage || '/assets/article/precoupe.jpg';
    const excerpt = meta?.excerpt || toExcerpt(row?.body || '');
    const date = row?.publish_date || row?.last_update || null;
    const tags = normalizeTags(meta?.tag);

    return {
        id: row?.id,
        title: row?.title,
        slug: row?.slug,
        cover,
        date,
        author: meta?.author || 'DaVinciBot',
        excerpt,
        body: row?.body || '',
        plainBody: stripMarkdown(row?.body || ''),
        tags
    };
}

function sanitiseLikeValue(value = '') {
    return value.replace(/%/g, '').replace(/_/g, '').trim();
}

export async function fetchBlogPosts({ offset = 0, limit = BLOG_PAGE_SIZE, search = '', tag = '' } = {}) {
    const nowIso = new Date().toISOString();
    const cappedLimit = Math.min(Math.max(limit, 1), 50);
    let query = supabase
        .from('blog')
        .select('*', { count: 'exact' })
        .lte('publish_date', nowIso)
        .order('publish_date', { ascending: false })
        .range(offset, offset + cappedLimit - 1);

    const safeTag = sanitiseLikeValue(tag);
    if (safeTag) {
        query = query.ilike('data->>tag', `%${safeTag}%`);
    }

    const safeSearch = sanitiseLikeValue(search);
    if (safeSearch) {
        const term = `%${safeSearch}%`;
        query = query.or(`title.ilike.${term},body.ilike.${term},data->>excerpt.ilike.${term}`);
    }

    const { data, error, count } = await query;

    if (error) {
        throw error;
    }

    const posts = (data || []).map(mapRowToPost);

    return {
        posts,
        count: count ?? posts.length
    };
}
