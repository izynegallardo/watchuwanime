/**
 * Lightweight in-memory query cache - imitates TanStack Query's core idea
 * (queryKey + queryFn + staleTime) without the dependency.
 *
 * query(key, fn, opts)  ->  useQuery({ queryKey, queryFn, staleTime })
 * invalidate(key)       ->  queryClient.invalidateQueries({ queryKey })
 * peek(key)             ->  queryClient.getQueryData(queryKey)
 *
 * Lives for the tab's lifetime only - a full page refresh clears it, same
 * as every other store in this app (see core/useState.js).
 */

const store = new Map()

/**
 * Named TTL presets (in seconds).
 *
 *   SHORT   - frequently changing data
 *   DEFAULT - standard data
 *   LONG    - rarely changing data
 *   SESSION - never auto-expires; lives until page refresh or explicit invalidation
 */
export const TTL = {
    SHORT: 60, // 1 minute
    DEFAULT: 5 * 60, // 5 minutes
    LONG: 30 * 60, // 30 minutes
    SESSION: Infinity, // never auto-expires within the session
}

/**
 * Fetch data with caching.
 *
 * If a fresh (non-stale) entry exists, it's returned immediately without
 * calling `fn`. Otherwise `fn` is called, its result stored, then returned.
 *
 * @param {string} key
 * @param {Function} fn - async function that returns the data
 * @param {Object} [opts]
 * @param {number} [opts.staleTime] - seconds, defaults to TTL.DEFAULT
 */
export async function query(key, fn, opts = {}) {
    const staleTime = opts.staleTime ?? TTL.DEFAULT
    const entry = store.get(key)

    // Cache HIT: entry exists and hasn't expired -> skip the network call
    if (entry && Date.now() < entry.expiresAt) {
        return entry.data
    }

    // Cache MISS: call the real fetch function and store the result
    const data = await fn()
    store.set(key, {
        data,
        expiresAt: staleTime === Infinity ? Infinity : Date.now() + staleTime * 1000,
    })
    return data
}

/**
 * Synchronous read of a cache entry, or undefined if missing/expired.
 * Use this when you want to render already-cached data instantly on the
 * first render, without waiting a tick for query()'s promise to resolve.
 *
 * @param {string} key
 */
export function peek(key) {
    const entry = store.get(key)
    if (!entry || Date.now() >= entry.expiresAt) return undefined
    return entry.data
}

/**
 * Immediately mark a single cache entry as stale.
 * The next query() call for this key will re-fetch from the source.
 *
 * @param {string} key
 */
export function invalidate(key) {
    store.delete(key)
}

/**
 * Invalidate all keys that start with a given prefix.
 *
 * @param {string} prefix
 */
export function invalidateWith(prefix) {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key)
    }
}

/**
 * Wipe the entire cache.
 */
export function clearAll() {
    store.clear()
}
