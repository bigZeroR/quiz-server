from flask import Flask, render_template, jsonify, request
import json
import os
import re
import time

app = Flask(__name__)
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
QUIZ_CACHE = {}

def detect_quiz_type(data: dict, filename: str) -> str:
    """تشخیص نوع آزمون با اولویت مطلق نام فایل برای جلوگیری از هرگونه خطا"""
    filename_lower = filename.lower()
    
    # 1. اولویت اول (مطمئن‌ترین روش): بررسی نام فایل
    if 'network' in filename_lower or 'شبکه' in filename_lower:
        return 'network'
    if 'command' in filename_lower or 'دستور' in filename_lower:
        return 'command'
    
    # 2. اولویت دوم: فیلد type در خود فایل JSON (اگر دستی اضافه کرده باشید)
    if 'type' in data:
        return str(data['type']).lower()
    
    # 3. اولویت سوم: بررسی عنوان آزمون
    title = data.get('title', '').lower()
    if 'network' in title or 'شبکه' in title:
        return 'network'
    
    # 4. پیش‌فرض: عمومی
    return 'general'

def load_quiz_files(force_reload: bool = False):
    """بارگذاری لیست آزمون‌ها"""
    global QUIZ_CACHE
    
    if QUIZ_CACHE and not force_reload:
        return [item['info'] for item in QUIZ_CACHE.values()]
    
    quizzes = []
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
        return quizzes

    for filename in sorted(os.listdir(DATA_DIR)):
        if filename.endswith('.json'):
            file_path = os.path.join(DATA_DIR, filename)
            try:
                with open(file_path, encoding='utf-8') as f:
                    data = json.load(f)
                
                quiz_name = filename.replace('.json', '')
                quiz_type = detect_quiz_type(data, filename)
                
                quiz_info = {
                    'file': quiz_name,
                    'title': data.get('title', filename).strip(),
                    'description': data.get('description', '').strip(),
                    'count': len(data.get('questions', [])),
                    'type': quiz_type,
                    'level': data.get('level', '1')
                }
                quizzes.append(quiz_info)
                QUIZ_CACHE[quiz_name] = {'info': quiz_info, 'data': data}
            except Exception as e:
                print(f"⚠️ خطا در خواندن {filename}: {e}")
    
    return quizzes

@app.route('/')
def index():
    quizzes = load_quiz_files()
    return render_template('index.html', quizzes=quizzes, quiz=None)

@app.route('/create')
def create_quiz_page():
    return render_template('create.html')

@app.route('/quiz/<quiz_name>')
def quiz_page(quiz_name):
    # اگر در کش نبود، یک بار با force_reload تلاش می‌کنیم
    if quiz_name not in QUIZ_CACHE:
        load_quiz_files(force_reload=True)
        
    if quiz_name not in QUIZ_CACHE:
        return "فایل یافت نشد", 404
        
    cached = QUIZ_CACHE[quiz_name]
    quizzes = [item['info'] for item in QUIZ_CACHE.values()]
    
    return render_template(
        'index.html',
        quizzes=quizzes,
        quiz=cached['data'],
        quiz_name=quiz_name,
        quiz_type=cached['info']['type']
    )

@app.route('/api/save_quiz', methods=['POST'])
def save_quiz():
    data = request.json
    if not data or 'questions' not in data:
        return jsonify({'success': False, 'error': 'ساختار JSON نامعتبر است'}), 400
    
    title = data.get('title', 'آزمون_جدید').strip()
    safe_filename = re.sub(r'[^\w\s-]', '', title).replace(' ', '_').lower()
    if not safe_filename:
        safe_filename = f'quiz_{int(time.time())}'
    
    file_path = os.path.join(DATA_DIR, f"{safe_filename}.json")
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        global QUIZ_CACHE
        QUIZ_CACHE = {}  # پاک کردن کش برای بارگذاری مجدد
        
        return jsonify({'success': True, 'redirect': f'/quiz/{safe_filename}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/reload')
def reload_cache():
    """پاک کردن کش و بارگذاری مجدد آزمون‌ها"""
    global QUIZ_CACHE
    QUIZ_CACHE = {}
    quizzes = load_quiz_files(force_reload=True)
    return jsonify({
        'success': True, 
        'message': f'کش پاک شد و {len(quizzes)} آزمون بارگذاری شد'
    })

@app.route('/dashboard')
def dashboard():
    """صفحه داشبورد کاربری"""
    quizzes = load_quiz_files()
    return render_template('dashboard.html', quizzes=quizzes)

# ============================================================
# API جستجوی جامع بین تمام آزمون‌ها
# ============================================================
@app.route('/api/search')
def search_questions():
    """جستجوی عبارت در تمام سوالات تمام آزمون‌ها"""
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'results': [], 'query': ''})
    
    # بارگذاری مجدد برای اطمینان از به‌روز بودن کش
    load_quiz_files(force_reload=True)
    
    results = []
    query_lower = query.lower()
    
    for quiz_name, cached in QUIZ_CACHE.items():
        quiz_data = cached['data']
        quiz_title = quiz_data.get('title', quiz_name)
        questions = quiz_data.get('questions', [])
        
        for q in questions:
            # جستجو در متن سوال، گزینه‌ها و توضیح
            text = q.get('text', '')
            options = ' '.join(q.get('options', []))
            explanation = q.get('explanation', '')
            combined = f"{text} {options} {explanation}".lower()
            
            if query_lower in combined:
                results.append({
                    'quiz_name': quiz_name,
                    'quiz_title': quiz_title,
                    'question_id': q.get('id', 0),
                    'question_text': text,
                    'category': q.get('category', ''),
                    'level': q.get('level', 1),
                    'options': q.get('options', []),
                    'correct': q.get('correct', 0),
                    'explanation': explanation,
                    'match_preview': text[:120] + ('...' if len(text) > 120 else '')
                })
    
    # مرتب‌سازی بر اساس طول متن (اختیاری)
    results.sort(key=lambda x: len(x['question_text']))
    
    return jsonify({
        'query': query,
        'count': len(results),
        'results': results[:100]  # حداکثر ۱۰۰ نتیجه
    })

if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    print("=" * 50)
    print("🚀 LPIC Quiz Server is running!")
    print("📂 http://127.0.0.1:5000")
    print("🔄 Reload Cache: http://127.0.0.1:5000/api/reload")
    print("=" * 50)
    app.run(debug=True, port=5000)
