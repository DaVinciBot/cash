// @ts-nocheck
import { BLOG_PAGE_SIZE, fetchBlogPosts } from '$lib/server/blogPosts.js';

export async function load({ setHeaders }) {
    try {
        const { posts, count } = await fetchBlogPosts({ offset: 0, limit: BLOG_PAGE_SIZE });
        const tags = Array.from(new Set(posts.flatMap((post) => post.tags || [])));

        setHeaders({ 'cache-control': 'public, max-age=60' });

        return {
            posts,
            tags,
            totalCount: count,
            pageSize: BLOG_PAGE_SIZE
        };
    } catch (error) {
        console.error('Error loading blog posts:', error);
        setHeaders({ 'cache-control': 'public, max-age=60' });
        return {
            posts: [],
            tags: [],
            totalCount: 0,
            pageSize: BLOG_PAGE_SIZE
        };
    }
}
