FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# ffmpeg/ffprobe for video->audio; git for the audio-recorder dependency
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg git ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Data and storage are volumes; the app creates them on start.
VOLUME ["/app/data", "/app/storage"]

EXPOSE 5000

ENV QUIZ_HOST=0.0.0.0 \
    QUIZ_PORT=5000 \
    QUIZ_DEBUG=0

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/healthz', timeout=2).status==200 else 1)"

CMD ["python", "server.py"]
