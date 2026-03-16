import type { MarkItDownOptions } from './types.js';
import { sanitize } from './core/sanitizer.js';
import { convertChildren } from './core/parser.js';
import { normalize } from './core/normalizer.js';
import { normalizeFragment } from './core/fragment.js';
import { collectFootnoteDefs, buildFootnotesSection } from './core/footnotes.js';

export type { DOMAdapterFn, Rule, MarkItDownOptions } from './types.js';

export function toMarkdown(input: string | Node, options: MarkItDownOptions = {}): string {
  let root: Element | Document;
  if (typeof input === 'string') {
    const adapter =
      options.domAdapter ?? ((html: string) => new DOMParser().parseFromString(html, 'text/html'));
    root = adapter(input);
  } else {
    root = input as Element;
  }

  const footnoteDefs = options.footnotes ? collectFootnoteDefs(root, options) : undefined;

  sanitize(root, 'full', options.math);
  const raw = convertChildren(root as Element, options);
  let result = normalize(raw);

  if (footnoteDefs && footnoteDefs.size > 0) {
    result = result.trimEnd() + '\n\n' + buildFootnotesSection(footnoteDefs);
  }
  return result;
}

/** Находит ближайший <table> в живом DOM, поднимаясь вверх от node */
function findAncestorTable(node: Node): Element | null {
  let current: Node | null = node.nodeType === 1 ? node : (node as Text).parentElement;
  while (current) {
    if ((current as Element).tagName?.toLowerCase() === 'table') return current as Element;
    current = (current as Element).parentElement ?? null;
  }
  return null;
}

/** Возвращает строку-шапку из исходной таблицы — ТОЛЬКО если есть явный <thead> */
function getTableHeaderRow(table: Element): Element | null {
  return table.querySelector('thead tr') ?? null;
}

/**
 * Обходит фрагмент и собирает все <tr> элементы.
 * Случаи:
 *   - commonAncestorContainer = <tbody>  → фрагмент содержит <tr> напрямую
 *   - commonAncestorContainer = <table>  → фрагмент содержит <thead>/<tbody>/<tr>
 *   - commonAncestorContainer = <tr>     → фрагмент содержит <td>/<th>,
 *                                          нужно обернуть в один <tr>
 */
function collectFragmentRows(fragment: DocumentFragment, doc: Document): Element[] {
  const rows: Element[] = [];

  function walk(node: Node): void {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (tag === 'tr') {
        rows.push(el);
      } else if (['table', 'thead', 'tbody', 'tfoot'].includes(tag)) {
        walk(child);
      }
    }
  }

  walk(fragment);

  // Если <tr> не нашли — возможно, commonAncestor был <tr>,
  // и фрагмент содержит td/th напрямую → оборачиваем в один <tr>
  if (rows.length === 0) {
    const cells = Array.from(fragment.querySelectorAll('td, th')) as Element[];
    if (cells.length > 0) {
      const tr = doc.createElement('tr');
      for (const cell of cells) tr.appendChild(cell.cloneNode(true));
      rows.push(tr);
    }
  }

  return rows;
}

/** Строит DocumentFragment с таблицей. headerRow может быть null (нет явного thead) */
function buildTableFragment(
  headerRow: Element | null,
  bodyRows: Element[],
  doc: Document,
): DocumentFragment {
  const frag = doc.createDocumentFragment();
  const table = doc.createElement('table');

  if (headerRow) {
    const thead = doc.createElement('thead');
    thead.appendChild(headerRow.cloneNode(true));
    table.appendChild(thead);
  }

  const tbody = doc.createElement('tbody');
  for (const row of bodyRows) tbody.appendChild(row.cloneNode(true));
  table.appendChild(tbody);

  frag.appendChild(table);
  return frag;
}

/**
 * Если range находится внутри таблицы — возвращает обогащённый фрагмент
 * с шапкой оригинальной таблицы + выделенными строками.
 * Если шапка уже входит в выделение — не дублирует.
 * Если range не в таблице — возвращает null (использовать cloneContents()).
 */
function tryEnrichTableFragment(range: Range): DocumentFragment | null {
  const ancestorTable = findAncestorTable(range.commonAncestorContainer);
  if (!ancestorTable) return null;

  const rawFragment = range.cloneContents();
  const doc = ancestorTable.ownerDocument!;
  const selectedRows = collectFragmentRows(rawFragment, doc);

  if (selectedRows.length === 0) return null;

  const originalHeaderRow = getTableHeaderRow(ancestorTable);

  if (originalHeaderRow) {
    // Проверяем: не выделена ли уже шапка
    const headerText = originalHeaderRow.textContent?.trim() ?? '';
    const firstRowText = selectedRows[0]!.textContent?.trim() ?? '';
    const headerAlreadySelected = headerText !== '' && headerText === firstRowText;

    if (headerAlreadySelected) {
      // Шапка уже есть в выделении — оформляем корректную структуру
      return buildTableFragment(selectedRows[0]!, selectedRows.slice(1), doc);
    }
    // Шапка не выделена — добавляем из оригинала
    return buildTableFragment(originalHeaderRow, selectedRows, doc);
  }

  // Нет <thead> — оборачиваем строки в таблицу без шапки
  return buildTableFragment(null, selectedRows, doc);
}

export function selectionToMarkdown(selection: Selection, options: MarkItDownOptions = {}): string {
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') return '';

  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const fragment = tryEnrichTableFragment(range) ?? range.cloneContents();
    container.appendChild(fragment);
  }

  normalizeFragment(container);
  sanitize(container, 'selection', options.math);
  const raw = convertChildren(container, options);
  return normalize(raw);
}
