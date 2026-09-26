# 🧠 Quiz Server

سامانه آزمون‌ساز با معماری لایه‌ای، AI Integration، Audio Subsystem و Mobile Support.

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
│   └── ai/                   # Provider abstraction
├── routes/                   # Flask blueprints
├── data/                     # Source of truth (JSON)
├── storage/audio/            # Audio files
├── templates/                # HTML
├── static/js/                # JS modules
└── tests/                    # Pytest
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/quizzes` | لیست آزمون‌ها |
| GET | `/api/v1/quizzes/<n>` | جزئیات آزمون |
| PUT | `/api/v1/quizzes/<n>/questions/<id>` | ویرایش سوال |
| DELETE | `/api/v1/quizzes/<n>/questions/<id>` | حذف سوال |
| GET | `/api/v1/search?q=` | جستجو |
| POST | `/api/v1/sessions` | ساخت Text Session |
| POST | `/api/v1/ai/generate` | تولید آزمون با AI |
| GET | `/api/v1/audio/devices` | دستگاه‌های صوتی |
| POST | `/api/v1/audio/record/start` | شروع ضبط |
| GET | `/api/v1/audio/files/<f>` | دانلود فایل صوتی |

## تست

```bash
pytest tests/ -v
```

## متغیرهای محیطی

```bash
export QUIZ_AI_API_KEY="sk-..."
export QUIZ_HOST="0.0.0.0"
export QUIZ_PORT=5000
```

## دسترسی از موبایل

```
http://<server-ip>:5000/mobile
```
