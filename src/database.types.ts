export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type BankTypeValue = 'cash' | 'savings' | 'order';
export type DocumentTypeValue = 'receipt' | 'invoice';
export type ExpanseStatusValue = 'accepted' | 'pending' | 'refused';
export type BlogStateValue = 'draft' | 'published' | 'deleted';
export type OrderStatusValue =
	| 'pending_cdp'
	| 'pending_treso'
	| 'pending_delivery'
	| 'refused_cdp'
	| 'refused_treso'
	| 'canceled_user'
	| 'canceled_ops'
	| 'completed';
export type PermissionValue =
	| 'members.profile.read.all'
	| 'members.profile.update.all'
	| 'members.projects.read.all'
	| 'members.projects.update.all'
	| 'members.invite.send'
	| 'members.profile.status.update'
	| 'iam.permissions.read.all'
	| 'iam.permissions.assign.all'
	| 'iam.permissions.assign.owned'
	| 'iam.permissions.revoke.all'
	| 'iam.permissions.revoke.owned'
	| 'training.catalog.read'
	| 'training.slot.read'
	| 'training.slot.cu'
	| 'training.registration.cru.self'
	| 'training.registration.read.all'
	| 'training.registration.cu.all'
	| 'training.presence.update'
	| 'training.summary_email.receive'
	| 'orders.cru.self'
	| 'orders.read.all'
	| 'orders.create.all'
	| 'orders.lifecycle.update.all'
	| 'projects.stats.read.all'
	| 'finance.read'
	| 'finance.write'
	| 'blog.draft.write'
	| 'blog.publish'
	| 'integration.smartshare.cast'
	| 'integration.discord.summary_webhook.send'
	| 'audit.logs.read'
	| 'audit.logs.read.security'
	| 'audit.events.export';
export type ProfileStatusValue = 'active' | 'disabled';
export type RegistrationStatusValue =
	| 'waitlisted'
	| 'registered'
	| 'canceled_by_user'
	| 'canceled_by_admin';
export type RoleValue = 'admin' | 'bureau' | 'cdp' | 'membre' | 'guest';
export type SlotStatusValue = 'draft' | 'pending' | 'done' | 'postponed' | 'canceled';
export type TagValue = 'méca' | 'info' | 'élek' | 'stock';
export type TrainingCategoryValue = 'code' | 'electronics' | 'robotic' | 'other' | 'software';
export type UpdateTypeValue =
	| 'order-creation'
	| 'comment'
	| 'update'
	| 'review-cdp-requested'
	| 'review-cdp-approved'
	| 'review-cdp-refused'
	| 'review-treso-requested'
	| 'review-treso-approved'
	| 'review-treso-refused'
	| 'order-pending-delivery'
	| 'order-canceled-user'
	| 'order-canceled-ops'
	| 'order-completed';

export type TrainingCardStatus = 'complete' | 'free' | 'hidden' | 'registered' | 'waiting' | 'my';

export interface BudgetRow {
	id: number;
	project_id: number | null;
	budget: number | null;
	current: boolean | null;
	year: string | null;
}

export interface BudgetInsert {
	id?: number;
	project_id?: number | null;
	budget?: number | null;
	current?: boolean | null;
	year?: string | null;
}

export type BudgetUpdate = Partial<BudgetInsert>;

export interface ProjectRow {
	id: number;
	name: string | null;
	debut: string | null;
}

export interface ProjectInsert {
	id?: number;
	name?: string | null;
	debut?: string | null;
}

export type ProjectUpdate = Partial<ProjectInsert>;

export interface BankRow {
	id: number;
	name: string | null;
	description: string | null;
	current_amount: number | null;
	category: BankTypeValue;
}

export interface BankInsert {
	id?: number;
	name?: string | null;
	description?: string | null;
	current_amount?: number | null;
	category?: BankTypeValue;
}

export type BankUpdate = Partial<BankInsert>;

export interface BankUpdateRow {
	TIMESTAMP: string;
	bank_id: number;
	amount: number | null;
}

export interface BankUpdateInsert {
	TIMESTAMP?: string;
	bank_id: number;
	amount?: number | null;
}

export type BankUpdateUpdate = Partial<BankUpdateInsert>;

export interface BlogRow {
	title: string;
	data: Json;
	slug: string;
	body: string | null;
	last_update: string | null;
	publish_date: string | null;
	state: BlogStateValue;
}

export interface BlogInsert {
	title: string;
	data: Json;
	slug: string;
	body?: string | null;
	last_update?: string | null;
	publish_date?: string | null;
	state?: BlogStateValue;
}

export type BlogUpdate = Partial<BlogInsert>;

export interface ExpanseRow {
	id: number;
	status: ExpanseStatusValue | null;
	made_by: string | null;
	title: string | null;
}

export interface ExpanseInsert {
	id?: number;
	status?: ExpanseStatusValue | null;
	made_by?: string | null;
	title?: string | null;
}

export type ExpanseUpdate = Partial<ExpanseInsert>;

export interface ItemRow {
	id: number;
	type: string | null;
	link: string | null;
	name: string | null;
	price: number | null;
	order_id: number | null;
	quantity: number;
}

export interface ItemInsert {
	id?: number;
	type?: string | null;
	link?: string | null;
	name?: string | null;
	price?: number | null;
	order_id?: number | null;
	quantity?: number;
}

export type ItemUpdate = Partial<ItemInsert>;

export interface MemberOfRow {
	project: number;
	profile: string;
	role: RoleValue;
}

export interface MemberOfInsert {
	project: number;
	profile: string;
	role?: RoleValue;
}

export type MemberOfUpdate = Partial<MemberOfInsert>;

export interface OAuthAccessTokenRow {
	access_token: string;
	user_id: string | null;
	client_id: string | null;
	scope: string | null;
	expires_at: string | null;
}

export interface OAuthAccessTokenInsert {
	access_token: string;
	user_id?: string | null;
	client_id?: string | null;
	scope?: string | null;
	expires_at?: string | null;
}

export type OAuthAccessTokenUpdate = Partial<OAuthAccessTokenInsert>;

export interface OAuthAuthorizationCodeRow {
	code: string;
	user_id: string | null;
	client_id: string | null;
	redirect_uri: string | null;
	code_challenge: string | null;
	code_challenge_method: string | null;
	scope: string | null;
	expires_at: string | null;
}

export interface OAuthAuthorizationCodeInsert {
	code: string;
	user_id?: string | null;
	client_id?: string | null;
	redirect_uri?: string | null;
	code_challenge?: string | null;
	code_challenge_method?: string | null;
	scope?: string | null;
	expires_at?: string | null;
}

export type OAuthAuthorizationCodeUpdate = Partial<OAuthAuthorizationCodeInsert>;

export interface OAuthClientRow {
	id: string;
	secret: string | null;
	name: string | null;
	redirect_url: string | null;
}

export interface OAuthClientInsert {
	id: string;
	secret?: string | null;
	name?: string | null;
	redirect_url?: string | null;
}

export type OAuthClientUpdate = Partial<OAuthClientInsert>;

export interface OAuthRefreshTokenRow {
	refresh_token: string;
	user_id: string | null;
	client_id: string | null;
	scope: string | null;
	expires_at: string | null;
}

export interface OAuthRefreshTokenInsert {
	refresh_token: string;
	user_id?: string | null;
	client_id?: string | null;
	scope?: string | null;
	expires_at?: string | null;
}

export type OAuthRefreshTokenUpdate = Partial<OAuthRefreshTokenInsert>;

export interface OrderRow {
	id: number;
	creationDate: string;
	lastUpdate: string | null;
	requestedBy: string | null;
	comment: string | null;
	projectId: number | null;
	status: OrderStatusValue | null;
	tags: TagValue[] | null;
	spending_id: number | null;
	name: string | null;
	price: number | null;
	shipping_cost: number;
	status_reason: string | null;
}

export interface OrderInsert {
	id?: number;
	creationDate?: string;
	lastUpdate?: string | null;
	requestedBy?: string | null;
	comment?: string | null;
	projectId?: number | null;
	status?: OrderStatusValue | null;
	tags?: TagValue[] | null;
	spending_id?: number | null;
	name?: string | null;
	price?: number | null;
	shipping_cost?: number;
	status_reason?: string | null;
}

export type OrderUpdate = Partial<OrderInsert>;

export interface ProfileRow {
	id: string;
	username: string | null;
	avatar_url: string | null;
	permissions: PermissionValue[] | null;
	status: ProfileStatusValue;
	status_updated_at: string | null;
	status_updated_by: string | null;
	status_reason: string | null;
}

export interface ProfileInsert {
	id: string;
	username?: string | null;
	avatar_url?: string | null;
	permissions?: PermissionValue[] | null;
	status?: ProfileStatusValue;
	status_updated_at?: string | null;
	status_updated_by?: string | null;
	status_reason?: string | null;
}

export type ProfileUpdate = Partial<ProfileInsert>;

export interface ReceiptRow {
	id: number;
	upload_at: string;
	doc_type: DocumentTypeValue | null;
	path: string | null;
	spending_id: number | null;
}

export interface ReceiptInsert {
	id?: number;
	upload_at?: string;
	doc_type?: DocumentTypeValue | null;
	path?: string | null;
	spending_id?: number | null;
}

export type ReceiptUpdate = Partial<ReceiptInsert>;

export interface RegistrationRow {
	slot_id: number;
	member_id: string;
	date_hour: string;
	remote: boolean;
	status: RegistrationStatusValue;
	present: boolean | null;
	to_excuse: boolean | null;
	feedback: string | null;
}

export interface RegistrationInsert {
	slot_id: number;
	member_id: string;
	date_hour?: string;
	remote: boolean;
	status: RegistrationStatusValue;
	present?: boolean | null;
	to_excuse?: boolean | null;
	feedback?: string | null;
}

export type RegistrationUpdate = Partial<RegistrationInsert>;

export interface SpendingRow {
	id: number;
	amount: number;
	date: string | null;
	is_positive: boolean;
	description: string | null;
	author: string | null;
	bank_id: number | null;
	order_id: number | null;
}

export interface SpendingInsert {
	id?: number;
	amount?: number;
	date?: string | null;
	is_positive?: boolean;
	description?: string | null;
	author?: string | null;
	bank_id?: number | null;
	order_id?: number | null;
}

export type SpendingUpdate = Partial<SpendingInsert>;

export interface TrainingRow {
	id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: TrainingCategoryValue;
}

export interface TrainingInsert {
	id?: number;
	name?: string;
	description?: string | null;
	prerequisites?: string | null;
	category?: TrainingCategoryValue;
}

export type TrainingUpdate = Partial<TrainingInsert>;

export interface TrainingSlotRow {
	id: number;
	training_id: number;
	custom_name: string | null;
	custom_description: string | null;
	custom_prerequisites: string | null;
	trainer_id: string;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	location: string | null;
	video_conference_link: string | null;
	excusable: boolean;
	status: SlotStatusValue;
}

export interface TrainingSlotInsert {
	id?: number;
	training_id: number;
	custom_name?: string | null;
	custom_description?: string | null;
	custom_prerequisites?: string | null;
	trainer_id: string;
	start: string;
	duration_hours: number;
	on_site_seats?: number | null;
	remote_seats?: number | null;
	location?: string | null;
	video_conference_link?: string | null;
	excusable: boolean;
	status?: SlotStatusValue;
}

export type TrainingSlotUpdate = Partial<TrainingSlotInsert>;

export interface TrainingEmailLogRow {
	id: number;
	template: string;
	slot_id: number;
	member_id: string;
	request_id: number | null;
	created_at: string;
}

export interface TrainingEmailLogInsert {
	id?: number;
	template: string;
	slot_id: number;
	member_id?: string;
	request_id?: number | null;
	created_at?: string;
}

export type TrainingEmailLogUpdate = Partial<TrainingEmailLogInsert>;

export interface UpdateRow {
	id: number;
	date: string;
	author: string | null;
	message: string | null;
	order_id: number | null;
	type: UpdateTypeValue | null;
}

export interface UpdateInsert {
	id?: number;
	date?: string;
	author?: string | null;
	message?: string | null;
	order_id?: number | null;
	type?: UpdateTypeValue | null;
}

export type UpdateUpdate = Partial<UpdateInsert>;

export interface TrainerRegistrationViewRow extends RegistrationListItemRow {
	trainer_id: string;
}

export interface TrainingListItemRow {
	training_id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: TrainingCategoryValue;
}

export interface TrainingSlotListItemRow extends TrainingListItemRow {
	slot_id: number;
	start: string;
	duration_hours: number;
	on_site_seats: number | null;
	remote_seats: number | null;
	on_site_registered: number | null;
	remote_registered: number | null;
	on_site_waitlisted: number | null;
	remote_waitlisted: number | null;
	on_site_remaining: number | null;
	remote_remaining: number | null;
	location: string | null;
	video_conference_link: string | null;
	excusable: boolean;
	status: SlotStatusValue;
	trainer_id: string;
	trainer_username: string | null;
	trainer_avatar_url: string | null;
}

export interface RegistrationListItemRow {
	slot_id: number;
	member_id: string;
	date_hour: string;
	remote: boolean;
	status: RegistrationStatusValue;
	present: boolean | null;
	to_excuse: boolean | null;
	feedback: string | null;
	member_username: string | null;
	member_avatar_url: string | null;
}

export interface ServerSessionRow {
	id: string;
	user_id: string;
	access_token: string;
	refresh_token: string;
	expires_at: string;
	revoked_at: string | null;
	created_at: string;
	last_seen_at: string | null;
}

export interface ServerSessionSecretRow {
	session_id: string;
	session_secret: string;
}

interface TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>, Relationships = []> {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: Relationships;
}

interface ViewDefinition<Row, Relationships = []> {
	Row: Row;
	Relationships: Relationships;
}

interface EmptySchema {
	Tables: Record<string, never>;
	Views: Record<string, never>;
	Functions: Record<string, never>;
	Enums: Record<string, never>;
	CompositeTypes: Record<string, never>;
}

export interface Database {
	public: {
		Tables: {
			budget: TableDefinition<BudgetRow, BudgetInsert, BudgetUpdate>;
			projects: TableDefinition<ProjectRow, ProjectInsert, ProjectUpdate>;
			bank: TableDefinition<BankRow, BankInsert, BankUpdate>;
			bank_updates: TableDefinition<BankUpdateRow, BankUpdateInsert, BankUpdateUpdate>;
			blog: TableDefinition<BlogRow, BlogInsert, BlogUpdate>;
			expanse: TableDefinition<ExpanseRow, ExpanseInsert, ExpanseUpdate>;
			items: TableDefinition<ItemRow, ItemInsert, ItemUpdate>;
			member_of: TableDefinition<MemberOfRow, MemberOfInsert, MemberOfUpdate>;
			oauth_access_tokens: TableDefinition<
				OAuthAccessTokenRow,
				OAuthAccessTokenInsert,
				OAuthAccessTokenUpdate
			>;
			oauth_authorization_codes: TableDefinition<
				OAuthAuthorizationCodeRow,
				OAuthAuthorizationCodeInsert,
				OAuthAuthorizationCodeUpdate
			>;
			oauth_clients: TableDefinition<OAuthClientRow, OAuthClientInsert, OAuthClientUpdate>;
			oauth_refresh_tokens: TableDefinition<
				OAuthRefreshTokenRow,
				OAuthRefreshTokenInsert,
				OAuthRefreshTokenUpdate
			>;
			orders: TableDefinition<OrderRow, OrderInsert, OrderUpdate>;
			profiles: TableDefinition<ProfileRow, ProfileInsert, ProfileUpdate>;
			receipt: TableDefinition<ReceiptRow, ReceiptInsert, ReceiptUpdate>;
			registration: TableDefinition<RegistrationRow, RegistrationInsert, RegistrationUpdate>;
			spending: TableDefinition<SpendingRow, SpendingInsert, SpendingUpdate>;
			training_slot: TableDefinition<TrainingSlotRow, TrainingSlotInsert, TrainingSlotUpdate>;
			training: TableDefinition<TrainingRow, TrainingInsert, TrainingUpdate>;
			training_email_log: TableDefinition<
				TrainingEmailLogRow,
				TrainingEmailLogInsert,
				TrainingEmailLogUpdate
			>;
			updates: TableDefinition<UpdateRow, UpdateInsert, UpdateUpdate>;
		};
		Views: {
			trainer_registration_view: ViewDefinition<TrainerRegistrationViewRow>;
		};
		Functions: {
			cancel_my_registration: {
				Args: { p_slot_id: number };
				Returns: undefined;
			};
			check_full_training_and_notify: {
				Args: { p_slot_id: number };
				Returns: undefined;
			};
			get_cdp_email: {
				Args: { project_id: number };
				Returns: string;
			};
			get_project_cost: {
				Args: { projectid: number; year: number };
				Returns: number;
			};
			get_project_stats: {
				Args: { projectid: number; year?: number };
				Returns: Json;
			};
			get_service_key: {
				Args: Record<string, never>;
				Returns: string;
			};
			has_permission: {
				Args: { p_permission: PermissionValue };
				Returns: boolean;
			};
			install_available_extensions_and_test: {
				Args: Record<string, never>;
				Returns: boolean;
			};
			promote_waitlist: {
				Args: { p_slot_id: number; p_remote: boolean };
				Returns: undefined;
			};
			register_to_slot: {
				Args: { p_slot_id: number; p_remote: boolean; p_to_excuse?: boolean };
				Returns: RegistrationStatusValue;
			};
			registration_list: {
				Args: { p_slot_id: number };
				Returns: RegistrationListItemRow[];
			};
			registration_target_status: {
				Args: { p_slot_id: number; p_remote: boolean };
				Returns: RegistrationStatusValue;
			};
			send_training_email: {
				Args: { p_template: string; p_slot_id: number; p_member_id?: string | null };
				Returns: number;
			};
			send_training_reminders: {
				Args: Record<string, never>;
				Returns: undefined;
			};
			sync_training_slot_statuses: {
				Args: Record<string, never>;
				Returns: undefined;
			};
			trainer_update_presence: {
				Args: { p_slot_id: number; p_member_id: string; p_present?: boolean | null };
				Returns: undefined;
			};
			training_list: {
				Args: Record<string, never>;
				Returns: TrainingListItemRow[];
			};
			training_director_ids: {
				Args: Record<string, never>;
				Returns: { id: string }[];
			};
			training_slot_detail: {
				Args: { p_slot_id: number };
				Returns: TrainingSlotListItemRow[];
			};
			training_slot_list: {
				Args: { p_from?: string; p_to?: string | null };
				Returns: TrainingSlotListItemRow[];
			};
		};
		Enums: {
			BankType: BankTypeValue;
			DocumentType: DocumentTypeValue;
			ExpanseStatus: ExpanseStatusValue;
			blog_state: BlogStateValue;
			order_status: OrderStatusValue;
			permission: PermissionValue;
			profile_status: ProfileStatusValue;
			registration_status: RegistrationStatusValue;
			roles: RoleValue;
			slot_status: SlotStatusValue;
			tags: TagValue;
			training_category: TrainingCategoryValue;
			update_type: UpdateTypeValue;
		};
		CompositeTypes: Record<string, never>;
	};
	sso: EmptySchema & {
		Tables: {
			server_sessions: TableDefinition<
				ServerSessionRow,
				{
					id?: string;
					secret_hash: string;
					user_id: string;
					access_token: string;
					refresh_token: string;
					expires_at: string;
					revoked_at?: string | null;
					created_at?: string;
					last_seen_at?: string | null;
				},
				Partial<{
					id: string;
					secret_hash: string;
					user_id: string;
					access_token: string;
					refresh_token: string;
					expires_at: string;
					revoked_at: string | null;
					created_at: string;
					last_seen_at: string | null;
				}>
			>;
		};
		Functions: {
			create_server_session: {
				Args: { p_access_token: string; p_refresh_token: string; p_expires_at: string };
				Returns: ServerSessionSecretRow[];
			};
			get_server_session: {
				Args: { p_session_id: string; p_session_secret: string };
				Returns: ServerSessionRow[];
			};
			revoke_server_session: {
				Args: { p_session_id: string; p_session_secret: string };
				Returns: undefined;
			};
			update_server_session_tokens: {
				Args: {
					p_session_id: string;
					p_session_secret: string;
					p_access_token: string;
					p_refresh_token: string;
					p_expires_at: string;
				};
				Returns: undefined;
			};
		};
	};
}
