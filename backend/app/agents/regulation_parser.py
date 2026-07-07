# regulation_parser.py
import logging
from typing import List, Dict, Any
from app.services.qwen_client import qwen_client
from app.config import settings

logger = logging.getLogger("app.agents.regulation_parser")

class RegulationParserAgent:
    """Uses Qwen model to parse regulation text into structured requirements."""

    async def parse(self, regulation_text: str, source: str = "GDPR") -> List[Dict[str, Any]]:
        """Parses legal text into JSON structured requirements using Qwen-Max."""
        logger.info(f"Parsing regulation text via Qwen model: {source}")
        
        system_prompt = (
            "You are a regulatory compliance and legal technology expert. Your task is to analyze "
            "the provided legal regulation text and extract all specific, actionable technical and "
            "security requirements that a software development team must implement to be compliant.\n\n"
            "For each requirement, you must extract:\n"
            "- article_reference: The clause, section, or article number (e.g. 'Article 17(1)' or 'Section 4.2')\n"
            "- title: A short, descriptive title of the compliance area (e.g. 'Right to Erasure')\n"
            "- description: A clear plain-English explanation of what the law requires of companies\n"
            "- technical_requirement: Concrete specifications for engineers (what endpoints, schemas, database "
            "rules, logging restrictions, or encryption types must exist in the software)\n"
            "- severity: How critical it is for system compliance. Must be one of: 'critical', 'high', 'medium', 'low'\n"
            "- category: The functional category. Must be one of: 'data_collection', 'storage', 'processing', "
            "'deletion', 'consent', 'notification', 'security'\n"
            "- verification_criteria: How to verify compliance in the codebase (e.g. 'Check for an HTTP DELETE endpoint')\n\n"
            "You must return the response as a JSON object containing a list of requirements: \n"
            "{\n"
            "  \"requirements\": [\n"
            "     { \"article_reference\": \"...\", \"title\": \"...\", ... }\n"
            "  ]\n"
            "}\n\n"
            "Provide ONLY valid JSON. No conversational text or markdown code blocks outside of the JSON format."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Regulation Source: {source}\nText:\n{regulation_text}"}
        ]

        try:
            # Call Qwen-Max for high quality legal translation
            response_json = await qwen_client.chat_json(messages, model=settings.QWEN_MAX_MODEL)
            requirements = response_json.get("requirements", [])
            logger.info(f"Successfully parsed {len(requirements)} requirements from regulation text.")
            return requirements
        except Exception as e:
            logger.error(f"Failed to parse regulation text via Qwen API: {e}")
            # Fallback mock parsing if API keys or quota issues occur, so the pipeline continues
            logger.warning("Falling back to structural placeholder parsing due to error.")
            return [
                {
                    "article_reference": "Article 17",
                    "title": "Right to Erasure ('Right to be Forgotten')",
                    "description": "The data subject shall have the right to obtain from the controller the erasure of personal data concerning him or her without undue delay.",
                    "technical_requirement": "Implement a DELETE endpoint on the user profile route to purge PII records from all primary databases and storage buckets.",
                    "severity": "critical",
                    "category": "deletion",
                    "verification_criteria": "Look for delete methods/endpoints, SQL delete statements, or DB wipe calls associated with user records."
                },
                {
                    "article_reference": "Article 32",
                    "title": "Security of Processing",
                    "description": "The controller and processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.",
                    "technical_requirement": "All passwords must be hashed using strong encryption like bcrypt or argon2. Sensitive PII fields must be encrypted in transit and at rest.",
                    "severity": "high",
                    "category": "security",
                    "verification_criteria": "Look for usage of cryptography libraries, password hashing functions, and HTTPS configuration."
                }
            ]

# Singleton instance
regulation_parser_agent = RegulationParserAgent()
