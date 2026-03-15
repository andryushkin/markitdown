import type { Rule, MarkItDownOptions } from '../types.js';
import { convert } from '../core/parser.js';

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

interface TableAnalysis {
  level: 'simple' | 'medium' | 'complex';
  hasHead: boolean;
  columns: number;
  rows: number;
}

function analyzeTable(table: Element): TableAnalysis {
  const hasColspan = !!table.querySelector('[colspan]');
  const hasRowspan = !!table.querySelector('[rowspan]');
  const hasNestedTable = !!table.querySelector('table table');
  const hasBlockContent = !!table.querySelector(
    'td > ul, td > ol, td > pre, td > blockquote, td > h1, td > h2, td > h3, td > h4, td > h5, td > h6, td > table',
  );
  const hasHead = !!table.querySelector('thead');
  const firstRow = table.querySelector('tr');
  const columns = firstRow ? firstRow.querySelectorAll('td, th').length : 0;
  const rows = table.querySelectorAll('tr').length;

  if (hasColspan || hasRowspan || hasNestedTable || hasBlockContent) {
    return { level: 'complex', hasHead, columns, rows };
  }

  if (!hasHead) {
    return { level: 'medium', hasHead, columns, rows };
  }

  return { level: 'simple', hasHead, columns, rows };
}

function getCellContent(cell: Element, options: MarkItDownOptions): string {
  let text = '';
  for (const child of Array.from(cell.childNodes)) {
    if (child.nodeType === ELEMENT_NODE) {
      const el = child as Element;
      if (el.tagName.toLowerCase() === 'br') {
        text += '<br>';
      } else {
        text += convert(child, options);
      }
    } else if (child.nodeType === TEXT_NODE) {
      text += child.textContent ?? '';
    }
  }
  return text.trim().replace(/\|/g, '\\|');
}

function getAlignment(cell: Element): string {
  const style = cell.getAttribute('style') ?? '';
  if (/text-align\s*:\s*center/i.test(style)) return ':center:';
  if (/text-align\s*:\s*right/i.test(style)) return ':right:';
  if (/text-align\s*:\s*left/i.test(style)) return ':left:';
  return 'none';
}

function buildSeparator(width: number, alignment: string): string {
  const w = Math.max(width, 3);
  if (alignment === ':center:') return ':' + '-'.repeat(Math.max(w - 2, 1)) + ':';
  if (alignment === ':right:') return '-'.repeat(Math.max(w - 1, 2)) + ':';
  if (alignment === ':left:') return ':' + '-'.repeat(Math.max(w - 1, 2));
  return '-'.repeat(w);
}

function buildGFMTable(headers: string[], bodyRows: string[][], alignments: string[]): string {
  const colWidths = headers.map((h, i) => {
    const maxBody = bodyRows.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
    return Math.max(h.length, maxBody, 3);
  });

  const padCell = (content: string, width: number) => content.padEnd(width);

  const headerLine = '| ' + headers.map((h, i) => padCell(h, colWidths[i] ?? 3)).join(' | ') + ' |';

  const separatorLine =
    '| ' +
    headers.map((_, i) => buildSeparator(colWidths[i] ?? 3, alignments[i] ?? 'none')).join(' | ') +
    ' |';

  const bodyLines = bodyRows.map(
    (row) =>
      '| ' + headers.map((_, i) => padCell(row[i] ?? '', colWidths[i] ?? 3)).join(' | ') + ' |',
  );

  return [headerLine, separatorLine, ...bodyLines].join('\n');
}

function serializeComplexTable(table: Element): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  const lines: string[] = ['<table>'];
  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('td, th'));
    const cellsHTML = cells
      .map((cell) => {
        const tag = cell.tagName.toLowerCase();
        const attrs = Array.from(cell.attributes)
          .map((a) => ` ${a.name}="${a.value}"`)
          .join('');
        return `<${tag}${attrs}>${cell.textContent?.trim() ?? ''}</${tag}>`;
      })
      .join('');
    lines.push(`<tr>${cellsHTML}</tr>`);
  }
  lines.push('</table>');
  return lines.join('\n');
}

export const TABLE_RULES: Rule[] = [
  {
    name: 'table',
    filter: 'table',
    replacement(el, _childContent, options) {
      const analysis = analyzeTable(el);

      if (analysis.level === 'complex') {
        const fallback = options.complexTableFallback ?? 'html';
        if (fallback === 'skip') return '';
        if (fallback === 'text') {
          const rows = Array.from(el.querySelectorAll('tr'));
          const text = rows
            .map((row) => {
              const cells = Array.from(row.querySelectorAll('td, th'));
              return cells.map((c) => c.textContent?.trim() ?? '').join(' | ');
            })
            .join('\n');
          return `\n\n${text}\n\n`;
        }
        // 'html' fallback (default)
        return `\n\n${serializeComplexTable(el)}\n\n`;
      }

      // Simple or medium: build GFM pipe table
      const allRows = Array.from(el.querySelectorAll('tr'));

      let headerRow: Element | null = null;
      let bodyRowEls: Element[] = [];

      if (analysis.hasHead) {
        headerRow = el.querySelector('thead tr') ?? null;
        bodyRowEls = Array.from(el.querySelectorAll('tbody tr'));
      } else {
        headerRow = allRows[0] ?? null;
        bodyRowEls = allRows.slice(1);
      }

      if (!headerRow) return '';

      const headerCells = Array.from(headerRow.querySelectorAll('td, th'));
      const headers = headerCells.map((c) => getCellContent(c, options));
      const alignments = headerCells.map(getAlignment);

      const bodyData = bodyRowEls.map((row) => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        return cells.map((c) => getCellContent(c, options));
      });

      if (headers.every((h) => !h) && bodyData.length === 0) return '';

      return `\n\n${buildGFMTable(headers, bodyData, alignments)}\n\n`;
    },
  },
  {
    name: 'table-structural',
    filter: ['thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption'],
    replacement(_el, childContent) {
      return childContent;
    },
  },
];
