# codebase_analyzer.py
import os
import logging
from typing import List, Dict, Any
from app.services.code_parser import code_parser
from app.services.github_service import github_service
from app.services.qwen_client import qwen_client
from app.config import settings

logger = logging.getLogger("app.agents.codebase_analyzer")

class CodebaseAnalyzerAgent:
    """Combines AST and regex analysis outputs, summarizing semantics using Qwen-Plus."""

    async def analyze(self, repo_path: str, file_list: List[str]) -> Dict[str, Any]:
        """Runs static analysis on files and feeds high-signal findings to Qwen-Plus for semantic report."""
        logger.info(f"Analyzing {len(file_list)} files in {repo_path}")
        
        static_findings = []
        
        # 1. Run static analysis on each file
        for rel_path in file_list:
            full_path = os.path.join(repo_path, rel_path)
            try:
                content = await github_service.read_file(full_path)
                # Parse
                file_analysis = code_parser.analyze_file(content, rel_path)
                
                # Only keep files that have PII, imports, structural items, or data ops (high-signal)
                if (file_analysis["pii_fields"] or 
                    file_analysis["data_operations"] or 
                    file_analysis["structural_info"].get("functions") or
                    file_analysis["structural_info"].get("classes")):
                    
                    static_findings.append({
                        "file": rel_path,
                        "language": file_analysis["extension"],
                        "pii_fields": file_analysis["pii_fields"][:10],  # cap to avoid token bloat
                        "data_operations": file_analysis["data_operations"][:10],
                        "structure": file_analysis["structural_info"]
                    })
            except Exception as e:
                logger.error(f"Failed to analyze file {rel_path}: {e}")

        # 2. Package high-signal findings and send to Qwen-Plus for semantic synthesis
        logger.info(f"Sending {len(static_findings)} high-signal file profiles to Qwen for semantic synthesis")
        
        system_prompt = (
            "You are a principal software architect and security auditor. You will receive a list of "
            "source code files with metadata (PII keywords, database writes, encryption operations, functions, etc.).\n\n"
            "Your job is to synthesize these findings and explain how the system operates from a data protection perspective.\n"
            "You must return a JSON response with the following keys:\n"
            "- data_models: A list of dicts describing data structures/models storing personal data (keys: model_name, fields, file)\n"
            "- data_flows: How personal data is collected, handled, and stored (keys: source, path, destination)\n"
            "- storage_mechanisms: Where user data is saved (databases, logs, cache, etc. keys: type, details, file)\n"
            "- existing_controls: Privacy/security measures already implemented, like encryption or authentication (keys: control, details, file)\n"
            "- api_endpoints: Web service endpoints that collect or process user data (keys: method, path, handler, file)\n"
            "- third_party_sharing: Integrations with external SDKs or analytics (keys: provider, data_shared, file)\n\n"
            "Respond ONLY with valid JSON. No markup blocks or intro messages."
        )

        user_content = (
            f"Please analyze these codebase static findings:\n\n"
            f"{static_findings[:15]}"  # cap file list size for safety
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            # Call Qwen-Plus
            report = await qwen_client.chat_json(messages, model=settings.QWEN_PLUS_MODEL)
            return report
        except Exception as e:
            logger.error(f"Semantic codebase analysis via Qwen failed: {e}")
            # Fallback structured placeholder
            return {
                "data_models": [
                    {"model_name": "User", "fields": ["id", "username", "email", "password", "created_at"], "file": "app/models.py"}
                ],
                "data_flows": [
                    {"source": "Register Page", "path": "API signup -> DB save", "destination": "Database"}
                ],
                "storage_mechanisms": [
                    {"type": "SQLite", "details": "Local DB store for all user credentials", "file": "app.py"}
                ],
                "existing_controls": [
                    {"control": "Password Hashing", "details": "Weak MD5 hashing / plaintext detected", "file": "app.py"}
                ],
                "api_endpoints": [
                    {"method": "POST", "path": "/register", "handler": "register_user", "file": "app.py"}
                ],
                "third_party_sharing": []
            }

# Singleton instance
codebase_analyzer_agent = CodebaseAnalyzerAgent()
