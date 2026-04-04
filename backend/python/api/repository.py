from flask import Blueprint, jsonify
from config.db_config import get_pool

repository_bp = Blueprint('repository', __name__)

@repository_bp.route('/repository', methods=['GET'])
def repository():
    conn = get_pool().get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT title, body AS description FROM content')
        items = cursor.fetchall()
        cursor.close()
        return jsonify({'success': True, 'items': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        conn.close()
