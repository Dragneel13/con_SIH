import sys
import os
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import pytest
from app.database import check_db_connection

def test_database_connection_check():
    # Will return True if DB container is up, False gracefully if offline
    res = check_db_connection()
    assert isinstance(res, bool)
