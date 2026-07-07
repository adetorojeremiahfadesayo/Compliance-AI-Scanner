# demo_catalog.py
import os
from copy import deepcopy


COUNTRIES = {
    "de": {"label": "Germany", "flag": "🇩🇪"},
    "gb": {"label": "United Kingdom", "flag": "🇬🇧"},
    "ng": {"label": "Nigeria", "flag": "🇳🇬"},
    "us": {"label": "United States", "flag": "🇺🇸"},
    "sg": {"label": "Singapore", "flag": "🇸🇬"},
}

REGULATIONS = {
    "banking": {
        "label": "Banking & FinTech",
        "de": {
            "framework": "GDPR + BaFin KWG + PSD2",
            "authority": "BaFin (Federal Financial Supervisory Authority)",
            "source_url": "https://www.bafin.de/EN/Homepage/homepage_node.html",
            "last_updated": "2026-07-07",
            "requirements": [
                {"ref": "KWG §25a", "title": "Risk Management System", "category": "risk", "severity": "critical", "description": "Banks need documented processes to identify, measure, control, and monitor material risks."},
                {"ref": "GDPR Art.32", "title": "Encryption of Financial PII", "category": "security", "severity": "critical", "description": "Customer financial data must be protected using appropriate security controls."},
                {"ref": "PSD2 Art.97", "title": "Strong Customer Authentication", "category": "authentication", "severity": "critical", "description": "Electronic payments require strong customer authentication controls."},
                {"ref": "AMLD5", "title": "KYC & Customer Due Diligence", "category": "kyc", "severity": "critical", "description": "Identity checks and enhanced due diligence are required for higher-risk customers."},
            ],
        },
    },
    "entertainment": {
        "label": "Entertainment & Media",
        "gb": {
            "framework": "UK GDPR + Online Safety Act + BBFC",
            "authority": "Ofcom / BBFC",
            "source_url": "https://www.ofcom.org.uk/online-safety",
            "last_updated": "2026-07-07",
            "requirements": [
                {"ref": "Online Safety Act 2023", "title": "Age Assurance for Adult Content", "category": "age_verification", "severity": "critical", "description": "Platforms must use effective age assurance where required."},
                {"ref": "BBFC", "title": "Content Classification Compliance", "category": "content_rating", "severity": "critical", "description": "Video-on-demand content needs appropriate age classification."},
                {"ref": "UK GDPR Art.8", "title": "Children's Data Protection", "category": "childrens_data", "severity": "critical", "description": "Children's data processing requires age-appropriate privacy controls."},
                {"ref": "ICO Cookie Guidance", "title": "Consent Before Tracking", "category": "consent", "severity": "high", "description": "Tracking cookies require informed consent before activation."},
            ],
        },
    },
    "shipping": {
        "label": "Shipping & Logistics",
        "sg": {
            "framework": "PDPA + Singapore Customs TradeNet",
            "authority": "Singapore Customs",
            "source_url": "https://www.customs.gov.sg/",
            "last_updated": "2026-07-07",
            "requirements": [
                {"ref": "TradeNet", "title": "Electronic Trade Documentation", "category": "customs", "severity": "critical", "description": "Import and export permits must use approved electronic trade documentation processes."},
                {"ref": "PDPA §26", "title": "Transfer Limitation Obligation", "category": "data_transfer", "severity": "critical", "description": "Overseas recipients must provide comparable data protection safeguards."},
                {"ref": "PDPA §24", "title": "Protection Obligation", "category": "security", "severity": "high", "description": "Organizations must make reasonable security arrangements to protect personal data."},
            ],
        },
    },
}

DEMO_CODEBASES = {
    "neobank": {
        "name": "NeoBank API",
        "industry": "banking",
        "language": "Python",
        "path": ("demo-codebases", "neobank-api"),
        "file": "main.py",
        "scores": {"de": 28, "gb": 32, "ng": 31, "us": 35, "sg": 40},
        "violations": [
            ("Plaintext password storage in SQLite.", "main.py:L35"),
            ("CVV and full payment card number stored in transaction records.", "main.py:L48-L49"),
            ("KYC exists but is not enforced before transfers.", "main.py:L113-L121"),
            ("Raw registration and login PII are written to logs.", "main.py:L65-L91"),
        ],
    },
    "streamvault": {
        "name": "StreamVault",
        "industry": "entertainment",
        "language": "JavaScript",
        "path": ("demo-codebases", "streamvault"),
        "file": "server.js",
        "scores": {"de": 22, "gb": 25, "ng": 42, "us": 35, "sg": 50},
        "violations": [
            ("Adult and region-restricted content is served without age or license checks.", "server.js:L93-L107"),
            ("Watch history is recorded without consent or opt-out controls.", "server.js:L126-L133"),
            ("Payment card details are logged and stored in user profile data.", "server.js:L154-L165"),
            ("JWT tokens are valid for 365 days.", "server.js:L82-L88"),
        ],
    },
    "cargotrack": {
        "name": "CargoTrack",
        "industry": "shipping",
        "language": "Python",
        "path": ("demo-codebases", "cargotrack"),
        "file": "app.py",
        "scores": {"de": 38, "gb": 41, "ng": 45, "us": 48, "sg": 65},
        "violations": [
            ("Cross-border shipment flow now records consent, but customs broker safeguards still need review.", "app.py:L109-L121"),
            ("Trade documentation is present, but transfer safeguards are only partially documented.", "app.py:L148-L166"),
            ("Shipment retention controls need scheduled purge evidence.", "app.py:L221-L223"),
        ],
    },
}


def _repo_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def get_demo_scan(codebase_id: str, country_id: str):
    codebase = DEMO_CODEBASES.get(codebase_id)
    country = COUNTRIES.get(country_id)
    if not codebase or not country:
        return None

    industry = REGULATIONS.get(codebase["industry"], {})
    regulation = industry.get(country_id) or industry.get("sg") or industry.get("gb") or industry.get("de")
    if not regulation:
        return None

    result = {
        "codebase_id": codebase_id,
        "country_id": country_id,
        "country_label": country["label"],
        "country_flag": country["flag"],
        "industry_label": industry["label"],
        "score": codebase["scores"].get(country_id, 45),
        "project": {
            "name": codebase["name"],
            "language": codebase["language"],
            "repo_path": os.path.join(_repo_root(), *codebase["path"]),
        },
        "regulation": deepcopy(regulation),
        "violations": deepcopy(codebase["violations"]),
    }
    result["confidence_status"] = "good" if result["score"] >= 60 else "bad"
    return result
