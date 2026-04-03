# @markitdown/core

[![npm version](https://img.shields.io/npm/v/@markitdown/core)](https://www.npmjs.com/package/@markitdown/core)
[![license](https://img.shields.io/npm/l/@markitdown/core)](./LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@markitdown/core)](https://bundlephobia.com/package/@markitdown/core)

TypeScript library for converting HTML to Markdown. Works in the browser (native `DOMParser`), Node.js, and Bun. Zero hard dependencies.

Powers the [Text to .md — HTML to Markdown Web Clipper](https://chromewebstore.google.com/detail/text-to-md-html-to-markdo/gkplehkbkofmdjhafgbclcmfcficoego) Chrome extension.

- **Browser-native** — uses `DOMParser`, no server-side code in your bundle
- **Multi-runtime** — Node.js and Bun via pluggable DOM adapters (linkedom / happy-dom)
- **Selection-aware** — `selectionToMarkdown()` captures user text selections exactly
- **Opt-in extras** — math (KaTeX / MathJax) and footnotes via flags
- **Extensible** — custom `Rule` system for site-specific transformations
- **Tiny** — ~6 KB gzip (browser entry), ~5 KB gzip (server entry)

## Installation

```bash
npm install @markitdown/core
# or
bun add @markitdown/core
# or
pnpm add @markitdown/core
```

## Quick Start

### Browser / Bundler (Vite, esbuild, webpack)

```typescript
import { toMarkdown } from '@markitdown/core'

// From HTML string
const md = toMarkdown('<h1>Hello</h1><p>World <strong>!</strong></p>')
// # Hello
//
// World **!**

// From a DOM node
const article = document.querySelector('article')!
const md = toMarkdown(article, { baseUrl: window.location.href })
```

### Node.js (ESM)

```typescript
import { toMarkdown, setDOMAdapter } from '@markitdown/core'
import { parseHTML } from 'linkedom'

setDOMAdapter((html) => parseHTML(html).document)

const md = toMarkdown('<p>Hello from <strong>Node.js</strong></p>')
// Hello from **Node.js**
```

### Node.js (CommonJS)

```javascript
const { toMarkdown, setDOMAdapter } = require('@markitdown/core')
const { parseHTML } = require('linkedom')

setDOMAdapter((html) => parseHTML(html).document)

const md = toMarkdown('<p>Hello</p>')
```

### Bun

```typescript
import { toMarkdown, setDOMAdapter } from '@markitdown/core'
import { parseHTML } from 'linkedom'

setDOMAdapter((html) => parseHTML(html).document)

const md = toMarkdown('<ul><li>One</li><li>Two</li></ul>')
// - One
// - Two
```

## selectionToMarkdown

The primary use case — convert what the user has selected on a page:

```typescript
import { selectionToMarkdown } from '@markitdown/core'

const selection = window.getSelection()
if (selection) {
  const md = selectionToMarkdown(selection, {
    baseUrl: window.location.href, // resolve relative links
    headingOffset: 1,              // h1→h2, h2→h3 for fragment context
  })
  await navigator.clipboard.writeText(md)
}
```

> `selectionToMarkdown` is only exported from the **browser** entry. It is not available in Node.js / Bun builds.

See [docs/CHROME_EXTENSION.md](./docs/CHROME_EXTENSION.md) for a complete Chrome Extension integration guide.

## API

### `toMarkdown(input, options?)`

```typescript
function toMarkdown(input: string | Node, options?: MarkItDownOptions): string
```

Converts an HTML string or DOM `Node` to Markdown.

### `selectionToMarkdown(selection, options?)`

```typescript
function selectionToMarkdown(selection: Selection, options?: MarkItDownOptions): string
```

Converts the browser's current text selection to Markdown. Browser entry only.

### `setDOMAdapter(adapter)`

```typescript
function setDOMAdapter(adapter: (html: string) => Document): void
```

Sets the DOM parser for Node.js / Bun. Must be called before `toMarkdown`.

### `MarkItDownOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | — | Resolve relative URLs in `href` and `src` attributes |
| `math` | `boolean` | `false` | Enable math conversion (KaTeX, MathJax v2/v3, Wikipedia) |
| `footnotes` | `boolean` | `false` | Enable footnote conversion |
| `complexTableFallback` | `'html' \| 'text' \| 'skip'` | `'html'` | Behavior for tables with merged cells |
| `headingOffset` | `number` | `0` | Shift heading levels (`1` turns h1→h2, h2→h3, …) |
| `rules` | `Rule[]` | `[]` | Custom rules with highest priority |
| `domAdapter` | `(html: string) => Document` | — | Per-call DOM adapter override |

### `Rule`

```typescript
interface Rule {
  name: string
  filter: string | string[] | ((el: Element) => boolean)
  replacement: (el: Element, childContent: string, options: MarkItDownOptions) => string
}
```

## Supported Elements

| HTML | Markdown |
|------|----------|
| `<h1>`–`<h6>` | `#`–`######` |
| `<p>` | Paragraph with blank lines |
| `<br>` | Hard line break |
| `<hr>` | `---` |
| `<strong>`, `<b>` | `**bold**` |
| `<em>`, `<i>` | `*italic*` |
| `<del>`, `<s>` | `~~strikethrough~~` |
| `<code>` (inline) | `` `code` `` |
| `<pre><code>` | Fenced code block with language |
| `<a>` | `[text](url)` |
| `<img>` | `![alt](src)` |
| `<ul>` | `- item` |
| `<ol>` | `1. item` |
| `<li>` + `<input type="checkbox">` | `[x]` / `[ ]` task list |
| `<blockquote>` | `> quote` |
| `<table>` | GFM pipe table |
| `<script>`, `<style>`, `<nav>`, `<footer>` | Removed |

Code blocks support language detection from class attributes used by Prism.js, highlight.js, GitHub, SyntaxHighlighter, and Pandoc.

Images support `src`, `data-src` (lazy loading), and `srcset`. Spacer and tracking pixels are filtered out.

## Options in Depth

### Math

```typescript
// KaTeX, MathJax v2/v3, and Wikipedia-style math
toMarkdown(html, { math: true })
// inline:  $E = mc^2$
// display: $$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$
```

### Footnotes

```typescript
toMarkdown(html, { footnotes: true })
// → Text[^1]
//
// [^1]: Footnote content
```

### Complex Tables

Tables with merged cells (`colspan` / `rowspan`) cannot be expressed in GFM. Three strategies:

```typescript
toMarkdown(html, { complexTableFallback: 'html' })  // keep original HTML (default)
toMarkdown(html, { complexTableFallback: 'text' })  // extract plain text
toMarkdown(html, { complexTableFallback: 'skip' })  // omit the table entirely
```

### Heading Offset

Useful when capturing a page fragment where the top-level heading should not be `h1`:

```typescript
toMarkdown('<h1>Section</h1><h2>Subsection</h2>', { headingOffset: 1 })
// ## Section
//
// ### Subsection
```

### Custom Rules

```typescript
toMarkdown(html, {
  rules: [
    // Add ==highlight== syntax for <mark>
    {
      name: 'mark',
      filter: 'mark',
      replacement: (_el, content) => `==${content}==`,
    },
    // Function filter for attribute-based matching
    {
      name: 'callout',
      filter: (el) => el.tagName === 'DIV' && el.hasAttribute('data-callout'),
      replacement: (_el, content) => `> **Note:** ${content}`,
    },
  ],
})
```

Rules are applied in priority order: custom → math/footnotes → standard → keep → remove → default fallback.

## Multi-runtime

| Environment | Entry | DOM |
|-------------|-------|-----|
| Browser / Chrome Extension | `dist/browser.mjs` | Native `DOMParser` |
| Node.js ESM | `dist/server.mjs` | linkedom or happy-dom |
| Node.js CJS | `dist/server.cjs` | linkedom or happy-dom |
| Bun | `dist/server.mjs` | linkedom or happy-dom |

The correct entry point is resolved automatically via `package.json` `exports` conditions (`browser`, `bun`, `node`). Install the DOM adapter of your choice:

```bash
npm install linkedom
# or
npm install happy-dom
```

The server entry auto-detects linkedom → happy-dom via dynamic import. DOM adapters are not bundled — they never appear in browser builds.

## Performance

| Metric | Target |
|--------|--------|
| Browser entry (gzip) | < 15 KB |
| Server entry (gzip) | < 20 KB |
| 10 KB HTML, browser | < 50 ms |
| 10 KB HTML, Bun + linkedom | < 30 ms |
| Test coverage | > 90% |

## Contributing

Bug reports, questions, and pull requests are welcome. See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details.

```bash
bun install                                                    # install dependencies
bun test                                                       # run tests
bun run build                                                  # build dist/
bun test && bun run lint && bun run tsc && bun run format:check  # full validation
```

## License

MIT
