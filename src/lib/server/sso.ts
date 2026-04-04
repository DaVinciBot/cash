import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';

const assertEnv = () => {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}
};

export const createAnonClient = () => {
	assertEnv();
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const createUserClient = (accessToken: string) => {
	assertEnv();
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		global: {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		},
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const decodeJwt = (token: string) => {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;
		const decoded = Buffer.from(payload, 'base64').toString('utf8');
		return JSON.parse(decoded);
	} catch {
		return null;
	}
};
