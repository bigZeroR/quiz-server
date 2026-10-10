/* Minimal safe Markdown renderer — no external deps.
 * Supports: headings, bold, italic, inline code, code fences,
 * links, ul/ol, blockquote, hr, paragraphs.
 * HTML is escaped BEFORE transformation. */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(text) {
    // text must already be escaped
    // code spans first (protect from other rules)
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => {
      codes.push(c);
      return `\u0000C${codes.length - 1}\u0000`;
    });
    // bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    // italic
    text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    // links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => {
      const safe = /^(https?:|\/|#|mailto:)/i.test(u) ? u : '#';
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${t}</a>`;
    });
    // restore code spans
    text = text.replace(/\u0000C(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
    return text;
  }

  function render(md) {
    if (!md) return '';
    const lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0, inCode = false, codeLang = '', codeBuf = [];
    let inList = null, inBQ = false, para = [];

    const flushPara = () => {
      if (para.length) {
        out.push(`<p>${inline(escapeHtml(para.join(' ')))}</p>`);
        para = [];
      }
    };
    const closeList = () => {
      if (inList) { out.push(`</${inList}>`); inList = null; }
    };
    const closeBQ = () => {
      if (inBQ) { out.push('</blockquote>'); inBQ = false; }
    };

    while (i < lines.length) {
      const line = lines[i];

      const fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        if (inCode) {
          out.push(`<pre><code class="lang-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
          inCode = false; codeLang = ''; codeBuf = [];
        } else {
          flushPara(); closeList(); closeBQ();
          inCode = true; codeLang = fence[1] || '';
        }
        i++; continue;
      }
      if (inCode) { codeBuf.push(line); i++; continue; }

      if (!line.trim()) { flushPara(); closeList(); closeBQ(); i++; continue; }

      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); closeList(); closeBQ();
        const lvl = h[1].length;
        out.push(`<h${lvl}>${inline(escapeHtml(h[2]))}</h${lvl}>`);
        i++; continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        flushPara(); closeList(); closeBQ();
        out.push('<hr>'); i++; continue;
      }

      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushPara(); closeList();
        if (!inBQ) { out.push('<blockquote>'); inBQ = true; }
        out.push(`<p>${inline(escapeHtml(bq[1]))}</p>`);
        i++; continue;
      } else { closeBQ(); }

      const ul = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
        out.push(`<li>${inline(escapeHtml(ul[1]))}</li>`);
        i++; continue;
      }

      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ol) {
        flushPara();
        if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
        out.push(`<li>${inline(escapeHtml(ol[1]))}</li>`);
        i++; continue;
      }

      closeList();
      para.push(line);
      i++;
    }
    flushPara(); closeList(); closeBQ();
    if (inCode) out.push(`<pre><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`);
    return out.join('\n');
  }

  global.MD = { render, escapeHtml };
})(window);
