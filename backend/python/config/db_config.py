import os
import mysql.connector.pooling
from dotenv import load_dotenv

# Load .env from the backend/python directory regardless of cwd
_env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=_env_path, override=True)

_pool = None

def get_pool() -> mysql.connector.pooling.MySQLConnectionPool:
    global _pool
    if _pool is None:
        host = os.environ.get('DB_HOST', '127.0.0.1')
        port = int(os.environ.get('DB_PORT', 3307))
        user = os.environ.get('DB_USER', 'root')
        password = os.environ.get('DB_PASSWORD', '')
        database = os.environ.get('DB_NAME', 'tutoring_system')
        _pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name='tutoring_pool',
            pool_size=5,
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            use_pure=True,  # avoid C-ext socket resolution issues on Windows
        )
    return _pool
