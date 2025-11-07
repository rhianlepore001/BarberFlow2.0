import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://szbaskgtpwtyskqnrifh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6YmFza2d0cHd0eXNrcW5yaWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MzI2NTIsImV4cCI6MjA3ODAwODY1Mn0.O3yiOvZ5IwF3k7xlHqXOyb7nz7r_hmOe3n9G7eSFZFY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
