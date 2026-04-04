import os
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from jose import jwt
from config.db_config import get_pool

load_dotenv()

quizzes_bp = Blueprint('quizzes', __name__)
SECRET_KEY = os.environ.get('SECRET_KEY', '')

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except Exception:
        return None

@quizzes_bp.route('/quizzes', methods=['GET'])
def get_quizzes():
    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT * FROM quizzes')
        quizzes = cursor.fetchall()
        cursor.close()
        return jsonify({'success': True, 'quizzes': quizzes})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@quizzes_bp.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = verify_token(token)
    if not user:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON'}), 400

    answers = data.get('answers', [])
    user_id = user.get('id')

    conn = get_pool().get_connection()
    try:
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
        return jsonify({'success': True, 'score': score, 'points_earned': points_earned})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
