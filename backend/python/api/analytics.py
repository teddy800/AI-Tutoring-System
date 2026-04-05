import os
import time
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from jose import jwt
from config.db_config import get_pool

load_dotenv()

analytics_bp = Blueprint('analytics', __name__)
SECRET_KEY = os.environ.get('SECRET_KEY', '')

# ── Simple in-memory cache ────────────────────────────────────────────────────
_cache: dict = {}
CACHE_TTL = 60  # seconds

def cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry['ts']) < CACHE_TTL:
        return entry['data']
    return None

def cache_set(key: str, data):
    _cache[key] = {'data': data, 'ts': time.time()}

def cache_clear(prefix: str = ''):
    keys = [k for k in _cache if k.startswith(prefix)]
    for k in keys:
        del _cache[k]

# ── Token verification ────────────────────────────────────────────────────────
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except Exception:
        return None

def get_token():
    return request.headers.get('Authorization', '').replace('Bearer ', '')

# ── Error helpers ─────────────────────────────────────────────────────────────
def unauthorized(msg='Unauthorized access'):
    return jsonify({'success': False, 'error': msg}), 403

def server_error(msg='Internal server error'):
    return jsonify({'success': False, 'error': msg}), 500

def not_found(msg='Resource not found'):
    return jsonify({'success': False, 'error': msg}), 404

# ── Routes ────────────────────────────────────────────────────────────────────

@analytics_bp.route('/analytics', methods=['GET'])
def analytics():
    """Overall analytics — tutor only."""
    user = verify_token(get_token())
    if not user or user.get('user_type') != 'tutor':
        return unauthorized('Only tutors can access analytics')

    cache_key = 'analytics_overview'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            'SELECT username, points AS progress FROM users WHERE user_type = "student" ORDER BY points DESC'
        )
        data = cursor.fetchall()
        cursor.close()

        result = {
            'success': True,
            'students': [d['username'] for d in data],
            'progress': [min(int(d['progress'] or 0), 100) for d in data],
            'total': len(data),
            'average': round(sum(d['progress'] or 0 for d in data) / max(len(data), 1), 1)
        }
        cache_set(cache_key, result)
        return jsonify(result)
    except Exception as e:
        return server_error(str(e))
    finally:
        conn.close()


@analytics_bp.route('/analytics/student/<int:student_id>', methods=['GET'])
def student_analytics(student_id: int):
    """Individual student analytics."""
    user = verify_token(get_token())
    if not user:
        return unauthorized()
    # Students can only see their own data; tutors can see anyone
    if user.get('user_type') != 'tutor' and user.get('id') != student_id:
        return unauthorized('You can only view your own analytics')

    cache_key = f'student_{student_id}'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            'SELECT id, username, points, streak, user_type FROM users WHERE id = %s',
            (student_id,)
        )
        student = cursor.fetchone()
        if not student:
            cursor.close()
            return not_found('Student not found')

        # Quiz scores
        cursor.execute(
            'SELECT score, topic, created_at FROM quiz_results WHERE user_id = %s ORDER BY created_at DESC LIMIT 20',
            (student_id,)
        )
        scores = cursor.fetchall()
        cursor.close()

        avg_score = round(sum(s['score'] for s in scores) / max(len(scores), 1), 1) if scores else 0
        result = {
            'success': True,
            'student': {
                'id': student['id'],
                'username': student['username'],
                'points': student['points'],
                'streak': student['streak'],
            },
            'quiz_scores': [{'score': s['score'], 'topic': s['topic']} for s in scores],
            'average_score': avg_score,
            'total_quizzes': len(scores)
        }
        cache_set(cache_key, result)
        return jsonify(result)
    except Exception as e:
        return server_error(str(e))
    finally:
        conn.close()


@analytics_bp.route('/analytics/courses', methods=['GET'])
def course_analytics():
    """Course-level analytics — tutor only."""
    user = verify_token(get_token())
    if not user or user.get('user_type') != 'tutor':
        return unauthorized('Only tutors can access course analytics')

    cache_key = 'analytics_courses'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            '''SELECT c.title, COUNT(e.user_id) as enrolled,
               AVG(e.progress) as avg_progress
               FROM courses c
               LEFT JOIN enrollments e ON c.id = e.course_id
               GROUP BY c.id, c.title
               ORDER BY enrolled DESC'''
        )
        courses = cursor.fetchall()
        cursor.close()

        result = {
            'success': True,
            'courses': [
                {
                    'title': c['title'],
                    'enrolled': int(c['enrolled'] or 0),
                    'avg_progress': round(float(c['avg_progress'] or 0), 1)
                }
                for c in courses
            ]
        }
        cache_set(cache_key, result)
        return jsonify(result)
    except Exception as e:
        return server_error(str(e))
    finally:
        conn.close()


@analytics_bp.route('/analytics/trends', methods=['GET'])
def analytics_trends():
    """Weekly/monthly trends — tutor only."""
    user = verify_token(get_token())
    if not user or user.get('user_type') != 'tutor':
        return unauthorized('Only tutors can access trend analytics')

    period = request.args.get('period', 'weekly')  # 'weekly' or 'monthly'
    cache_key = f'analytics_trends_{period}'
    cached = cache_get(cache_key)
    if cached:
        return jsonify(cached)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        if period == 'monthly':
            cursor.execute(
                '''SELECT DATE_FORMAT(created_at, '%Y-%m') as period,
                   COUNT(*) as quiz_attempts, AVG(score) as avg_score
                   FROM quiz_results
                   GROUP BY period
                   ORDER BY period DESC LIMIT 12'''
            )
        else:
            cursor.execute(
                '''SELECT YEARWEEK(created_at) as period,
                   COUNT(*) as quiz_attempts, AVG(score) as avg_score
                   FROM quiz_results
                   GROUP BY period
                   ORDER BY period DESC LIMIT 12'''
            )
        trends = cursor.fetchall()
        cursor.close()

        result = {
            'success': True,
            'period': period,
            'trends': [
                {
                    'period': str(t['period']),
                    'quiz_attempts': int(t['quiz_attempts']),
                    'avg_score': round(float(t['avg_score'] or 0), 1)
                }
                for t in trends
            ]
        }
        cache_set(cache_key, result)
        return jsonify(result)
    except Exception as e:
        return server_error(str(e))
    finally:
        conn.close()
