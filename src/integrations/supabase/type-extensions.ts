
import { Database as SupabaseDatabase } from './types';

// Extend the Database type to include our elevenlabs_api_keys table
declare module './types' {
  interface Database {
    public: {
      Tables: {
        elevenlabs_api_keys: {
          Row: {
            id: string;
            user_id: string;
            key: string;
            name: string;
            is_active: boolean;
            quota_remaining: number | null;
            last_used: string | null;
            created_at: string;
            updated_at: string | null;
          };
          Insert: {
            id?: string;
            user_id: string;
            key: string;
            name: string;
            is_active?: boolean;
            quota_remaining?: number | null;
            last_used?: string | null;
            created_at?: string;
            updated_at?: string | null;
          };
          Update: {
            id?: string;
            user_id?: string;
            key?: string;
            name?: string;
            is_active?: boolean;
            quota_remaining?: number | null;
            last_used?: string | null;
            created_at?: string;
            updated_at?: string | null;
          };
          Relationships: [
            {
              foreignKeyName: "elevenlabs_api_keys_user_id_fkey";
              columns: ["user_id"];
              referencedRelation: "users";
              referencedColumns: ["id"];
            }
          ];
        };
      } & SupabaseDatabase['public']['Tables'];
      Views: SupabaseDatabase['public']['Views'];
      Functions: SupabaseDatabase['public']['Functions'];
      Enums: SupabaseDatabase['public']['Enums'];
      CompositeTypes: SupabaseDatabase['public']['CompositeTypes'];
    };
  }
}

// Export types for use in other files
export type Database = SupabaseDatabase;
