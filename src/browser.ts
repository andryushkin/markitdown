import type { MarkItDownOptions } from './types.js';
import { sanitize } from './core/sanitizer.js';
import { convertChildren } from './core/parser.js';
import { normalize } from './core/normalizer.js';
import { normalizeFragment } from './core/fragment.js';

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
  sanitize(root, 'full', options.math);
  const raw = convertChildren(root as Element, options);
  return normalize(raw);
}

export function selectionToMarkdown(selection: Selection, options: MarkItDownOptions = {}): string {
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') return '';

  const container = document.createElement('div');
  for (let i = 0; i < selection.rangeCount; i++) {
    container.appendChild(selection.getRangeAt(i).cloneContents());
  }

  normalizeFragment(container);
  sanitize(container, 'selection', options.math);
  const raw = convertChildren(container, options);
  return normalize(raw);
}
