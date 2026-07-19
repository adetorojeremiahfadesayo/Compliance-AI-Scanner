# remediation_engine.py
import logging
from typing import List, Dict, Any, Optional
from app.services.qwen_client import qwen_client
from app.config import settings

logger = logging.getLogger("app.agents.remediation_engine")

class RemediationEngineAgent:
    """Uses Qwen-Max to generate step-by-step repair plans and code snippets for fixing compliance gaps."""

    async def generate_code_fix(
        self,
        gap_description: str,
        remediation_plan: str,
        file_path: str,
        original_content: str,
    ) -> Optional[str]:
        """Asks Qwen to rewrite one file so it resolves a single compliance gap.

        Returns the full corrected file content, or None if the model declined
        or the response didn't look like usable source (caller treats None as
        "no fix available" rather than failing the whole request).
        """
        system_prompt = (
            "You are a senior software engineer applying a single, targeted compliance fix "
            "to one source file. You will be given the file's current full content, the "
            "compliance gap it has, and a remediation plan.\n\n"
            "Rewrite the ENTIRE file with the minimal change needed to resolve the gap. "
            "Preserve all unrelated code, formatting, comments, and behavior exactly. "
            "Do not refactor unrelated code. Do not add explanatory comments about the change "
            "unless the remediation plan asks for that.\n\n"
            "Respond with ONLY the full corrected file content — no markdown code fences, "
            "no prose before or after, no JSON wrapper. If the file is too large or the gap "
            "cannot be safely fixed without more context, respond with exactly: NO_FIX_AVAILABLE"
        )
        user_content = (
            f"File: {file_path}\n\n"
            f"Compliance gap: {gap_description}\n\n"
            f"Remediation plan:\n{remediation_plan}\n\n"
            f"Current file content:\n{original_content}"
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]
        try:
            corrected = await qwen_client.chat(messages, model=settings.QWEN_MAX_MODEL)
        except Exception as e:
            logger.warning(f"Code fix generation failed for {file_path}: {e}")
            return None

        corrected = (corrected or "").strip()
        if not corrected or corrected == "NO_FIX_AVAILABLE" or "NO_FIX_AVAILABLE" in corrected[:40]:
            return None
        # Strip an accidental wrapping code fence if the model added one anyway.
        if corrected.startswith("```"):
            lines = corrected.splitlines()
            if lines and lines[-1].strip() == "```":
                lines = lines[1:-1]
            else:
                lines = lines[1:]
            corrected = "\n".join(lines)
        return corrected

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
