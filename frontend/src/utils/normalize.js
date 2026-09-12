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

// "4 days ago" style relative time, matching the reference design for the
// Saved page's date-added column. Takes a full ISO timestamp (unlike
// normalizeDate above, which expects a plain YYYY-MM-DD date).
export function normalizeRelativeDate(isoString) {
    if (!isoString) return ''

    const diffSeconds = Math.max(0, (Date.now() - new Date(isoString).getTime()) / 1000)
    const UNITS = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ]

    for (const [label, secondsInUnit] of UNITS) {
        const value = Math.floor(diffSeconds / secondsInUnit)
        if (value >= 1) return `${value} ${label}${value > 1 ? 's' : ''} ago`
    }

    return 'just now'
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
