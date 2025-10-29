// @ts-nocheck
import { SITE, canonicalFor } from '$lib/config/site.js';
import { supabase } from '$lib/supabaseClient.js';

export const prerender = false; // depends on DB content

function xmlEscape(s = '') {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlTag(loc, lastmod, changefreq = 'weekly', priority = '0.7') {
    return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n${lastmod ? `    <lastmod>${xmlEscape(lastmod)}</lastmod>\n` : ''
        }    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export async function GET() {
    // Static routes to include
    const staticPaths = [
        '/',
        '/blog/',
        '/contact/',
        '/sponsors/',
        '/nos-ecoles/',
    ];

    const urls = [];

    // Add static routes
    for (const p of staticPaths) {
        urls.push(urlTag(canonicalFor(p), new Date().toISOString(), 'weekly', p === '/' ? '1.0' : '0.6'));
    }

    // Add dynamic blog posts
    try {
        const { data, error } = await supabase
            .from('blog')
            .select('slug,last_update,publish_date')
            .order('publish_date', { ascending: false, nullsFirst: false });
        if (!error && data) {
            for (const row of data) {
                const last = new Date(row.publish_date || row.last_update || null);
                urls.push(urlTag(canonicalFor(`/blog/${row.slug}/`), last.toISOString(), 'monthly', '0.8'));
            }
        }
    } catch (e) {
        // ignore sitemap blog failures
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
    )}\n</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
