# main.py
import asyncio
import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.models.database import init_db
from app.services.monitor_service import monitoring_loop
from app.api.auth import verify_api_token
from app.api.regulations import router as regulations_router
from app.api.projects import router as projects_router
from app.api.analysis import router as analysis_router
from app.api.reports import router as reports_router
from app.api.system import router as system_router
from app.api.websocket import router as websocket_router
from app.api.webhooks import router as webhooks_router

# Setup basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("app.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Initializing compliance database...")
    init_db()
    logger.info("Database loaded successfully.")
    monitor_task = asyncio.create_task(monitoring_loop())
    yield
    # Shutdown actions
    monitor_task.cancel()
    logger.info("Shutting down Compliance Autopilot API...")

app = FastAPI(
    title="Compliance Autopilot API",
    description="Automated AI agents scanning repositories for regulatory compliance.",
    version="0.1.0",
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire routers. Regulations/projects/analysis/reports require API_ACCESS_TOKEN
# when it's set (see app/api/auth.py). system (deployment-proof) stays open so
# hackathon judges can verify the deployment without a secret, and webhooks
# stays open because GitHub itself calls it.
_auth = [Depends(verify_api_token)]
app.include_router(regulations_router, prefix="/api", dependencies=_auth)
app.include_router(projects_router, prefix="/api", dependencies=_auth)
app.include_router(analysis_router, prefix="/api", dependencies=_auth)
app.include_router(reports_router, prefix="/api", dependencies=_auth)
app.include_router(system_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(websocket_router)  # Mounted directly for WebSocket endpoints

@app.get("/")
def read_root():
    """Health check root endpoint."""
    return {
        "name": "Compliance Autopilot API",
        "version": "0.1.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
