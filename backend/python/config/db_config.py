import os
import mysql.connector.pooling
from dotenv import load_dotenv

load_dotenv()

_pool = None

def get_pool() -> mysql.connector.pooling.MySQLConnectionPool:
    global _pool
    if _pool is None:
        _pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name='tutoring_pool',
            pool_size=5,
            host=os.environ.get('DB_HOST', '127.0.0.1'),
            port=int(os.environ.get('DB_PORT', 3307)),
            user=os.environ.get('DB_USER', 'root'),
            password=os.environ.get('DB_PASSWORD', ''),
            database=os.environ.get('DB_NAME', 'tutoring_system'),
        )
    return _pool
