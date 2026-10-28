<div align="center" dir="rtl">

# 🧠 Quiz Server

### آزمون بساز، درسنامه بنویس، و مواد آموزشی را به تجربه‌های تعاملی تبدیل کن.

یک فضای کاری مبتنی بر Flask که **مدیریت آزمون**، **تولید سوال با هوش مصنوعی**، **درسنامه‌های Markdown**، **ضبط صدا**، و **استخراج صدا از ویدیوهای لوکال** را در یک جا جمع می‌کند.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Tests](https://img.shields.io/badge/tests-111%20passing-brightgreen?logo=pytest&logoColor=white)](#تست)
[![API](https://img.shields.io/badge/API-REST%20%2F%20v1-2E8B57)](#مرجع-api)

[🇬🇧 English](README.md) · [شروع سریع](#شروع-سریع) · [ویژگی‌ها](#ویژگی‌ها) · [مرجع API](#مرجع-api)

</div>

---

## معرفی

**Quiz Server** یک برنامهٔ مطالعه و مدیریت محتوا است که روی کامپیوتر خودت اجرا می‌شود. به‌جای پخش‌شدن آزمون‌ها، درسنامه‌ها، فایل‌های صوتی و ویدیوها در ابزارهای مختلف، همه‌چیز در یک رابط وب مبتنی بر Python/Flask در دسترس است.

بانک سوال بساز و ویرایش کن، آزمون‌ها را جستجو کن، درسنامه‌های ساخت‌یافته با Markdown بنویس، با کمک هوش مصنوعی پیش‌نویس سوال تولید کن، صدا ضبط کن، یا از ویدیوهای لوکال صدایشان را بیرون بکش. محتوا به‌صورت فایل‌های JSON ذخیره می‌شود، پس بازرسی، پشتیبان‌گیری و نسخه‌بندی‌اش ساده است.

---

## شروع سریع

اگر فقط می‌خواهی برنامه را اجرا کنی و شروع به استفاده کنی — بدون توسعه و تغییر — این مراحل را انجام بده.

### ۱. نصب پیش‌نیازها

به **Python 3.10+** و **FFmpeg** نیاز داری.

**لینوکس (اوبونتو / دبیان):**

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv ffmpeg git
```

**مک** (با [Homebrew](https://brew.sh/)):

```bash
brew install python ffmpeg git
```

**ویندوز:**

- **Python** را از [python.org](https://www.python.org/downloads/) نصب کن — آخرین نسخهٔ پایدار **Python 3.x** را دانلود کن، و در صفحهٔ اول نصب تیک **"Add python.exe to PATH"** را بزن.
- **Git** را از [git-scm.com](https://git-scm.com/download/win) نصب کن.
- **FFmpeg**:
  1. فایل `ffmpeg-release-essentials.zip` را از [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) دانلود کن.
  2. استخراج کن و پوشهٔ داخلی را به `C:\ffmpeg` منتقل کن (طوری که `C:\ffmpeg\bin\ffmpeg.exe` وجود داشته باشد).
  3. کلید **Win** را بزن، `Environment` را تایپ کن، **"Edit the system environment variables"** را باز کن → **Environment Variables** → در بخش **User variables** روی **Path** دوبار کلیک → **Edit** → **New** → پیست کن `C:\ffmpeg\bin` → OK.
  4. **Command Prompt را ببند و دوباره باز کن.**

صحّت نصب:

```bash
python --version       # یا: python3 --version
ffmpeg -version
git --version
```

### ۲. دریافت پروژه

```bash
git clone https://github.com/bigZeroR/quiz-server.git
cd quiz-server
```

### ۳. ساخت virtual environment و نصب پکیج‌ها

**لینوکس / مک:**

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**ویندوز:**

```bat
py -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

بعد از فعال‌سازی، باید `(.venv)` ابتدای خط ترمینال دیده شود.

### ۴. اجرا

```bash
python server.py
```

### ۵. باز کردن برنامه

در مرورگر برو به: **http://127.0.0.1:5000**

تمام. الان می‌توانی:

- آزمون‌ها را از صفحهٔ اصلی ببینی و شرکت کنی.
- آزمون جدید بسازی: `/create`
- درسنامه بنویسی: `/lessons`
- صدا ضبط کنی یا استخراج کنی: `/audio` و `/video`

> **نکتهٔ اولین اجرا:** اگر می‌خواهی صدای سیستم را در ویندوز ضبط کنی (مثلاً ویدیویی که در مرورگر پخش می‌شود)، **Stereo Mix** را فعال کن (تنظیمات صدا → تب Recording) یا [VB-Cable](https://vb-audio.com/Cable/) نصب کن، سپس آن دستگاه را در صفحهٔ `/audio` انتخاب کن.

### توقف سرور

در ترمینالی که `python server.py` در آن اجرا می‌شود، `Ctrl+C` بزن.

### اجرای مجدد در آینده

هر بار خواستی برنامه را بالا بیاوری:

**لینوکس / مک:**

```bash
cd quiz-server
source .venv/bin/activate
python server.py
```

**ویندوز:**

```bat
cd quiz-server
.venv\Scripts\activate.bat
python server.py
```

---

## ویژگی‌ها

| <span dir="rtl">بخش</span> | <span dir="rtl">قابلیت‌ها</span> |
|------|-----------|
| **مدیریت آزمون** | ساخت، نمایش، ویرایش، و جستجوی آزمون؛ ویرایش یا حذف تک‌تک سوالات |
| **تولید با AI** | تولید پیش‌نویس سوال از متن با هر API سازگار با OpenAI |
| **درسنامه** | ساخت و ویرایش درسنامه‌های مستقل با محتوای Markdown، بخش‌ها، برچسب‌ها، و شناسهٔ سوالات مرتبط |
| **اتصال درسنامه به آزمون** | درسنامه را به یک آزمون وصل کن و از داخل آزمون به آن دسترسی داشته باش |
| **ضبط صدا** | یافتن دستگاه‌های صوتی، شروع/توقف ضبط، presetها، و مدیریت فایل‌های ضبط‌شده |
| **ویدیو → صدا** | اسکن فایل‌های ویدیویی لوکال، نمایش متادیتا، و استخراج صدا با FFmpeg. انتخاب دسته‌ای و صف پردازش پشتیبانی می‌شود. |
| **صفحهٔ موبایل** | رابط مخصوص ورود متن از گوشی |
| **HTTP API** | دسترسی به همهٔ قابلیت‌ها از طریق `/api/v1` |
| **ذخیره‌سازی لوکال** | آزمون‌ها و درسنامه‌ها به‌صورت JSON؛ فایل‌های تولیدشده در `storage/` |

### برای چه کسانی؟

- **دانشجویان** که مطالب درسی را در آزمون و درسنامه سازمان می‌دهند.
- **معلمان** که مجموعه‌سوالات قابل استفادهٔ مجدد می‌سازند.
- **توسعه‌دهندگان** که می‌خواهند یک اپلیکیشن Flask لایه‌ای با repository مبتنی بر JSON را بررسی کنند.

---

## تکنولوژی‌ها

| <span dir="rtl">بخش</span> | <span dir="rtl">تکنولوژی</span> |
|------|-----------|
| Runtime | Python 3.10+ |
| وب‌سرور | Flask 3.0 |
| قالب‌ها | Jinja2 |
| فرانت‌اند | HTML رندرشده در سرور + ماژول‌های JavaScript |
| ذخیره‌سازی داده | فایل‌های JSON |
| هوش مصنوعی | API سازگار با OpenAI |
| پردازش رسانه | FFmpeg / FFprobe |
| ضبط صدا | [audio-recorder](https://github.com/bigZeroR/audio-recorder) (نصب از git) |
| تست | pytest |

برنامه **به دیتابیس رابطه‌ای نیاز ندارد**.

---

## راه‌اندازی کامل

### ۱. کلون

```bash
git clone https://github.com/bigZeroR/quiz-server.git
cd quiz-server
```

### ۲. Virtual environment

**لینوکس / مک:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

**ویندوز (Command Prompt):**

```bat
py -m venv .venv
.venv\Scripts\activate.bat
```

**ویندوز (PowerShell):**

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
```

> [!NOTE]
> اگر PowerShell اجازهٔ اجرای اسکریپت فعال‌سازی را نداد، یک بار این را اجرا کن:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

### ۳. نصب وابستگی‌ها

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

> [!NOTE]
> پکیج `audio-recorder` به‌صورت git از GitHub نصب می‌شود. **Git باید نصب و در `PATH` باشد.** اگر شبکه‌ات GitHub را مسدود می‌کند، ریپو را دستی کلون کن و editable نصب کن:
>
> ```bash
> git clone https://github.com/bigZeroR/audio-recorder.git ../audio-recorder
> pip install -e ../audio-recorder
> ```

### ۴. تنظیمات

فایل نمونهٔ تنظیمات را کپی کن:

```bash
cp .env.example .env
```

برنامه `.env` را به‌صورت خودکار می‌خواند (با `python-dotenv`). پیش‌فرض‌ها امن هستند: سرور روی `127.0.0.1` گوش می‌دهد و debug خاموش است.

برای تولید `SECRET_KEY` پایدار (که sessionها بعد از ریستارت باقی بمانند):

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

و در `.env` قرار بده:

```ini
QUIZ_SECRET_KEY=مقدار-تولید-شده
```

### ۵. اجرا

```bash
python server.py
```

برو به: **http://127.0.0.1:5000**

> **دسترسی شبکه:** پیش‌فرض `QUIZ_HOST=127.0.0.1` است، یعنی فقط از همین کامپیوتر قابل دسترسی است. برای دسترسی از دستگاه‌های دیگر روی **شبکهٔ لوکال مورد اعتماد**، در `.env` مقدار `QUIZ_HOST=0.0.0.0` بگذار. سرور توسعهٔ Flask را هرگز مستقیم روی اینترنت عمومی قرار نده.

---

## تنظیمات

تمام تنظیمات از `config.py` و متغیرهای محیطی خوانده می‌شوند.

| <span dir="rtl">متغیر</span> | <span dir="rtl">پیش‌فرض</span> | <span dir="rtl">توضیح</span> |
| --- | --- | --- |
| `QUIZ_HOST` | `127.0.0.1` | آدرس listen (پیش‌فرض فقط لوکال) |
| `QUIZ_PORT` | `5000` | پورت HTTP |
| `QUIZ_DEBUG` | `0` | حالت debug (هرگز روی شبکهٔ مشترک فعال نکن) |
| `QUIZ_SECRET_KEY` | تصادفی در هر اجرا | کلید session. برای پایداری، مقدار ثابت در `.env` بگذار. |
| `QUIZ_DATA_DIR` | `./data` | پوشهٔ آزمون‌ها |
| `QUIZ_LESSON_DIR` | `data/lessons` | پوشهٔ درسنامه‌ها |
| `QUIZ_STORAGE_DIR` | `./storage` | پوشهٔ فایل‌های تولیدشده |
| `QUIZ_VIDEO_DIR` | `storage/videos` | پوشهٔ پیش‌فرض صفحهٔ ویدیو |
| `QUIZ_VIDEO_ROOTS` | *(خالی)* | لیست پوشه‌های اضافی برای API ویدیو. `storage/videos` همیشه مجاز است. |
| `QUIZ_MAX_UPLOAD_MB` | `64` | حداکثر حجم آپلود (مگابایت) |
| `QUIZ_MAX_AUDIO_SECONDS` | `600` | حداکثر مدت صدا (ثانیه) |
| `QUIZ_TEXT_MAX_CHARS` | `200000` | حداکثر طول متن ورودی |
| `QUIZ_AI_PROVIDER` | `openai_compatible` | انتخاب provider |
| `QUIZ_AI_BASE_URL` | `https://api.openai.com/v1` | آدرس سرویس AI |
| `QUIZ_AI_API_KEY` | *(خالی)* | کلید API |
| `QUIZ_AI_MODEL` | `gpt-4o-mini` | نام مدل |
| `QUIZ_AI_TIMEOUT` | `60` | Timeout (ثانیه) |

### مثال: دسترسی از شبکهٔ لوکال

در `.env`:

```ini
QUIZ_HOST=0.0.0.0
```

سپس از دستگاه دیگر با IP لوکال سرور:

```text
http://192.168.1.10:5000
```

### مثال: تنظیم AI

در `.env`:

```ini
QUIZ_AI_API_KEY=sk-your-key-here
QUIZ_AI_BASE_URL=https://api.openai.com/v1
QUIZ_AI_MODEL=gpt-4o-mini
QUIZ_AI_TIMEOUT=60
```

هرگز کلید API، secret، یا محتوای شخصی را در ریپوی عمومی commit نکن.

### مثال: افزودن پوشه‌های ویدیویی

به‌طور پیش‌فرض، صفحهٔ ویدیو فقط از `storage/videos/` می‌خواند. برای افزودن مسیرهای دیگر:

```ini
QUIZ_VIDEO_ROOTS=~/Videos,~/Downloads,/mnt/media
```

مسیرهای خارج از این محدوده توسط API رد می‌شوند.

---

## استفاده از برنامه

### ساخت و مدیریت آزمون

1. برو به `/create`
2. در تب **JSON**، ساختار آزمون را پیست کن و **پردازش و افزودن** بزن، **یا**
3. در تب **AI**، متن درس را پیست کن، **کپی پرامپت** بزن، در ChatGPT/Claude/Gemini پیست کن، و جواب JSON را برگردان.
4. نام آزمون را وارد کن (فقط حروف کوچک انگلیسی، اعداد، `-` و `_`).
5. **ذخیره و انتشار**.

### درسنامه

1. برو به `/lessons/new/edit`
2. عنوان، توضیح، برچسب‌ها و بخش‌ها را وارد کن.
3. هر بخش را به Markdown بنویس.
4. اگر خواستی، درسنامه را به یک آزمون وصل کن.
5. ذخیره کن (یا `Ctrl+S`).

ادیتور یک بخش **تولید با AI** هم دارد: متن منبع را پیست کن، پرامپت را کپی کن، در LLM پیست کن، جواب JSON را برگردان — عنوان، توضیح، برچسب‌ها و بخش‌ها خودکار پر می‌شوند.

### ضبط صدا

`/audio` را باز کن.

**در ویندوز** برای ضبط صدای سیستم (نه میکروفون):

1. **Stereo Mix** (اگر کارت صدا پشتیبانی کند):
   - روی آیکون صدا در نوار وظیفه راست‌کلیک → **Sounds** → تب **Recording**
   - اگر `Stereo Mix` دیده شد، راست‌کلیک → **Enable**
   - در صفحهٔ `/audio`، `Stereo Mix` را انتخاب کن
2. **VB-Cable** (اگر Stereo Mix نداری):
   - [VB-Cable](https://vb-audio.com/Cable/) را نصب کن
   - سیستم را ری‌استارت کن
   - در `/audio`، `CABLE Output` را انتخاب کن

**در مک** از [BlackHole](https://existential.audio/blackhole/) استفاده کن.

**در لینوکس** دستگاهی که با `Monitor of ...` شروع می‌شود را انتخاب کن.

### استخراج صدا از ویدیو

`/video` را باز کن:

1. مسیر یک پوشه یا فایل ویدیویی را وارد کن.
2. **اسکن** بزن.
3. برای هر ویدیو: نام خروجی و فرمت را انتخاب کن.
4. **استخراج صدا** بزن.

می‌توانی **چند ویدیو** را انتخاب کنی و به **صف پردازش** اضافه کنی. صف برای هر آیتم وضعیت، progress bar، زمان سپری‌شده، و امکان توقف بین آیتم‌ها را نشان می‌دهد.

**پسوندهای ورودی:** `mp4`, `mkv`, `mov`, `avi`, `webm`, `flv`, `wmv`, `m4v`, `ts`, `mpg`, `mpeg`.

**فرمت‌های خروجی:** `mp3`, `wav`, `flac`, `m4a`, `opus`, `aac`.

خروجی‌ها در `storage/audio/` ذخیره می‌شوند.

### دسترسی از موبایل

اگر `QUIZ_HOST=0.0.0.0` باشد و گوشی روی همان شبکه باشد:

```text
http://<ip-کامپیوتر>:5000/mobile
```

برای پیدا کردن IP:

**لینوکس:** `ip addr | grep "inet "`
**مک:** `ipconfig getifaddr en0`
**ویندوز:** `ipconfig` (بخش `IPv4 Address`)

---

## مرجع API

### آزمون‌ها

| Method | Endpoint | کاربرد |
| --- | --- | --- |
| `GET` | `/api/v1/quizzes` | لیست آزمون‌ها |
| `GET` | `/api/v1/quizzes/<name>` | خواندن یک آزمون |
| `POST` | `/api/v1/quizzes/<name>` | ذخیره آزمون |
| `PUT` | `/api/v1/quizzes/<name>/questions/<id>` | ویرایش سوال |
| `DELETE` | `/api/v1/quizzes/<name>/questions/<id>` | حذف سوال |
| `GET` | `/api/v1/search?q=<term>` | جستجو |

### AI و Sessionها

| Method | Endpoint | کاربرد |
| --- | --- | --- |
| `POST` | `/api/v1/sessions` | ساخت Session متن |
| `POST` | `/api/v1/ai/generate` | تولید پیش‌نویس آزمون |
| `POST` | `/api/v1/ai/validate` | اعتبارسنجی پیش‌نویس |

### درسنامه‌ها

| Method | Endpoint | کاربرد |
| --- | --- | --- |
| `GET` | `/api/v1/lessons` | لیست درسنامه‌ها |
| `GET` | `/api/v1/lessons/<name>` | خواندن یک درسنامه |
| `POST` | `/api/v1/lessons/<name>` | ساخت درسنامه |
| `PUT` | `/api/v1/lessons/<name>` | ویرایش |
| `DELETE` | `/api/v1/lessons/<name>` | حذف |
| `GET` | `/api/v1/lessons/by-quiz/<quiz>` | درسنامهٔ متصل به آزمون |
| `GET` | `/api/v1/lessons/search?q=<term>` | جستجو |

### صدا

| Method | Endpoint | کاربرد |
| --- | --- | --- |
| `GET` | `/api/v1/audio/devices` | لیست دستگاه‌های ضبط |
| `POST` | `/api/v1/audio/record/start` | شروع ضبط |
| `POST` | `/api/v1/audio/record/stop` | توقف ضبط |
| `GET` | `/api/v1/audio/presets` | presetها و فرمت‌ها |
| `GET` | `/api/v1/audio/files` | لیست فایل‌ها |
| `GET` | `/api/v1/audio/files/<filename>` | دریافت فایل |
| `DELETE` | `/api/v1/audio/files/<filename>` | حذف فایل |

### ویدیو → صدا

| Method | Endpoint | کاربرد |
| --- | --- | --- |
| `POST` | `/api/v1/video/scan` | اسکن یک پوشه یا فایل |
| `POST` | `/api/v1/video/probe` | خواندن متادیتا |
| `POST` | `/api/v1/video/extract` | استخراج صدا |
| `GET` | `/api/v1/video/formats` | لیست فرمت‌ها و پوشهٔ پیش‌فرض |

**نمونهٔ بدنهٔ درخواست:**

```json
{"dir": "storage/videos"}
```

```json
{"path": "storage/videos/lesson.mp4"}
```

```json
{
  "path": "storage/videos/lesson.mp4",
  "name": "lesson-audio",
  "format": "mp3"
}
```

**نکتهٔ امنیتی:** API ویدیو فقط مسیرهای زیر `QUIZ_VIDEO_DIR` یا مسیرهای `QUIZ_VIDEO_ROOTS` را می‌پذیرد.

---

## مدل داده

### نمونهٔ JSON آزمون

```json
{
  "title": "Linux Essentials",
  "description": "Basic command-line concepts",
  "type": "linux",
  "level": 1,
  "questions": [
    {
      "id": "q_1",
      "text": "What does the ls command do?",
      "options": ["Lists files", "Deletes files", "Copies files", "Moves files"],
      "correct": 0,
      "category": "Commands",
      "level": 1,
      "explanation": "ls displays directory entries."
    }
  ]
}
```

`correct` **اندیس صفر-مبنا** در آرایهٔ گزینه‌ها است.

### نمونهٔ JSON درسنامه

```json
{
  "title": "Introduction to Storage",
  "description": "Disk and partition basics",
  "quiz_name": "linux-essentials",
  "level": 1,
  "tags": ["storage", "partitions"],
  "sections": [
    {
      "id": "s1",
      "title": "Understanding partitions",
      "content": "## Partitions\nA partition is a logical region of a disk.",
      "question_ids": ["q_1"]
    }
  ]
}
```

---

## معماری

```text
مرورگر / کلاینت API
        │
        ▼
     Flask app
     server.py
        │
        ▼
 Route blueprints (routes/)
        │
        ▼
  Domain services (core/services/)
        │
        ├── عملیات آزمون/درسنامه ──► JSON repository ──► data/
        ├── عملیات AI ────────────► Provider abstraction / API
        └── عملیات صوت/ویدیو ─────► FFmpeg and storage/
```

مسئولیت‌های اصلی:

- **`server.py`** — راه‌اندازی Flask، مسیرهای صفحه، ثبت blueprints، error handlers، و مسیرهای legacy
- **`config.py`** — تنظیمات مرکزی، بارگذاری `.env`، مسیرهای storage
- **`routes/`** — endpointهای HTTP به‌تفکیک ویژگی
- **`core/services/`** — منطق کسب‌وکار
- **`core/repository.py`** — ذخیره‌سازی JSON با atomic write و lock به‌ازای هر آزمون
- **`core/security.py`** — sanitize نام‌ها و محافظت path traversal
- **`core/ai/`** — Provider abstraction
- **`templates/` و `static/`** — رابط کاربری
- **`tests/`** — تست‌ها

### ساختار پروژه

```text
quiz-server/
├── server.py
├── config.py
├── requirements.txt
├── .env.example
├── core/
│   ├── errors.py
│   ├── security.py
│   ├── schema.py
│   ├── repository.py
│   ├── ai/
│   └── services/
├── routes/
│   ├── quiz_routes.py
│   ├── ai_routes.py
│   ├── audio_routes.py
│   ├── video_routes.py
│   └── lesson_routes.py
├── data/
│   └── lessons/
├── storage/
│   ├── audio/
│   ├── videos/
│   ├── tmp/
│   ├── uploads/
│   └── logs/
├── templates/
├── static/
└── tests/
```

---

## صفحات

| <span dir="rtl">صفحه</span> | <span dir="rtl">مسیر</span> |
| --- | --- |
| خانه / کتابخانهٔ آزمون | `/` |
| مشاهده آزمون | `/quiz/<name>` |
| ساخت آزمون | `/create` |
| پنل کاربری | `/dashboard` |
| ضبط صدا | `/audio` |
| استخراج صدا از ویدیو | `/video` |
| ورود متن از موبایل | `/mobile` |
| لیست درسنامه‌ها | `/lessons` |
| مشاهده درسنامه | `/lessons/<name>` |
| ویرایش درسنامه | `/lessons/<name>/edit` |

---

## تست

```bash
python -m pytest tests/ -v
```

در حال حاضر **۷۸ تست** روی Python 3.10 همه پاس می‌شوند.

پوشش تست‌ها:

- تنظیمات پیش‌فرض (host امن، debug خاموش، تولید `SECRET_KEY`، پارس `VIDEO_ROOTS`)
- Sanitization و محافظت path traversal (شامل symlink escape)
- Normalize کردن schema برای سوال، آزمون، درسنامه
- Atomic write، lock به‌ازای هر آزمون، نوشتن همزمان از ۲۰ thread
- محدودیت مسیر API ویدیو نسبت به `VIDEO_DIR` و `VIDEO_ROOTS`
- CRUD درسنامه و اتصال به آزمون

---

## امنیت و استقرار

پیش‌فرض‌های امن:

- سرور روی `127.0.0.1` گوش می‌دهد.
- Flask debug **خاموش** است.
- اگر `SECRET_KEY` ندهی، به‌صورت تصادفی ساخته می‌شود.
- API ویدیو فقط مسیرهای مجاز را می‌خواند.
- `sanitize_quiz_name` جداکننده‌های مسیر را قبل از هر نرمال‌سازی رد می‌کند.

قبل از استقرار عمومی:

1. مقدار قوی و یکتا برای `QUIZ_SECRET_KEY` در `.env` قرار بده.
2. برنامه را پشت یک WSGI production و reverse proxy با HTTPS قرار بده.
3. کنترل دسترسی endpointها را بررسی کن — برنامه **احراز هویت ندارد**.
4. محدودیت‌های مسیر فایل، اعتبارسنجی ورودی، محدودیت آپلود، و پوشه‌های در معرض را بررسی کن.
5. کلیدهای API را در environment یا secret manager نگه دار؛ هرگز منتشر نکن.
6. از `data/` و `storage/` پشتیبان بگیر.
7. دسترسی‌های ضبط صدا در سطح سیستم‌عامل و دسترس‌پذیری FFmpeg را تأیید کن.

> [!WARNING]
> فرض نکن که این برنامه authentication، multi-user isolation، rate limiting، یا محافظت اینترنت عمومی به‌صورت آماده دارد.

---

## عیب‌یابی

<details>
<summary><strong>نصب وابستگی audio-recorder شکست می‌خورد</strong></summary>

`requirements.txt` پکیج `audio-recorder` را از GitHub با git URL نصب می‌کند. اگر نصب شکست خورد:

- مطمئن شو `git` نصب و در `PATH` است.
- مطمئن شو شبکه به `github.com` دسترسی دارد.
- دستی امتحان کن:

  ```bash
  pip install "git+https://github.com/bigZeroR/audio-recorder.git"
  ```

- یا کلون و editable نصب کن:

  ```bash
  git clone https://github.com/bigZeroR/audio-recorder.git ../audio-recorder
  pip install -e ../audio-recorder
  ```

</details>

<details>
<summary><strong>FFmpeg یا FFprobe پیدا نمی‌شود</strong></summary>

FFmpeg را با package manager سیستم‌عامل نصب کن، سپس تأیید کن که `ffmpeg -version` و `ffprobe -version` در همان محیطی که سرور اجرا می‌شود کار می‌کنند.

**در ویندوز**، معمولاً یعنی `C:\ffmpeg\bin` در `PATH` نیست. اضافه کن و بعد Command Prompt را **ببند و باز کن**.

</details>

<details>
<summary><strong><code>python</code> در ویندوز شناخته نمی‌شود</strong></summary>

دوباره نصب کن و **"Add Python to environment variables"** را تیک بزن. یا از `py` استفاده کن:

```bat
py server.py
```

</details>

<details>
<summary><strong>PowerShell فعال‌سازی venv را رد می‌کند</strong></summary>

یک بار این را اجرا کن:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

</details>

<details>
<summary><strong>درخواست‌های AI کار نمی‌کنند</strong></summary>

مقادیر `QUIZ_AI_API_KEY`، `QUIZ_AI_BASE_URL`، `QUIZ_AI_MODEL` را چک کن و ببین provider انتخابی مدل موردنظر را پشتیبانی می‌کند. مطمئن شو این مقادیر در همان پروسه‌ای که سرور اجرا می‌شود وجود دارند (از `.env` یا export شده).

در ویندوز، متغیرهایی که با `set` تعریف می‌کنی فقط برای همان ترمینال معتبرند. از `.env` استفاده کن.

</details>

<details>
<summary><strong>از گوشی به برنامه دسترسی ندارم</strong></summary>

پیش‌فرض `QUIZ_HOST=127.0.0.1` است یعنی فقط از همان کامپیوتر قابل دسترسی. برای اجازه از دستگاه‌های دیگر:

1. در `.env` مقدار `QUIZ_HOST=0.0.0.0` بگذار.
2. مطمئن شو هر دو دستگاه روی شبکهٔ مورد اعتماد هستند.
3. پورت را از firewall عبور بده.
4. از گوشی، IP لوکال سرور را وارد کن (نه `127.0.0.1`).

</details>

<details>
<summary><strong>استخراج ویدیو با "این مسیر مجاز نیست" شکست می‌خورد</strong></summary>

API ویدیو فقط مسیرهای زیر `QUIZ_VIDEO_DIR` (پیش‌فرض `storage/videos/`) یا مسیرهای `QUIZ_VIDEO_ROOTS` را می‌خواند. پوشهٔ مورد نظر را در `.env` اضافه کن:

```ini
QUIZ_VIDEO_ROOTS=~/Videos,~/Downloads
```

و سرور را ری‌استارت کن.

</details>

<details>
<summary><strong>ضبط صدا ساکت است</strong></summary>

احتمالاً میکروفون پیش‌فرض را ضبط می‌کنی نه صدای سیستم. در ویندوز **Stereo Mix** را فعال کن یا **VB-Cable** نصب کن و آن دستگاه را در صفحهٔ `/audio` انتخاب کن.

</details>

---

## مشارکت

از مشارکت، گزارش باگ، و بهبود مستندات استقبال می‌شود.

1. این ریپو را Fork کن.
2. یک branch ویژگی بساز.
3. تغییر متمرکز با تست مناسب اعمال کن.
4. قبل از PR، `python -m pytest tests/ -v` را اجرا کن.
5. توضیح بده چرا و چطور تست شد.

برای باگ یا پیشنهاد، از [GitHub Issues](https://github.com/bigZeroR/quiz-server/issues) استفاده کن.

---

## لینک‌ها

- **ریپو:** https://github.com/bigZeroR/quiz-server
- **Issues:** https://github.com/bigZeroR/quiz-server/issues
- **audio-recorder backend:** https://github.com/bigZeroR/audio-recorder

---

<div align="center">

**Quiz Server** — یک فضای کاری برای آزمون، درسنامه، تولید محتوا با AI، و رسانه‌های آموزشی.

[⬆ بازگشت به بالا](#quiz-server)

</div>

