/**
 * Convert ASCII digits to Persian digits for presentation only.
 * Domain-safe: works on text nodes of marked elements; never touches
 * inputs, code blocks, URLs, or JSON payloads.
 */
(function () {
    "use strict";
    var MAP = ["\u06F0","\u06F1","\u06F2","\u06F3","\u06F4","\u06F5","\u06F6","\u06F7","\u06F8","\u06F9"];

    function toFa(s) {
        return String(s).replace(/[0-9]/g, function (d) { return MAP[+d]; });
    }

    function shouldSkip(el) {
        var tag = el.tagName;
        if (!tag) return true;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "CODE" || tag === "PRE") return true;
        if (el.closest && el.closest("pre, code, input, textarea, script, style, [data-no-fa]")) return true;
        return false;
    }

    function walk(node) {
        if (node.nodeType === 3) {
            if (/[0-9]/.test(node.nodeValue)) node.nodeValue = toFa(node.nodeValue);
            return;
        }
        if (node.nodeType !== 1) return;
        if (shouldSkip(node)) return;
        for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    }

    function apply() {
        var sel = ".fa-num, .stat-value, .stat-item .value, .progress-text, .timer";
        document.querySelectorAll(sel).forEach(function (el) {
            if (shouldSkip(el)) return;
            walk(el);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", apply);
    } else {
        apply();
    }
    window.faDigits = toFa;
})();
