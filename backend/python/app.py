import os
import time
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from api.courses import courses_bp
from api.quizzes import quizzes_bp
from api.chatbot import chatbot_bp
from api.analytics import analytics_bp
from api.repository import repository_bp

load_dotenv()

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', '*')
CORS(app, resources={r"/api/*": {
    "origins": ALLOWED_ORIGIN,
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "X-Session-ID"]
}})

# ── Blueprints ────────────────────────────────────────────────────────────────
app.register_blueprint(courses_bp,    url_prefix='/api')
app.register_blueprint(quizzes_bp,    url_prefix='/api')
app.register_blueprint(chatbot_bp,    url_prefix='/api')
app.register_blueprint(analytics_bp,  url_prefix='/api')
app.register_blueprint(repository_bp, url_prefix='/api')

# ── Health check ──────────────────────────────────────────────────────────────
_start_time = time.time()

@app.route('/api/health')
def health():
    return jsonify({
        'success': True,
        'status': 'ok',
        'uptime': round(time.time() - _start_time, 1),
        'version': '2.0.0'
    })

# ── 404 handler ───────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'success': False, 'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    port  = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug)
