import { SITE } from '$lib/config/site.js';

export const prerender = true;

export async function GET() {
    const body = [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        // 'Disallow: /auth/', // disabled to allow noindexing of auth-related pages
        'Disallow: /caroussel/',
        `Sitemap: ${SITE.origin}/sitemap.xml`
    ].join('\n');

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
        }
    });
}
