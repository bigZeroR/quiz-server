(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));

  const $dir = document.getElementById('dirPath');
  const $btnScan = document.getElementById('btnScan');
  const $scanStatus = document.getElementById('scanStatus');
  const $entriesCard = document.getElementById('entriesCard');
  const $entries = document.getElementById('entries');
  const $entriesTitle = document.getElementById('entriesTitle');
  const $entriesMeta = document.getElementById('entriesMeta');
  const $globalStatus = document.getElementById('globalStatus');
  const $btnCollapse = document.getElementById('btnCollapse');
  const $quickDirs = document.getElementById('quickDirs');

  function setStatus(el, kind, text, spin = false) {
    el.className = 'status-box ' + (kind || '');
    el.style.display = '';
    el.innerHTML = (spin ? '<span class="spin"></span>' : '') + esc(text);
  }
  function clearStatus(el) { el.style.display = 'none'; el.textContent = ''; }

  function fmtDuration(sec) {
    if (!sec && sec !== 0) return '';
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${m}:${String(ss).padStart(2, '0')}`;
  }
  function fmtSize(b) {
    if (!b) return '';
    const mb = b / 1024 / 1024;
    if (mb < 1) return (b / 1024).toFixed(0) + ' KB';
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  }

  // ── Default dir hints ────────────────────────────────────
  async function loadFormats() {
    try {
      const r = await fetch('/api/v1/video/formats').then(x => x.json());
      if (r.default_dir) {
        const b = document.createElement('button');
        b.textContent = '📂 ' + r.default_dir;
        b.onclick = () => { $dir.value = r.default_dir; scan(); };
        $quickDirs.appendChild(b);
      }
      const home = document.createElement('button');
      home.textContent = '🏠 ~/Videos';
      home.onclick = () => { $dir.value = '~/Videos'; scan(); };
      $quickDirs.appendChild(home);

      const dl = document.createElement('button');
      dl.textContent = '⬇ ~/Downloads';
      dl.onclick = () => { $dir.value = '~/Downloads'; scan(); };
      $quickDirs.appendChild(dl);

      const cur = document.createElement('button');
      cur.textContent = '📁 .';
      cur.onclick = () => { $dir.value = '.'; scan(); };
      $quickDirs.appendChild(cur);
    } catch (_) {}
  }

  // ── Scan ─────────────────────────────────────────────────
  async function scan() {
    const p = $dir.value.trim();
    $btnScan.disabled = true;
    setStatus($scanStatus, 'loading', p ? `اسکن ${p} ...` : 'اسکن پوشه پیش‌فرض...', true);

    try {
      // decide: file or dir
      const isFile = /\.[a-z0-9]{2,5}$/i.test(p);
      if (isFile) {
        const res = await fetch('/api/v1/video/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: p }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
        setStatus($scanStatus, 'ok', '✅ یک فایل یافت شد');
        renderEntries({ dir: data.file.path, count: 1, files: [data.file] });
      } else {
        const res = await fetch('/api/v1/video/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dir: p }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
        setStatus($scanStatus, 'ok', `✅ ${data.count} ویدیو یافت شد`);
        renderEntries(data);
      }
    } catch (e) {
      setStatus($scanStatus, 'err', '❌ ' + e.message);
      $entriesCard.style.display = 'none';
    } finally {
      $btnScan.disabled = false;
    }
  }

  // ── Render ──────────────────────────────────────────────
  function renderEntries(data) {
    $entriesCard.style.display = '';
    $entries.innerHTML = '';
    $entriesTitle.textContent = data.count === 1 ? '🎬 ویدیو' : '🎞️ ویدیوها';
    $entriesMeta.textContent = data.dir || '';

    if (!data.files || !data.files.length) {
      $entries.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">هیچ ویدیویی در این مسیر یافت نشد.</p>';
      return;
    }

    data.files.forEach(f => {
      const box = document.createElement('div');
      box.className = 'entry';

      const head = document.createElement('div');
      head.className = 'head';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = f.title || f.filename;

      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = f.path;

      const meta = document.createElement('div');
      meta.className = 'meta-chips';
      if (f.duration) {
        const s = document.createElement('span');
        s.textContent = '⏱️ ' + fmtDuration(f.duration);
        meta.appendChild(s);
      }
      const sz = document.createElement('span');
      sz.textContent = '💾 ' + fmtSize(f.size_bytes);
      meta.appendChild(sz);

      const row = document.createElement('div');
      row.className = 'row';

      const nameInput = document.createElement('input');
      nameInput.className = 'name';
      nameInput.type = 'text';
      nameInput.value = f.suggested_name || '';
      nameInput.placeholder = 'نام خروجی';

      const fmtSel = document.createElement('select');
      ['mp3', 'wav', 'flac', 'm4a', 'opus', 'aac'].forEach(x => {
        const o = document.createElement('option');
        o.value = x; o.textContent = x.toUpperCase();
        fmtSel.appendChild(o);
      });

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm';
      btn.textContent = '⬇️ استخراج صدا';
      btn.onclick = () => extract(f.path, nameInput.value, fmtSel.value, btn);

      row.appendChild(nameInput);
      row.appendChild(fmtSel);
      row.appendChild(btn);

      head.appendChild(title);
      head.appendChild(sub);
      box.appendChild(head);
      box.appendChild(meta);
      box.appendChild(row);
      $entries.appendChild(box);
    });

    $entriesCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Extract ─────────────────────────────────────────────
  async function extract(path, name, format, btn) {
    if (!name.trim()) { alert('نام خروجی را وارد کنید'); return; }
    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳...';
    setStatus($globalStatus, 'loading',
      `در حال استخراج «${name}.${format}» از:\n${path}`, true);

    try {
      const res = await fetch('/api/v1/video/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, name, format }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);

      const size = (data.size_bytes / 1024 / 1024).toFixed(1);
      const dur = data.duration_seconds ? ` • ${fmtDuration(data.duration_seconds)}` : '';
      const src = data.source ? `\nاز: ${data.source}` : '';
      setStatus($globalStatus, 'ok',
        `✅ ذخیره شد: storage/audio/${data.filename}  (${size} MB${dur})${src}`);
    } catch (e) {
      setStatus($globalStatus, 'err', '❌ ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  // ── Events ──────────────────────────────────────────────
  $btnScan.addEventListener('click', scan);
  $dir.addEventListener('keydown', (e) => { if (e.key === 'Enter') scan(); });
  $btnCollapse.addEventListener('click', () => {
    $entriesCard.style.display = 'none';
    clearStatus($scanStatus);
  });

  loadFormats();
})();
