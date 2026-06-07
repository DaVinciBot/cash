export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type TrainingCategoryValue = 'code' | 'electronics' | 'robotic' | 'other' | 'software';
export type TrainingCardStatus = 'complete' | 'free' | 'hidden' | 'registered' | 'waiting' | 'my';
export type RegistrationStatusValue =
	| 'waitlisted'
	| 'registered'
	| 'canceled_by_user'
	| 'canceled_by_admin';
export type SlotStatusValue = 'draft' | 'pending' | 'done' | 'postponed' | 'canceled';

export interface BlogRow {
	id: number;
	title: string;
	slug: string;
	body: string | null;
	state: string | null;
	data: Json;
	publish_date: string | null;
	last_update: string | null;
	author?: string | null;
}

export interface RegistrationRow {
	slot_id: number;
	member_id: string;
	remote: boolean;
	status: RegistrationStatusValue;
	present: boolean | null;
	to_excuse: boolean | null;
	feedback: string | null;
}

export interface ItemRow {
	id: string | number;
}

export interface TrainingRow {
	id: number;
	name: string;
	description: string | null;
	prerequisites: string | null;
	category: TrainingCategoryValue;
}

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
	access_token: string;
	refresh_token: string;
	expires_at: string;
	user_id: string;
	revoked_at: string | null;
}

export interface ServerSessionSecretRow {
	session_id: string;
	session_secret: string;
}

interface TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> {
	Row: Row;
	Insert: Insert;
	Update: Update;
	Relationships: [];
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
			blog: TableDefinition<BlogRow>;
			items: TableDefinition<ItemRow>;
			registration: TableDefinition<RegistrationRow>;
			training: TableDefinition<TrainingRow>;
			training_slot: TableDefinition<TrainingSlotRow>;
		};
		Views: {
			trainer_registration_view: {
				Row: RegistrationListItemRow;
				Relationships: [];
			};
		};
		Functions: {
			cancel_my_registration: {
				Args: { p_slot_id: number };
				Returns: Json;
			};
			register_to_slot: {
				Args: { p_slot_id: number; p_remote: boolean; p_to_excuse: boolean };
				Returns: string;
			};
			registration_list: {
				Args: { p_slot_id: number };
				Returns: RegistrationListItemRow[];
			};
			trainer_update_presence: {
				Args: { p_slot_id: number; p_member_id: string; p_present: boolean | null };
				Returns: Json;
			};
			training_list: {
				Args: Record<string, never>;
				Returns: TrainingListItemRow[];
			};
			training_slot_detail: {
				Args: { p_slot_id: number };
				Returns: TrainingSlotListItemRow[];
			};
			training_slot_list: {
				Args: { p_from: string; p_to: string | null };
				Returns: TrainingSlotListItemRow[];
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
	sso: EmptySchema & {
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
				Returns: Json;
			};
			update_server_session_tokens: {
				Args: {
					p_session_id: string;
					p_session_secret: string;
					p_access_token: string;
					p_refresh_token: string;
					p_expires_at: string;
				};
				Returns: Json;
			};
		};
	};
}
