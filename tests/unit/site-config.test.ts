import { describe, expect, it } from 'vitest';

import { SITE, canonicalFor } from '../../src/lib/config/site';

describe('site config helpers', () => {
	it('exposes expected site origin', () => {
		expect(SITE.origin).toBe('https://davincibot.fr');
	});

	it('canonicalFor normalizes leading and trailing slashes', () => {
		expect(canonicalFor('/blog')).toBe('https://davincibot.fr/blog/');
		expect(canonicalFor('contact')).toBe('https://davincibot.fr/contact/');
	});

	it('canonicalFor falls back to origin when pathname is invalid', () => {
		expect(canonicalFor(null)).toBe('https://davincibot.fr/');
	});
});
