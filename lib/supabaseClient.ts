import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avodqajneytxiarbjrcp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2b2RxYWpuZXl0eGlhcmJqcmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzQxNDUsImV4cCI6MjA3ODExMDE0NX0.-mx1W_s2rSsVMqm8SFSDli4kFJaqlYmqqwaX7gS5Fto';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);