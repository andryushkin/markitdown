const REMOVE_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'iframe',
  'object',
  'embed',
  'template',
  'svg',
]);
const REMOVE_STRUCTURAL = new Set(['nav', 'footer', 'aside', 'header']);
const UNWRAP_IF_EMPTY = new Set(['div', 'span', 'section', 'article']);
const PRESERVE_WS = new Set(['pre', 'code', 'textarea', 'kbd', 'samp']);

export function sanitize(root: Element | Document, mode: 'full' | 'selection' = 'full'): void {
  removeByTagSet(root, REMOVE_TAGS);
  if (mode === 'full') removeByTagSet(root, REMOVE_STRUCTURAL);
  removeHidden(root);
  removeEmptyWrappers(root);
  collapseWhitespace(root);
}

function removeByTagSet(root: Element | Document, tags: Set<string>): void {
  // Собираем все элементы заранее, чтобы не мутировать во время итерации
  const toRemove: Element[] = [];
  const walker = createWalker(root);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as Element;
    if (tags.has(el.tagName.toLowerCase())) {
      toRemove.push(el);
    }
  }
  for (const el of toRemove) {
    el.parentNode?.removeChild(el);
  }
}

function removeHidden(root: Element | Document): void {
  const toRemove: Element[] = [];
  const walker = createWalker(root);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as Element;
    if (isHidden(el)) {
      toRemove.push(el);
    }
  }
  for (const el of toRemove) {
    el.parentNode?.removeChild(el);
  }
}

function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const style = el.getAttribute('style') ?? '';
  if (/display\s*:\s*none/i.test(style)) return true;
  if (/visibility\s*:\s*hidden/i.test(style)) return true;
  return false;
}

function removeEmptyWrappers(root: Element | Document): void {
  // Повторяем несколько раз, чтобы убрать вложенные пустые обёртки
  for (let pass = 0; pass < 5; pass++) {
    const toRemove: Element[] = [];
    const walker = createWalker(root);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const el = node as Element;
      if (UNWRAP_IF_EMPTY.has(el.tagName.toLowerCase()) && isEmptyWrapper(el)) {
        toRemove.push(el);
      }
    }
    if (toRemove.length === 0) break;
    for (const el of toRemove) {
      el.parentNode?.removeChild(el);
    }
  }
}

function isEmptyWrapper(el: Element): boolean {
  const text = el.textContent ?? '';
  if (text.trim() !== '') return false;
  // Проверяем наличие медиа-элементов
  const MEDIA_TAGS = ['img', 'video', 'audio', 'canvas', 'picture', 'figure'];
  for (const tag of MEDIA_TAGS) {
    if (el.querySelector(tag)) return false;
  }
  return true;
}

function collapseWhitespace(root: Element | Document): void {
  const walker = document_createTreeWalker(root, 0x4 /* NodeFilter.SHOW_TEXT */);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    if (isInsidePreserved(textNode)) continue;
    const original = textNode.nodeValue ?? '';
    // НЕ используем \s+ — это сломает \u00A0 (&nbsp;)
    textNode.nodeValue = original.replace(/[\t\n\v\f\r ]+/g, ' ');
  }
}

function isInsidePreserved(node: Node): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if (current.nodeType === 1 /* ELEMENT_NODE */) {
      const tag = (current as Element).tagName.toLowerCase();
      if (PRESERVE_WS.has(tag)) return true;
    }
    current = current.parentNode;
  }
  return false;
}

function createWalker(root: Element | Document): TreeWalker {
  return document_createTreeWalker(root, 0x1 /* NodeFilter.SHOW_ELEMENT */);
}

// Вспомогательная функция для совместимости с различными DOM-окружениями
function document_createTreeWalker(root: Element | Document, whatToShow: number): TreeWalker {
  const doc =
    root.nodeType === 9 /* DOCUMENT_NODE */ ? (root as Document) : (root as Element).ownerDocument!;
  return doc.createTreeWalker(root, whatToShow);
}
