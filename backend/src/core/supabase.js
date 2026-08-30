import { createClient } from '@supabase/supabase-js'

const projectURL = process.env.SUPABASE_PROJECT_URL
const privateKey = process.env.SUPABASE_API_KEY

if (!projectURL) throw new Error('Supabase project URL is missing or invalid.')
if (!privateKey) throw new Error('Supabase API key is missing or invalid.')

export const supabase = createClient(projectURL, privateKey)
