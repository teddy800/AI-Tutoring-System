from flask import Blueprint, request, jsonify
from config.db_config import get_pool

courses_bp = Blueprint('courses', __name__)

@courses_bp.route('/courses', methods=['GET'])
def get_courses():
    difficulty = request.args.get('difficulty', '')
    category   = request.args.get('category', '')
    search     = request.args.get('search', '')
    limit      = min(int(request.args.get('limit', 100)), 100)

    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        sql    = 'SELECT * FROM courses WHERE 1=1'
        params = []
        if difficulty:
            sql += ' AND difficulty = %s'; params.append(difficulty)
        if category:
            sql += ' AND category = %s'; params.append(category)
        if search:
            sql += ' AND (title LIKE %s OR description LIKE %s OR category LIKE %s)'
            params += [f'%{search}%', f'%{search}%', f'%{search}%']
        sql += ' ORDER BY students DESC LIMIT %s'; params.append(limit)
        cursor.execute(sql, params)
        courses = cursor.fetchall()
        # Convert Decimal to float for JSON
        for c in courses:
            if 'rating' in c and c['rating'] is not None:
                c['rating'] = float(c['rating'])
        cursor.close()

        # Get unique categories for filter UI
        cursor2 = conn.cursor()
        cursor2.execute('SELECT DISTINCT category FROM courses ORDER BY category')
        categories = [r[0] for r in cursor2.fetchall()]
        cursor2.close()

        return jsonify({'success': True, 'courses': courses, 'categories': categories, 'total': len(courses)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
