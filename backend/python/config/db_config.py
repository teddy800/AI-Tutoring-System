import os
import mysql.connector.pooling
from dotenv import load_dotenv

load_dotenv()

db_config = {
    'host':      os.environ.get('DB_HOST', 'localhost'),
    'user':      os.environ.get('DB_USER', 'root'),
    'password':  os.environ.get('DB_PASSWORD', ''),
    'database':  os.environ.get('DB_NAME', 'tutoring_system'),
    'pool_name': 'tutoring_pool',
    'pool_size': 10,
}

_pool = None

def get_pool() -> mysql.connector.pooling.MySQLConnectionPool:
    global _pool
    if _pool is None:
        _pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name=db_config['pool_name'],
            pool_size=db_config['pool_size'],
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
        )
    return _pool
