# CI Integration

Compliance Autopilot exposes two endpoints that turn any CI pipeline into a
compliance gate, plus a README badge.

## Score badge

Embed the live compliance score of a project in a README:

```markdown
![Compliance](https://your-autopilot-host/api/projects/1/badge.svg)
```

The badge is green at ≥60%, amber at 40–59%, red below 40%, and grey when the
project has no completed scan yet.

## CI gate endpoint

`GET /api/projects/{id}/ci-status?threshold=60` returns:

```json
{
  "project_id": 1,
  "project_name": "microblog",
  "analysis_id": 3,
  "score": 50.0,
  "threshold": 60.0,
  "passing": false,
  "critical_gaps": 1,
  "completed_at": "2026-07-08T12:29:13",
  "message": "Compliance score below threshold."
}
```

Fail the build when `passing` is `false`. Example with curl + jq:

```bash
curl -sf "https://your-autopilot-host/api/projects/1/ci-status?threshold=60" \
  | jq -e '.passing' > /dev/null || { echo "Compliance gate failed"; exit 1; }
```

## GitHub Actions

A ready-made workflow lives at [examples/compliance-ci.yml](../examples/compliance-ci.yml).
Copy it to `.github/workflows/` in the repository you want gated, and set the
`AUTOPILOT_URL` and `AUTOPILOT_PROJECT_ID` repository variables.

## Continuous re-scans on push

Instead of (or in addition to) the CI gate, point a GitHub webhook at

```
POST https://your-autopilot-host/api/webhooks/github
```

with content type `application/json` and the *push* event enabled. When a push
arrives for a repository registered as a project, Compliance Autopilot re-runs
the full agent pipeline automatically and the MonitorAgent flags any new
regressions against the previous scan.
