import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jaatnjdgxnluuhfvinzc.supabase.co';
const supabaseKey = 'sb_publishable_3bGOvR7tOU0PhLE-yHoEAA_JmI_nLhe';

export const supabase = createClient(supabaseUrl, supabaseKey);
