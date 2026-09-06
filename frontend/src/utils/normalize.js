// Escapes text before it goes into an innerHTML template string.
// Needed for anything that comes from the dataset/API (titles, summaries),
// since those aren't hardcoded strings we control like the genre labels are.
const ESCAPE_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}

export function normalizeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}

export function normalizeDate(date) {
    if (!date) return ''

    const [year, month, day] = date.split('-')

    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}
