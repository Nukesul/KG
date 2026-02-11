import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gbeqpmijbnaxkluuqovn.supabase.co'

const supabaseAnonKey = 'sb_publishable_MwonKKcLTopZlOzdaFSJ7g_KNEJri-a'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
