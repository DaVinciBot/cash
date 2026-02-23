declare namespace App {
	interface Locals {
		session: {
			access_token: string;
			user: any;
		} | null;
		user: any;
		safeGetSession: () => Promise<{
			session: Locals['session'];
			user: Locals['user'];
		}>;
	}
}

export {};
