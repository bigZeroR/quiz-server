<div align="center" dir="rtl">

# 🧠 Quiz Server

**آزمون بساز، درسنامه بنویس، و مواد آموزشی را به تجربه‌های تعاملی تبدیل کن.**

یک فضای کاری Flask خودمیزبان: مدیریت آزمون، تولید سوال با هوش مصنوعی، درسنامه‌های Markdown،
ضبط صدا، و استخراج صدا از ویدیوهای لوکال — همه در یک رابط وب.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Tests](https://img.shields.io/badge/tests-111%20passing-brightgreen?logo=pytest&logoColor=white)](#تست)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[English](README.md) · [فارسی](README.fa.md)

[شروع سریع](#شروع-سریع) · [ویژگی‌ها](#ویژگی‌ها) · [تنظیمات](#تنظیمات) · [مرجع API](#مرجع-api) · [تست](#تست) · [مشارکت](#مشارکت)

</div>

---

## چرا این پروژه

مواد آموزشی معمولاً پراکنده‌اند: سوال‌ها در یک فایل، جزوه‌ها در جای دیگر، ضبط‌ها
جایی دیگر. Quiz Server همه را پشت یک اپ وب لوکال جمع می‌کند و داده را به‌صورت
JSON ساده نگه می‌دارد — قابل بازرسی، آسان برای بکاپ، و قابل نسخه‌بندی.

## ویژگی‌ها

- **مدیریت آزمون** — ساخت، ویرایش، جست‌وجو، و حذف آزمون و سوال‌های تکی.
- **پیش‌نویس با هوش مصنوعی** — تولید پیش‌نویس آزمون از طریق هر endpoint سازگار با OpenAI.
- **درسنامه‌های Markdown** — اسناد بخش‌بندی‌شده و متصل به آزمون‌ها.
- **ضبط صدا** — ضبط، پردازش، و مدیریت فایل‌های صوتی (با `audio-recorder`).
- **ویدیو ← صدا** — استخراج تراک صوتی از فایل‌های ویدیویی لوکال با `ffmpeg`.
- **رابط فارسی** — چیدمان راست‌به‌چپ، فونت Vazirmatn، اعداد فارسی.
- **دسترس‌پذیر** — کنتراست WCAG AA، حالت focus واضح، هدف لمسی ۴۴ پیکسل.
- **چندسکویی** — لانچر برای Linux، macOS و Windows.

## شروع سریع

پلتفرم خود را انتخاب کن. هر لانچر یک virtual environment می‌سازد،
وابستگی‌ها را نصب می‌کند، در صورت نبود `.env` آن را از `.env.example` می‌سازد،
و سرور را اجرا می‌کند.

### Linux / macOS

```bash
./scripts/run.sh
```

### Windows (PowerShell)

```powershell
.\scripts\run.ps1
```

### Windows (دابل‌کلیک)

```bat
scripts\run.bat
```

سپس <http://127.0.0.1:5000> را باز کن.

### نصب دستی

**پیش‌نیازها:** Python 3.10+، `git`، و `ffmpeg` (فقط برای قابلیت ویدیو).

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python server.py
```

## استفاده

### ساخت آزمون در رابط وب

1. به `/create` برو.
2. عنوان را وارد کن، سپس سوال‌ها را اضافه کن (متن، حداقل دو گزینه، ایندکس پاسخ صحیح).
3. ذخیره کن — آزمون در `data/<slug>.json` نوشته می‌شود و در صفحه اصلی ظاهر می‌شود.

### کوچک‌ترین مثال API

فهرست همه آزمون‌ها:

```bash
curl http://127.0.0.1:5000/api/v1/quizzes
```

ساخت یک آزمون:

```bash
curl -X POST http://127.0.0.1:5000/api/v1/quizzes/my-quiz \
  -H 'Content-Type: application/json' \
  -d '{
        "title": "My Quiz",
        "questions": [
          {"text": "2 + 2?", "options": ["3", "4"], "correct": 1}
        ]
      }'
```

### استخراج صدا از ویدیوی لوکال

```bash
curl -X POST http://127.0.0.1:5000/api/v1/video/extract \
  -H 'Content-Type: application/json' \
  -d '{"path": "/absolute/path/lecture.mp4", "name": "lecture", "format": "mp3"}'
```

مسیر مبدأ باید زیر `storage/videos` یا یکی از پوشه‌های `QUIZ_VIDEO_ROOTS` باشد.

## تنظیمات

همه تنظیمات متغیر محیطی هستند و یک‌بار در زمان شروع خوانده می‌شوند. آن‌ها را در
`.env` بگذار (هرگز این فایل را کامیت نکن). هر کلید در `.env.example` هم مستند شده است.

| متغیر | نوع | پیش‌فرض | الزامی | توضیح |
|---|---|---|---|---|
| `QUIZ_HOST` | str | `127.0.0.1` | خیر | آدرس bind. `0.0.0.0` را فقط در شبکهٔ مورد اعتماد بگذار. |
| `QUIZ_PORT` | int | `5000` | خیر | پورت HTTP. |
| `QUIZ_DEBUG` | bool | `0` | خیر | دیباگر Werkzeug. **هرگز در شبکهٔ اشتراکی فعال نکن.** |
| `QUIZ_SECRET_KEY` | str | تصادفی | خیر | کلید session. برای بقای session‌ها مقدار ثابت بگذار. |
| `QUIZ_DATA_DIR` | path | `data` | خیر | محل فایل‌های JSON آزمون. |
| `QUIZ_LESSON_DIR` | path | `data/lessons` | خیر | محل فایل‌های JSON درسنامه. |
| `QUIZ_STORAGE_DIR` | path | `storage` | خیر | ریشهٔ صدا، ویدیو، آپلود و لاگ. |
| `QUIZ_VIDEO_DIR` | path | `storage/videos` | خیر | پوشهٔ پیش‌فرض API ویدیو. |
| `QUIZ_VIDEO_ROOTS` | csv paths | *(خالی)* | خیر | پوشه‌های اضافی که `/api/v1/video/*` می‌تواند بخواند. |
| `QUIZ_AUDIO_IMPORT_ROOTS` | csv paths | *(خالی)* | خیر | پوشه‌هایی که endpoint ایمپورت صدا می‌تواند از آن‌ها کپی کند. پوشه‌های سیستمی همیشه بلاک‌اند. |
| `QUIZ_MAX_UPLOAD_MB` | int | `64` | خیر | حداکثر حجم بدنهٔ درخواست. |
| `QUIZ_MAX_AUDIO_SECONDS` | int | `600` | خیر | سقف طول ضبط. |
| `QUIZ_TEXT_MAX_CHARS` | int | `200000` | خیر | سقف متن ورودی AI/session. |
| `QUIZ_RATE_LIMIT_PER_MIN` | int | `120` | خیر | درخواست‌های تغییردهنده در دقیقه به ازای هر IP. `0` غیرفعال. |
| `QUIZ_AI_PROVIDER` | str | `openai_compatible` | خیر | انتخاب backend هوش مصنوعی. |
| `QUIZ_AI_BASE_URL` | url | `https://api.openai.com/v1` | خیر | هر base URL سازگار با OpenAI. |
| `QUIZ_AI_API_KEY` | str | *(خالی)* | خیر | فقط اگر از endpointهای AI استفاده می‌کنی لازم است. |
| `QUIZ_AI_MODEL` | str | `gpt-4o-mini` | خیر | نام مدل که به provider پاس داده می‌شود. |
| `QUIZ_AI_TIMEOUT` | int | `60` | خیر | تایم‌اوت درخواست AI، ثانیه. |

**رازها:** `QUIZ_SECRET_KEY` و `QUIZ_AI_API_KEY` هرگز نباید کامیت شوند.
ساخت کلید:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## مرجع API

Base URL: `http://127.0.0.1:5000`. همه endpointها JSON با کلید `success`
برمی‌گردانند. خطاها `code` و پیام خوانا در `error` دارند.

### آزمون‌ها — `/api/v1`

| متد | مسیر | کار |
|---|---|---|
| GET | `/quizzes` | فهرست آزمون‌ها (فقط متادیتا). |
| GET | `/quizzes/<name>` | دریافت یک آزمون با سوال‌ها. |
| POST | `/quizzes/<name>` | ساخت یا جایگزینی آزمون. |
| DELETE | `/quizzes/<name>` | حذف آزمون. |
| GET | `/quizzes/<name>/categories` | دسته‌های موجود در یک آزمون. |
| POST | `/quizzes/<name>/questions` | افزودن سوال. |
| PUT | `/quizzes/<name>/questions/<question_id>` | ویرایش یک سوال. |
| DELETE | `/quizzes/<name>/questions/<question_id>` | حذف یک سوال. |
| GET | `/search?q=` | جست‌وجوی متنی در آزمون‌ها. |
| GET | `/reload` | باطل کردن کش حافظه. |

### درسنامه‌ها — `/api/v1/lessons`

| متد | مسیر | کار |
|---|---|---|
| GET | `/` | فهرست درسنامه‌ها. |
| GET | `/<name>` | دریافت یک درسنامه. |
| POST | `/<name>` | ساخت یا جایگزینی. |
| PUT | `/<name>` | ویرایش. |
| DELETE | `/<name>` | حذف. |
| GET | `/by-quiz/<quiz_name>` | درسنامه‌های متصل به یک آزمون. |
| GET | `/search?q=` | جست‌وجو در درسنامه‌ها. |

### صدا — `/api/v1/audio`

| متد | مسیر | کار |
|---|---|---|
| GET | `/devices` | فهرست دستگاه‌های ورودی صدا. |
| POST | `/record/start` | شروع ضبط. |
| POST | `/record/stop` | توقف و پردازش. |
| GET | `/presets` | پریست‌ها و فرمت‌های خروجی. |
| GET | `/files` | فهرست فایل‌های ضبط‌شده. |
| GET | `/files/<filename>` | دانلود فایل. |
| DELETE | `/files/<filename>` | حذف فایل. |
| POST | `/files/import` | کپی فایل صوتی خارجی به داخل. |

### ویدیو — `/api/v1/video`

| متد | مسیر | کار |
|---|---|---|
| POST | `/scan` | فهرست ویدیوها در یک پوشه. |
| POST | `/probe` | متادیتای یک فایل ویدیو. |
| POST | `/extract` | استخراج صدا از ویدیو. |
| GET | `/formats` | فرمت‌های پشتیبانی‌شده. |

### هوش مصنوعی — `/api/v1`

| متد | مسیر | کار |
|---|---|---|
| POST | `/ai/generate` | تولید پیش‌نویس آزمون از متن. |
| POST | `/ai/validate` | اعتبارسنجی payload بدون ذخیره. |
| POST | `/sessions` | ساخت session تحلیل متن. |
| GET | `/sessions/<sid>` | خواندن session. |
| DELETE | `/sessions/<sid>` | حذف session. |

### سلامت

| متد | مسیر | کار |
|---|---|---|
| GET | `/healthz` | probe زنده‌بودن. تا وقتی اپ بالاست همیشه `200`. |

### قالب خطا

```json
{
  "success": false,
  "code": "validation_error",
  "error": "متن سوال الزامی است",
  "details": {}
}
```

کدهای وضعیت: `404` یافت نشد، `409` تعارض، `422` اعتبارسنجی،
`429` محدودیت نرخ (با `Retry-After`)، `500` خطای داخلی.

## معماری

```
server.py            کارخانهٔ اپ Flask، routeهای HTML، aliasهای API قدیمی
config.py            همهٔ تنظیمات، قابل بازنویسی با env
core/
  repository.py      تنها ماژولی که فایل JSON را لمس می‌کند (نوشتن اتمیک)
  schema.py          نرمال‌سازی سوال / آزمون / درسنامه
  security.py        پاک‌سازی نام و محافظت مسیر
  rate_limit.py      محدودکنندهٔ نرخ در حافظه
  logging_setup.py   لاگ با پوشاندن مسیر home
  services/          منطق quiz, lesson, audio, video, AI, text-session
routes/              یک blueprint Flask برای هر حوزه
static/              سیستم طراحی (style.css, dashboard.css) و JS
  js/                کنترلر هر صفحه، اعداد فارسی، sanitizer
templates/           صفحات Jinja2 (RTL، فارسی)
tests/               ۱۱۱ تست: config, schema, security, repo, migration,
                     rate limiting, contrast, env guards
scripts/             لانچرهای چندسکویی
```

جریان داده: مرورگر ← blueprint Flask ← سرویس ← repository ← `data/*.json`.
نوشتن‌ها اتمیک‌اند (فایل موقت + `os.replace`) و با قفل per-quiz محافظت می‌شوند.

## تست

```bash
python -m pytest -q
```

انتظار: **۱۱۱ تست پاس**. پوشش شامل پیش‌فرض‌های config، path traversal،
نرمال‌سازی schema، نوشتن اتمیک و هم‌روندی، محدودیت نرخ، مهاجرت فایل‌های قدیمی،
کنتراست WCAG AA، و بهداشت `.env.example` است.

## نکات امنیتی

- bind پیش‌فرض `127.0.0.1` و debug خاموش است. هر دو را آگاهانه تغییر بده.
- همهٔ نام‌های آزمون و درسنامه پاک‌سازی می‌شوند؛ `../` رد می‌شود، نه حذف.
- APIهای ایمپورت صدا و ویدیو مسیر را resolve می‌کنند و allowlist پوشه را اعمال می‌کنند.
- پوشه‌های سیستمی (`/etc`، `/proc`، `/sys`، `/dev`، `/boot`، `/root`)
  حتی بدون allowlist هم برای ایمپورت صدا بلاک‌اند.
- لاگ‌ها مسیرهای `/home/<user>` و `/Users/<user>` را می‌پوشانند.
- درخواست‌های تغییردهنده محدودیت نرخ دارند؛ پاسخ `429` شامل `Retry-After` است.
- خروجی HTML در سمت کلاینت با `static/js/sanitize.js` escape می‌شود.

## Docker

```bash
docker build -t quiz-server .
docker run --rm -p 5000:5000 \
  -v "$PWD/data:/app/data" \
  -v "$PWD/storage:/app/storage" \
  quiz-server
```

ایمیج `ffmpeg` و `git` را همراه دارد (لازم برای وابستگی `audio-recorder`)
و یک `HEALTHCHECK` روی `/healthz` دارد.

## مشارکت

1. ریپو را fork کن و یک شاخه بساز: `git checkout -b fix/short-name`.
2. تغییر را بده و یک تست regression زیر `tests/` اضافه کن.
3. `python -m pytest -q` را اجرا کن — مجموعه باید سبز بماند.
4. تغییرات را متمرکز نگه دار؛ فایل‌های بی‌ربط را دوباره قالب‌بندی نکن.
5. pull request باز کن و مشکل و راه‌حل را توضیح بده.

## مجوز

این پروژه تحت **مجوز MIT** منتشر شده است. متن کامل در فایل [LICENSE](LICENSE) است.

به‌طور خلاصه: استفاده، کپی، تغییر، ادغام، انتشار، توزیع، ساب‌لایسنس و فروش
نسخه‌های این نرم‌افزار آزاد است، به شرط اینکه اطلاعیهٔ کپی‌رایت و این اطلاعیهٔ
اجازه در همهٔ نسخه‌ها حفظ شود. نرم‌افزار «همان‌گونه که هست» ارائه می‌شود، بدون
هیچ نوع ضمانت.

## قدردانی

- [Flask](https://flask.palletsprojects.com/)
- [Vazirmatn](https://github.com/rastikerdar/vazirmatn) typeface
- [audio-recorder](https://github.com/bigZeroR/audio-recorder) backend
- [ffmpeg](https://ffmpeg.org/)
