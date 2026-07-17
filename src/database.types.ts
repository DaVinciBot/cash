export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '13.0.4';
	};
	public: {
		Tables: {
			bank: {
				Row: {
					category: Database['public']['Enums']['BankType'];
					current_amount: number | null;
					description: string | null;
					id: number;
					name: string | null;
				};
				Insert: {
					category?: Database['public']['Enums']['BankType'];
					current_amount?: number | null;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Update: {
					category?: Database['public']['Enums']['BankType'];
					current_amount?: number | null;
					description?: string | null;
					id?: number;
					name?: string | null;
				};
				Relationships: [];
			};
			bank_updates: {
				Row: {
					amount: number | null;
					bank_id: number;
					TIMESTAMP: string;
				};
				Insert: {
					amount?: number | null;
					bank_id: number;
					TIMESTAMP?: string;
				};
				Update: {
					amount?: number | null;
					bank_id?: number;
					TIMESTAMP?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'bank_updates_bank_id_fkey';
						columns: ['bank_id'];
						isOneToOne: false;
						referencedRelation: 'bank';
						referencedColumns: ['id'];
					}
				];
			};
			blog: {
				Row: {
					body: string | null;
					data: Json;
					last_update: string | null;
					publish_date: string | null;
					slug: string;
					state: Database['public']['Enums']['blog_state'];
					title: string;
				};
				Insert: {
					body?: string | null;
					data: Json;
					last_update?: string | null;
					publish_date?: string | null;
					slug: string;
					state?: Database['public']['Enums']['blog_state'];
					title: string;
				};
				Update: {
					body?: string | null;
					data?: Json;
					last_update?: string | null;
					publish_date?: string | null;
					slug?: string;
					state?: Database['public']['Enums']['blog_state'];
					title?: string;
				};
				Relationships: [];
			};
			budget: {
				Row: {
					budget: number | null;
					current: boolean | null;
					id: number;
					project_id: number | null;
					year: string | null;
				};
				Insert: {
					budget?: number | null;
					current?: boolean | null;
					id?: number;
					project_id?: number | null;
					year?: string | null;
				};
				Update: {
					budget?: number | null;
					current?: boolean | null;
					id?: number;
					project_id?: number | null;
					year?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'Budget_project_id_fkey';
						columns: ['project_id'];
						isOneToOne: false;
						referencedRelation: 'projects';
						referencedColumns: ['id'];
					}
				];
			};
			expanse: {
				Row: {
					id: number;
					made_by: string | null;
					status: Database['public']['Enums']['ExpanseStatus'] | null;
					title: string | null;
				};
				Insert: {
					id?: number;
					made_by?: string | null;
					status?: Database['public']['Enums']['ExpanseStatus'] | null;
					title?: string | null;
				};
				Update: {
					id?: number;
					made_by?: string | null;
					status?: Database['public']['Enums']['ExpanseStatus'] | null;
					title?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'expanse_made_by_fkey';
						columns: ['made_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			global_roles: {
				Row: {
					permissions: Database['public']['Enums']['global_permission'][];
					rank: number;
					role: Database['public']['Enums']['global_role'];
				};
				Insert: {
					permissions?: Database['public']['Enums']['global_permission'][];
					rank: number;
					role: Database['public']['Enums']['global_role'];
				};
				Update: {
					permissions?: Database['public']['Enums']['global_permission'][];
					rank?: number;
					role?: Database['public']['Enums']['global_role'];
				};
				Relationships: [];
			};
			items: {
				Row: {
					id: number;
					link: string | null;
					name: string | null;
					order_id: number | null;
					price: number | null;
					quantity: number;
					type: string | null;
				};
				Insert: {
					id?: number;
					link?: string | null;
					name?: string | null;
					order_id?: number | null;
					price?: number | null;
					quantity?: number;
					type?: string | null;
				};
				Update: {
					id?: number;
					link?: string | null;
					name?: string | null;
					order_id?: number | null;
					price?: number | null;
					quantity?: number;
					type?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'items_order_id_fkey';
						columns: ['order_id'];
						isOneToOne: false;
						referencedRelation: 'orders';
						referencedColumns: ['id'];
					}
				];
			};
			member_of: {
				Row: {
					id: number;
					profile: string;
					project: number;
					revoked_at: string | null;
					revoked_by: string | null;
					role: Database['public']['Enums']['project_role'];
				};
				Insert: {
					id?: never;
					profile: string;
					project: number;
					revoked_at?: string | null;
					revoked_by?: string | null;
					role?: Database['public']['Enums']['project_role'];
				};
				Update: {
					id?: never;
					profile?: string;
					project?: number;
					revoked_at?: string | null;
					revoked_by?: string | null;
					role?: Database['public']['Enums']['project_role'];
				};
				Relationships: [
					{
						foreignKeyName: 'member_of_revoked_by_fkey';
						columns: ['revoked_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'membre_projet_profile_fkey';
						columns: ['profile'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'membre_projet_project_fkey';
						columns: ['project'];
						isOneToOne: false;
						referencedRelation: 'projects';
						referencedColumns: ['id'];
					}
				];
			};
			oauth_access_tokens: {
				Row: {
					access_token: string;
					client_id: string | null;
					expires_at: string | null;
					scope: string | null;
					user_id: string | null;
				};
				Insert: {
					access_token: string;
					client_id?: string | null;
					expires_at?: string | null;
					scope?: string | null;
					user_id?: string | null;
				};
				Update: {
					access_token?: string;
					client_id?: string | null;
					expires_at?: string | null;
					scope?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'oauth_access_tokens_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			oauth_authorization_codes: {
				Row: {
					client_id: string | null;
					code: string;
					code_challenge: string | null;
					code_challenge_method: string | null;
					expires_at: string | null;
					nonce: string | null;
					redirect_uri: string | null;
					scope: string | null;
					user_id: string | null;
				};
				Insert: {
					client_id?: string | null;
					code: string;
					code_challenge?: string | null;
					code_challenge_method?: string | null;
					expires_at?: string | null;
					nonce?: string | null;
					redirect_uri?: string | null;
					scope?: string | null;
					user_id?: string | null;
				};
				Update: {
					client_id?: string | null;
					code?: string;
					code_challenge?: string | null;
					code_challenge_method?: string | null;
					expires_at?: string | null;
					nonce?: string | null;
					redirect_uri?: string | null;
					scope?: string | null;
					user_id?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'oauth_authorization_codes_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			oauth_clients: {
				Row: {
					id: string;
					name: string | null;
					redirect_url: string | null;
					secret_hash: string | null;
				};
				Insert: {
					id: string;
					name?: string | null;
					redirect_url?: string | null;
					secret_hash?: string | null;
				};
				Update: {
					id?: string;
					name?: string | null;
					redirect_url?: string | null;
					secret_hash?: string | null;
				};
				Relationships: [];
			};
			oauth_refresh_tokens: {
				Row: {
					client_id: string | null;
					expires_at: string | null;
					refresh_token: string;
					scope: string | null;
					user_id: string | null;
				};
				Insert: {
					client_id?: string | null;
					expires_at?: string | null;
					refresh_token: string;
					scope?: string | null;
					user_id?: string | null;
				};
				Update: {
					client_id?: string | null;
					expires_at?: string | null;
					refresh_token?: string;
					scope?: string | null;
					user_id?: string | null;
				};
				Relationships: [];
			};
			orders: {
				Row: {
					comment: string | null;
					creationDate: string;
					id: number;
					lastUpdate: string | null;
					name: string | null;
					price: number | null;
					projectId: number | null;
					requestedBy: string | null;
					shipping_cost: number;
					spending_id: number | null;
					status: Database['public']['Enums']['order_status'] | null;
					status_reason: string | null;
					tags: Database['public']['Enums']['tags'][] | null;
				};
				Insert: {
					comment?: string | null;
					creationDate?: string;
					id?: number;
					lastUpdate?: string | null;
					name?: string | null;
					price?: number | null;
					projectId?: number | null;
					requestedBy?: string | null;
					shipping_cost?: number;
					spending_id?: number | null;
					status?: Database['public']['Enums']['order_status'] | null;
					status_reason?: string | null;
					tags?: Database['public']['Enums']['tags'][] | null;
				};
				Update: {
					comment?: string | null;
					creationDate?: string;
					id?: number;
					lastUpdate?: string | null;
					name?: string | null;
					price?: number | null;
					projectId?: number | null;
					requestedBy?: string | null;
					shipping_cost?: number;
					spending_id?: number | null;
					status?: Database['public']['Enums']['order_status'] | null;
					status_reason?: string | null;
					tags?: Database['public']['Enums']['tags'][] | null;
				};
				Relationships: [
					{
						foreignKeyName: 'orders_projectId_fkey';
						columns: ['projectId'];
						isOneToOne: false;
						referencedRelation: 'projects';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'orders_requestedBy_fkey';
						columns: ['requestedBy'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'orders_spending_id_fkey';
						columns: ['spending_id'];
						isOneToOne: false;
						referencedRelation: 'spending';
						referencedColumns: ['id'];
					}
				];
			};
			profile_global_roles: {
				Row: {
					granted_at: string;
					granted_by: string | null;
					id: number;
					profile: string;
					revoked_at: string | null;
					revoked_by: string | null;
					role: Database['public']['Enums']['global_role'];
				};
				Insert: {
					granted_at?: string;
					granted_by?: string | null;
					id?: never;
					profile: string;
					revoked_at?: string | null;
					revoked_by?: string | null;
					role: Database['public']['Enums']['global_role'];
				};
				Update: {
					granted_at?: string;
					granted_by?: string | null;
					id?: never;
					profile?: string;
					revoked_at?: string | null;
					revoked_by?: string | null;
					role?: Database['public']['Enums']['global_role'];
				};
				Relationships: [
					{
						foreignKeyName: 'profile_global_roles_granted_by_fkey';
						columns: ['granted_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'profile_global_roles_profile_fkey';
						columns: ['profile'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'profile_global_roles_revoked_by_fkey';
						columns: ['revoked_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'profile_global_roles_role_fkey';
						columns: ['role'];
						isOneToOne: false;
						referencedRelation: 'global_roles';
						referencedColumns: ['role'];
					}
				];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					id: string;
					permissions: Database['public']['Enums']['global_permission'][];
					status: Database['public']['Enums']['profile_status'];
					status_reason: string | null;
					status_updated_at: string | null;
					status_updated_by: string | null;
					username: string | null;
				};
				Insert: {
					avatar_url?: string | null;
					id: string;
					permissions?: Database['public']['Enums']['global_permission'][];
					status?: Database['public']['Enums']['profile_status'];
					status_reason?: string | null;
					status_updated_at?: string | null;
					status_updated_by?: string | null;
					username?: string | null;
				};
				Update: {
					avatar_url?: string | null;
					id?: string;
					permissions?: Database['public']['Enums']['global_permission'][];
					status?: Database['public']['Enums']['profile_status'];
					status_reason?: string | null;
					status_updated_at?: string | null;
					status_updated_by?: string | null;
					username?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'profiles_status_updated_by_fkey';
						columns: ['status_updated_by'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			project_role_permissions: {
				Row: {
					permissions: Database['public']['Enums']['project_permission'][];
					role: Database['public']['Enums']['project_role'];
				};
				Insert: {
					permissions?: Database['public']['Enums']['project_permission'][];
					role: Database['public']['Enums']['project_role'];
				};
				Update: {
					permissions?: Database['public']['Enums']['project_permission'][];
					role?: Database['public']['Enums']['project_role'];
				};
				Relationships: [];
			};
			projects: {
				Row: {
					debut: string | null;
					id: number;
					name: string | null;
				};
				Insert: {
					debut?: string | null;
					id?: number;
					name?: string | null;
				};
				Update: {
					debut?: string | null;
					id?: number;
					name?: string | null;
				};
				Relationships: [];
			};
			receipt: {
				Row: {
					doc_type: Database['public']['Enums']['DocumentType'] | null;
					id: number;
					path: string | null;
					spending_id: number | null;
					upload_at: string;
				};
				Insert: {
					doc_type?: Database['public']['Enums']['DocumentType'] | null;
					id?: number;
					path?: string | null;
					spending_id?: number | null;
					upload_at?: string;
				};
				Update: {
					doc_type?: Database['public']['Enums']['DocumentType'] | null;
					id?: number;
					path?: string | null;
					spending_id?: number | null;
					upload_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'receipt_spending_id_fkey';
						columns: ['spending_id'];
						isOneToOne: false;
						referencedRelation: 'spending';
						referencedColumns: ['id'];
					}
				];
			};
			registration: {
				Row: {
					date_hour: string;
					feedback: string | null;
					member_id: string;
					present: boolean | null;
					remote: boolean;
					slot_id: number;
					status: Database['public']['Enums']['registration_status'];
					to_excuse: boolean | null;
				};
				Insert: {
					date_hour?: string;
					feedback?: string | null;
					member_id: string;
					present?: boolean | null;
					remote: boolean;
					slot_id: number;
					status: Database['public']['Enums']['registration_status'];
					to_excuse?: boolean | null;
				};
				Update: {
					date_hour?: string;
					feedback?: string | null;
					member_id?: string;
					present?: boolean | null;
					remote?: boolean;
					slot_id?: number;
					status?: Database['public']['Enums']['registration_status'];
					to_excuse?: boolean | null;
				};
				Relationships: [
					{
						foreignKeyName: 'registration_member_id_fkey';
						columns: ['member_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'registration_slot_id_fkey';
						columns: ['slot_id'];
						isOneToOne: false;
						referencedRelation: 'training_slot';
						referencedColumns: ['id'];
					}
				];
			};
			spending: {
				Row: {
					amount: number;
					author: string | null;
					bank_id: number | null;
					date: string | null;
					description: string | null;
					id: number;
					is_positive: boolean;
					order_id: number | null;
				};
				Insert: {
					amount?: number;
					author?: string | null;
					bank_id?: number | null;
					date?: string | null;
					description?: string | null;
					id?: number;
					is_positive?: boolean;
					order_id?: number | null;
				};
				Update: {
					amount?: number;
					author?: string | null;
					bank_id?: number | null;
					date?: string | null;
					description?: string | null;
					id?: number;
					is_positive?: boolean;
					order_id?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: 'spending_author_fkey';
						columns: ['author'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'spending_bank_id_fkey';
						columns: ['bank_id'];
						isOneToOne: false;
						referencedRelation: 'bank';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'spending_order_id_fkey';
						columns: ['order_id'];
						isOneToOne: false;
						referencedRelation: 'orders';
						referencedColumns: ['id'];
					}
				];
			};
			training: {
				Row: {
					category: Database['public']['Enums']['training_category'];
					description: string | null;
					id: number;
					name: string;
					prerequisites: string | null;
				};
				Insert: {
					category?: Database['public']['Enums']['training_category'];
					description?: string | null;
					id?: number;
					name?: string;
					prerequisites?: string | null;
				};
				Update: {
					category?: Database['public']['Enums']['training_category'];
					description?: string | null;
					id?: number;
					name?: string;
					prerequisites?: string | null;
				};
				Relationships: [];
			};
			training_email_log: {
				Row: {
					created_at: string;
					id: number;
					member_id: string;
					request_id: number | null;
					slot_id: number;
					template: string;
				};
				Insert: {
					created_at?: string;
					id?: number;
					member_id?: string;
					request_id?: number | null;
					slot_id: number;
					template: string;
				};
				Update: {
					created_at?: string;
					id?: number;
					member_id?: string;
					request_id?: number | null;
					slot_id?: number;
					template?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'training_email_log_slot_id_fkey';
						columns: ['slot_id'];
						isOneToOne: false;
						referencedRelation: 'training_slot';
						referencedColumns: ['id'];
					}
				];
			};
			training_slot: {
				Row: {
					custom_description: string | null;
					custom_name: string | null;
					custom_prerequisites: string | null;
					duration_hours: number;
					excusable: boolean;
					id: number;
					location: string | null;
					on_site_seats: number | null;
					remote_seats: number | null;
					start: string;
					status: Database['public']['Enums']['slot_status'];
					trainer_id: string;
					training_id: number;
					video_conference_link: string | null;
				};
				Insert: {
					custom_description?: string | null;
					custom_name?: string | null;
					custom_prerequisites?: string | null;
					duration_hours: number;
					excusable: boolean;
					id?: number;
					location?: string | null;
					on_site_seats?: number | null;
					remote_seats?: number | null;
					start: string;
					status?: Database['public']['Enums']['slot_status'];
					trainer_id: string;
					training_id: number;
					video_conference_link?: string | null;
				};
				Update: {
					custom_description?: string | null;
					custom_name?: string | null;
					custom_prerequisites?: string | null;
					duration_hours?: number;
					excusable?: boolean;
					id?: number;
					location?: string | null;
					on_site_seats?: number | null;
					remote_seats?: number | null;
					start?: string;
					status?: Database['public']['Enums']['slot_status'];
					trainer_id?: string;
					training_id?: number;
					video_conference_link?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'slot_trainer_id_fkey';
						columns: ['trainer_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'slot_training_id_fkey';
						columns: ['training_id'];
						isOneToOne: false;
						referencedRelation: 'training';
						referencedColumns: ['id'];
					}
				];
			};
			updates: {
				Row: {
					author: string | null;
					date: string;
					id: number;
					message: string | null;
					order_id: number | null;
					type: Database['public']['Enums']['update_type'] | null;
				};
				Insert: {
					author?: string | null;
					date?: string;
					id?: number;
					message?: string | null;
					order_id?: number | null;
					type?: Database['public']['Enums']['update_type'] | null;
				};
				Update: {
					author?: string | null;
					date?: string;
					id?: number;
					message?: string | null;
					order_id?: number | null;
					type?: Database['public']['Enums']['update_type'] | null;
				};
				Relationships: [
					{
						foreignKeyName: 'updates_author_fkey';
						columns: ['author'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'updates_order_id_fkey';
						columns: ['order_id'];
						isOneToOne: false;
						referencedRelation: 'orders';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			trainer_registration_view: {
				Row: {
					date_hour: string | null;
					feedback: string | null;
					member_avatar_url: string | null;
					member_id: string | null;
					member_username: string | null;
					present: boolean | null;
					remote: boolean | null;
					slot_id: number | null;
					status: Database['public']['Enums']['registration_status'] | null;
					to_excuse: boolean | null;
					trainer_id: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'registration_member_id_fkey';
						columns: ['member_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'registration_slot_id_fkey';
						columns: ['slot_id'];
						isOneToOne: false;
						referencedRelation: 'training_slot';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'slot_trainer_id_fkey';
						columns: ['trainer_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Functions: {
			assign_global_role: {
				Args: {
					p_profile: string;
					p_role: Database['public']['Enums']['global_role'];
				};
				Returns: undefined;
			};
			can_manage_role: {
				Args: { p_target_role: Database['public']['Enums']['global_role'] };
				Returns: boolean;
			};
			cancel_my_registration: {
				Args: { p_slot_id: number };
				Returns: undefined;
			};
			check_full_training_and_notify: {
				Args: { p_slot_id: number };
				Returns: undefined;
			};
			get_cdp_email: { Args: { project_id: number }; Returns: string };
			get_project_cost: {
				Args: { projectid: number; year: number };
				Returns: number;
			};
			get_project_stats:
				| { Args: { projectid: number }; Returns: Json }
				| { Args: { projectid: number; year: number }; Returns: Json };
			get_service_key: { Args: never; Returns: string };
			has_permission: {
				Args: { p_permission: Database['public']['Enums']['global_permission'] };
				Returns: boolean;
			};
			has_project_permission: {
				Args: {
					p_permission: Database['public']['Enums']['project_permission'];
					p_project_id: number;
				};
				Returns: boolean;
			};
			install_available_extensions_and_test: { Args: never; Returns: boolean };
			list_user_oauth_connections: {
				Args: { p_user_id: string };
				Returns: {
					client_id: string;
					client_name: string;
					latest_expires_at: string;
					scopes: string;
					token_count: number;
				}[];
			};
			promote_waitlist: {
				Args: { p_remote: boolean; p_slot_id: number };
				Returns: undefined;
			};
			register_to_slot: {
				Args: { p_remote: boolean; p_slot_id: number; p_to_excuse?: boolean };
				Returns: Database['public']['Enums']['registration_status'];
			};
			registration_list: {
				Args: { p_slot_id: number };
				Returns: {
					date_hour: string;
					feedback: string;
					member_avatar_url: string;
					member_id: string;
					member_username: string;
					present: boolean;
					remote: boolean;
					slot_id: number;
					status: Database['public']['Enums']['registration_status'];
					to_excuse: boolean;
				}[];
			};
			registration_target_status: {
				Args: { p_remote: boolean; p_slot_id: number };
				Returns: Database['public']['Enums']['registration_status'];
			};
			revoke_global_role: {
				Args: {
					p_profile: string;
					p_role: Database['public']['Enums']['global_role'];
				};
				Returns: undefined;
			};
			revoke_user_oauth_connection: {
				Args: { p_client_id: string; p_user_id: string };
				Returns: number;
			};
			send_training_email: {
				Args: { p_member_id?: string; p_slot_id: number; p_template: string };
				Returns: number;
			};
			send_training_reminders: { Args: never; Returns: undefined };
			submit_report: {
				Args: {
					p_description: string;
					p_image_urls?: string[];
					p_title: string;
					p_type: string;
				};
				Returns: number;
			};
			sync_training_slot_statuses: { Args: never; Returns: undefined };
			trainer_update_presence: {
				Args: { p_member_id: string; p_present?: boolean; p_slot_id: number };
				Returns: undefined;
			};
			training_director_ids: {
				Args: never;
				Returns: {
					id: string;
				}[];
			};
			training_list: {
				Args: never;
				Returns: {
					category: Database['public']['Enums']['training_category'];
					description: string;
					name: string;
					prerequisites: string;
					training_id: number;
				}[];
			};
			training_slot_detail: {
				Args: { p_slot_id: number };
				Returns: {
					category: Database['public']['Enums']['training_category'];
					description: string;
					duration_hours: number;
					excusable: boolean;
					location: string;
					name: string;
					on_site_registered: number;
					on_site_remaining: number;
					on_site_seats: number;
					on_site_waitlisted: number;
					prerequisites: string;
					remote_registered: number;
					remote_remaining: number;
					remote_seats: number;
					remote_waitlisted: number;
					slot_id: number;
					start: string;
					status: Database['public']['Enums']['slot_status'];
					trainer_avatar_url: string;
					trainer_id: string;
					trainer_username: string;
					training_id: number;
					video_conference_link: string;
				}[];
			};
			training_slot_list: {
				Args: { p_from?: string; p_to?: string };
				Returns: {
					category: Database['public']['Enums']['training_category'];
					description: string;
					duration_hours: number;
					excusable: boolean;
					location: string;
					name: string;
					on_site_registered: number;
					on_site_remaining: number;
					on_site_seats: number;
					on_site_waitlisted: number;
					prerequisites: string;
					remote_registered: number;
					remote_remaining: number;
					remote_seats: number;
					remote_waitlisted: number;
					slot_id: number;
					start: string;
					status: Database['public']['Enums']['slot_status'];
					trainer_avatar_url: string;
					trainer_id: string;
					trainer_username: string;
					training_id: number;
					video_conference_link: string;
				}[];
			};
		};
		Enums: {
			BankType: 'cash' | 'savings' | 'order';
			blog_state: 'draft' | 'published' | 'deleted';
			DocumentType: 'receipt' | 'invoice';
			ExpanseStatus: 'accepted' | 'pending' | 'refused';
			global_permission:
				| 'members.profile.read.all'
				| 'members.profile.update.all'
				| 'members.invite.send'
				| 'members.profile.status.update'
				| 'members.projects.update.all'
				| 'iam.roles.manage'
				| 'iam.overrides.manage'
				| 'training.catalog.read'
				| 'training.slot.read'
				| 'training.slot.manage'
				| 'training.registration.manage.self'
				| 'training.registration.read.all'
				| 'training.registration.manage.all'
				| 'training.presence.update'
				| 'training.summary_email.receive'
				| 'training.summary.discord.send'
				| 'training.story.discord.send'
				| 'orders.manage.self'
				| 'orders.read.all'
				| 'orders.create.all'
				| 'orders.lifecycle.update.all'
				| 'stats.read.all'
				| 'finance.read'
				| 'finance.write'
				| 'blog.draft.write'
				| 'blog.publish'
				| 'integration.smartshare.cast'
				| 'audit.logs.read'
				| 'audit.logs.read.security'
				| 'audit.events.export'
				| 'infra.environments.access';
			global_role:
				| 'super_admin'
				| 'president'
				| 'directorate'
				| 'secretary'
				| 'treasurer'
				| 'project_director'
				| 'training_director'
				| 'digital_department'
				| 'content_writer'
				| 'communication_director'
				| 'member'
				| 'guest';
			order_status:
				| 'pending_cdp'
				| 'pending_treso'
				| 'pending_delivery'
				| 'refused_cdp'
				| 'refused_treso'
				| 'canceled_user'
				| 'canceled_ops'
				| 'completed';
			profile_status: 'active' | 'disabled';
			project_permission:
				| 'orders.read.project'
				| 'orders.lifecycle.update.project'
				| 'members.projects.read.project';
			project_role: 'cdp' | 'project_member';
			registration_status: 'waitlisted' | 'registered' | 'canceled_by_user' | 'canceled_by_admin';
			roles: 'admin' | 'bureau' | 'cdp' | 'membre' | 'guest';
			slot_status: 'draft' | 'pending' | 'done' | 'postponed' | 'canceled';
			tags: 'méca' | 'info' | 'élek' | 'stock';
			training_category: 'code' | 'electronics' | 'robotic' | 'other' | 'software';
			update_type:
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
		};
		CompositeTypes: Record<never, never>;
	};
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- boilerplate généré (CompositeTypes vide => keyof never)
			keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			BankType: ['cash', 'savings', 'order'],
			blog_state: ['draft', 'published', 'deleted'],
			DocumentType: ['receipt', 'invoice'],
			ExpanseStatus: ['accepted', 'pending', 'refused'],
			global_permission: [
				'members.profile.read.all',
				'members.profile.update.all',
				'members.invite.send',
				'members.profile.status.update',
				'members.projects.update.all',
				'iam.roles.manage',
				'iam.overrides.manage',
				'training.catalog.read',
				'training.slot.read',
				'training.slot.manage',
				'training.registration.manage.self',
				'training.registration.read.all',
				'training.registration.manage.all',
				'training.presence.update',
				'training.summary_email.receive',
				'training.summary.discord.send',
				'training.story.discord.send',
				'orders.manage.self',
				'orders.read.all',
				'orders.create.all',
				'orders.lifecycle.update.all',
				'stats.read.all',
				'finance.read',
				'finance.write',
				'blog.draft.write',
				'blog.publish',
				'integration.smartshare.cast',
				'audit.logs.read',
				'audit.logs.read.security',
				'audit.events.export',
				'infra.environments.access'
			],
			global_role: [
				'super_admin',
				'president',
				'directorate',
				'secretary',
				'treasurer',
				'project_director',
				'training_director',
				'digital_department',
				'content_writer',
				'communication_director',
				'member',
				'guest'
			],
			order_status: [
				'pending_cdp',
				'pending_treso',
				'pending_delivery',
				'refused_cdp',
				'refused_treso',
				'canceled_user',
				'canceled_ops',
				'completed'
			],
			profile_status: ['active', 'disabled'],
			project_permission: [
				'orders.read.project',
				'orders.lifecycle.update.project',
				'members.projects.read.project'
			],
			project_role: ['cdp', 'project_member'],
			registration_status: ['waitlisted', 'registered', 'canceled_by_user', 'canceled_by_admin'],
			roles: ['admin', 'bureau', 'cdp', 'membre', 'guest'],
			slot_status: ['draft', 'pending', 'done', 'postponed', 'canceled'],
			tags: ['méca', 'info', 'élek', 'stock'],
			training_category: ['code', 'electronics', 'robotic', 'other', 'software'],
			update_type: [
				'order-creation',
				'comment',
				'update',
				'review-cdp-requested',
				'review-cdp-approved',
				'review-cdp-refused',
				'review-treso-requested',
				'review-treso-approved',
				'review-treso-refused',
				'order-pending-delivery',
				'order-canceled-user',
				'order-canceled-ops',
				'order-completed'
			]
		}
	}
} as const;

export type ItemRow = Tables<'items'>;
export type OrderRow = Tables<'orders'>;
export type ProjectRow = Tables<'projects'>;
export type TrainingCardStatus = 'complete' | 'free' | 'hidden' | 'registered' | 'waiting' | 'my';
