import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ymxendqyugynglswehyv.supabase.co';
const supabaseAnonKey = 'sb_publishable_dUjylZe5KMGDXbw2iImcBg_WKbv7y3y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);