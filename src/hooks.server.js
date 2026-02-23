import { createClient } from '@supabase/supabase-js';
import { error } from '@sveltejs/kit';
import { supabaseKey, supabaseUrl } from '$lib/supabaseClient';
import { canAccessAdminPath } from '$lib/permissions';

function extractAccessTokenFromCookieValue(rawValue) {
    if (!rawValue) return null;

    const parseJsonToken = (value) => {
        try {
            const parsed = JSON.parse(value);
            if (parsed?.access_token) return parsed.access_token;
            if (Array.isArray(parsed) && parsed[0]?.access_token) return parsed[0].access_token;
            return null;
        } catch {
            return null;
        }
    };

    if (rawValue.startsWith('base64-')) {
        const base64Payload = rawValue.slice('base64-'.length);
        try {
            const decoded = Buffer.from(base64Payload, 'base64').toString('utf8');
            const token = parseJsonToken(decoded);
            if (token) return token;
        } catch {
            return null;
        }
    }

    const directJsonToken = parseJsonToken(rawValue);
    if (directJsonToken) return directJsonToken;

    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(rawValue)) {
        return rawValue;
    }

    return null;
}

function getAccessTokenFromRequest(event) {
    const authHeader = event.request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length);
    }

    const authCookie = event.cookies
        .getAll()
        .find((cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token'));

    return extractAccessTokenFromCookieValue(authCookie?.value);
}

function logUnauthorized(event, reason, meta = {}) {
    const forwardedFor = event.request.headers.get('x-forwarded-for') || null;
    const realIp = event.request.headers.get('x-real-ip') || null;
    const userAgent = event.request.headers.get('user-agent') || null;

    console.warn('[auth] unauthorized', {
        reason,
        method: event.request.method,
        path: event.url.pathname,
        userAgent,
        ip: realIp || forwardedFor,
        ...meta
    });
}

export async function handle({ event, resolve }) {
    const path = event.url.pathname;
    const isAdminPath = path === '/admin' || path.startsWith('/admin/');
    const isStaticAssetPath = path.startsWith('/admin/_app/') || path.startsWith('/admin/favicon');

    const locals = /** @type {any} */ (event.locals);

    locals.session = null;
    locals.user = null;
    locals.safeGetSession = async () => ({
        session: locals.session,
        user: locals.user
    });

    if (!isAdminPath || isStaticAssetPath) {
        return resolve(event);
    }

    const accessToken = getAccessTokenFromRequest(event);
    if (!accessToken) {
        logUnauthorized(event, 'missing_access_token');
        throw error(401, 'Unauthorized');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });

    const {
        data: { user },
        error: userError
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
        logUnauthorized(event, 'invalid_user_session', {
            authError: userError?.message || null
        });
        throw error(401, 'Unauthorized');
    }

    locals.user = user;
    locals.session = {
        access_token: accessToken,
        user
    };

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('permissions')
        .eq('id', user.id)
        .single();

    if (profileError) {
        logUnauthorized(event, 'profile_lookup_failed', {
            userId: user.id,
            profileError: profileError.message
        });
        throw error(401, 'Unauthorized');
    }

    if (!canAccessAdminPath(path, profile?.permissions || [])) {
        logUnauthorized(event, 'insufficient_permissions', {
            userId: user.id,
            permissions: profile?.permissions || []
        });
        throw error(401, 'Unauthorized');
    }

    return resolve(event);
}