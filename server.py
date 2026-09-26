"""Quiz Server - Flask application entry point."""
from __future__ import annotations

import logging

from flask import Flask, render_template, jsonify, request

from config import Config
from core.errors import AppError
from core.logging_setup import setup_logging
from core.repository import QuizRepository
from core.services.quiz_service import QuizService
from routes import ai_routes, audio_routes, quiz_routes

setup_logging(logging.INFO if not Config.DEBUG else logging.DEBUG)
log = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", template_folder="templates")
    app.config["SECRET_KEY"] = Config.SECRET_KEY
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_UPLOAD_MB * 1024 * 1024

    repo = QuizRepository()
    quiz_service = QuizService(repo)

    app.register_blueprint(quiz_routes.bp)
    app.register_blueprint(ai_routes.bp)
    app.register_blueprint(audio_routes.bp)

    # Legacy aliases (backward compatibility)
    @app.post("/api/save_quiz")
    @app.post("/api/save_quiz_with_name")
    def legacy_save():
        body = request.get_json(silent=True) or {}
        name = body.get("quiz_name") or body.get("title") or "quiz"
        data = body.get("quiz_data") or body
        quiz_service.save(name, data)
        return jsonify({"success": True, "redirect": f"/quiz/{name}"})

    @app.post("/api/edit_question")
    def legacy_edit():
        body = request.get_json(silent=True) or {}
        quiz_service.update_question(body["quiz_name"], str(body["question_id"]), body["question"])
        return jsonify({"success": True})

    @app.post("/api/delete_question")
    def legacy_delete():
        body = request.get_json(silent=True) or {}
        quiz_service.delete_question(body["quiz_name"], str(body["question_id"]))
        return jsonify({"success": True})

    @app.get("/api/search")
    def legacy_search():
        return jsonify(quiz_service.search(request.args.get("q", "").strip()))

    @app.get("/api/reload")
    def legacy_reload():
        repo.invalidate()
        return jsonify({"success": True, "quizzes": len(repo.list_quizzes(reload=True))})

    # HTML routes
    @app.get("/")
    def index():
        return render_template("index.html", quizzes=quiz_service.list_all(), quiz=None)

    @app.get("/quiz/<name>")
    def quiz_page(name: str):
        quiz = quiz_service.get(name)
        return render_template(
            "index.html",
            quizzes=quiz_service.list_all(),
            quiz=quiz,
            quiz_name=name,
            quiz_type=quiz.get("type", "general"),
        )

    @app.get("/create")
    def create_page():
        return render_template("create.html")

    @app.get("/dashboard")
    def dashboard_page():
        return render_template("dashboard.html", quizzes=quiz_service.list_all())

    @app.get("/audio")
    def audio_page():
        return render_template("audio.html")

    @app.get("/mobile")
    def mobile_page():
        return render_template("mobile.html")

    # Error handlers
    @app.errorhandler(AppError)
    def handle_app_error(e: AppError):
        log.warning("AppError: %s (%s)", e.message, e.code)
        return jsonify(e.to_dict()), e.status_code

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"success": False, "code": "not_found", "error": "یافت نشد"}), 404

    @app.errorhandler(500)
    def server_error(e):
        log.exception("Unhandled error: %s", e)
        return jsonify({"success": False, "code": "internal_error", "error": "خطای داخلی سرور"}), 500

    return app


app = create_app()


if __name__ == "__main__":
    Config.ensure_dirs()
    print("=" * 56)
    print(f"🚀 Quiz Server running on http://{Config.HOST}:{Config.PORT}")
    print(f"📂 Data dir: {Config.DATA_DIR}")
    print(f"🎧 Audio dir: {Config.AUDIO_DIR}")
    print("=" * 56)
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
