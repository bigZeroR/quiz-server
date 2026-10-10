#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  add_ai_lesson_prompt.sh — افزودن تب AI به ویرایشگر درسنامه
#  Usage: bash add_ai_lesson_prompt.sh [project_root]
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT"

if [ ! -f "templates/lesson_edit.html" ]; then
    echo "❌ templates/lesson_edit.html یافت نشد."
    exit 1
fi
if [ ! -f "static/js/lesson_editor.js" ]; then
    echo "❌ static/js/lesson_editor.js یافت نشد."
    exit 1
fi

echo "═══════════════════════════════════════════════════"
echo " 🤖 Adding AI prompt section to lesson editor"
echo "═══════════════════════════════════════════════════"

# ─── 1. Patch lesson_edit.html ───────────────────────────────
echo "▶ Patching templates/lesson_edit.html..."

python3 - <<'PY'
from pathlib import Path
p = Path("templates/lesson_edit.html")
src = p.read_text(encoding="utf-8")

if "aiPromptCard" in src:
    print("  ⏭  already patched")
    raise SystemExit(0)

anchor = '''    <div class="editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">📑 بخش‌ها</h3>'''

new_block = '''    <!-- ═══════════ AI PROMPT GENERATOR ═══════════ -->
    <div class="editor-card" id="aiPromptCard"
         style="border-color:rgba(139,92,246,0.35);background:linear-gradient(135deg,rgba(139,92,246,0.06),rgba(59,130,246,0.04));">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;color:#8b5cf6;">🤖 تولید درسنامه با AI</h3>
            <button class="btn btn-ghost btn-sm" id="toggleAIPrompt" type="button">مخفی</button>
        </div>

        <div id="aiPromptBody">
            <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.9;margin-bottom:14px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:8px;padding:12px;">
                📌 متن آموزشی خود را در کادر زیر پیست کنید. یک پرامپت آماده می‌گیرید که به هر AI بدهید.
                خروجی JSON را در کادر پایین‌تر پیست کنید تا خودکار به بخش‌های درسنامه اضافه شود.
            </div>

            <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;">
                <a href="https://chat.openai.com" target="_blank" class="btn btn-ghost" style="font-size:0.78rem;padding:4px 10px;">🟢 ChatGPT</a>
                <a href="https://claude.ai" target="_blank" class="btn btn-ghost" style="font-size:0.78rem;padding:4px 10px;">🟠 Claude</a>
                <a href="https://gemini.google.com" target="_blank" class="btn btn-ghost" style="font-size:0.78rem;padding:4px 10px;">🔵 Gemini</a>
                <a href="https://chat.deepseek.com" target="_blank" class="btn btn-ghost" style="font-size:0.78rem;padding:4px 10px;">🐋 DeepSeek</a>
            </div>

            <label class="form-label">📄 متن آموزشی (منبع):</label>
            <textarea id="aiSourceText" class="form-textarea"
                      placeholder="متن درس، جزوه، خلاصه، یادداشت، رونویسی audio و... را اینجا پیست کنید..."
                      style="min-height:180px;"></textarea>

            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btnCopyLessonPrompt" type="button"
                        style="background:#8b5cf6;border-color:#8b5cf6;color:#fff;flex:1;min-width:200px;">
                    📋 کپی پرامپت کامل
                </button>
                <button class="btn btn-ghost" id="btnPreviewLessonPrompt" type="button">
                    👁️ پیش‌نمایش پرامپت
                </button>
            </div>

            <details id="promptPreviewBox" style="margin-top:14px;">
                <summary style="cursor:pointer;font-size:0.85rem;color:var(--text-secondary);padding:6px 0;">📄 مشاهدهٔ پرامپت</summary>
                <pre id="lessonPromptPreview"
                     style="background:#1e1e1e;color:#ddd;padding:14px;border-radius:8px;overflow:auto;direction:ltr;text-align:left;max-height:400px;font-family:monospace;font-size:0.72rem;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin-top:8px;"></pre>
            </details>

            <div style="margin-top:22px;padding-top:18px;border-top:1px dashed rgba(139,92,246,0.35);">
                <div style="font-size:0.95rem;font-weight:700;color:var(--accent);margin-bottom:6px;">
                    📥 پیست خروجی JSON از AI
                </div>
                <div style="font-size:0.78rem;color:var(--text-tertiary);margin-bottom:8px;">
                    خروجی AI (حتی اگر داخل \`\`\`json بود) را پیست کنید.
                </div>
                <textarea id="aiLessonOutput" class="form-textarea mono"
                          placeholder='{"title":"...","description":"...","tags":[...],"sections":[{"title":"...","content":"..."}]}'
                          style="min-height:130px;font-size:0.78rem;"></textarea>
                <button class="btn btn-primary" id="btnImportAI" type="button"
                        style="margin-top:10px;width:100%;background:#8b5cf6;border-color:#8b5cf6;color:#fff;">
                    ⚙️ افزودن به ویرایشگر
                </button>
                <div id="aiImportStatus" style="font-size:0.82rem;color:var(--text-secondary);margin-top:10px;min-height:1.2em;"></div>
            </div>
        </div>
    </div>

    <div class="editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
            <h3 style="margin:0;">📑 بخش‌ها</h3>'''

if anchor not in src:
    print("  ✗ anchor not found — skipping HTML patch")
    raise SystemExit(1)

src = src.replace(anchor, new_block, 1)
p.write_text(src, encoding="utf-8")
print("  ✓ HTML patched")
PY

# ─── 2. Patch lesson_editor.js ───────────────────────────────
echo "▶ Patching static/js/lesson_editor.js..."

python3 - <<'PY'
from pathlib import Path
p = Path("static/js/lesson_editor.js")
src = p.read_text(encoding="utf-8")

if "buildLessonPrompt" in src:
    print("  ⏭  already patched")
    raise SystemExit(0)

anchor = "  // ── Boot ────────────────────────────────────────────────"
if anchor not in src:
    print("  ✗ anchor '// ── Boot ──' not found")
    raise SystemExit(1)

new_code = r'''  // ── AI Prompt Generator ─────────────────────────────────
  function buildLessonPrompt(sourceText, titleHint) {
    const title = titleHint || $title.value.trim() || 'درسنامه';
    const lines = [
      'You are an expert teacher creating a Persian (Farsi) lesson in Markdown format.',
      '',
      'TASK: Convert the following source text into a structured lesson.',
      '',
      'OUTPUT FORMAT — return ONLY valid JSON, no explanation, no markdown code fences:',
      '{',
      '  "title": "عنوان درسنامه",',
      '  "description": "توضیح کوتاه یک‌خطی",',
      '  "tags": ["برچسب۱", "برچسب۲"],',
      '  "sections": [',
      '    {',
      '      "id": "s1",',
      '      "title": "عنوان بخش اول",',
      '      "content": "## زیرعنوان\\n\\nمتن مارک‌داون..."',
      '    }',
      '  ]',
      '}',
      '',
      'RULES:',
      '1. Language: Persian (Farsi), RTL. Keep technical terms in English (e.g. command names).',
      '2. Split the content into 3-8 logical sections with clear descriptive titles.',
      '3. Each section "content" MUST be valid Markdown.',
      '4. Use headings (##, ###), bullet lists, **bold**, and `inline code`.',
      '5. For commands/code samples, use fenced blocks: start with three backticks + bash, end with three backticks.',
      '6. Use "> " blockquote for important warnings or tips.',
      '7. Do NOT invent facts. Only reformat / restructure the given text.',
      '8. Section "id" must be lowercase ascii like "s1", "s2", ...',
      '9. "tags" must be 2-5 short Persian keywords.',
      '10. If the source is messy, clean it up but keep all factual content.',
      '',
      'LESSON TITLE HINT: ' + title,
      '',
      'SOURCE TEXT:',
      '---',
      sourceText,
      '---',
      '',
      'Now output the JSON:'
    ];
    return lines.join('\n');
  }

  const aiSourceText = document.getElementById('aiSourceText');
  const aiLessonOutput = document.getElementById('aiLessonOutput');
  const lessonPromptPreview = document.getElementById('lessonPromptPreview');
  const aiImportStatus = document.getElementById('aiImportStatus');

  function refreshPromptPreview() {
    if (!lessonPromptPreview) return;
    lessonPromptPreview.textContent = buildLessonPrompt(
      aiSourceText?.value || '...', $title.value.trim()
    );
  }
  if (aiSourceText) {
    aiSourceText.addEventListener('input', refreshPromptPreview);
  }
  if ($title) {
    $title.addEventListener('input', refreshPromptPreview);
  }
  refreshPromptPreview();

  const $btnCopyPrompt = document.getElementById('btnCopyLessonPrompt');
  if ($btnCopyPrompt) {
    $btnCopyPrompt.addEventListener('click', async () => {
      const srcText = aiSourceText.value.trim();
      if (!srcText) {
        alert('ابتدا متن آموزشی را در کادر بالا وارد کنید');
        return;
      }
      const prompt = buildLessonPrompt(srcText, $title.value.trim());
      try {
        await navigator.clipboard.writeText(prompt);
        $status.style.color = '#22c55e';
        $status.textContent = '✅ پرامپت کپی شد — در ChatGPT/Claude/Gemini پیست کنید';
        setTimeout(() => { $status.textContent = ''; $status.style.color = ''; }, 4000);
      } catch (e) {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = prompt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); $status.textContent = '✅ کپی شد'; }
        catch (_) { alert('کپی ناموفق — به‌صورت دستی از پیش‌نمایش بردارید'); }
        document.body.removeChild(ta);
      }
    });
  }

  const $btnPreviewPrompt = document.getElementById('btnPreviewLessonPrompt');
  if ($btnPreviewPrompt) {
    $btnPreviewPrompt.addEventListener('click', () => {
      refreshPromptPreview();
      const box = document.getElementById('promptPreviewBox');
      if (box) box.open = true;
      lessonPromptPreview?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  const $btnImportAI = document.getElementById('btnImportAI');
  if ($btnImportAI) {
    $btnImportAI.addEventListener('click', () => {
      const raw = aiLessonOutput.value.trim();
      aiImportStatus.style.color = '';
      if (!raw) {
        aiImportStatus.style.color = '#f43f5e';
        aiImportStatus.textContent = '⚠️ کادر خروجی AI خالی است';
        return;
      }

      // strip ```json ... ``` fences if present
      let cleaned = raw
        .replace(/^\s*```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      // tolerate trailing commas before } or ]
      cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

      let data;
      try {
        data = JSON.parse(cleaned);
      } catch (e) {
        // try to extract first {...} block
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { data = JSON.parse(m[0].replace(/,\s*([}\]])/g, '$1')); }
          catch (e2) {
            aiImportStatus.style.color = '#f43f5e';
            aiImportStatus.textContent = '❌ JSON نامعتبر: ' + e2.message;
            return;
          }
        } else {
          aiImportStatus.style.color = '#f43f5e';
          aiImportStatus.textContent = '❌ JSON نامعتبر: ' + e.message;
          return;
        }
      }

      const incoming = data.sections || data.chapters || data.parts;
      if (!Array.isArray(incoming) || !incoming.length) {
        aiImportStatus.style.color = '#f43f5e';
        aiImportStatus.textContent = '❌ فیلد "sections" پیدا نشد یا خالی است';
        return;
      }

      // fill meta if empty
      if (data.title && !$title.value.trim()) $title.value = data.title;
      if (data.description && !$desc.value.trim()) $desc.value = data.description;
      if (Array.isArray(data.tags)) {
        data.tags.forEach(t => {
          const v = String(t).trim();
          if (v && !tags.includes(v)) tags.push(v);
        });
        renderTags();
      }

      // append sections
      incoming.forEach((s, i) => {
        if (typeof s === 'string') {
          sections.push({
            id: '', title: `بخش ${sections.length + 1}`,
            content: s, question_ids: []
          });
          return;
        }
        sections.push({
          id: s.id || '',
          title: s.title || `بخش ${sections.length + 1}`,
          content: s.content || s.body || s.text || '',
          question_ids: s.question_ids || s.related_question_ids || []
        });
      });
      renderSections();

      aiLessonOutput.value = '';
      aiImportStatus.style.color = '#22c55e';
      aiImportStatus.textContent = `✅ ${incoming.length} بخش اضافه شد (${sections.length} بخش کل)`;
      setTimeout(() => {
        if (aiImportStatus.style.color === 'rgb(34, 197, 94)') {
          aiImportStatus.textContent = '';
        }
      }, 4000);
    });
  }

  const $toggleAI = document.getElementById('toggleAIPrompt');
  const $aiBody = document.getElementById('aiPromptBody');
  if ($toggleAI && $aiBody) {
    $toggleAI.addEventListener('click', () => {
      const hidden = $aiBody.style.display === 'none';
      $aiBody.style.display = hidden ? '' : 'none';
      $toggleAI.textContent = hidden ? 'مخفی' : 'نمایش';
    });
  }

'''

src = src.replace(anchor, new_code + anchor, 1)
p.write_text(src, encoding="utf-8")
print("  ✓ JS patched")
PY

# ─── 3. Verify ────────────────────────────────────────────────
echo ""
echo "▶ Verifying..."
python3 - <<'PY'
import json, re, sys
from pathlib import Path

html = Path("templates/lesson_edit.html").read_text(encoding="utf-8")
js   = Path("static/js/lesson_editor.js").read_text(encoding="utf-8")

checks = [
    ("HTML has aiPromptCard",  "aiPromptCard" in html),
    ("HTML has aiSourceText",  "aiSourceText" in html),
    ("HTML has aiLessonOutput","aiLessonOutput" in html),
    ("HTML has copy button",   "btnCopyLessonPrompt" in html),
    ("HTML has import button", "btnImportAI" in html),
    ("JS has buildLessonPrompt","buildLessonPrompt" in js),
    ("JS has import handler",  "aiLessonOutput" in js),
]

ok = True
for name, passed in checks:
    print(f"  {'✓' if passed else '✗'} {name}")
    if not passed:
        ok = False

if not ok:
    sys.exit(1)
PY

echo ""
echo "═══════════════════════════════════════════════════"
echo " ✅ AI prompt section added to lesson editor"
echo "═══════════════════════════════════════════════════"
echo ""
echo " اجرا:"
echo "   bash run.sh"
echo ""
echo " سپس:"
echo "   /lessons/new/edit   یا   /lessons/<name>/edit"
echo ""
