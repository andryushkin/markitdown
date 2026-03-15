import type { Rule, MarkItDownOptions } from '../types.js';

// Стандартные правила — заполнятся в Phase 2–7
export const STANDARD_RULES: Rule[] = [];

// 4. Keep-rules (HTML as-is) — заполнятся по необходимости
export const KEEP_RULES: Rule[] = [];

// 5. Remove-rules
export const REMOVE_RULES: Rule[] = [
  {
    name: 'remove',
    filter: ['script', 'style', 'noscript', 'iframe', 'object', 'embed'],
    replacement: () => '',
  },
];

// 6. Default fallback
export const DEFAULT_RULE: Rule = {
  name: 'default',
  filter: () => true,
  replacement: (_el, childContent) => childContent,
};

export function findRule(el: Element, options: MarkItDownOptions): Rule {
  // Priority 1: user rules
  for (const rule of options.rules ?? []) {
    if (matches(el, rule.filter)) return rule;
  }
  // Priority 2: special rules (math/footnotes) — Phase 10/11
  // Priority 3: standard rules
  for (const rule of STANDARD_RULES) {
    if (matches(el, rule.filter)) return rule;
  }
  // Priority 4: keep rules
  for (const rule of KEEP_RULES) {
    if (matches(el, rule.filter)) return rule;
  }
  // Priority 5: remove rules
  for (const rule of REMOVE_RULES) {
    if (matches(el, rule.filter)) return rule;
  }
  // Priority 6: default fallback
  return DEFAULT_RULE;
}

function matches(el: Element, filter: Rule['filter']): boolean {
  if (typeof filter === 'string') return el.tagName.toLowerCase() === filter;
  if (Array.isArray(filter)) return filter.includes(el.tagName.toLowerCase());
  return filter(el);
}
