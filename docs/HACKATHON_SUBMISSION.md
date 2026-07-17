# Qwen Cloud Hackathon Submission Guide

## Recommended Track

**Primary track:** Track 4: Autopilot Agent

Compliance Autopilot fits Track 4 because it automates a high-value workflow from ambiguous input to actionable output — and then keeps acting on the repository over time:

1. Accepts a public repository plus one or more frameworks: a GDPR template, a source-backed country/industry rule pack, or pasted custom regulation text.
2. Uses Qwen Cloud agents to parse legal requirements and analyze source code.
3. Maps code evidence to compliance statuses.
4. Generates remediation plans, report exports, and privacy policy clauses.
5. Requires human approval before remediation output is treated as approved.
6. After approval, pushes the remediation package to a branch and opens a real GitHub pull request.
7. Keeps watch autonomously: scheduled per-project re-scans, a GitHub push webhook, a CI compliance gate, and a live README badge.
8. Exports a remediation patch diff and compares scans for newly introduced compliance regressions.

**Secondary fit:** Track 3: Agent Society

The project has multiple specialized agents, but the current architecture is a coordinated pipeline. Submit to Track 4 unless you add more explicit cross-agent debate, voting, or delegation logic.

## Prize Narrative

**One-liner:** Compliance Autopilot turns a software repository into a GDPR audit report using a Qwen-powered multi-agent workflow.

**Problem:** Small teams need to understand whether their code handles user data safely, but compliance audits are slow, expensive, and hard to repeat after code changes.

**Solution:** The app runs a real compliance pipeline: regulation parsing, codebase scanning, gap detection, remediation generation, scoring, human approval, and Markdown report export.

**Why Qwen Cloud matters:** Qwen models handle the judgment-heavy work: translating regulation text into technical requirements, summarizing codebase data flows, mapping evidence to compliance statuses, and generating remediation instructions.

## Demo Video Script

Target length: 3 minutes.

1. **0:00-0:15: Problem**
   Show the dashboard and explain that compliance audits usually require manual legal and engineering review — and go stale the moment code changes.

2. **0:15-0:45: Configure scan**
   Walk the wizard: pick an industry and country (source-backed rule pack loads), switch to "My repository", paste a public GitHub URL, and tick the frameworks (GDPR + country rule pack + optionally a pasted custom policy).

3. **0:45-1:20: Agent workflow**
   Launch and show the live timeline streaming over WebSockets: RegulationParser, CodebaseAnalyzer, GapDetector, RemediationEngine, and Orchestrator.

4. **1:20-1:50: Results**
   Show the compliance score, gap matrix, real code references from the scanned repo, Qwen Cloud model metadata, and a remediation plan.

5. **1:50-2:20: Human approval → real pull request**
   Click "Approve Remediation", then "Create Fix PR" — cut to GitHub showing the `compliance-autopilot/scan-N` branch and the opened pull request. This is the autopilot money shot.

6. **2:20-2:45: Continuous compliance**
   Toggle Monitoring on, show the README compliance badge and the CI gate response (`/api/projects/{id}/ci-status`), and mention the GitHub push webhook.

7. **2:45-3:00: Regression and exports**
   Run the MonitorAgent regression check and export the report, remediation guide, patch diff, and privacy policy clauses.

## Devpost Checklist

- Public open-source repository link.
- Demo video, 3 minutes or less.
- Architecture diagram from `docs/ARCHITECTURE.md`.
- Clear statement that Qwen Cloud models are used: `qwen3.7-max`, `qwen3.7-plus`, and `qwen3.6-flash`.
- Alibaba Cloud deployment proof: URL, screenshots, or console evidence.
- Short explanation of human-in-the-loop remediation approval.
- Show `/api/deployment-proof` or the dashboard deployment proof panel.
- Show the one-click demo scan if the live GitHub scan is slow during judging.
- Show the auto-fix pull request on GitHub (requires `GITHUB_TOKEN` with write access to the scanned repo).
- Show the compliance badge and CI gate endpoint (`docs/CI_INTEGRATION.md`).
- Mention that local fallback data exists only for demo resilience and Qwen calls are used when `DASHSCOPE_API_KEY` is configured.

## Alibaba Cloud Deployment Proof Checklist

- Backend running on Alibaba Cloud ECS, Container Service, or equivalent Alibaba Cloud compute.
- Frontend reachable through public URL.
- `DASHSCOPE_API_KEY` set as a secure environment variable.
- Screenshot of deployed container/service.
- Screenshot or log line showing Qwen Cloud model usage.
- Screenshot of the app showing model provider as "Qwen Cloud".
- Screenshot of the deployment proof card or `/api/deployment-proof` endpoint.

## Suggested Devpost Description

Compliance Autopilot is a Qwen Cloud-powered agent workflow for automated regulatory compliance audits. It scans a software repository, converts regulation text into technical requirements, analyzes source code for personal-data handling, maps requirements to evidence, detects compliance gaps, generates remediation plans, and exports audit artifacts. The workflow is intentionally human-in-the-loop: remediation packages remain pending until a reviewer approves them — and once approved, the agent pushes the remediation package to a branch and opens a real GitHub pull request.

One repository can be scanned against several frameworks in a single run: a GDPR baseline, a source-backed country/industry rule pack (25 countries × 3 industries), or any pasted custom regulation or internal policy, which the RegulationParser agent converts into structured requirements with `qwen3.7-max`.

The autopilot also operates continuously: per-project scheduled re-scans, a GitHub push webhook that triggers an immediate re-scan, a CI gate endpoint that fails builds below a compliance threshold, and a live README badge.

The project targets Track 4: Autopilot Agent because it automates a real business workflow with multiple AI agents, external tooling, live status streaming, production-oriented review checkpoints, and real-world actions (pull requests, CI gates).

The latest build also includes a one-click seeded demo scan, MonitorAgent regression comparison, per-finding agent provenance, and a patch-diff remediation export so judges can inspect the workflow even when external repository cloning is slow.
