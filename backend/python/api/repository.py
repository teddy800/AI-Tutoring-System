from flask import Blueprint, jsonify
import mysql.connector
from config.db_config import db_config

repository_bp = Blueprint('repository', __name__)

@repository_bp.route('/repository', methods=['GET'])
def repository():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        cursor.execute('SELECT title, body AS description FROM content')
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify({'success': True, 'items': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500