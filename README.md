# Compliance Autopilot

Compliance Autopilot is a Qwen Cloud-powered regulatory compliance audit agent. It scans a software repository, translates regulation text into technical requirements, detects gaps in the codebase, generates remediation plans, streams progress in real time, and exports audit-ready Markdown reports. Beyond one-off audits it acts continuously: scheduled re-scans, GitHub push webhooks, a CI compliance gate with a README badge, and one-click pull requests that ship the approved remediation package back to the repository.

The project is built for the **Qwen Cloud Hackathon Track 4: Autopilot Agent**.

## What It Does

1. Parses regulation text into structured requirements with `qwen3.7-max`.
2. Scans repositories for PII fields, data storage, logging leaks, deletion logic, consent handling, encryption usage, API endpoints, and third-party sharing.
3. Uses `qwen3.7-plus` to synthesize codebase data-flow and control summaries.
4. Uses `qwen3.7-max` to map regulation requirements to source evidence.
5. Generates remediation plans and privacy policy clauses.
6. Streams agent progress over WebSockets.
7. Adds a human approval checkpoint before remediation output is marked approved.
8. Exports compliance reports, remediation guides, and policy clauses as Markdown.
9. Exports unified-diff style remediation patch suggestions for engineering review.
10. Compares repeated scans with a MonitorAgent regression check.
11. Scans one repository against several frameworks at once — GDPR baseline, a source-backed country/industry rule pack, and any pasted custom regulation or internal policy (parsed into requirements by the RegulationParser agent).
12. Opens a real GitHub pull request with the human-approved remediation package (`compliance-autopilot/scan-N` branch).
13. Re-scans continuously: per-project scheduled monitoring and a GitHub push webhook.
14. Gates CI pipelines with `GET /api/projects/{id}/ci-status` and serves a live README compliance badge — see [docs/CI_INTEGRATION.md](docs/CI_INTEGRATION.md).
15. Provides a one-click seeded demo scan for judging when repository cloning is slow.
16. Exposes `/api/deployment-proof` for Alibaba Cloud and Qwen Cloud submission evidence.
17. Gates the API behind an optional shared access token (`API_ACCESS_TOKEN`) so a public deployment isn't wide open to anyone who finds the URL.
18. Supports a per-project autonomy toggle: **Auto-PR** skips the human approval click and opens the fix PR as soon as a scan completes, still as a PR (never a direct push) so the merge button stays the final human checkpoint.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system diagram and deployment shape.

High-level pipeline:

```mermaid
flowchart LR
    Regulation["Regulation Template"] --> Parser["Regulation Parser<br/>qwen3.7-max"]
    Repo["GitHub Repository"] --> Scanner["Static Scanner"]
    Scanner --> Analyzer["Codebase Analyzer<br/>qwen3.7-plus"]
    Parser --> GapDetector["Gap Detector<br/>qwen3.7-max"]
    Analyzer --> GapDetector
    GapDetector --> Remediation["Remediation Engine<br/>qwen3.7-max"]
    Remediation --> Review["Human Approval"]
    Review --> Reports["Audit Reports"]
```

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, Pydantic v2
- AI: Qwen Cloud via OpenAI-compatible API
- Models: `qwen3.7-max`, `qwen3.7-plus`, `qwen3.6-flash`
- Database: SQLite locally, PostgreSQL-compatible design for production
- Frontend: React, Vite, React Router, Recharts, Lucide React
- Deployment: Docker and Docker Compose

## Local Setup

### Backend

Create `backend/.env`:

```bash
DASHSCOPE_API_KEY=your_dashscope_api_key_here
DATABASE_URL=sqlite:///./compliance_autopilot.db
# Optional: enables the auto-fix PR feature (needs repo write access)
GITHUB_TOKEN=your_github_token
# Optional: gates the API behind a shared access token (see Production Readiness below)
API_ACCESS_TOKEN=
```

Run the API:

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

## Docker Compose

```bash
set DASHSCOPE_API_KEY=your-key
docker-compose up --build
```

On macOS/Linux:

```bash
export DASHSCOPE_API_KEY=your-key
docker-compose up --build
```

## Demo Flow

1. Open the dashboard and click **Start a Scan**.
2. **Industry** — pick the sector (Banking & FinTech, Shipping & Logistics, Entertainment & Media).
3. **Geography** — pick a continent and country; a source-backed rule pack loads from the backend.
4. **Codebase** — choose a bundled demo codebase, or switch to **My repository** and paste a public GitHub URL. In repository mode, tick the frameworks to scan against: GDPR baseline, the country rule pack, and/or a pasted custom regulation.
5. **Launch** — the live pipeline clones the repo and streams RegulationParser → CodebaseAnalyzer → GapDetector → RemediationEngine progress over WebSockets.
6. Review the compliance score, gap matrix, and per-finding code evidence.
7. Approve the remediation package (human-in-the-loop checkpoint).
8. Click **Create Fix PR** to push the approved remediation package to a branch and open a GitHub pull request.
9. Toggle **Monitoring** to schedule automatic re-scans, or point a GitHub push webhook at `/api/webhooks/github`.
10. Run a regression check against the previous scan, and export the report, remediation guide, patch diff, or privacy policy clauses.

For a quick judge walkthrough, the demo-codebase mode creates a completed seeded scan instantly, with agent provenance, remediation output, and report exports.

## Continuous Compliance & CI

Every project gets a live compliance badge (`/api/projects/{id}/badge.svg`) and a CI gate endpoint (`/api/projects/{id}/ci-status?threshold=60`). A ready-made GitHub Actions workflow lives at [examples/compliance-ci.yml](examples/compliance-ci.yml); setup details are in [docs/CI_INTEGRATION.md](docs/CI_INTEGRATION.md).

## Production Readiness

This is a hackathon build, and we'd rather say that plainly than have it discovered. What's already in place:

- Dockerized, deployed on Alibaba Cloud ECS, `restart: always`, environment-based config, backend tests, real WebSocket streaming, CI gate integration, and an audit log for every agent/human action.
- An optional shared-token API gate (`API_ACCESS_TOKEN`, see [backend/.env.example](backend/.env.example)) so the deployment isn't callable by anyone who finds the URL.

What a production deployment would still need, in priority order:

1. **Real user accounts and per-user authorization**, not a single shared token — the current gate stops anonymous drive-by use, it isn't multi-tenant auth.
2. **HTTPS termination** in front of the app (currently plain HTTP on the demo deployment).
3. **A managed database** (RDS/PostgreSQL) in place of SQLite, plus a real migration tool instead of the current ad-hoc `ALTER TABLE` column checks.
4. **Horizontal scaling** — today's deployment is a single ECS instance; a production path would move to a container service (e.g. ACK) behind a load balancer, with the SQLite-only `check_same_thread` constraint removed.
5. **Secrets management** (e.g. KMS-backed secrets) instead of a plain `.env` file on the host.

The seeded/demo fallback data paths that appear when `DASHSCOPE_API_KEY` is unset are intentional for judging resilience, not something we're pretending isn't there — see **Notes** below.

## Hackathon Submission

See [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md) for the recommended Devpost description, demo video script, Track 4 positioning, and Alibaba Cloud deployment proof checklist.

## Testing

Backend:

```bash
python -m pytest backend/tests -q
```

Frontend:

```bash
cd frontend
npm run build
```

## Notes

If `DASHSCOPE_API_KEY` is missing or Qwen Cloud is unavailable, selected agents return fallback demo data so the pipeline can still be demonstrated. For judging, configure a real Qwen Cloud key and show the model metadata displayed in the dashboard and report pages.

## License

MIT. See [LICENSE](LICENSE).
