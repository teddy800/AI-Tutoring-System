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
        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
    except Exception:
        return None

@quizzes_bp.route('/quizzes', methods=['GET'])
def get_quizzes():
    topic      = request.args.get('topic', '')
    difficulty = request.args.get('difficulty', '')
    search     = request.args.get('search', '')
    limit      = min(int(request.args.get('limit', 120)), 200)
    random_q   = request.args.get('random', 'false').lower() == 'true'
    count      = min(int(request.args.get('count', 10)), 30)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        sql    = 'SELECT * FROM quizzes WHERE 1=1'
        params = []
        if topic:
            sql += ' AND topic = %s'; params.append(topic)
        if difficulty:
            sql += ' AND difficulty = %s'; params.append(difficulty)
        if search:
            sql += ' AND (question LIKE %s OR topic LIKE %s)'
            params += [f'%{search}%', f'%{search}%']
        if random_q:
            sql += ' ORDER BY RAND() LIMIT %s'; params.append(count)
        else:
            sql += ' ORDER BY id LIMIT %s'; params.append(limit)
        cursor.execute(sql, params)
        quizzes = cursor.fetchall()
        cursor.close()

        # Get unique topics for filter UI
        cursor2 = conn.cursor()
        cursor2.execute('SELECT DISTINCT topic FROM quizzes ORDER BY topic')
        topics = [r[0] for r in cursor2.fetchall()]
        cursor2.close()

        return jsonify({'success': True, 'quizzes': quizzes, 'topics': topics, 'total': len(quizzes)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()

@quizzes_bp.route('/submit-quiz', methods=['POST'])
def submit_quiz():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user  = verify_token(token)
    if not user:
        return jsonify({'success': False, 'error': 'Invalid token'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'Invalid JSON'}), 400

    answers = data.get('answers', [])
    topic   = data.get('topic', 'General')
    user_id = user.get('id')

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        score = 0; results = []
        for answer in answers:
            cursor.execute('SELECT correct_answer, explanation FROM quizzes WHERE id = %s', (answer['question_id'],))
            quiz = cursor.fetchone()
            if quiz:
                correct = quiz['correct_answer'] == answer['answer']
                if correct: score += 50
                results.append({
                    'question_id': answer['question_id'],
                    'correct': correct,
                    'explanation': quiz.get('explanation', '')
                })
        points_earned = score // 10
        cursor.execute('UPDATE users SET points = points + %s WHERE id = %s', (points_earned, user_id))
        cursor.execute('INSERT INTO quiz_results (user_id, score, topic) VALUES (%s, %s, %s)', (user_id, score, topic))
        conn.commit()
        cursor.close()
        return jsonify({'success': True, 'score': score, 'points_earned': points_earned, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
