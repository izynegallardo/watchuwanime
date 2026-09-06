const STORAGE_KEY = 'allowMatureGenres'

export function getAllowMatureGenres() {
    return localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setAllowMatureGenres(allow) {
    localStorage.setItem(STORAGE_KEY, String(allow))
}

export function toggleAllowMatureGenres() {
    const next = !getAllowMatureGenres()
    setAllowMatureGenres(next)
    return next
}
