# 🧠 Quiz Server

سامانه آزمون‌ساز با معماری لایه‌ای، AI Integration، Audio Subsystem، درسنامه، و Mobile Support.

## نصب سریع

```bash
bash run.sh
```

## ساختار

```
.
├── server.py                 # Entry point
├── config.py                 # تنظیمات
├── core/
│   ├── errors.py             # استثناها
│   ├── security.py           # Path traversal + sanitization
│   ├── schema.py             # Schema + Field Mapping
│   ├── repository.py         # Atomic JSON I/O + Cache
│   ├── services/             # Business logic
│   │   ├── quiz_service.py
│   │   ├── ai_service.py
│   │   ├── audio_service.py
│   │   ├── lesson_service.py # ← جدید
│   │   └── text_session_service.py
│   └── ai/                   # Provider abstraction
├── routes/                   # Flask blueprints
│   ├── quiz_routes.py
│   ├── ai_routes.py
│   ├── audio_routes.py
│   └── lesson_routes.py      # ← جدید
├── data/                     # Source of truth (JSON)
│   ├── *.json                # آزمون‌ها
│   └── lessons/*.json        # درسنامه‌ها  ← جدید
├── storage/audio/            # Audio files
├── templates/                # HTML
├── static/js/                # JS modules
├── vendor/audio-recorder/    # وابستگی محلی
└── tests/                    # Pytest
```

## ویژگی‌ها

- **آزمون‌ساز** — ساخت، ویرایش، جستجو، دسته‌بندی
- **AI Integration** — تولید سوال از متن (OpenAI-compatible / Mock)
- **Audio Subsystem** — ضبط صدا با preset و فرمت‌های مختلف
- **درسنامه (Lessons)** — درسنامه‌های مستقل با Markdown، TOC، و اتصال به آزمون
- **AI Prompt Generator** — برای درسنامه و آزمون، پرامپت آماده برای هر LLM
- **Mobile Support** — رابط ورود متن برای موبایل

## API

### آزمون‌ها

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quizzes` | لیست آزمون‌ها |
| GET | `/api/v1/quizzes/<n>` | جزئیات آزمون |
| POST | `/api/v1/quizzes/<n>` | ذخیره آزمون |
| PUT | `/api/v1/quizzes/<n>/questions/<id>` | ویرایش سوال |
| DELETE | `/api/v1/quizzes/<n>/questions/<id>` | حذف سوال |
| GET | `/api/v1/search?q=` | جستجو |

### AI / Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sessions` | ساخت Text Session |
| POST | `/api/v1/ai/generate` | تولید آزمون با AI |
| POST | `/api/v1/ai/validate` | اعتبارسنجی draft |

### Audio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audio/devices` | دستگاه‌های صوتی |
| POST | `/api/v1/audio/record/start` | شروع ضبط |
| POST | `/api/v1/audio/record/stop` | توقف ضبط |
| GET | `/api/v1/audio/presets` | presetها و فرمت‌ها |
| GET | `/api/v1/audio/files` | لیست فایل‌ها |
| GET | `/api/v1/audio/files/<f>` | دانلود فایل صوتی |
| DELETE | `/api/v1/audio/files/<f>` | حذف فایل صوتی |

### درسنامه‌ها (Lessons)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lessons` | لیست درسنامه‌ها |
| GET | `/api/v1/lessons/<n>` | جزئیات درسنامه |
| POST | `/api/v1/lessons/<n>` | ساخت درسنامه |
| PUT | `/api/v1/lessons/<n>` | ویرایش درسنامه |
| DELETE | `/api/v1/lessons/<n>` | حذف درسنامه |
| GET | `/api/v1/lessons/by-quiz/<q>` | درسنامهٔ متصل به آزمون |
| GET | `/api/v1/lessons/search?q=` | جستجو |

## صفحات

| مسیر | توضیح |
|------|-------|
| `/` | خانه — لیست آزمون‌ها |
| `/quiz/<name>` | صفحهٔ آزمون |
| `/create` | ساخت آزمون جدید (AI / JSON) |
| `/dashboard` | پنل کاربری |
| `/audio` | ضبط و مدیریت صدا |
| `/mobile` | ورود متن با AI |
| `/lessons` | لیست درسنامه‌ها |
| `/lessons/<name>` | مشاهدهٔ درسنامه |
| `/lessons/<name>/edit` | ویرایش / ساخت درسنامه |

## درسنامه — نحوهٔ استفاده

### ساخت دستی

1. برو به `/lessons/new/edit`
2. نام فایل (انگلیسی)، عنوان، توضیح، برچسب‌ها و بخش‌ها را پر کن
3. هر بخش محتوای **Markdown** می‌پذیرد (`## heading`, `**bold**`, `` `code` ``, ` ```bash ` و ...)
4. با `Ctrl+S` یا دکمهٔ ذخیره، در `data/lessons/<name>.json` ذخیره می‌شود

### ساخت با AI

1. در ادیتور، کادر **«📄 متن آموزشی»** را با متن منبع پر کن
2. **«📋 کپی پرامپت کامل»** را بزن
3. پرامپت را در ChatGPT / Claude / Gemini / DeepSeek پیست کن
4. خروجی JSON را در کادر **«📥 پیست خروجی JSON از AI»** برگردان
5. **«⚙️ افزودن به ویرایشگر»** را بزن — عنوان، توضیح، برچسب و بخش‌ها خودکار پر می‌شوند
6. ذخیره کن

> خروجی AI می‌تواند داخل ` ```json ` باشد و trailing comma داشته باشد — هر دو تحمل می‌شوند.

### اتصال به آزمون

در ادیتور درسنامه، فیلد **«آزمون مرتبط»** را به یک آزمون موجود ست کن.
بعد از ذخیره، در صفحهٔ آن آزمون، دکمهٔ شناور **📖** نمایش داده می‌شود.

## اسکریپت‌های نصب

| اسکریپت | کار |
|---------|-----|
| `run.sh` | venv + pip install + اجرای سرور |
| `setup_all.sh` | بازنویسی فایل‌های فرانت‌اند |
| `integrate_audio_recorder.sh` | نصب vendor/audio-recorder |
| `install_lessons.sh` | نصب زیرسیستم درسنامه |
| `add_ai_lesson_prompt.sh` | افزودن تب AI به ادیتور درسنامه |

## تست

```bash
pytest tests/ -v
```

## متغیرهای محیطی

```bash
export QUIZ_AI_API_KEY="sk-..."       # کلید AI
export QUIZ_AI_BASE_URL="https://api.openai.com/v1"
export QUIZ_AI_MODEL="gpt-4o-mini"

export QUIZ_HOST="0.0.0.0"
export QUIZ_PORT=5000
export QUIZ_DEBUG=1
export QUIZ_SECRET_KEY="change-me"

export QUIZ_DATA_DIR="./data"
export QUIZ_LESSON_DIR="./data/lessons"
export QUIZ_STORAGE_DIR="./storage"
```

نمونه در `.env.example` موجود است — کپی کن به `.env`.

## دسترسی از موبایل

```
http://<server-ip>:5000/mobile
```

## مدل دادهٔ درسنامه

```json
{
  "title": "درسنامه ذخیره‌سازی",
  "description": "خلاصهٔ فصل ۳",
  "quiz_name": "episode-one-of-mcsa",
  "level": 1,
  "tags": ["storage", "mbr"],
  "sections": [
    {
      "id": "s1",
      "title": "مقدمه",
      "content": "## عنوان\nمتن Markdown...",
      "question_ids": ["q_abc"]
    }
  ]
}
```

## مدل دادهٔ آزمون

```json
{
  "title": "مدیریت فایل",
  "description": "دستورات پایه",
  "type": "linux",
  "level": 1,
  "questions": [
    {
      "id": "q_1",
      "text": "دستور ls چه کاری می‌کند؟",
      "options": ["لیست فایل‌ها", "حذف", "کپی", "انتقال"],
      "correct": 0,
      "category": "دستورات",
      "level": 1,
      "explanation": "ls برای لیست گرفتن از پوشه است."
    }
  ]
}
```
