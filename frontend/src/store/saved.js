import { useState } from '@/core/useState'
import { getSavedIds } from '@/utils/saved'

// Mirrors utils/saved.js's localStorage state in reactive form, so every
// mounted save button (resultPage/animePage cards) and the /saved page can
// stay in sync with each other without polling. utils/saved.js remains the
// actual source of truth/persistence - this is purely a notification layer
// on top of it.
export const [savedIds, setSavedIds, subscribeSavedIds] = useState(getSavedIds())

/**
 * Call this right after any utils/saved.js mutation (toggleSaved/clearSaved)
 * to push localStorage's new state into the store and notify subscribers.
 * Always creates a fresh array, so every call fires subscribers - that's
 * intentional, since "the save state changed" is exactly what this signals,
 * even if the resulting id list happens to look the same.
 */
export function syncSavedIds() {
    setSavedIds(getSavedIds())
}
