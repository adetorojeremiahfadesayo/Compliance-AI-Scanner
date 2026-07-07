# code_parser.py
import ast
import re
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger("app.services.code_parser")

class CodeParserService:
    """Analyzes source code files statically to extract structure, PII fields, and storage/API operations."""
    
    def __init__(self):
        # Base patterns
        self.pii_keywords = [
            "email", "phone", "address", "ssn", "social_security", "dob", "date_of_birth", 
            "birthdate", "password", "credit_card", "cc_", "card_num", "cvv", "ip_address", 
            "first_name", "last_name", "fullname", "username", "biometric"
        ]
        
        self.consent_keywords = ["consent", "agree", "opt_in", "optin", "terms_of_service", "privacy_policy", "subscribe"]
        self.encryption_keywords = ["bcrypt", "hash", "encrypt", "fernet", "aes", "argon2", "pbkdf2", "sha256", "salt"]
        self.deletion_keywords = ["delete", "remove", "purge", "erase", "anonymize", "destroy_user"]
        
        # Compile PII regex (case insensitive, matches keywords as word boundaries or parts of variables)
        pattern_str = r"\b\w*(" + "|".join(self.pii_keywords) + r")\w*\b"
        self.pii_regex = re.compile(pattern_str, re.IGNORECASE)
        
        # Logging anti-patterns (matching print statements or log calls that output PII variables)
        self.logging_regex = re.compile(
            r"(print|log|logger|logging)\.(info|debug|warning|error|write)?\(.*(" + "|".join(self.pii_keywords) + r").*\)",
            re.IGNORECASE
        )

    def analyze_python_file(self, content: str, file_path: str) -> Dict[str, Any]:
        """Extracts AST structure from a Python file."""
        findings = {
            "classes": [],
            "functions": [],
            "imports": [],
            "database_operations": []
        }
        
        try:
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                # Class definitions
                if isinstance(node, ast.ClassDef):
                    findings["classes"].append(node.name)
                    
                # Function definitions
                elif isinstance(node, ast.FunctionDef):
                    findings["functions"].append(node.name)
                    
                # Imports
                elif isinstance(node, ast.Import):
                    for name in node.names:
                        findings["imports"].append(name.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        findings["imports"].append(node.module)
                        
                # Database patterns in AST (e.g. calls like cursor.execute, session.add, db.commit)
                elif isinstance(node, ast.Call):
                    func_name = ""
                    if isinstance(node.func, ast.Attribute):
                        func_name = node.func.attr
                    elif isinstance(node.func, ast.Name):
                        func_name = node.func.id
                        
                    if func_name in ["execute", "commit", "add", "save", "delete", "query", "filter"]:
                        findings["database_operations"].append({
                            "operation": func_name,
                            "line": getattr(node, "lineno", 0)
                        })
                        
        except SyntaxError as e:
            logger.warning(f"AST parsing failed for Python file {file_path} (SyntaxError): {e}")
            # Fallback to regex or empty structural findings
            
        return findings

    def find_pii_patterns(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Scans code line by line for references to PII fields."""
        matches = []
        lines = content.splitlines()
        
        for idx, line in enumerate(lines):
            line_num = idx + 1
            # Exclude obvious false positives (e.g. comment lines explaining code, config values)
            if line.strip().startswith("#") or line.strip().startswith("//"):
                continue
                
            for match in self.pii_regex.finditer(line):
                matches.append({
                    "keyword": match.group(0),
                    "line_number": line_num,
                    "code_snippet": line.strip()
                })
                
        return matches

    def find_data_operations(self, content: str, file_path: str) -> List[Dict[str, Any]]:
        """Identifies storage, deletion, third-party sharing, and encryption events in code."""
        operations = []
        lines = content.splitlines()
        
        for idx, line in enumerate(lines):
            line_num = idx + 1
            line_strip = line.strip()
            
            # Skip comments
            if line_strip.startswith("#") or line_strip.startswith("//"):
                continue
                
            # 1. Logging leaks
            log_match = self.logging_regex.search(line)
            if log_match:
                operations.append({
                    "category": "logging_leak",
                    "line_number": line_num,
                    "code_snippet": line_strip,
                    "description": "Potential leak of sensitive information (PII) in log or print statement."
                })
                
            # 2. Encryption status
            for enc_kw in self.encryption_keywords:
                if enc_kw in line_strip.lower():
                    operations.append({
                        "category": "encryption",
                        "keyword": enc_kw,
                        "line_number": line_num,
                        "code_snippet": line_strip,
                        "description": f"Encryption pattern detected: usage of '{enc_kw}'."
                    })
                    break
                    
            # 3. Deletion capabilities
            for del_kw in self.deletion_keywords:
                if del_kw in line_strip.lower():
                    operations.append({
                        "category": "deletion",
                        "keyword": del_kw,
                        "line_number": line_num,
                        "code_snippet": line_strip,
                        "description": f"Data deletion pattern detected: usage of '{del_kw}'."
                    })
                    break

            # 4. Consent patterns
            for con_kw in self.consent_keywords:
                if con_kw in line_strip.lower():
                    operations.append({
                        "category": "consent",
                        "keyword": con_kw,
                        "line_number": line_num,
                        "code_snippet": line_strip,
                        "description": f"Consent handling pattern detected: usage of '{con_kw}'."
                    })
                    break
                    
            # 5. Database operations (general regex fallback for non-python files too)
            db_keywords = ["db.session", "session.add", "execute(", "insert into", "select *", "save()", "update ", "delete from"]
            for db_kw in db_keywords:
                if db_kw in line_strip.lower():
                    operations.append({
                        "category": "database_write",
                        "keyword": db_kw,
                        "line_number": line_num,
                        "code_snippet": line_strip,
                        "description": f"Database operation pattern detected: '{db_kw}'."
                    })
                    break

            # 6. Third party sharing
            tp_keywords = ["analytics", "tracking", "mixpanel", "amplitude", "segment", "facebook", "fbq", "google-analytics", "ga(", "webhook"]
            for tp_kw in tp_keywords:
                if tp_kw in line_strip.lower():
                    operations.append({
                        "category": "third_party_sharing",
                        "keyword": tp_kw,
                        "line_number": line_num,
                        "code_snippet": line_strip,
                        "description": f"Third party API or tracking integration: '{tp_kw}'."
                    })
                    break

        return operations

    def analyze_file(self, content: str, file_path: str) -> Dict[str, Any]:
        """Runs complete static analysis on a single code file."""
        ext = os.path.splitext(file_path)[1].lower()
        
        # AST structure (Python only for now)
        structural_info = {}
        if ext == ".py":
            structural_info = self.analyze_python_file(content, file_path)
            
        # PII references
        pii_fields = self.find_pii_patterns(content, file_path)
        
        # Data/Compliance operations
        data_ops = self.find_data_operations(content, file_path)
        
        return {
            "file_path": file_path,
            "extension": ext,
            "structural_info": structural_info,
            "pii_fields": pii_fields,
            "data_operations": data_ops
        }

# Singleton instance
code_parser = CodeParserService()
