import os
from urllib.parse import urlparse

from fastapi import APIRouter

from app.config import settings
from app.models.schemas import DeploymentProofResponse

router = APIRouter(tags=["system"])


@router.get("/deployment-proof", response_model=DeploymentProofResponse)
def get_deployment_proof():
    """Returns deployment and Qwen Cloud metadata for hackathon judges."""
    database_scheme = urlparse(settings.DATABASE_URL).scheme or "sqlite"
    return DeploymentProofResponse(
        app_name="Compliance Autopilot",
        backend_version="0.1.0",
        deployment_provider=os.getenv("ALIBABA_DEPLOYMENT_PROVIDER", "Alibaba Cloud"),
        qwen_base_url=settings.QWEN_BASE_URL,
        models=[
            settings.QWEN_MAX_MODEL,
            settings.QWEN_PLUS_MODEL,
            settings.QWEN_TURBO_MODEL,
        ],
        api_key_configured=bool(os.getenv("DASHSCOPE_API_KEY") or settings.DASHSCOPE_API_KEY),
        database_url_scheme=database_scheme,
    )
