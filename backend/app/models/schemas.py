# schemas.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

# Requirement Schemas
class RequirementBase(BaseModel):
    article_reference: str
    title: str
    description: str
    technical_requirement: str
    severity: str
    category: str
    verification_criteria: str

class RequirementCreate(RequirementBase):
    pass

class RequirementResponse(RequirementBase):
    id: int
    regulation_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Regulation Schemas
class RegulationBase(BaseModel):
    name: str
    source: str
    version: str = "1.0"
    full_text: str

class RegulationCreate(RegulationBase):
    pass

class RegulationResponse(RegulationBase):
    id: int
    created_at: datetime
    requirements: List[RequirementResponse] = []
    model_config = ConfigDict(from_attributes=True)

class RegulationSummary(BaseModel):
    id: int
    name: str
    source: str
    version: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    repo_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: int
    repo_path: Optional[str] = None
    language: str
    status: str
    monitor_enabled: bool = False
    monitor_interval_minutes: int = 60
    last_monitor_run: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MonitoringUpdate(BaseModel):
    enabled: bool
    interval_minutes: int = Field(default=60, ge=5, le=10080)

# Compliance Gap Schemas
class ComplianceGapBase(BaseModel):
    status: str
    evidence: Optional[str] = None
    gap_description: Optional[str] = None
    remediation_plan: Optional[str] = None
    code_location: Optional[str] = None
    priority: str
    agent_name: str = "GapDetector"

class ComplianceGapCreate(ComplianceGapBase):
    requirement_id: int

class ComplianceGapResponse(ComplianceGapBase):
    id: int
    analysis_id: int
    requirement_id: int
    requirement: RequirementResponse
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CodeAnnotation(BaseModel):
    line_number: int
    status: str
    description: str
    code_location: Optional[str] = None

class CodeInspectorResponse(BaseModel):
    file_path: str
    code: str
    annotations: List[CodeAnnotation] = []

# Audit Log Schemas
class AuditLogBase(BaseModel):
    agent_name: str
    action: str
    details: Optional[str] = None

class AuditLogCreate(AuditLogBase):
    analysis_id: int

class AuditLogResponse(AuditLogBase):
    id: int
    analysis_id: int
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class RemediationApprovalRequest(BaseModel):
    note: Optional[str] = None

class DeploymentProofResponse(BaseModel):
    app_name: str
    backend_version: str
    deployment_provider: str
    qwen_base_url: str
    models: List[str]
    api_key_configured: bool
    database_url_scheme: str

class RegressionFinding(BaseModel):
    requirement_id: int
    article_reference: str
    title: str
    previous_status: str
    current_status: str
    priority: str
    agent_name: str

class RegressionCheckResponse(BaseModel):
    project_id: int
    current_analysis_id: int
    baseline_analysis_id: Optional[int] = None
    new_regressions: List[RegressionFinding] = []
    resolved_gaps: List[RegressionFinding] = []
    persistent_gaps: List[RegressionFinding] = []
    message: str

# Analysis Schemas
class AnalysisBase(BaseModel):
    project_id: int
    regulation_id: int

class AnalysisCreate(AnalysisBase):
    pass

class MultiAnalysisCreate(BaseModel):
    project_id: int
    regulation_ids: List[int] = Field(min_length=1, max_length=5)

class FixPrResponse(BaseModel):
    status: str  # created, failed
    branch: Optional[str] = None
    pr_url: Optional[str] = None
    message: str

class AnalysisResponse(AnalysisBase):
    id: int
    status: str
    overall_score: float
    model_provider: str = "Qwen Cloud"
    model_names: str = ""
    token_usage: Optional[str] = None
    remediation_approval_status: str = "pending_review"
    remediation_approved_at: Optional[datetime] = None
    remediation_approval_note: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    project: Optional[ProjectResponse] = None
    regulation: Optional[RegulationSummary] = None
    gaps: List[ComplianceGapResponse] = []
    industry_label: Optional[str] = None
    country_label: Optional[str] = None
    country_flag: Optional[str] = None
    framework: Optional[str] = None
    authority: Optional[str] = None
    source_url: Optional[str] = None
    last_updated: Optional[str] = None
    confidence_status: str = "bad"
    totalGaps: int = 0
    criticalGaps: int = 0
    model_config = ConfigDict(from_attributes=True)

# WebSocket / Progress Update Schemas
class AnalysisProgress(BaseModel):
    analysis_id: int
    status: str
    stage: str  # PARSING, SCANNING, DETECTING, REMEDIATING, COMPLETE, FAILED
    progress_pct: float
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
