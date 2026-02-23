export const load = async ({ locals: { safeGetSession }, cookies, depends }) => {
    depends('supabase:auth');
    const { session, user } = await safeGetSession();
    return {
        session,
        user,
        cookies: cookies.getAll()
    };
};
