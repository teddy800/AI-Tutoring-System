from flask import Blueprint, request, jsonify
import mysql.connector
from config.db_config import db_config
from jose import jwt

quizzes_bp = Blueprint('quizzes', __name__)
SECRET_KEY = 'your-secret-key-12345'

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['data']
    except Exception as e:
        return None

@quizzes_bp.route('/quizzes', methods=['GET'])
def get_quizzes():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM quizzes')
        quizzes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'quizzes': quizzes})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@quizzes_bp.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = verify_token(token)
    if not user:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

    data = request.get_json()
    answers = data.get('answers', [])
    user_id = user['id']

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        score = 0
        for answer in answers:
            cursor.execute('SELECT correct_answer FROM quizzes WHERE id = %s', (answer['question_id'],))
            quiz = cursor.fetchone()
            if quiz and quiz['correct_answer'] == answer['answer']:
                score += 50
        points_earned = score // 10
        cursor.execute('UPDATE users SET points = points + %s WHERE id = %s', (points_earned, user_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'score': score, 'points_earned': points_earned})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500