# Hackathon Readiness Design

## Goal

Make Compliance Autopilot credible for the Qwen Cloud Hackathon Track 4: Autopilot Agent by improving the product proof points judges will inspect: real scan data, human-in-the-loop remediation approval, visible Qwen Cloud usage, and submission-ready documentation.

## Scope

The readiness pass covers five improvements:

1. Add a submission guide that maps the project to Track 4 and gives a demo script.
2. Add an architecture document with a Mermaid diagram and deployment checklist.
3. Replace dashboard mock scan data with real backend analysis records.
4. Add remediation approval state and an approval endpoint.
5. Surface Qwen Cloud provider/model metadata in API responses, reports, and UI.

## Backend Design

The `Analysis` model gains lightweight metadata fields:

- `model_provider`, defaulting to `Qwen Cloud`
- `model_names`, storing the Qwen models used by the pipeline
- `token_usage`, storing serialized token usage from the Qwen client
- `remediation_approval_status`, defaulting to `pending_review`
- `remediation_approved_at`
- `remediation_approval_note`

`init_db()` performs a small SQLite-safe column check so existing local databases keep working. A new `GET /api/analysis` endpoint returns recent analyses with project and regulation summaries, and a new `POST /api/analysis/{analysis_id}/approve-remediation` endpoint marks remediation output as human-approved and writes an audit log.

## Frontend Design

The dashboard calls `GET /api/analysis` and displays real recent scans. Empty states replace mock projects/scans. Stats are derived from live analysis and gap data where available. The analysis and report views show the model provider/model names and remediation approval state. A reviewer can approve the remediation package from the completed analysis screen.

## Reporting Design

Markdown reports include Qwen Cloud model metadata and the remediation approval status. Remediation guides state whether the plan is still AI-generated and pending human approval or has been approved.

## Testing

Backend tests cover:

- Listing analyses with nested project/regulation and Qwen metadata.
- Approving remediation and writing the approval audit trail.
- Markdown report generation including Qwen metadata and approval status.

Frontend changes are verified with lint/build because there is no existing frontend test harness.
