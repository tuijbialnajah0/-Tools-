import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsschswsnpdlpfuuofbb.supabase.co';
const supabaseAnonKey = 'sb_publishable_eWXNLjPZZdIpf4yKwFe-Yg_Ab50hA98';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
