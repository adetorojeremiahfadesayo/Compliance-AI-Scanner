# Qwen Cloud Hackathon Submission Guide

## Recommended Track

**Primary track:** Track 4: Autopilot Agent

Compliance Autopilot fits Track 4 because it automates a high-value workflow from ambiguous input to actionable output:

1. Accepts a public repository and a regulation template.
2. Uses Qwen Cloud agents to parse legal requirements and analyze source code.
3. Maps code evidence to compliance statuses.
4. Generates remediation plans, report exports, and privacy policy clauses.
5. Requires human approval before remediation output is treated as approved.
6. Exports a remediation patch diff and compares scans for newly introduced compliance regressions.

**Secondary fit:** Track 3: Agent Society

The project has multiple specialized agents, but the current architecture is a coordinated pipeline. Submit to Track 4 unless you add more explicit cross-agent debate, voting, or delegation logic.

## Prize Narrative

**One-liner:** Compliance Autopilot turns a software repository into a GDPR audit report using a Qwen-powered multi-agent workflow.

**Problem:** Small teams need to understand whether their code handles user data safely, but compliance audits are slow, expensive, and hard to repeat after code changes.

**Solution:** The app runs a real compliance pipeline: regulation parsing, codebase scanning, gap detection, remediation generation, scoring, human approval, and Markdown report export.

**Why Qwen Cloud matters:** Qwen models handle the judgment-heavy work: translating regulation text into technical requirements, summarizing codebase data flows, mapping evidence to compliance statuses, and generating remediation instructions.

## Demo Video Script

Target length: 3 minutes.

1. **0:00-0:20: Problem**
   Show the dashboard and explain that GDPR audits usually require manual legal and engineering review.

2. **0:20-0:55: Configure scan**
   Select a GDPR template, enter a public GitHub repository, and launch the compliance pipeline.

3. **0:55-1:35: Agent workflow**
   Show the live timeline: RegulationParser, CodebaseAnalyzer, GapDetector, RemediationEngine, and Orchestrator.

4. **1:35-2:15: Results**
   Show the compliance score, gap matrix, code references, Qwen Cloud model metadata, and remediation plan.

5. **2:15-2:40: Human approval**
   Click "Approve Remediation" to show the human-in-the-loop checkpoint.

6. **2:40-2:55: Regression and patch**
   Run the MonitorAgent regression check and export the remediation patch diff.

7. **2:55-3:00: Exports**
   Export the compliance report, remediation guide, and privacy policy clauses.

## Devpost Checklist

- Public open-source repository link.
- Demo video, 3 minutes or less.
- Architecture diagram from `docs/ARCHITECTURE.md`.
- Clear statement that Qwen Cloud models are used: `qwen-max` and `qwen-plus`.
- Alibaba Cloud deployment proof: URL, screenshots, or console evidence.
- Short explanation of human-in-the-loop remediation approval.
- Show `/api/deployment-proof` or the dashboard deployment proof panel.
- Show the one-click demo scan if the live GitHub scan is slow during judging.
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

Compliance Autopilot is a Qwen Cloud-powered agent workflow for automated regulatory compliance audits. It scans a software repository, converts GDPR articles into technical requirements, analyzes source code for personal-data handling, maps requirements to evidence, detects compliance gaps, generates remediation plans, and exports audit artifacts. The workflow is intentionally human-in-the-loop: remediation packages remain pending until a reviewer approves them.

The project targets Track 4: Autopilot Agent because it automates a real business workflow with multiple AI agents, external tooling, live status streaming, and production-oriented review checkpoints.

The latest build also includes a one-click seeded demo scan, MonitorAgent regression comparison, per-finding agent provenance, and a patch-diff remediation export so judges can inspect the workflow even when external repository cloning is slow.
