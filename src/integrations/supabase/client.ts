
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cvfqcvytoobplgracobg.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2ZnFjdnl0b29icGxncmFjb2JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY4MzYwMDAsImV4cCI6MjAzMjE5ODQwMH0.KqTC1Mjb-k11j8CzRYs5FY-rp6FTFn9BcnLLTsz-1M0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
