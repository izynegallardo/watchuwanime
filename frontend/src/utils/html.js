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

export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char])
}
