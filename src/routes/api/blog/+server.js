import { json } from '@sveltejs/kit';
import { BLOG_PAGE_SIZE, fetchBlogPosts } from '$lib/server/blogPosts.js';

export async function GET({ url }) {
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? BLOG_PAGE_SIZE);
    const search = url.searchParams.get('search') ?? '';
    const tag = url.searchParams.get('tag') ?? '';

    try {
        const { posts, count } = await fetchBlogPosts({
            offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0,
            limit: Number.isFinite(limit) ? limit : BLOG_PAGE_SIZE,
            search,
            tag
        });

        return json({ posts, count });
    } catch (error) {
        console.error('Error fetching paginated blog posts:', error);
        return json({ posts: [], count: 0, error: 'Unable to load more posts' }, { status: 500 });
    }
}
