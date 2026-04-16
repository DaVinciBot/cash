import { expect, test } from '@playwright/test';

test('application responds on admin base path', async ({ request }) => {
	const response = await request.get('/admin');
	expect(response.status()).toBeLessThan(500);
});
