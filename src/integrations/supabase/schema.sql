
-- Schema for ElevenLabs API keys
create table if not exists elevenlabs_api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  is_active boolean default true,
  quota_remaining integer,
  last_used timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster queries
create index if not exists elevenlabs_api_keys_user_id_idx on elevenlabs_api_keys(user_id);

-- Row level security policies for elevenlabs_api_keys
alter table elevenlabs_api_keys enable row level security;

-- Only allow users to see their own API keys
create policy "Users can view their own API keys"
  on elevenlabs_api_keys for select
  using (auth.uid() = user_id);

-- Only allow users to insert their own API keys
create policy "Users can insert their own API keys"
  on elevenlabs_api_keys for insert
  with check (auth.uid() = user_id);

-- Only allow users to update their own API keys
create policy "Users can update their own API keys"
  on elevenlabs_api_keys for update
  using (auth.uid() = user_id);

-- Only allow users to delete their own API keys
create policy "Users can delete their own API keys"
  on elevenlabs_api_keys for delete
  using (auth.uid() = user_id);

-- Add the initial ElevenLabs API key based on user-provided key
-- You would run this as a Supabase migration or manually after setup
