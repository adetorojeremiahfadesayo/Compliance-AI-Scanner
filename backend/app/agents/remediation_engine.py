# remediation_engine.py
import logging
from typing import List, Dict, Any
from app.services.qwen_client import qwen_client
from app.config import settings

logger = logging.getLogger("app.agents.remediation_engine")

class RemediationEngineAgent:
    """Uses Qwen-Max to generate step-by-step repair plans and code snippets for fixing compliance gaps."""

    async def remediate(self, gaps: List[Dict[str, Any]], codebase_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generates remediation plans for non-compliant and partially compliant requirements."""
        # Filter gaps that need fixing
        unresolved_gaps = [g for g in gaps if g["status"] != "compliant"]
        
        if not unresolved_gaps:
            logger.info("No non-compliant gaps found. Skipping remediation engine.")
            return []
            
        logger.info(f"Generating remediation plans for {len(unresolved_gaps)} unresolved compliance gaps.")
        
        system_prompt = (
            "You are a senior systems engineer and cybersecurity consultant. You will receive a list of "
            "compliance gaps (with descriptions and code locations) and codebase metadata.\n\n"
            "Your task is to generate actionable remediation plans. For each gap, provide:\n"
            "- requirement_id: The ID of the requirement associated with this gap\n"
            "- remediation_plan: A detailed step-by-step instruction in Markdown. You MUST include "
            "specific code snippets (e.g. Flask routes, SQLAlchemy schemas, hashing calls) showing the developer "
            "exactly how to implement the compliance controls and fix the gap.\n\n"
            "Respond in JSON format as follows:\n"
            "{\n"
            "  \"remediations\": [\n"
            "     { \"requirement_id\": 1, \"remediation_plan\": \"### Fix for Article X... \\n\\n```python\\n# code here...\\n```\" }\n"
            "  ]\n"
            "}\n\n"
            "Respond ONLY with valid JSON. Do not include markdown code block syntax outside the JSON string."
        )

        user_content = (
            f"Unresolved Gaps:\n{unresolved_gaps}\n\n"
            f"Codebase Metadata:\n{codebase_analysis}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        try:
            # Call Qwen-Max for detailed code generation
            response = await qwen_client.chat_json(messages, model=settings.QWEN_MAX_MODEL)
            remediations = response.get("remediations", [])
            logger.info(f"Successfully generated {len(remediations)} remediation plans.")
            return remediations
        except Exception as e:
            logger.error(f"Remediation plan generation failed: {e}")
            
            # Safe pipeline fallback
            fallback_remediations = []
            for g in unresolved_gaps:
                plan = (
                    f"### Remediation Action Plan for {g.get('article_reference', 'N/A')}\n\n"
                    f"**Location to update:** `{g.get('code_location', 'N/A')}`\n\n"
                    f"1. **Implement Control Structure:** Add missing security validation. Below is a code draft suggestion:\n"
                    f"```python\n"
                    f"# Suggested correction for compliance with {g.get('article_reference', 'N/A')}\n"
                    f"from cryptography.fernet import Fernet\n\n"
                    f"def encrypt_data(value: str) -> bytes:\n"
                    f"    key = Fernet.generate_key()\n"
                    f"    f = Fernet(key)\n"
                    f"    return f.encrypt(value.encode())\n"
                    f"```\n"
                    f"2. **Verify Implementation:** Run pytest integration scans and confirm that sensitive fields are stored encoded in database records."
                )
                fallback_remediations.append({
                    "requirement_id": g["requirement_id"],
                    "remediation_plan": plan
                })
            return fallback_remediations

# Singleton instance
remediation_engine_agent = RemediationEngineAgent()
