# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`@markitdown/core` — опенсорсная TypeScript-библиотека для конвертации HTML в Markdown. Работает в браузере (нативный DOMParser), Node.js и Bun (через pluggable DOM-адаптеры). Zero hard dependencies.

**Продуктовый контекст:** библиотека является ядром платного Chrome Extension для сохранения выделенных фрагментов страниц в Markdown. Ключевой сценарий — работа с пользовательским выделением (`selectionToMarkdown`), а не с полными страницами. Модуль Partial Selection (Модуль 2 в спеке) — приоритетный.

**Единственный источник правды:** `docs/LIBRARY_SPEC.md` — полная техническая спецификация с парами HTML→Markdown, антипаттернами и граничными случаями для каждого модуля.

## Commands

```bash
bun install                              # Install dependencies
bun test                                 # Run all tests
bun test tests/whitespace.test.ts        # Run single test file
bun test --coverage                      # With coverage (target: >90%)
bun run build                            # Build dist via tsup
bun run lint                             # ESLint
bun run lint:fix                         # ESLint auto-fix
bun run tsc                              # TypeScript type check
bun run format                           # Prettier format
bun run format:check                     # Check formatting

# Full validation before commit
bun test && bun run lint && bun run tsc && bun run format:check

# Pre-publish checks
npx @arethetypeswrong/cli --pack .       # Check types are correct
npx publint                              # Check package.json exports
```

## Architecture

### Conversion Pipeline

```
HTML string/Node
    ↓
[Sanitizer]   — удаление script/style/nav/footer, скрытых элементов, пустых обёрток
    ↓ clean DOM
[Parser]      — рекурсивный обход DOM, применение Rule по tagName
    ↓ raw markdown string
[Normalizer]  — сжатие 3+ переносов до 2, удаление trailing whitespace
    ↓
Markdown string
```

### Rule System

Каждый тег обрабатывается правилом в порядке приоритета:

1. Пользовательские (`options.rules`) — наивысший
2. Специальные (math, footnotes) — если опция включена
3. Стандартные (headings, inline, lists, code, tables, images, blockquote, paragraphs)
4. Keep-правила (HTML как есть)
5. Remove-правила (script, style и т.д.)
6. Default fallback (textContent)

```typescript
interface Rule {
  name: string;
  filter: string | string[] | ((el: Element) => boolean);
  replacement: (el: Element, childContent: string, options: MarkItDownOptions) => string;
}
```

### Multi-runtime DOM

- **browser.mjs** — нативный `DOMParser`, для бандлеров (Vite, esbuild, webpack)
- **server.mjs/cjs** — авто-детекция linkedom → happy-dom, для Node.js/Bun/SSR
- Серверные DOM-библиотеки подключаются через `dynamic import` — не попадают в браузерный бандл

### Whitespace (критический фундамент)

Три фазы нормализации:

1. **DOM-level** (в Sanitizer): `[\t\n\v\f\r ]+` → ` `. НЕ `\s+` (сломает `&nbsp;`). Исключения: `<pre>`, `<code>`, `<textarea>`, `<kbd>`, `<samp>`
2. **Flanking** (при конвертации inline): переносить внутренние пробелы наружу от `*`, `**`, `` ` ``
3. **Output** (после конвертации): сжать 3+ `\n` до `\n\n`, убрать trailing whitespace

### Build Outputs (tsup)

| Entry                                 | Format | Platform |
| ------------------------------------- | ------ | -------- |
| `src/browser.ts` → `dist/browser.mjs` | ESM    | browser  |
| `src/server.ts` → `dist/server.mjs`   | ESM    | node     |
| `src/server.ts` → `dist/server.cjs`   | CJS    | node     |

## Public API

```typescript
function toMarkdown(input: string | Node, options?: MarkItDownOptions): string;
function setDOMAdapter(adapter: DOMAdapterFn): void; // для Node.js/Bun
function selectionToMarkdown(selection: Selection, options?: MarkItDownOptions): string; // только браузер

interface MarkItDownOptions {
  baseUrl?: string;
  math?: boolean; // KaTeX/MathJax (default: false)
  complexTableFallback?: 'html' | 'text' | 'skip'; // default: 'html'
  rules?: Rule[];
  domAdapter?: DOMAdapterFn;
}
```

## Tests Structure

```
tests/
├── whitespace.test.ts, tables.test.ts, code.test.ts, math.test.ts, ...
├── integration/
│   ├── github.test.ts, wikipedia.test.ts, stackoverflow.test.ts, arxiv.test.ts
└── fixtures/          # реальные HTML-фрагменты с сайтов
```

Тест-кейсы — пары `{html input → expected markdown}`. Запускаются в двух рантаймах: Vitest (Node.js + browser mode) и `bun test`.

## Known Issues / Gotchas

### `Node` глобал не определён в Bun
`Node.TEXT_NODE`, `Node.ELEMENT_NODE` и т.д. — браузерные глобалы. В Bun выбрасывают `ReferenceError`.
**Решение:** использовать числовые константы: `TEXT_NODE = 3`, `ELEMENT_NODE = 1`, `DOCUMENT_NODE = 9`.

### `linkedom` нужен и в `peerDependencies`, и в `devDependencies`
`peerDependencies` не устанавливаются автоматически — для тестов linkedom должен быть явно в `devDependencies`.

## Performance Targets

| Метрика                              | Цель    |
| ------------------------------------ | ------- |
| browser entry (gzip)                 | < 15 KB |
| server entry (gzip)                  | < 20 KB |
| Конвертация 10 KB HTML, браузер      | < 50 мс |
| Конвертация 10 KB HTML, Bun+linkedom | < 30 мс |
| Покрытие тестами                     | > 90%   |
