import { env } from '$env/dynamic/private';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = env.SUPABASE_URL ?? '';
const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? '';

const assertEnv = () => {
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
	}
};

export const createAnonClient = () => {
	assertEnv();
	return createClient(supabaseUrl, supabaseAnonKey, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const createUserClient = (accessToken: string) => {
	assertEnv();
	return createClient(supabaseUrl, supabaseAnonKey, {
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
