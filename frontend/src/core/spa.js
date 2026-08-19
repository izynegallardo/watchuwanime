class SPA {
    routes = []

    constructor(config = {}) {
        this.context = {
            root: config?.root || document.querySelector('#app'),
        }

        this.defaultRoute = {
            key: '*',
            callback: (config?.defaultRoute || (() => {})).bind(this.context),
        }
    }

    add(path, cb) {
        this.routes.push({
            key: path,
            callback: cb.bind(this.context),
        })
    }

    get(path) {
        const route = this.routes.find(
            (r) => (r.key instanceof RegExp && r.key.test(path)) || r.key === path,
        )
        return route || this.defaultRoute
    }

    execute(path) {
        document.body.className = ''
        const route = this.get(path)
        let params

        if (route?.key && route?.key instanceof RegExp) {
            params = route.key.exec(window.location.pathname)

            if (params?.groups && Object.keys(params?.groups).length > 0) {
                params = params.groups
            } else {
                params = Array.from(params)
                params?.shift()
            }
        }

        route?.callback(params)
    }

    setDefault(cb) {
        this.defaultRoute = {
            key: '*',
            callback: cb,
        }
    }

    pushRoute(path) {
        history.pushState({}, '', path)
        this.execute(path)
    }

    handleClick(e) {
        // Walk up from e.target to find the nearest <a> ancestor.
        // This correctly handles clicks on child elements (e.g. <span> or <img> inside <a>).
        // Previously used e.currentTarget, which only works when the listener is bound
        // directly to the <a> — not with delegation.
        const anchor = e.target.closest('a')
        if (!anchor || !anchor.href) return

        try {
            const targetUrl = new URL(anchor.href)
            const target = anchor.getAttribute('target') || '_self'

            if (targetUrl.origin === window.location.origin && target === '_self') {
                // Guard: clicking a link to the current page would push a duplicate
                // history entry, meaning back would need an extra press to escape.
                if (targetUrl.pathname === window.location.pathname && !targetUrl.hash) {
                    e.preventDefault()
                    return
                }

                e.preventDefault()
                history.pushState({}, '', anchor.href)
                this.execute(window.location.pathname)

                // Scroll to hash target after render
                if (targetUrl.hash) {
                    const focusElem = document.querySelector(targetUrl.hash)
                    focusElem &&
                        setTimeout(
                            focusElem.scrollIntoView({
                                behavior: 'smooth',
                                block: 'end',
                                inline: 'nearest',
                            }),
                            500,
                        )
                }
            }
        } catch (err) {
            console.error('spa: cannot parse target href', err)
        }
    }

    /**
     * Register events
     *
     * @returns {void}
     *
     */
    handleRouteChanges() {
        window.addEventListener('popstate', () => {
            this.execute(window.location.pathname)
        })

        // Single delegated listener on document — replaces the MutationObserver approach.
        //
        // The MutationObserver bug: its callback fires asynchronously after all synchronous
        // DOM mutations complete. By the time the callback runs, Layout(), Header(), Main(),
        // and Footer() have ALL already written their content. So when mutation A
        // (#app → empty #header added) is processed, #header is already populated — and
        // getElementsByTagName('a') finds the nav links. Then mutation B (#header → the
        // <header class="app-header"> added) ALSO finds the same links. Every anchor ends
        // up with two click listeners, each calling pushState — resulting in two identical
        // history entries per navigation, requiring two back-button presses to escape.
        //
        // Event delegation is the correct pattern: one listener on document captures all
        // clicks on any <a> tag, present or future, with zero risk of double-registration.
        // This is how React Router, Vue Router, and all major SPA routers work.
        document.addEventListener('click', this.handleClick.bind(this))

        this.execute(window.location.pathname)
    }
}

export default SPA
