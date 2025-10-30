import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = 'https://jliqbvpbplpthuyhqofj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaXFidnBicGxwdGh1eWhxb2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDk0NTIsImV4cCI6MjA3NzIyNTQ1Mn0.wbuiy6m30Snzf5c66QE5v6F6p-buwYhfRBdhocO3-p4';

// Use the generated Supabase types for full type safety
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
