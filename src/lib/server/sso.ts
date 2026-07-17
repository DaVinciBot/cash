import { env } from '$env/dynamic/public';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@davincibot/database-types';

const assertEnv = () => {
	if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_PUBLISHABLE_KEY');
	}
};

export const createAnonClient = () => {
	assertEnv();
	return createClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

export const createUserClient = (accessToken: string) => {
	assertEnv();
	return createClient<Database>(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		global: {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		},
		auth: { persistSession: false, autoRefreshToken: false }
	});
};

interface JwtPayload {
	sub: string;
	email?: string | null;
	app_metadata?: Record<string, unknown>;
	user_metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

export const decodeJwt = (token: string): JwtPayload | null => {
	try {
		const payload = token.split('.')[1];
		if (!payload) {
			return null;
		}
		const decoded = Buffer.from(payload, 'base64').toString('utf8');
		return JSON.parse(decoded) as JwtPayload;
	} catch {
		return null;
	}
};
