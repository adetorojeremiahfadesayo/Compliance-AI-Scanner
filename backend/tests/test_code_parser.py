# tests/test_code_parser.py
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.code_parser import code_parser

def test_find_pii_patterns():
    # Code snippet containing PII fields
    content = """
def save_profile(user_email, first_name, data):
    phone_number = data.get("phone")
    user_password = "plaintext_password"
    print("Normal log statement")
    """
    
    findings = code_parser.find_pii_patterns(content, "dummy.py")
    keywords = [f["keyword"] for f in findings]
    
    assert "email" in keywords or any("email" in k for k in keywords)
    assert "first_name" in keywords or any("first_name" in k for k in keywords)
    assert "phone" in keywords or any("phone" in k for k in keywords)
    assert "password" in keywords or any("password" in k for k in keywords)

def test_find_data_operations():
    # Code snippet containing leaks and operations
    content = """
import logging
logger = logging.getLogger(__name__)

def signup(email, password):
    print(f"Signing up user with email: {email} and password: {password}")
    logger.info(f"User signup details: email={email}")
    db.session.add(user)
    db.session.commit()
    """
    
    ops = code_parser.find_data_operations(content, "dummy.py")
    categories = [o["category"] for o in ops]
    
    assert "logging_leak" in categories
    assert "database_write" in categories

def test_analyze_python_file():
    # Python code for AST check
    content = """
import os
from datetime import datetime

class UserModel:
    def __init__(self, username):
        self.username = username

def register():
    pass
    """
    
    findings = code_parser.analyze_python_file(content, "dummy.py")
    
    assert "UserModel" in findings["classes"]
    assert "register" in findings["functions"]
    assert "os" in findings["imports"]
    assert "datetime" in findings["imports"]
