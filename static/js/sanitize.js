/* Safe HTML rendering helpers. */
(function (global) {
  'use strict';

  const ALLOWED_TAGS = new Set(['CODE', 'BR', 'B', 'I', 'STRONG', 'EM']);

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeHtml(input) {
    const text = String(input ?? '');
    if (!text) return '';
    const doc = new DOMParser().parseFromString(
      `<div id="__root">${text}</div>`, 'text/html'
    );
    const root = doc.getElementById('__root');
    if (!root) return escapeHtml(text);
    const out = document.createElement('div');
    copyFiltered(root, out);
    return out.innerHTML;
  }

  function copyFiltered(src, dst) {
    src.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        dst.appendChild(document.createTextNode(node.nodeValue));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        dst.appendChild(document.createTextNode(node.textContent || ''));
        return;
      }
      const clean = document.createElement(tag.toLowerCase());
      copyFiltered(node, clean);
      dst.appendChild(clean);
    });
  }

  function textOnly(input) { return escapeHtml(input); }

  global.Sanitize = { escapeHtml, safeHtml, textOnly };
})(window);
