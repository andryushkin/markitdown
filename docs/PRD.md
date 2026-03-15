# PRD: @markitdown/core — Фазы разработки

Документ отслеживает поэтапную реализацию библиотеки.
Единственный источник правды по поведению: [`docs/LIBRARY_SPEC.md`](./LIBRARY_SPEC.md).

## Статусы

- `[ ]` — не начато
- `[~]` — в процессе
- `[x]` — завершено + тесты проходят

---

## Phase 0: Infrastructure ✅

Настройка проекта и инструментария.

- [x] `package.json` с exports (browser/server/cjs)
- [x] `tsconfig.json` (strict mode)
- [x] `tsup.config.ts` (два entry points: `src/browser.ts`, `src/server.ts`)
- [x] ESLint + Prettier конфигурация
- [x] Vitest конфигурация (node + browser mode)
- [x] Базовая структура `src/` и `tests/`

---

## Phase 1: Core Engine ✅

Фундамент всего конвертера.

- [x] DOM adapter interface + `setDOMAdapter()`
- [x] Rule system (`findRule`, применение правил, приоритеты 1–6)
- [x] Parser (рекурсивный обход: `convert()`, `convertChildren()`)
- [x] Sanitizer (удаление тегов, скрытые элементы, пустые обёртки)
- [x] Normalizer (финальная нормализация строки)
- [x] Whitespace Phase 1 — DOM-level collapsing (`[\t\n\v\f\r ]+` → ` `, исключая `<pre>/<code>/<textarea>/<kbd>/<samp>`)
- [x] Whitespace Phase 2 — flanking (`extractFlankingWhitespace()` в `src/utils/flanking.ts`)
- [x] Whitespace Phase 3 — output normalization (3+ `\n` → `\n\n`, trailing whitespace)
- [x] **Tests:** `tests/whitespace.test.ts` (13 кейсов), `tests/sanitizer.test.ts` (8 кейсов)

---

## Phase 2: Block Elements

- [ ] Headings (`<h1>`–`<h6>` → ATX `#`)
- [ ] Paragraphs (`<p>`) и Breaks (`<br>`)
- [ ] Blockquotes (`<blockquote>` → `>`)
- [ ] **Tests:** `tests/headings.test.ts`, `tests/paragraphs.test.ts`, `tests/blockquote.test.ts`

---

## Phase 3: Lists

- [ ] Unordered lists (`<ul>/<li>` → `-`)
- [ ] Ordered lists (`<ol>/<li>` → `1.`)
- [ ] Nested lists (сохранение уровней отступа)
- [ ] **Tests:** `tests/lists.test.ts`

---

## Phase 4: Inline Elements

- [ ] Strong (`<strong>/<b>` → `**`)
- [ ] Em (`<em>/<i>` → `*`)
- [ ] Del (`<del>/<s>` → `~~`)
- [ ] Sub (`<sub>`), Sup (`<sup>`), Mark (`<mark>`)
- [ ] Inline code (`<code>` вне `<pre>` → `` ` ``)
- [ ] **Tests:** `tests/inline.test.ts`

---

## Phase 5: Links & Images

- [ ] Links: абсолютные URL
- [ ] Links: относительные URL (резолвинг через `options.baseUrl`)
- [ ] Links: title атрибут
- [ ] Links: autolinks, `mailto:`, `tel:`
- [ ] Images: `src`, `data-src` (lazy loading), `alt`, `title`
- [ ] **Tests:** `tests/links.test.ts`, `tests/images.test.ts`

---

## Phase 6: Code Blocks

- [ ] Fenced code blocks (` ``` `)
- [ ] Language detection (`class="language-*"`, `data-lang`)
- [ ] Сохранение whitespace внутри `<pre>/<code>`
- [ ] **Tests:** `tests/code.test.ts`

---

## Phase 7: Tables

- [ ] Simple GFM pipe tables
- [ ] Complex tables (colspan/rowspan) → fallback: `'html' | 'text' | 'skip'` (опция `complexTableFallback`)
- [ ] **Tests:** `tests/tables.test.ts`

---

## Phase 8: Selection API ← КЛЮЧЕВАЯ ФИЧА

Приоритетный модуль — ядро Chrome Extension.

- [ ] `selectionToMarkdown(selection: Selection, options?: MarkItDownOptions): string`
- [ ] Partial Selection: нормализация произвольного DOM-фрагмента (Selection → DocumentFragment)
- [ ] Sanitizer в режиме selection (не удалять `<nav>/<aside>` — контекст может быть нужен)
- [ ] Граничные случаи: выделение пересекает несколько блоков, частично выделенные списки/таблицы
- [ ] **Tests:** `tests/selection.test.ts`

---

## Phase 9: Build & Publish Validation

- [ ] Bundle size check (browser entry < 15 KB gzip, server entry < 20 KB gzip)
- [ ] `npx @arethetypeswrong/cli --pack .` — корректность типов
- [ ] `npx publint` — корректность `package.json` exports
- [ ] Integration tests: `tests/integration/` (github, wikipedia, stackoverflow, arxiv)
- [ ] Performance benchmark (10 KB HTML: браузер < 50 мс, Bun+linkedom < 30 мс)

---

## Phase 10: Math (после v1.0)

- [ ] KaTeX extraction
- [ ] MathJax v2/v3
- [ ] Wikipedia формулы
- [ ] **Tests:** `tests/math.test.ts`

---

## Phase 11: Footnotes (v2.0)

- [ ] Markdown footnote syntax `[^1]`
- [ ] **Tests:** `tests/footnotes.test.ts`
