import modal from '@/components/modal/main'

// modal/main.js is a lazily-created singleton (appends its element/styles to
// document.body on first use) - guard init() so multiple pages calling this
// across the app's lifetime don't each append a duplicate modal + <style>.
let initialized = false

function ensureModalInit() {
    if (initialized) return
    modal.init()
    initialized = true
}

/**
 * Opens a confirm/cancel dialog for a destructive action (remove, clear, etc).
 * `message` is inserted as innerHTML - callers must normalizeHTML() any
 * dynamic values (anime titles, etc.) themselves before interpolating them
 * in, same convention as everywhere else user-derived text hits the DOM.
 *
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.message - pre-escaped HTML string
 * @param {string} [options.confirmLabel]
 * @param {() => void | Promise<void>} options.onConfirm
 */
export function confirmDestructive({ title, message, confirmLabel = 'Delete', onConfirm }) {
    ensureModalInit()

    modal.open({
        title,
        body: `<p class="modal-confirm-message">${message}</p>`,
        submitLabel: confirmLabel,
        variant: 'danger',
        onSubmit: async () => {
            await onConfirm()
        },
    })
}
