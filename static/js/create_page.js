/* Create Quiz Page Controller — with max generation + continuation */
(function () {
  'use strict';

  const escapeHtml = window.Sanitize.escapeHtml;
  const questions = [];
  let metadata = { title: '', description: '', type: 'general', level: 1 };

  const $ = (id) => document.getElementById(id);

  const AI_PROMPT_BASE = `نقش تو:

تو یک «معمار ارشد بانک سؤال»، «متخصص استخراج دانش ساختاریافته» و «طراح آزمون‌های چهارگزینه‌ای حرفه‌ای» هستی.

وظیفه تو این است که متن آموزشی داده‌شده در انتهای پرامپت را با دقت کامل تحلیل کنی، تمام واحدهای دانش مستقل و قابل‌آزمون آن را استخراج کنی و از آن‌ها حداکثر تعداد سؤال چهارگزینه‌ای باکیفیت تولید کنی.

هدف اصلی:

تولید «حداکثر تعداد سؤال ارزشمند و غیرتکراری»، نه صرفاً تولید بیشترین تعداد سؤال.

هر سؤال باید حداقل یک واحد دانش مستقل را بسنجد. اگر دو سؤال عملاً یک مفهوم را با تغییر جزئی در جمله‌بندی می‌سنجند، فقط سؤال قوی‌تر را نگه دار.

═══════════════════════════════════════════
۱. تحلیل اولیه متن
═══════════════════════════════════════════

قبل از تولید سؤال، متن را از نظر مفهومی به واحدهای دانش تقسیم کن.

واحدهای دانش می‌توانند شامل موارد زیر باشند:

* تعریف‌ها
* مفاهیم
* اصطلاحات
* ویژگی‌ها
* تفاوت‌ها
* روابط علت و معلولی
* ترتیب یا توالی
* معماری
* اجزای یک سیستم
* کاربردها
* محدودیت‌ها
* مثال‌ها
* سناریوها
* مقایسه‌ها
* تصمیم‌گیری‌های فنی
* فرآیندها
* نسخه‌ها و تاریخچه‌ها
* نقش‌ها و مسئولیت‌ها
* ارتباط بین مفاهیم
* خطاها و سوءبرداشت‌های رایج

برای هر واحد دانش بررسی کن آیا واقعاً قابلیت تبدیل‌شدن به سؤال مستقل دارد یا خیر.

═══════════════════════════════════════════
۲. اصل حداکثر پوشش
═══════════════════════════════════════════

از تمام نکات مفید و غیرتکراری متن سؤال تولید کن.

اما:

* صرفاً برای افزایش تعداد سؤال، یک مفهوم را با چند جمله‌بندی مختلف تکرار نکن.
* سؤال‌های کم‌ارزش، بدیهی یا مصنوعی تولید نکن.
* اگر یک مفهوم فقط یک سؤال خوب ایجاد می‌کند، همان یک سؤال کافی است.
* اگر یک مفهوم از چند زاویه مستقل قابل‌آزمون است، چند سؤال تولید کن.
* مفاهیم مهم را نسبت به جزئیات کم‌اهمیت بیشتر پوشش بده.

هدف:

MAXIMUM MEANINGFUL COVERAGE

نه:

MAXIMUM QUESTION COUNT AT ANY COST

═══════════════════════════════════════════
۳. تفکیک «دانش» از «ادعا»
═══════════════════════════════════════════

متن آموزشی ممکن است شامل موارد زیر باشد:

1. واقعیت یا دانش فنی
2. نظر مدرس
3. تحلیل مدرس
4. مثال مدرس
5. توصیه آموزشی
6. ادعای تاریخی
7. ادعای تجاری
8. ادعای وابسته به زمان
9. اطلاعات احتمالاً قدیمی یا منسوخ
10. اشتباه گفتاری یا transcription error

این موارد را با یکدیگر قاطی نکن.

اگر متن چیزی را به‌عنوان نظر، تحلیل یا توصیه بیان می‌کند، سؤال را طوری طراحی نکن که آن را به‌عنوان یک حقیقت قطعی علمی یا فنی تثبیت کند.

اگر یک ادعا صرفاً دیدگاه مدرس است، در صورت مناسب‌بودن سؤال را با عباراتی مانند:

«طبق متن آموزشی...»

طراحی کن.

اگر اطلاعاتی به زمان وابسته است، آن را به‌عنوان یک حقیقت همیشگی در نظر نگیر.

اگر متن دارای عبارت مبهم، خراب‌شده یا ناشی از تبدیل گفتار به متن است، از حدس‌زدن خودداری کن.

═══════════════════════════════════════════
۴. عدم تصحیح خاموش متن
═══════════════════════════════════════════

منبع اصلی، همین متن آموزشی است.

اگر متن دارای اشتباه یا اطلاعات نادقیق است:

* آن را بدون دلیل به حقیقت صحیح تبدیل نکن.
* اطلاعاتی را که در متن وجود ندارد از دانش قبلی خودت وارد نکن.
* سؤال را بر اساس اطلاعاتی که واقعاً از متن قابل استخراج است بساز.
* اگر یک ادعا آشکارا به‌صورت «نظر مدرس» مطرح شده، آن را fact جلوه نده.

در عین حال، خطاهای واضح ناشی از Speech-to-Text مانند اشتباه تایپی یا شکستن کلمات را تا حد ممکن از روی context تشخیص بده.

═══════════════════════════════════════════
۵. سطح دشواری
═══════════════════════════════════════════

level:

1 = مقدماتی
2 = متوسط
3 = پیشرفته
4 = فوق‌پیشرفته

سطح سؤال باید بر اساس میزان استدلال موردنیاز تعیین شود، نه طول سؤال.

Level 1:
تشخیص مستقیم یک مفهوم یا واقعیت صریح.

Level 2:
درک مفهوم، تفاوت یا ارتباط ساده.

Level 3:
نیازمند ترکیب چند بخش از متن، تحلیل یا کاربرد دانش در سناریو.

Level 4:
نیازمند استدلال چندمرحله‌ای، تحلیل سناریوی پیچیده یا تشخیص دقیق بین چند گزینه بسیار نزدیک.

از تولید مصنوعی سؤال‌های Level 4 خودداری کن. اگر متن دانش کافی برای آن ندارد، Level 4 تولید نکن.

═══════════════════════════════════════════
۶. طراحی گزینه‌ها
═══════════════════════════════════════════

هر سؤال دقیقاً ۴ گزینه داشته باشد.

گزینه‌های غلط باید:

* منطقی باشند.
* از نظر فنی ممکن به نظر برسند.
* ترجیحاً نماینده اشتباهات رایج باشند.
* از نظر طول و سبک با گزینه صحیح قابل مقایسه باشند.

از گزینه‌هایی مانند:

* «همه موارد»
* «هیچ‌کدام»
* «هر سه مورد»
* گزینه‌های شوخی
* گزینه‌های آشکارا بی‌ربط

تا حد امکان استفاده نکن.

گزینه صحیح نباید صرفاً به دلیل طولانی‌تر بودن یا دقیق‌تر بودن قابل تشخیص باشد.

جای گزینه صحیح را بین indexهای 0 تا 3 توزیع کن و الگوی قابل پیش‌بینی ایجاد نکن.

═══════════════════════════════════════════
۷. جلوگیری از تکرار
═══════════════════════════════════════════

قبل از نهایی‌کردن هر سؤال بررسی کن:

* آیا همین مفهوم قبلاً پرسیده شده؟
* آیا سؤال جدید فقط بازنویسی سؤال قبلی است؟
* آیا پاسخ سؤال جدید از همان استدلال سؤال قبلی به دست می‌آید؟
* آیا تفاوت سؤال جدید واقعاً آموزشی است؟

اگر پاسخ مثبت است و سؤال جدید ارزش مستقل ندارد، آن را حذف کن.

═══════════════════════════════════════════
۸. سؤال‌های سناریومحور
═══════════════════════════════════════════

هرجا متن اجازه می‌دهد، علاوه بر سؤال‌های مستقیم، سؤال‌های سناریومحور تولید کن.

مثلاً اگر متن درباره رابطه بین:

Windows Server
Active Directory
Azure
Hybrid Environment

صحبت می‌کند، می‌توان سؤال را به شکل یک موقعیت واقعی طراحی کرد.

اما اطلاعات جدیدی که در متن وجود ندارد وارد سناریو نکن.

═══════════════════════════════════════════
۹. اصطلاحات فنی
═══════════════════════════════════════════

اصطلاحات فنی مهم را در explanation با تگ:

<code>...</code>

مشخص کن.

مثال:

<code>Active Directory Domain Services</code>

<code>Azure</code>

<code>Hybrid Environment</code>

<code>Windows Server</code>

از قرار دادن بی‌دلیل تمام کلمات انگلیسی داخل <code>...</code> خودداری کن.

═══════════════════════════════════════════
۱۰. command و example
═══════════════════════════════════════════

اگر متن شامل command، syntax، configuration، مثال مشخص یا عبارت فنی قابل ثبت است، در فیلدهای اختیاری قرار بده.

اگر چنین چیزی در متن وجود ندارد، این فیلدها را حذف کن.

هرگز command یا example جدیدی از دانش خارج از متن اختراع نکن.

═══════════════════════════════════════════
۱۱. اطلاعات زمانی و نسخه‌ای
═══════════════════════════════════════════

اگر متن درباره نسخه، سال، بازنشستگی، تغییر مسیر، certification یا وضعیت یک محصول صحبت می‌کند، سؤال را دقیقاً بر اساس ادعای متن بساز.

از تبدیل اطلاعات زمان‌مند به حقیقت دائمی خودداری کن.

مثلاً به جای:

«مایکروسافت همیشه ...»

در صورت نیاز بنویس:

«طبق متن آموزشی، ...»

═══════════════════════════════════════════
۱۲. ساختار خروجی
═══════════════════════════════════════════

خروجی باید ۱۰۰٪ JSON معتبر باشد.

هیچ متن اضافی قبل یا بعد از JSON قرار نده.

هیچ Markdown قرار نده.

هیچ بلوک کد قرار نده.

ساختار دقیقاً:

{
"title": "عنوان کوتاه و دقیق مبحث",
"description": "توضیح یک یا دو جمله‌ای",
"type": "general",
"level": 2,
"batch_number": 1,
"exhausted": false,
"continuation_hint": "...",
"questions": []
}

═══════════════════════════════════════════
۱۳. قوانین batch
═══════════════════════════════════════════

batch_number شماره بخش فعلی است و از 1 شروع می‌شود.

اگر تمام واحدهای دانش قابل‌سؤال متن استخراج شده‌اند:

"exhausted": true

و:

"continuation_hint": ""

قرار بده.

اگر هنوز نکات مستقل و ارزشمند باقی مانده‌اند:

"exhausted": false

و در continuation_hint دقیقاً مشخص کن چه موضوعاتی هنوز پوشش داده نشده‌اند.

مثال:

"مباحث مربوط به Hybrid Environment، تفاوت مسیرهای certification و کاربردهای Windows Server هنوز باقی مانده‌اند."

در صورت exhausted=true هیچ سؤال مهم و مستقل دیگری نباید عمداً حذف شده باشد.

═══════════════════════════════════════════
۱۴. ID سؤال‌ها
═══════════════════════════════════════════

IDها باید یکتا باشند.

در هر batch از q1 شروع کن:

q1
q2
q3
...

اگر batch بعدی تولید شد، همچنان IDها در همان batch محلی باشند؛ بنابراین batch 2 نیز می‌تواند از q1 شروع شود.

═══════════════════════════════════════════
۱۵. کیفیت explanation
═══════════════════════════════════════════

Explanation نباید فقط پاسخ صحیح را تکرار کند.

باید توضیح دهد:

* چرا گزینه صحیح درست است.
* مفهوم اصلی چیست.
* در صورت نیاز چرا گزینه‌های دیگر اشتباه‌اند.
* ارتباط سؤال با متن آموزشی چیست.

اما از توضیحات بسیار طولانی و خارج از موضوع خودداری کن.

═══════════════════════════════════════════
۱۶. کنترل نهایی قبل از خروجی
═══════════════════════════════════════════

قبل از تولید JSON نهایی، این موارد را بررسی کن:

[ ] JSON معتبر است.
[ ] دقیقاً ۴ گزینه برای هر سؤال وجود دارد.
[ ] correct بین 0 و 3 است.
[ ] correct واقعاً پاسخ صحیح است.
[ ] level بین 1 و 4 است.
[ ] سؤال تکراری نیست.
[ ] گزینه‌های غلط منطقی هستند.
[ ] سؤال از متن قابل استخراج است.
[ ] دانش جدید بدون منبع وارد نشده است.
[ ] نظر مدرس به‌عنوان fact قطعی ارائه نشده است.
[ ] اطلاعات زمان‌مند به‌عنوان حقیقت دائمی بیان نشده‌اند.
[ ] explanation با پاسخ سازگار است.
[ ] category مناسب است.
[ ] command/example در صورت نبودن حذف شده‌اند.
[ ] تمام واحدهای مهم دانش بررسی شده‌اند.

═══════════════════════════════════════════
۱۷. قانون نهایی توقف
═══════════════════════════════════════════

وقتی:

1. تمام نکات مستقل و قابل‌آزمون متن پوشش داده شده‌اند،

یا

2. ادامه تولید سؤال باعث تکرار، سطحی‌شدن یا کاهش کیفیت می‌شود،

توقف کن.

در این حالت exhausted=true قرار بده.

هرگز فقط برای افزایش تعداد سؤال، سؤال مصنوعی تولید نکن.

═══════════════════════════════════════════
SCHEMA
═══════════════════════════════════════════

{
"title": "عنوان کوتاه و دقیق مبحث",
"description": "توضیح یک یا دو جمله‌ای",
"type": "general",
"level": 2,
"batch_number": 1,
"exhausted": false,
"continuation_hint": "...",
"questions": [
{
"id": "q1",
"text": "متن سؤال",
"options": [
"گزینه اول",
"گزینه دوم",
"گزینه سوم",
"گزینه چهارم"
],
"correct": 0,
"category": "نام دسته‌بندی",
"level": 2,
"explanation": "توضیح کامل با <code>اصطلاح فنی</code>"
}
]
}
`;

  const AI_PROMPT_CONTINUATION_RULES = `

═══════════════════════════════════════════
حالت ادامه (این batch شماره N>1 است)
═══════════════════════════════════════════

متن آموزشی همان است که در انتها می‌آید، اما سؤالات batchهای قبلی هم به تو داده می‌شود.

قوانین سخت ادامه:

1. هیچ سؤالی از batchهای قبلی را تکرار نکن — نه عیناً، نه با تغییر کلمات، نه با تغییر گزینه‌ها، نه با همان مفهوم در قالب سناریوی مشابه.
2. روی واحدهای دانشی که در batchهای قبلی پوشش داده نشده‌اند تمرکز کن.
3. اگر تمام واحدهای دانش قبلاً پوشش داده شده‌اند، خروجی را با "exhausted": true و questions خالی برگردان.
4. batch_number را برابر شماره این batch قرار بده.
5. در description بنویس: «ادامه‌ی batch قبلی — عنوان قبلی».
`;

  const AI_PROMPT_TAIL = `

═══════════════════════════════════════════
متن آموزشی
═══════════════════════════════════════════
`;

  function buildPrompt() {
    const text = $('aiInputText').value.trim();
    const prevQuestions = $('prevQuestions').value.trim();
    const prevTitle = $('prevTitle').value.trim();
    const startNumber = parseInt($('startNumber').value) || 1;
    const isContinuation = prevQuestions.length > 0 || startNumber > 1;

    let prompt = AI_PROMPT_BASE;

    if (isContinuation) {
      prompt += AI_PROMPT_CONTINUATION_RULES;
      prompt += '\n\n═══════════════════════════════════════════\n';
      prompt += 'اطلاعات batch قبلی\n';
      prompt += '═══════════════════════════════════════════\n\n';
      if (prevTitle) {
        prompt += `عنوان batch قبلی: ${prevTitle}\n`;
      }
      prompt += `شماره batch این بخش: ${startNumber > 1 ? 2 : 1}\n`;
      prompt += `\nلیست سؤالات batchهای قبلی (این‌ها را تکرار نکن):\n`;
      prompt += prevQuestions + '\n';
    }

    prompt += AI_PROMPT_TAIL;
    if (text) {
      prompt += '\n' + text + '\n';
    } else {
      prompt += '\n[متن درس را اینجا پیست کنید]\n';
    }

    return prompt;
  }

  function toast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function switchTab(which) {
    const isJSON = which === 'json';
    $('panelJSON').style.display = isJSON ? 'block' : 'none';
    $('panelAI').style.display = isJSON ? 'none' : 'block';

    const jsonBtn = $('tabJSON');
    const aiBtn = $('tabAI');
    jsonBtn.style.flex = '1'; aiBtn.style.flex = '1';

    if (isJSON) {
      jsonBtn.className = 'btn btn-primary';
      jsonBtn.style.background = ''; jsonBtn.style.color = ''; jsonBtn.style.borderColor = '';
      aiBtn.className = 'btn btn-ghost';
      aiBtn.style.background = 'rgba(139,92,246,0.1)';
      aiBtn.style.color = '#8b5cf6';
      aiBtn.style.borderColor = 'rgba(139,92,246,0.3)';
    } else {
      aiBtn.className = 'btn btn-primary';
      aiBtn.style.background = '#8b5cf6';
      aiBtn.style.color = '#fff';
      aiBtn.style.borderColor = '#8b5cf6';
      jsonBtn.className = 'btn btn-ghost';
      jsonBtn.style.background = ''; jsonBtn.style.color = ''; jsonBtn.style.borderColor = '';
    }
  }

  $('tabJSON').addEventListener('click', () => switchTab('json'));
  $('tabAI').addEventListener('click', () => switchTab('ai'));

  function updateAIPreview() {
    const text = $('aiInputText').value;
    $('charCount').textContent = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    $('wordCount').textContent = words;
    $('aiPreview').textContent = buildPrompt();
  }

  ['aiInputText', 'prevQuestions', 'prevTitle', 'startNumber'].forEach(id => {
    $(id).addEventListener('input', updateAIPreview);
  });

  async function copyToClipboard(text, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMsg, 'success');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast(successMsg, 'success');
      } catch (_) {
        toast('کپی ناموفق — دستی کپی کنید', 'error');
      }
      document.body.removeChild(ta);
    }
  }

  $('btnCopyPrompt').addEventListener('click', () => {
    copyToClipboard(buildPrompt(), '✅ پرامپت کپی شد — در ChatGPT پیست کنید');
  });

  $('btnCopyPromptOnly').addEventListener('click', () => {
    copyToClipboard(AI_PROMPT_BASE, '✅ پرامپت خالی کپی شد');
  });

  function renderQuestions() {
    $('qCount').textContent = questions.length;
    $('totalCount').textContent = questions.length + ' سوال';
    const list = $('questionsList');
    if (!questions.length) {
      list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);">هنوز سوالی اضافه نشده.</div>';
      return;
    }
    list.innerHTML = '';
    questions.forEach((q, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;margin-bottom:8px;display:flex;justify-content:space-between;gap:12px;align-items:center;';
      const info = document.createElement('div');
      info.innerHTML = `<div style="font-weight:600;">#${i+1} (id: ${escapeHtml(q.id)}) ${escapeHtml(q.text.slice(0, 70))}${q.text.length > 70 ? '...' : ''}</div>
        <div style="font-size:0.8rem;color:var(--text-tertiary);margin-top:4px;">📁 ${escapeHtml(q.category)} • L${q.level} • پاسخ: ${['A','B','C','D'][q.correct]}</div>`;
      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.className = 'btn btn-danger';
      del.onclick = () => { questions.splice(i, 1); renderQuestions(); };
      div.appendChild(info);
      div.appendChild(del);
      list.appendChild(div);
    });
  }

  $('btnPaste').addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      $('rawText').value = text;
      toast('از کلیپ‌بورد خوانده شد', 'success');
    } catch (e) {
      toast('دسترسی به کلیپ‌بورد ممکن نیست', 'error');
    }
  });

  $('btnParse').addEventListener('click', () => {
    const raw = $('rawText').value.trim();
    if (!raw) { toast('JSON را وارد کنید', 'error'); return; }

    let cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    try {
      const data = JSON.parse(cleaned);
      if (!Array.isArray(data.questions)) {
        toast('فیلد questions باید آرایه باشد', 'error');
        return;
      }

      metadata = {
        title: data.title || 'آزمون',
        description: data.description || '',
        type: data.type || 'general',
        level: data.level || 1,
      };

      let added = 0;
      data.questions.forEach((q, i) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        let correct = parseInt(q.correct);
        if (isNaN(correct) || correct < 0 || correct >= opts.length) correct = 0;
        const qid = q.id || ('q' + (i + 1));
        questions.push({
          id: String(qid),
          text: q.text || '',
          options: opts,
          correct: correct,
          category: q.category || 'عمومی',
          level: parseInt(q.level) || 1,
          explanation: q.explanation || '',
          command: q.command || undefined,
          example: q.example || undefined,
        });
        added++;
      });

      renderQuestions();
      $('rawText').value = '';

      let infoHtml = `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:10px;color:var(--success);">
        ✅ ${added} سوال اضافه شد.
      </div>`;
      if (data.exhausted === false) {
        infoHtml += `<div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:10px;color:var(--warning);margin-top:8px;">
          ⚠️ AI گفته هنوز موضوعات پوشش‌داده‌نشده باقی است.<br>
          <strong>hint:</strong> ${escapeHtml(data.continuation_hint || '—')}<br>
          <span style="font-size:0.8rem;">برای batch بعدی: حالت ادامه باز است، سؤالات این batch در کادر پایین قرار گرفتند.</span>
        </div>`;
      } else if (data.exhausted === true) {
        infoHtml += `<div style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:8px;padding:10px;color:var(--success);margin-top:8px;">
          🎉 AI اعلام کرده تمام واحدهای دانشی پوشش داده شده‌اند.
        </div>`;
      }

      if (data.exhausted === false) {
        $('prevTitle').value = data.title || '';
        $('startNumber').value = 2;
        const prevText = questions.map(q => q.text).join('\n');
        $('prevQuestions').value = prevText;

        const currentName = $('quizName').value.trim();
        if (currentName && !currentName.match(/part\d+$/)) {
          $('quizName').placeholder = currentName + '-part2';
        }
      }

      $('parseInfo').innerHTML = infoHtml;
      toast(`✅ ${added} سوال اضافه شد`, 'success');
    } catch (e) {
      toast('JSON نامعتبر: ' + e.message, 'error');
    }
  });

  $('btnPublish').addEventListener('click', async () => {
    const name = $('quizName').value.trim();
    if (!name) { toast('نام آزمون الزامی است', 'error'); return; }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      toast('نام آزمون فقط حروف انگلیسی، اعداد، - و _', 'error');
      return;
    }
    if (!questions.length) { toast('حداقل یک سوال اضافه کنید', 'error'); return; }

    const payload = {
      title: metadata.title || 'آزمون',
      description: metadata.description || '',
      type: metadata.type || 'general',
      level: metadata.level || 1,
      questions: questions.map((q, i) => ({
        id: q.id || ('q' + (i + 1)),
        text: q.text,
        options: q.options,
        correct: q.correct,
        category: q.category,
        level: q.level,
        explanation: q.explanation,
        ...(q.command ? { command: q.command } : {}),
        ...(q.example ? { example: q.example } : {}),
      })),
    };

    const btn = $('btnPublish');
    btn.disabled = true;
    btn.textContent = 'در حال ذخیره...';
    try {
      await window.API.saveQuiz(name, payload);
      toast('✅ ذخیره شد', 'success');
      setTimeout(() => { window.location.href = `/quiz/${name}`; }, 800);
    } catch (e) {
      toast('خطا: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = '💾 ذخیره و انتشار';
    }
  });

  switchTab('ai');
  renderQuestions();
  updateAIPreview();
})();
