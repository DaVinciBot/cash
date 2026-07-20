import { describe, expect, it } from 'vitest';
import { isMobileUserAgent, parseDeviceLabel } from '@davincibot/lib/settings';

const UA = {
	chromeMac:
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
	firefoxWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
	edgeWindows:
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
	safariIphone:
		'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
	chromeAndroid:
		'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
	operaLinux:
		'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0'
};

describe('parseDeviceLabel', () => {
	it('identifie navigateur et système', () => {
		expect(parseDeviceLabel(UA.chromeMac)).toBe('Chrome · macOS');
		expect(parseDeviceLabel(UA.firefoxWindows)).toBe('Firefox · Windows');
		expect(parseDeviceLabel(UA.safariIphone)).toBe('Safari · iOS');
	});

	it('distingue les navigateurs à base Chromium (ordre des motifs)', () => {
		expect(parseDeviceLabel(UA.edgeWindows)).toBe('Edge · Windows');
		expect(parseDeviceLabel(UA.operaLinux)).toBe('Opera · Linux');
		expect(parseDeviceLabel(UA.chromeAndroid)).toBe('Chrome · Android');
	});

	it('retombe sur « Appareil inconnu » sans user-agent exploitable', () => {
		expect(parseDeviceLabel(null)).toBe('Appareil inconnu');
		expect(parseDeviceLabel('')).toBe('Appareil inconnu');
		expect(parseDeviceLabel('curl/8.6.0')).toBe('Appareil inconnu');
	});
});

describe('isMobileUserAgent', () => {
	it('détecte les appareils mobiles', () => {
		expect(isMobileUserAgent(UA.safariIphone)).toBe(true);
		expect(isMobileUserAgent(UA.chromeAndroid)).toBe(true);
	});

	it('considère desktop par défaut', () => {
		expect(isMobileUserAgent(UA.chromeMac)).toBe(false);
		expect(isMobileUserAgent(null)).toBe(false);
	});
});
