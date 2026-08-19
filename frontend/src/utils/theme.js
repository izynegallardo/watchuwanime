const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')

export function getTheme() {
    return localStorage.getItem('theme') ?? 'system'
}

export function isDarkTheme() {
    const theme = getTheme()

    if (theme === 'system') {
        return mediaQueryList.matches
    }

    return theme === 'dark'
}

export function applyTheme(theme) {
    const isDark = theme === 'system' ? mediaQueryList.matches : theme === 'dark'

    document.documentElement.classList.toggle('dark', isDark)
}

export function setTheme(theme) {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
}

export function toggleTheme() {
    setTheme(isDarkTheme() ? 'light' : 'dark')
}

export function initTheme() {
    applyTheme(getTheme())

    mediaQueryList.addEventListener('change', () => {
        if (getTheme() === 'system') {
            applyTheme('system')
        }
    })
}
