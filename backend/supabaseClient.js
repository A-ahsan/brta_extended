// Supabase client for backend usage (ESM)
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase backend environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
