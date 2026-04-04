import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from jose import jwt
from config.db_config import get_pool

load_dotenv()

analytics_bp = Blueprint('analytics', __name__)
SECRET_KEY = os.environ.get('SECRET_KEY', '')

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except Exception:
        return None

@analytics_bp.route('/analytics', methods=['GET'])
def analytics():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = verify_token(token)
    if not user or user.get('user_type') != 'tutor':
        return jsonify({'success': False, 'error': 'Unauthorized access'}), 403

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT username, points AS progress FROM users WHERE user_type = "student"')
        data = cursor.fetchall()
        cursor.close()
        return jsonify({
            'success': True,
            'students': [d['username'] for d in data],
            'progress': [d['progress'] for d in data]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
