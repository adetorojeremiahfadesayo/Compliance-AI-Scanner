# Competition Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the five requested hackathon competition features.

**Architecture:** Extend existing backend models/routes and frontend pages without introducing a new service boundary. Keep generated patches as review artifacts instead of applying code automatically.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React, Vite.

---

### Task 1: Backend Feature Contracts

- [x] Add tests for deployment proof, patch export, one-click demo scan, regression comparison, and agent provenance.
- [x] Add `agent_name` to compliance gaps and response schemas.
- [x] Add deployment proof API.
- [x] Add remediation patch generator and endpoint.
- [x] Add MonitorAgent regression comparison.
- [x] Add one-click demo scan endpoint.

### Task 2: Frontend Integration

- [x] Add API client methods.
- [x] Add one-click demo and deployment proof to dashboard.
- [x] Add regression check to analysis view.
- [x] Add patch diff export to report view.
- [x] Show agent provenance in gap and requirement displays.

### Task 3: Documentation And Verification

- [x] Update README, architecture, and hackathon submission docs.
- [x] Run backend test suite.
- [x] Run frontend lint.
- [x] Run frontend build.
