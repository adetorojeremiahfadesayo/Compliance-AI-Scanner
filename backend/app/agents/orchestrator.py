# orchestrator.py
import asyncio
import json
import os
import logging
from datetime import datetime
from typing import Callable, Optional
from sqlalchemy.orm import Session

from app.models.database import SessionLocal, Analysis, ComplianceGap, AuditLog, Project, Regulation, Requirement
from app.models.schemas import AnalysisProgress
from app.services.github_service import github_service
from app.services.qwen_client import qwen_client
from app.config import settings
from app.agents.regulation_parser import regulation_parser_agent
from app.agents.codebase_analyzer import codebase_analyzer_agent
from app.agents.gap_detector import gap_detector_agent
from app.agents.remediation_engine import remediation_engine_agent

logger = logging.getLogger("app.agents.orchestrator")

# Severity weighting for the compliance score. A critical requirement counts four
# times as much as a low one so a single critical gap moves the needle more than a
# handful of low-priority ones.
SEVERITY_WEIGHTS = {"critical": 4, "high": 3, "medium": 2, "low": 1}
STATUS_FACTORS = {"compliant": 1.0, "partial": 0.5, "non_compliant": 0.0}


def compute_weighted_score(items) -> float:
    """Computes a 0-100 compliance score from (severity, status) pairs.

    Each requirement contributes in proportion to its severity weight, scaled by a
    status factor (compliant=1.0, partial=0.5, non_compliant=0.0). An empty set
    scores 100 (nothing to fail).
    """
    total_weight = 0.0
    weighted = 0.0
    for severity, status in items:
        weight = SEVERITY_WEIGHTS.get(severity, 2)
        total_weight += weight
        weighted += weight * STATUS_FACTORS.get(status, 0.0)
    return (weighted / total_weight * 100.0) if total_weight else 100.0


class AnalysisOrchestrator:
    """Manages the lifecycle of a codebase compliance scan using specialized agents."""

    async def log_audit(self, db: Session, analysis_id: int, agent: str, action: str, details: str):
        """Creates an audit log entry in the database."""
        audit = AuditLog(
            analysis_id=analysis_id,
            agent_name=agent,
            action=action,
            details=details,
            timestamp=datetime.utcnow()
        )
        db.add(audit)
        db.commit()
        logger.info(f"[{agent}] {action}: {details}")

    async def update_status(
        self,
        db: Session,
        analysis: Analysis,
        status: str,
        progress_callback: Optional[Callable] = None,
        progress_pct: float = 0.0,
        msg: str = ""
    ):
        """Updates analysis status in the database and sends real-time updates via callback."""
        analysis.status = status
        if status == "complete":
            analysis.completed_at = datetime.utcnow()
        db.commit()
        
        if progress_callback:
            progress = AnalysisProgress(
                analysis_id=analysis.id,
                status=status,
                stage=status.upper(),
                progress_pct=progress_pct,
                message=msg
            )
            await progress_callback(progress)

    async def run(self, analysis_id: int, progress_callback: Optional[Callable] = None):
        """Runs the multi-agent compliance scan pipeline from start to finish."""
        db = SessionLocal()
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        
        if not analysis:
            logger.error(f"Analysis ID {analysis_id} not found.")
            db.close()
            return

        # Snapshot cumulative token usage so we can store the per-analysis delta.
        # qwen_client is a process-lifetime singleton that accumulates forever.
        tokens_at_start = qwen_client.get_token_usage()

        try:
            analysis.started_at = datetime.utcnow()
            db.commit()

            await self.log_audit(db, analysis_id, "Orchestrator", "pipeline_started", "Compliance Autopilot pipeline initiated.")
            
            # ==========================================
            # STAGE 1: PARSING REGULATIONS
            # ==========================================
            await self.update_status(db, analysis, "parsing", progress_callback, 10.0, "Parsing regulation and extracting requirements...")
            await self.log_audit(db, analysis_id, "RegulationParser", "start_parsing", f"Parsing regulation {analysis.regulation.name}.")
            
            # Check if regulation requirements are already parsed in DB
            requirements = db.query(Requirement).filter(Requirement.regulation_id == analysis.regulation_id).all()
            if not requirements:
                # Need to parse regulation text via Qwen
                parsed_requirements = await regulation_parser_agent.parse(analysis.regulation.full_text, analysis.regulation.source)
                
                # Store parsed requirements in DB
                for req_data in parsed_requirements:
                    req = Requirement(
                        regulation_id=analysis.regulation_id,
                        article_reference=req_data["article_reference"],
                        title=req_data["title"],
                        description=req_data["description"],
                        technical_requirement=req_data["technical_requirement"],
                        severity=req_data.get("severity", "high"),
                        category=req_data.get("category", "security"),
                        verification_criteria=req_data["verification_criteria"]
                    )
                    db.add(req)
                db.commit()
                requirements = db.query(Requirement).filter(Requirement.regulation_id == analysis.regulation_id).all()
                await self.log_audit(db, analysis_id, "RegulationParser", "parsing_completed", f"Extracted {len(requirements)} requirements.")
            else:
                await self.log_audit(db, analysis_id, "RegulationParser", "cache_hit", "Using pre-parsed requirements.")
                
            await self.update_status(db, analysis, "parsing", progress_callback, 25.0, f"Extracted {len(requirements)} requirements.")
            
            # ==========================================
            # STAGE 2: SCANNING CODEBASE
            # ==========================================
            await self.update_status(db, analysis, "scanning", progress_callback, 30.0, "Cloning and scanning project repository...")
            project = analysis.project
            
            # Refresh remote repos on every scan so regression checks compare fresh
            # code. Locally-bundled demo repos (repo_url is None) are never touched.
            if project.repo_url:
                repo_dir = project.repo_path or os.path.join(
                    os.path.expanduser("~"), ".compliance_autopilot", f"project_{project.id}"
                )
                await self.log_audit(db, analysis_id, "Orchestrator", "syncing_repo", f"Syncing {project.repo_url} to local drive.")

                try:
                    await github_service.sync_repo(project.repo_url, repo_dir)
                    project.repo_path = repo_dir
                    db.commit()
                except Exception as clone_err:
                    await self.log_audit(db, analysis_id, "Orchestrator", "clone_failed", str(clone_err))
                    raise RuntimeError(f"Cloning codebase failed: {clone_err}")

            if not project.repo_path or not os.path.exists(project.repo_path):
                raise FileNotFoundError(f"Project codebase path not found or empty: {project.repo_path}")

            # List and parse code files
            await self.log_audit(db, analysis_id, "CodebaseAnalyzer", "start_scanning", f"Scanning files under {project.repo_path}")
            code_files = await github_service.list_code_files(project.repo_path)
            
            if not code_files:
                await self.log_audit(db, analysis_id, "CodebaseAnalyzer", "scan_empty", "No supported code files found in repo.")
                # We won't crash, but we will have empty scan
                codebase_scan_result = {
                    "data_models": [], "data_flows": [], "storage_mechanisms": [],
                    "existing_controls": [], "api_endpoints": [], "third_party_sharing": []
                }
            else:
                # Trigger Codebase Analyzer Agent
                codebase_scan_result = await codebase_analyzer_agent.analyze(project.repo_path, code_files)
                await self.log_audit(db, analysis_id, "CodebaseAnalyzer", "scan_completed", "Codebase semantic scan completed.")

            await self.update_status(db, analysis, "scanning", progress_callback, 50.0, f"Scanned {len(code_files)} code files.")

            # ==========================================
            # STAGE 3: DETECTING COMPLIANCE GAPS
            # ==========================================
            await self.update_status(db, analysis, "detecting", progress_callback, 55.0, "Mapping requirements against codebase...")
            await self.log_audit(db, analysis_id, "GapDetector", "start_mapping", "Mapping requirements to codebase details.")
            
            # Serialize requirements for agent input
            req_dicts = [{
                "id": r.id,
                "article_reference": r.article_reference,
                "title": r.title,
                "description": r.description,
                "technical_requirement": r.technical_requirement,
                "severity": r.severity,
                "category": r.category,
                "verification_criteria": r.verification_criteria
            } for r in requirements]
            
            # Run Gap Detector Agent
            gaps_detected = await gap_detector_agent.detect(req_dicts, codebase_scan_result)
            await self.log_audit(db, analysis_id, "GapDetector", "gaps_discovered", f"Identified {len(gaps_detected)} requirements status mapping.")
            
            # Store gaps in database
            for gd in gaps_detected:
                gap = ComplianceGap(
                    analysis_id=analysis_id,
                    requirement_id=gd["requirement_id"],
                    status=gd["status"],  # compliant, partial, non_compliant
                    evidence=gd.get("evidence"),
                    gap_description=gd.get("gap_description"),
                    code_location=gd.get("code_location"),
                    priority=gd.get("priority", "medium"),
                    agent_name="GapDetector"
                )
                db.add(gap)
            db.commit()

            await self.update_status(db, analysis, "detecting", progress_callback, 75.0, "Gap mapping completed.")

            # ==========================================
            # STAGE 4: REMEDIATION & POLICY DRAFTING
            # ==========================================
            await self.update_status(db, analysis, "remediating", progress_callback, 80.0, "Generating remediation plans and compliance fixes...")
            await self.log_audit(db, analysis_id, "RemediationEngine", "start_remediation", "Generating repair plans for non-compliant areas.")
            
            # Fetch gaps back with requirement object
            active_gaps = db.query(ComplianceGap).filter(ComplianceGap.analysis_id == analysis_id).all()
            gap_dicts = []
            for ag in active_gaps:
                gap_dicts.append({
                    "id": ag.id,
                    "requirement_id": ag.requirement_id,
                    "status": ag.status,
                    "requirement_title": ag.requirement.title,
                    "article_reference": ag.requirement.article_reference,
                    "gap_description": ag.gap_description,
                    "code_location": ag.code_location,
                    "evidence": ag.evidence
                })
                
            # Run Remediation Engine Agent
            remediations = await remediation_engine_agent.remediate(gap_dicts, codebase_scan_result)
            
            # Update gaps with remediation plans in DB
            remediation_lookup = {r["requirement_id"]: r["remediation_plan"] for r in remediations if "remediation_plan" in r}
            for ag in active_gaps:
                if ag.requirement_id in remediation_lookup:
                    ag.remediation_plan = remediation_lookup[ag.requirement_id]
                    if ag.status != "compliant":
                        ag.agent_name = "RemediationEngine"
            db.commit()
            
            await self.log_audit(db, analysis_id, "RemediationEngine", "remediation_completed", "Remediation plan generation finished.")
            await self.update_status(db, analysis, "remediating", progress_callback, 95.0, "Remediation plans generated.")

            # ==========================================
            # STAGE 5: CALCULATION & FINALIZE
            # ==========================================
            # Severity-weighted scoring: each requirement contributes in proportion
            # to its severity, scaled by how compliant the codebase is for it.
            scored_items = [
                ((g.requirement.severity if g.requirement else None) or g.priority or "medium", g.status)
                for g in active_gaps
            ]
            analysis.overall_score = compute_weighted_score(scored_items)

            analysis.model_provider = "Qwen Cloud"
            analysis.model_names = ", ".join([
                settings.QWEN_MAX_MODEL,
                settings.QWEN_PLUS_MODEL
            ])
            # Store only the tokens this analysis consumed, not the process total.
            tokens_now = qwen_client.get_token_usage()
            token_delta = {
                key: tokens_now.get(key, 0) - tokens_at_start.get(key, 0)
                for key in tokens_now
            }
            analysis.token_usage = json.dumps(token_delta)
                
            await self.log_audit(db, analysis_id, "Orchestrator", "pipeline_completed", f"Scan finished with score: {analysis.overall_score:.1f}%")
            await self.update_status(db, analysis, "complete", progress_callback, 100.0, "Compliance scan successfully completed!")
            
        except Exception as e:
            logger.exception(f"Compliance pipeline failed on analysis {analysis_id}: {e}")
            await self.log_audit(db, analysis_id, "Orchestrator", "pipeline_failed", f"Failed with exception: {e}")
            await self.update_status(db, analysis, "failed", progress_callback, 100.0, f"Analysis failed: {str(e)}")
            
        finally:
            db.close()

# Singleton orchestrator
orchestrator = AnalysisOrchestrator()
