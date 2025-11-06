from flask import Blueprint, jsonify
import mysql.connector
from config.db_config import db_config
from jose import jwt

analytics_bp = Blueprint('analytics', __name__)
SECRET_KEY = 'your-secret-key-12345'

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['data']
    except Exception as e:
        return None

@analytics_bp.route('/analytics', methods=['GET'])
def analytics():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = verify_token(token)
    if not user or user['user_type'] != 'tutor':
        return jsonify({'success': False, 'error': 'Unauthorized access'}), 403

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT username, points AS progress FROM users WHERE user_type = "student"')
        data = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({
            'success': True,
            'students': [d['username'] for d in data],
            'progress': [d['progress'] for d in data]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500