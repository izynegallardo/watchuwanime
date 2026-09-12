const PING_INTERVAL_MS = 1000 * 60 * 60 * 24 * 3 // 3 days

async function ping() {
    try {
        const { supabase } = await import('../core/supabase.js')
        const { error } = await supabase.from('anime').select('id').limit(1)

        if (error) throw new Error(JSON.stringify(error))

        console.log(`[keep-alive] Supabase ping ok - ${new Date().toISOString()}`)
    } catch (error) {
        console.error('[keep-alive] Supabase ping failed:', error)
    }
}

/**
 * Starts the recurring Supabase keep-alive ping. No-op (returns null)
 * when Supabase credentials aren't configured - i.e. local/Docker dev
 * against Postgres directly, and any environment that hasn't set these.
 */
export function startSupabaseKeepAlive() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_API_KEY) {
        console.log('[keep-alive] Supabase credentials not set, skipping keep-alive ping.')
        return null
    }

    ping()

    return setInterval(ping, PING_INTERVAL_MS)
}
