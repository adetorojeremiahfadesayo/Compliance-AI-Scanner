# Competition Features Design

## Goal

Add the five requested competition upgrades to make Compliance Autopilot easier to judge and more compelling for Track 4: Autopilot Agent.

## Features

1. **Remediation patch export:** Completed analyses expose a unified-diff style patch artifact generated from unresolved gaps and remediation plans.
2. **Regression monitor:** Completed analyses can be compared against the previous completed scan for the same project. The MonitorAgent reports new regressions, resolved gaps, and persistent gaps.
3. **Deployment proof endpoint:** `/api/deployment-proof` returns Alibaba Cloud/Qwen Cloud evidence for judges, including model names and whether a Qwen API key is configured.
4. **One-click demo scan:** `/api/analysis/demo` seeds a completed scan of `demo-repo` so judges can inspect the product immediately.
5. **Agent provenance:** Each compliance gap stores and displays the agent responsible for the finding or remediation output.

## Architecture

The backend keeps these features inside the existing FastAPI structure. `ComplianceGap` gains an `agent_name` column. Reports gain a patch export endpoint. Analysis routes gain the demo and regression endpoints. A new lightweight system router exposes deployment proof metadata.

The frontend adds matching controls on existing pages: dashboard one-click demo and deployment proof card, analysis regression check, report patch export, and agent labels in gap displays.

## Testing

Backend tests cover all five features. Frontend verification uses ESLint and the production Vite build.
