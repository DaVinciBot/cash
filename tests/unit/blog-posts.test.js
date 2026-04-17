import { beforeEach, describe, expect, it, vi } from 'vitest';

let nextResponse;
let lastQuery;

function createQuery() {
	const query = {
		select: vi.fn(() => query),
		lte: vi.fn(() => query),
		order: vi.fn(() => query),
		range: vi.fn(() => query),
		ilike: vi.fn(() => query),
		or: vi.fn(() => query),
		then: (resolve, reject) => Promise.resolve(nextResponse).then(resolve, reject)
	};

	return query;
}

vi.mock('$lib/supabaseClient.js', () => ({
	supabase: {
		from: vi.fn()
	}
}));

import { supabase } from '$lib/supabaseClient.js';

import {
	fetchBlogPosts,
	mapRowToPost,
	normalizeTags,
	stripMarkdown,
	toExcerpt
} from '../../src/lib/server/blogPosts.js';

describe('blog posts helpers', () => {
	beforeEach(() => {
		nextResponse = { data: [], error: null, count: 0 };
		lastQuery = null;
		supabase.from.mockClear();
		supabase.from.mockImplementation(() => {
			lastQuery = createQuery();
			return lastQuery;
		});
	});

	it('stripMarkdown removes markdown syntax from content', () => {
		const plain = stripMarkdown('## Bonjour **le monde**\n\n[link](https://example.com) `code`');

		expect(plain).toBe('Bonjour le monde link code');
	});

	it('toExcerpt truncates long text and appends ellipsis', () => {
		expect(toExcerpt('abcdef', 4)).toBe('abcd…');
		expect(toExcerpt('', 4)).toBe('');
	});

	it('normalizeTags deduplicates tags case-insensitively', () => {
		expect(normalizeTags('Robotique,robotique #Code ; code')).toEqual(['Robotique', 'Code']);
		expect(normalizeTags(null)).toEqual([]);
	});

	it('mapRowToPost applies defaults and transformed fields', () => {
		const post = mapRowToPost({
			id: 12,
			title: 'Titre',
			slug: 'titre',
			body: '**Texte**',
			last_update: '2025-01-10T10:00:00.000Z',
			data: { tag: 'Alpha,beta,alpha' }
		});

		expect(post.cover).toBe('/assets/article/precoupe.jpg');
		expect(post.author).toBe('DaVinciBot');
		expect(post.plainBody).toBe('Texte');
		expect(post.tags).toEqual(['Alpha', 'beta']);
	});

	it('fetchBlogPosts builds filtered query and caps page size', async () => {
		nextResponse = {
			data: [
				{
					id: 1,
					title: 'A',
					slug: 'a',
					body: 'Hello',
					publish_date: '2025-01-01T00:00:00.000Z',
					data: {}
				}
			],
			error: null,
			count: 10
		};

		const result = await fetchBlogPosts({
			offset: 2,
			limit: 500,
			search: '%robot_',
			tag: '_code%'
		});

		expect(supabase.from).toHaveBeenCalledWith('blog');
		expect(lastQuery.range).toHaveBeenCalledWith(2, 51);
		expect(lastQuery.ilike).toHaveBeenCalledWith('data->>tag', '%code%');
		expect(lastQuery.or).toHaveBeenCalledWith(
			'title.ilike.%robot%,body.ilike.%robot%,data->>excerpt.ilike.%robot%'
		);

		const [, nowIso] = lastQuery.lte.mock.calls[0];
		expect(Number.isNaN(Date.parse(nowIso))).toBe(false);
		expect(result.count).toBe(10);
		expect(result.posts).toHaveLength(1);
	});

	it('fetchBlogPosts falls back to posts length when count is null', async () => {
		nextResponse = {
			data: [{ id: 1, title: 'A', slug: 'a', body: '', data: {} }],
			error: null,
			count: null
		};

		const result = await fetchBlogPosts();
		expect(result.count).toBe(1);
	});

	it('fetchBlogPosts throws query errors', async () => {
		nextResponse = {
			data: null,
			error: new Error('boom'),
			count: null
		};

		await expect(fetchBlogPosts()).rejects.toThrow('boom');
	});
});
