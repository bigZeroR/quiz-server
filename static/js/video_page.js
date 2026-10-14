(function () {
  'use strict';
  const esc = window.Sanitize?.escapeHtml || (s => String(s));

  // ── DOM ──
  const $dir        = document.getElementById('dirPath');
  const $btnScan    = document.getElementById('btnScan');
  const $scanStatus = document.getElementById('scanStatus');
  const $quickDirs  = document.getElementById('quickDirs');

  const $entriesCard  = document.getElementById('entriesCard');
  const $entries      = document.getElementById('entries');
  const $entriesTitle = document.getElementById('entriesTitle');
  const $entriesMeta  = document.getElementById('entriesMeta');
  const $btnCollapse  = document.getElementById('btnCollapse');

  const $batchBar         = document.getElementById('batchBar');
  const $selectAll        = document.getElementById('selectAll');
  const $selectedCount    = document.getElementById('selectedCount');
  const $batchFormat      = document.getElementById('batchFormat');
  const $btnAddToQueue    = document.getElementById('btnAddToQueue');
  const $btnClearSelection= document.getElementById('btnClearSelection');

  const $queueCard        = document.getElementById('queueCard');
  const $queueList        = document.getElementById('queueList');
  const $qProgressFill    = document.getElementById('qProgressFill');
  const $qProgressText    = document.getElementById('qProgressText');
  const $btnStartQueue    = document.getElementById('btnStartQueue');
  const $btnStopQueue     = document.getElementById('btnStopQueue');
  const $btnClearQueue    = document.getElementById('btnClearQueue');
  const $btnQueueCollapse = document.getElementById('btnQueueCollapse');
  const $queueStatus      = document.getElementById('queueStatus');

  // ── State ──
  /** Map<path, {entry, nameInput, checkboxEl, entryEl}> */
  const entriesByPath = new Map();
  /** Set<path> */
  const selection = new Set();
  /** QueueItem[] */
  let queue = [];
  let isProcessing = false;
  let stopRequested = false;
  let currentItemId = null;
  let tickTimer = null;

  // ── Helpers ──
  function fmtDuration(sec) {
    if (!sec && sec !== 0) return '';
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    return `${m}:${String(ss).padStart(2,'0')}`;
  }
  function fmtSize(b) {
    if (!b) return '';
    const mb = b / 1024 / 1024;
    if (mb < 1) return (b / 1024).toFixed(0) + ' KB';
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
  }
  function setStatus(el, kind, text) {
    el.className = 'status-box ' + (kind || '');
    el.style.display = '';
    el.textContent = text;
  }
  function clearStatus(el) { el.style.display = 'none'; el.textContent = ''; }
  function uid() { return 'q_' + Math.random().toString(36).slice(2, 10); }

  // ── Quick dirs ──
  async function loadQuickDirs() {
    try {
      const r = await fetch('/api/v1/video/formats').then(x => x.json());
      if (r.default_dir) {
        const b = document.createElement('button');
        b.textContent = '📂 ' + r.default_dir;
        b.onclick = () => { $dir.value = r.default_dir; scan(); };
        $quickDirs.appendChild(b);
      }
    } catch (_) {}
    [['🏠 ~/Videos','~/Videos'], ['⬇ ~/Downloads','~/Downloads'], ['📁 .','.']]
      .forEach(([label, val]) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.onclick = () => { $dir.value = val; scan(); };
        $quickDirs.appendChild(b);
      });
  }

  // ── Scan ──
  async function scan() {
    const p = $dir.value.trim();
    $btnScan.disabled = true;
    setStatus($scanStatus, 'loading', p ? `اسکن ${p} ...` : 'اسکن پوشه پیش‌فرض...');
    try {
      const isFile = /\.[a-z0-9]{2,5}$/i.test(p);
      const url = isFile ? '/api/v1/video/probe' : '/api/v1/video/scan';
      const body = isFile ? { path: p } : { dir: p };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      if (isFile) {
        setStatus($scanStatus, 'ok', '✅ یک فایل یافت شد');
        renderEntries({ dir: data.file.path, count: 1, files: [data.file] });
      } else {
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

  // ── Render entries ──
  function renderEntries(data) {
    $entriesCard.style.display = '';
    $entries.innerHTML = '';
    entriesByPath.clear();
    selection.clear();
    updateBatchBar();

    $entriesTitle.textContent = data.count === 1 ? '🎬 ویدیو' : '🎞️ ویدیوها';
    $entriesMeta.textContent  = data.dir || '';

    if (!data.files || !data.files.length) {
      $entries.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">هیچ ویدیویی در این مسیر یافت نشد.</p>';
      return;
    }

    data.files.forEach(f => {
      const el = document.createElement('div');
      el.className = 'entry';
      el.dataset.path = f.path;

      // checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.addEventListener('change', () => {
        if (cb.checked) selection.add(f.path);
        else selection.delete(f.path);
        el.classList.toggle('selected', cb.checked);
        updateBatchBar();
      });

      // body
      const body = document.createElement('div');
      body.className = 'body';

      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = f.title || f.filename;

      const sub = document.createElement('div');
      sub.className = 'sub';
      sub.textContent = f.path;

      const chips = document.createElement('div');
      chips.className = 'chips';
      if (f.duration) {
        const s = document.createElement('span');
        s.textContent = '⏱️ ' + fmtDuration(f.duration);
        chips.appendChild(s);
      }
      const sz = document.createElement('span');
      sz.textContent = '💾 ' + fmtSize(f.size_bytes);
      chips.appendChild(sz);

      const row = document.createElement('div');
      row.className = 'row';

      const nameInput = document.createElement('input');
      nameInput.className = 'name';
      nameInput.type = 'text';
      nameInput.value = f.suggested_name || '';
      nameInput.placeholder = 'نام خروجی';

      const fmtSel = document.createElement('select');
      ['mp3','wav','flac','m4a','opus','aac'].forEach(x => {
        const o = document.createElement('option');
        o.value = x; o.textContent = x.toUpperCase();
        fmtSel.appendChild(o);
      });

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary btn-sm';
      btn.textContent = '⬇️ استخراج';
      btn.onclick = () => {
        const name = nameInput.value.trim();
        if (!name) { alert('نام خروجی را وارد کنید'); return; }
        enqueue(f.path, name, fmtSel.value, f.title || f.filename);
        // یک نفره → بلافاصله شروع کن (اگه در حال پردازش نیست)
        if (!isProcessing) processQueue();
      };

      row.appendChild(nameInput);
      row.appendChild(fmtSel);
      row.appendChild(btn);

      body.appendChild(title);
      body.appendChild(sub);
      body.appendChild(chips);
      body.appendChild(row);

      el.appendChild(cb);
      el.appendChild(body);
      $entries.appendChild(el);

      entriesByPath.set(f.path, {
        entry: f, nameInput, checkboxEl: cb, entryEl: el,
      });
    });

    $entriesCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Selection ──
  function updateBatchBar() {
    const n = selection.size;
    $selectedCount.textContent = n;
    $batchBar.style.display = n > 0 ? 'flex' : 'none';
    // select-all state
    const total = entriesByPath.size;
    $selectAll.checked = n > 0 && n === total;
    $selectAll.indeterminate = n > 0 && n < total;
  }

  $selectAll.addEventListener('change', () => {
    const want = $selectAll.checked;
    selection.clear();
    entriesByPath.forEach((rec, path) => {
      rec.checkboxEl.checked = want;
      rec.entryEl.classList.toggle('selected', want);
      if (want) selection.add(path);
    });
    updateBatchBar();
  });

  $btnClearSelection.addEventListener('click', () => {
    selection.clear();
    entriesByPath.forEach(rec => {
      rec.checkboxEl.checked = false;
      rec.entryEl.classList.remove('selected');
    });
    updateBatchBar();
  });

  // ── Queue ──
  function enqueue(path, name, format, displayTitle) {
    // جلوگیری از تکرار عین آیتم در حال انتظار
    const dup = queue.find(q =>
      q.path === path && q.name === name && q.format === format &&
      (q.status === 'pending' || q.status === 'processing')
    );
    if (dup) {
      setStatus($queueStatus, '', '⚠️ این آیتم از قبل در صف است.');
      return;
    }
    queue.push({
      id: uid(),
      path, name, format,
      displayTitle: displayTitle || name,
      status: 'pending',
      message: '',
      startedAt: null,
      endedAt: null,
      duration: null,
      filename: null,
    });
    $queueCard.style.display = '';
    renderQueue();
    $queueCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addSelectedToQueue() {
    if (!selection.size) return;
    const format = $batchFormat.value;
    let added = 0;
    selection.forEach(path => {
      const rec = entriesByPath.get(path);
      if (!rec) return;
      const name = rec.nameInput.value.trim();
      if (!name) return;
      enqueue(path, name, format, rec.entry.title || rec.entry.filename);
      added++;
    });
    // پاک کردن انتخاب بعد از افزودن
    $btnClearSelection.click();
    if (added) {
      setStatus($queueStatus, 'ok', `✅ ${added} آیتم به صف اضافه شد`);
      setTimeout(() => clearStatus($queueStatus), 2500);
      if (!isProcessing) processQueue();
    }
  }

  function renderQueue() {
    $queueList.innerHTML = '';
    if (!queue.length) {
      $queueList.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:14px;">صف خالی است.</p>';
      $qProgressFill.style.width = '0%';
      $qProgressText.textContent = '0 / 0';
      $queueCard.style.display = 'none';
      return;
    }
    $queueCard.style.display = '';

    queue.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'q-item ' + item.status;
      el.dataset.id = item.id;

      const num = document.createElement('div');
      num.className = 'q-num';
      num.textContent = item.status === 'done' ? '✓'
        : item.status === 'error' ? '✕'
        : (idx + 1);

      const info = document.createElement('div');
      info.style.minWidth = '0';
      const t = document.createElement('div');
      t.className = 'q-title';
      t.textContent = item.displayTitle;
      const s = document.createElement('div');
      s.className = 'q-sub';
      s.textContent = `${item.name}.${item.format}`;
      info.appendChild(t);
      info.appendChild(s);

      const st = document.createElement('div');
      st.className = 'q-status';
      updateStatusEl(st, item);

      el.appendChild(num);
      el.appendChild(info);
      el.appendChild(st);
      if (item.message) {
        el.title = item.message;
      }
      $queueList.appendChild(el);
    });

    updateProgress();
  }

  function updateStatusEl(st, item) {
    switch (item.status) {
      case 'pending':
        st.textContent = 'در انتظار';
        break;
      case 'processing': {
        const secs = item.startedAt
          ? ((Date.now() - item.startedAt) / 1000).toFixed(0)
          : 0;
        st.innerHTML = `پردازش... ${secs}s<span class="spin"></span>`;
        break;
      }
      case 'done':
        st.textContent = item.duration != null
          ? `انجام شد (${item.duration.toFixed(1)}s)`
          : 'انجام شد';
        break;
      case 'error':
        st.textContent = 'خطا';
        break;
    }
  }

  function updateProgress() {
    const total = queue.length;
    const done = queue.filter(q => q.status === 'done' || q.status === 'error').length;
    const pct = total ? (done / total) * 100 : 0;
    $qProgressFill.style.width = pct.toFixed(1) + '%';
    $qProgressText.textContent = `${done} / ${total}`;
  }

  function tickCurrent() {
    if (!currentItemId) return;
    const el = $queueList.querySelector(`.q-item[data-id="${currentItemId}"]`);
    if (!el) return;
    const item = queue.find(q => q.id === currentItemId);
    if (!item) return;
    const st = el.querySelector('.q-status');
    if (st) updateStatusEl(st, item);
  }

  async function processQueue() {
    if (isProcessing) return;
    const pending = queue.filter(q => q.status === 'pending');
    if (!pending.length) {
      setStatus($queueStatus, 'ok', '✅ همه آیتم‌ها پردازش شدند');
      return;
    }
    isProcessing = true;
    stopRequested = false;
    $btnStartQueue.style.display = 'none';
    $btnStopQueue.style.display = 'inline-block';
    $btnClearQueue.disabled = true;
    clearStatus($queueStatus);

    // شروع تایمر
    tickTimer = setInterval(tickCurrent, 500);

    for (const item of pending) {
      if (stopRequested) break;
      currentItemId = item.id;
      item.status = 'processing';
      item.startedAt = Date.now();
      renderQueue();
      try {
        const res = await fetch('/api/v1/video/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: item.path, name: item.name, format: item.format,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
        item.status = 'done';
        item.filename = data.filename;
        item.duration = data.elapsed_seconds || null;
        item.message = `ذخیره شد: ${data.filename}`;
      } catch (e) {
        item.status = 'error';
        item.message = e.message;
      } finally {
        item.endedAt = Date.now();
        currentItemId = null;
        renderQueue();
      }
    }

    clearInterval(tickTimer);
    tickTimer = null;
    currentItemId = null;
    isProcessing = false;
    $btnStartQueue.style.display = 'inline-block';
    $btnStopQueue.style.display = 'none';
    $btnClearQueue.disabled = false;

    const doneN = queue.filter(q => q.status === 'done').length;
    const errN  = queue.filter(q => q.status === 'error').length;
    if (stopRequested) {
      setStatus($queueStatus, '', `⏸️ متوقف شد — ${doneN} انجام، ${errN} خطا`);
    } else if (errN) {
      setStatus($queueStatus, 'err', `⚠️ پایان — ${doneN} انجام، ${errN} خطا`);
    } else {
      setStatus($queueStatus, 'ok', `✅ همه ${doneN} آیتم با موفقیت انجام شد`);
    }
    stopRequested = false;
  }

  $btnStartQueue.addEventListener('click', processQueue);
  $btnStopQueue.addEventListener('click', () => {
    stopRequested = true;
    setStatus($queueStatus, '', '⏸️ بعد از اتمام آیتم فعلی متوقف می‌شود...');
  });
  $btnClearQueue.addEventListener('click', () => {
    if (isProcessing) return;
    if (!confirm('صف پاک شود؟')) return;
    queue = [];
    renderQueue();
    clearStatus($queueStatus);
  });

  $btnQueueCollapse.addEventListener('click', () => {
    const list = $queueList;
    const hidden = list.style.display === 'none';
    list.style.display = hidden ? '' : 'none';
    $btnQueueCollapse.textContent = hidden ? 'جمع کردن' : 'باز کردن';
  });

  // ── Entry buttons ──
  $btnAddToQueue.addEventListener('click', addSelectedToQueue);
  $btnCollapse.addEventListener('click', () => {
    $entriesCard.style.display = 'none';
    $batchBar.style.display = 'none';
    clearStatus($scanStatus);
  });
  $btnScan.addEventListener('click', scan);
  $dir.addEventListener('keydown', (e) => { if (e.key === 'Enter') scan(); });

  // ── Boot ──
  loadQuickDirs();
})();
