
-- Create table for ElevenLabs API keys
CREATE TABLE IF NOT EXISTS public.eleven_labs_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  quota_remaining INTEGER,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.eleven_labs_api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select only their own API keys
CREATE POLICY "Users can view their own API keys"
  ON public.eleven_labs_api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert only their own API keys
CREATE POLICY "Users can create their own API keys"
  ON public.eleven_labs_api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own API keys
CREATE POLICY "Users can update their own API keys"
  ON public.eleven_labs_api_keys
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own API keys
CREATE POLICY "Users can delete their own API keys"
  ON public.eleven_labs_api_keys
  FOR DELETE
  USING (auth.uid() = user_id);
