const STORAGE_KEY = 'watchuwanime:saved'

/**
 * Reads the saved list from localStorage, normalized to {paheId, dateAdded}.
 * Guarded with try/catch since localStorage can throw in private-browsing
 * modes or when a corrupted/foreign value sits under the key.
 *
 * Back-compat: earlier versions stored a flat array of paheId strings.
 * Any string entries found are upgraded to the {paheId, dateAdded} shape
 * in-memory (dateAdded backfilled to "now") so old localStorage data isn't
 * wiped out by this change - it's rewritten to the new shape next persist().
 */
function readEntries() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []

        return parsed.map((entry) =>
            typeof entry === 'string'
                ? { paheId: entry, dateAdded: new Date().toISOString() }
                : entry,
        )
    } catch {
        return []
    }
}

function persist(entries) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
        // Storage full or blocked - fail silently, nothing the user can act on
    }
}

/**
 * Full saved entries, each {paheId, dateAdded}. Used by the Saved page,
 * which needs dateAdded for its "date added" column.
 */
export function getSavedEntries() {
    return readEntries()
}

/**
 * Just the paheIds, in save order. This is the shape every other caller
 * (card save-icon, animePage) actually needs.
 */
export function getSavedIds() {
    return readEntries().map((entry) => entry.paheId)
}

export function isSaved(paheId) {
    return readEntries().some((entry) => entry.paheId === paheId)
}

/**
 * Adds or removes a paheId from the saved list.
 * Returns the new saved state (true = now saved) so callers can update
 * a button's appearance without a separate isSaved() lookup.
 *
 * Note: this only touches localStorage. Callers that need every mounted
 * card/page to react to the change (not just their own button) should
 * follow this with store/saved.js's syncSavedIds().
 */
export function toggleSaved(paheId) {
    const entries = readEntries()
    const index = entries.findIndex((entry) => entry.paheId === paheId)

    if (index === -1) {
        persist([...entries, { paheId, dateAdded: new Date().toISOString() }])
        return true
    }

    persist(entries.filter((entry) => entry.paheId !== paheId))
    return false
}

/**
 * Wipes the entire saved list. Used by the Settings "Clear data" button.
 */
export function clearSaved() {
    persist([])
}
