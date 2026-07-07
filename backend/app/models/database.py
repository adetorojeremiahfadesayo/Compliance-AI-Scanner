# database.py
import json
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import settings

Base = declarative_base()

class Regulation(Base):
    __tablename__ = "regulations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    source = Column(String, default="GDPR")
    version = Column(String, default="1.0")
    full_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    requirements = relationship("Requirement", back_populates="regulation", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="regulation")

class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True)
    regulation_id = Column(Integer, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    article_reference = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    technical_requirement = Column(Text, nullable=False)
    severity = Column(String, default="high")  # critical, high, medium, low
    category = Column(String, default="security")  # data_collection, storage, processing, deletion, consent, notification, security
    verification_criteria = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    regulation = relationship("Regulation", back_populates="requirements")
    gaps = relationship("ComplianceGap", back_populates="requirement", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    repo_url = Column(String, nullable=True)
    repo_path = Column(String, nullable=True)
    language = Column(String, default="Python")
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    regulation_id = Column(Integer, ForeignKey("regulations.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending")  # pending, parsing, scanning, detecting, remediating, complete, failed
    overall_score = Column(Float, default=0.0)
    model_provider = Column(String, default="Qwen Cloud")
    model_names = Column(String, default="")
    token_usage = Column(Text, nullable=True)
    remediation_approval_status = Column(String, default="pending_review")  # pending_review, approved
    remediation_approved_at = Column(DateTime, nullable=True)
    remediation_approval_note = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="analyses")
    regulation = relationship("Regulation", back_populates="analyses")
    gaps = relationship("ComplianceGap", back_populates="analysis", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="analysis", cascade="all, delete-orphan")

    def _token_usage_payload(self):
        if not self.token_usage:
            return {}
        try:
            return json.loads(self.token_usage)
        except (TypeError, ValueError):
            return {}

    @property
    def demo_metadata(self):
        return self._token_usage_payload().get("demo_metadata", {})

    @property
    def industry_label(self):
        return self.demo_metadata.get("industry_label")

    @property
    def country_label(self):
        return self.demo_metadata.get("country_label")

    @property
    def country_flag(self):
        return self.demo_metadata.get("country_flag")

    @property
    def framework(self):
        return self.demo_metadata.get("framework")

    @property
    def authority(self):
        return self.demo_metadata.get("authority")

    @property
    def source_url(self):
        return self.demo_metadata.get("source_url")

    @property
    def last_updated(self):
        return self.demo_metadata.get("last_updated")

    @property
    def confidence_status(self):
        return "good" if float(self.overall_score or 0) >= 60 else "bad"

    @property
    def totalGaps(self):
        return len(self.gaps or [])

    @property
    def criticalGaps(self):
        return len([gap for gap in (self.gaps or []) if gap.priority == "critical" and gap.status != "compliant"])

class ComplianceGap(Base):
    __tablename__ = "compliance_gaps"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="non_compliant")  # compliant, partial, non_compliant
    evidence = Column(Text, nullable=True)
    gap_description = Column(Text, nullable=True)
    remediation_plan = Column(Text, nullable=True)
    code_location = Column(String, nullable=True)
    priority = Column(String, default="medium")  # critical, high, medium, low
    agent_name = Column(String, default="GapDetector")
    created_at = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("Analysis", back_populates="gaps")
    requirement = relationship("Requirement", back_populates="gaps")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    agent_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    analysis = relationship("Analysis", back_populates="audit_logs")

# Database session setup
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _ensure_sqlite_column(table_name: str, column_name: str, ddl: str):
    """Adds a missing SQLite column without requiring a migration framework."""
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))


def init_db():
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        _ensure_sqlite_column("analyses", "model_provider", "model_provider VARCHAR DEFAULT 'Qwen Cloud'")
        _ensure_sqlite_column("analyses", "model_names", "model_names VARCHAR DEFAULT ''")
        _ensure_sqlite_column("analyses", "token_usage", "token_usage TEXT")
        _ensure_sqlite_column("analyses", "remediation_approval_status", "remediation_approval_status VARCHAR DEFAULT 'pending_review'")
        _ensure_sqlite_column("analyses", "remediation_approved_at", "remediation_approved_at DATETIME")
        _ensure_sqlite_column("analyses", "remediation_approval_note", "remediation_approval_note TEXT")
        _ensure_sqlite_column("compliance_gaps", "agent_name", "agent_name VARCHAR DEFAULT 'GapDetector'")
