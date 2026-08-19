# vanilla-spa

Single-Page Application (SPA) built with vanilla JavaScript boilerplate,

## Stack

- Vite
- Vanilla JavaScript
- CSS Modules

## Quick Start

Clone the repo with:

```bash
git clone https://github.com/izynegallardo/vanilla-spa.git
```

## Getting Started

```bash
npm install
npm run dev
```

Other available scripts:

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build locally
```

## Project Structure

```
index.html               # HTML entry point, mounts #app
src/
  main.js                # Entry point - creates the SPA instance and registers routes
  core/
    spa.js               # Router: route matching, history, link click handling
    useState.js          # Minimal reactive state helper (get, set, subscribe)
  layouts/
    default.js           # Shared header/main/footer shell used by pages
  pages/                 # Route handlers - build a layout and mount components into it
  components/            # UI pieces, one folder per component (main.js + component.module.css, event.js)
  store/                 # App-wide state created with useState
  lib/                   # Third-party client setup (e.g. axios)
  styles/                # Global CSS
  assets/                # Static assets bundled by Vite
public/                  # Static assets served as-is
```

## Routing

Routes are registered in `src/main.js`:

```js
app.add('/', HomePage)
app.add(/\/pages\/(?<id>\d+)/i, Page)
```

- A path can be a string (exact match) or a `RegExp` (supports named capture groups, passed to the page as `params`).
- `defaultRoute` in the `SPA` config handles unmatched paths (404).
- Internal link clicks are intercepted automatically (event delegation on `document`) and pushed through `history.pushState` - no full page reload.

## State

`useState` returns a `[get, set, subscribe]` tuple, similar in spirit to a signal:

```js
import { useState } from '../core/useState'

export const [count, setCount] = useState(0)
```

Call `subscribe(fn)` to re-run `fn` whenever the value changes - useful for updating the DOM from a component without a virtual DOM diff.
