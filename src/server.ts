import type { DOMAdapterFn, MarkItDownOptions } from './types.js';
import { setDOMAdapter as _setDOMAdapter, getAdapter } from './core/adapter.js';
import { sanitize } from './core/sanitizer.js';
import { convertChildren } from './core/parser.js';
import { normalize } from './core/normalizer.js';

export type { DOMAdapterFn, Rule, MarkItDownOptions } from './types.js';

export function toMarkdown(input: string | Node, options: MarkItDownOptions = {}): string {
  let root: Element | Document;
  if (typeof input === 'string') {
    const adapter = options.domAdapter ?? getAdapter();
    root = adapter(input);
  } else {
    root = input as Element;
  }
  sanitize(root);
  const raw = convertChildren(root as Element, options);
  return normalize(raw);
}

export function setDOMAdapter(adapter: DOMAdapterFn): void {
  _setDOMAdapter(adapter);
}
