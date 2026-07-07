# document_generator.py
import logging
from typing import List, Dict, Any

logger = logging.getLogger("app.services.document_generator")

class DocumentGenerator:
    """Generates Markdown compliance reports, remediation files, and policy templates."""

    def generate_compliance_report(
        self,
        project_name: str,
        regulation_name: str,
        score: float,
        gaps: List[Dict[str, Any]],
        model_provider: str = "Qwen Cloud",
        model_names: str = "",
        token_usage: str = "",
        remediation_approval_status: str = "pending_review"
    ) -> str:
        """Generates a comprehensive compliance report in Markdown format."""
        logger.info(f"Generating compliance report for project {project_name} against {regulation_name}")
        
        compliant_count = sum(1 for g in gaps if g["status"] == "compliant")
        partial_count = sum(1 for g in gaps if g["status"] == "partial")
        non_compliant_count = sum(1 for g in gaps if g["status"] == "non_compliant")
        total_count = len(gaps)
        
        md = []
        md.append(f"# Compliance Report: {project_name}")
        md.append(f"**Regulation:** {regulation_name} | **Compliance Score:** {score:.1f}%")
        md.append(f"**AI Provider:** {model_provider} | **Models:** {model_names or 'Not recorded'}")
        if token_usage:
            md.append(f"**Token Usage:** `{token_usage}`")
        md.append(f"**Remediation Approval Status:** `{remediation_approval_status}`")
        md.append("")
        md.append("## Executive Summary")
        md.append(f"An automated compliance scan was performed on the codebase. Out of {total_count} evaluated requirements:")
        md.append(f"- **Compliant:** {compliant_count} requirements")
        md.append(f"- **Partially Compliant:** {partial_count} requirements")
        md.append(f"- **Non-Compliant:** {non_compliant_count} requirements")
        md.append("")
        
        # Add visual bar using markdown
        progress = int(score / 5)
        bar = "█" * progress + "░" * (20 - progress)
        md.append(f"Score status: `[{bar}]` ({score:.1f}%)")
        md.append("")
        
        # Gap Matrix Table
        md.append("## Requirement Mapping Grid")
        md.append("| ID | Requirement | Category | Status | Priority |")
        md.append("|---|---|---|---|---|")
        for g in gaps:
            req = g.get("requirement", {})
            status_emoji = "✅ Compliant" if g["status"] == "compliant" else ("⚠️ Partial" if g["status"] == "partial" else "❌ Non-Compliant")
            md.append(f"| {req.get('article_reference', 'N/A')} | {req.get('title', 'Unknown')} | {req.get('category', 'security')} | {status_emoji} | {g.get('priority', 'medium').upper()} |")
        md.append("")
        
        # Detailed findings
        md.append("## Detailed Findings & Gaps")
        for g in gaps:
            req = g.get("requirement", {})
            status_emoji = "✅ Compliant" if g["status"] == "compliant" else ("⚠️ Partial" if g["status"] == "partial" else "❌ Non-Compliant")
            
            md.append(f"### {req.get('article_reference', 'N/A')}: {req.get('title', 'Unknown')} — `{status_emoji}`")
            md.append(f"**Severity:** {req.get('severity', 'medium').upper()} | **Category:** {req.get('category', 'security')}")
            md.append(f"**Producing Agent:** `{g.get('agent_name', 'GapDetector')}`")
            md.append("")
            md.append(f"**Requirement description:**  \n{req.get('description', '')}")
            md.append("")
            
            if g["status"] != "compliant":
                md.append("**Compliance Gap Detected:**")
                md.append(f"> {g.get('gap_description', 'No details provided.')}")
                md.append("")
                md.append("**Evidence / Code Reference:**")
                md.append(f"`{g.get('code_location', 'N/A')}`")
                if g.get("evidence"):
                    md.append("```python")
                    md.append(g.get("evidence", "").strip())
                    md.append("```")
                md.append("")
                md.append("**Remediation Strategy:**")
                md.append(g.get("remediation_plan", "No plan generated."))
                md.append("")
            else:
                md.append("**Compliance Evidence:**")
                md.append(f"Requirements met. Detected controls in: `{g.get('code_location', 'N/A')}`")
                if g.get("evidence"):
                    md.append("```python")
                    md.append(g.get("evidence", "").strip())
                    md.append("```")
            md.append("---")
            md.append("")
            
        return "\n".join(md)

    def generate_remediation_plan(
        self,
        project_name: str,
        gaps: List[Dict[str, Any]],
        remediation_approval_status: str = "pending_review",
        remediation_approval_note: str = None
    ) -> str:
        """Generates a detailed step-by-step remediation guide for fixing gaps."""
        non_compliant_gaps = [g for g in gaps if g["status"] != "compliant"]
        
        if not non_compliant_gaps:
            return f"# Remediation Plan: {project_name}\n\nAll checked requirements are compliant! No remediation needed."
            
        md = []
        md.append(f"# Actionable Remediation Plan: {project_name}")
        md.append("This plan lists the concrete code updates and implementations required to achieve full compliance.")
        md.append("")
        md.append(f"**Human Review Status:** `{remediation_approval_status}`")
        if remediation_approval_note:
            md.append(f"**Reviewer Note:** {remediation_approval_note}")
        elif remediation_approval_status != "approved":
            md.append("**Reviewer Note:** This AI-generated remediation package is pending human approval.")
        md.append("")
        
        for idx, g in enumerate(non_compliant_gaps, 1):
            req = g.get("requirement", {})
            md.append(f"## Step {idx}: Fix {req.get('article_reference', 'N/A')} — {req.get('title', 'Unknown')} (Priority: {g.get('priority', 'medium').upper()})")
            md.append(f"**File / Location:** `{g.get('code_location', 'N/A')}`")
            md.append("")
            md.append("### Issue:")
            md.append(g.get("gap_description", "Gap details unavailable."))
            md.append("")
            md.append("### Recommended Action Plan:")
            md.append(g.get("remediation_plan", "No remediation actions specified."))
            md.append("")
            md.append("---")
            md.append("")
            
        return "\n".join(md)

    def generate_privacy_policy_section(self, requirements: List[Dict[str, Any]], gaps: List[Dict[str, Any]]) -> str:
        """Generates a public-facing Privacy Policy section draft based on detected controls."""
        md = []
        md.append("# Draft Privacy Policy Section (GDPR Disclosure)")
        md.append("*Note: This is an AI-generated draft based on automated codebase scanning. It should be reviewed by legal counsel before publication.*")
        md.append("")
        md.append("## 1. Information We Collect and Process")
        md.append("We process user data in accordance with the principles of GDPR. Depending on your interactions with our system, we collect:")
        
        # Collect detected PII items
        pii_items = set()
        for g in gaps:
            evidence = g.get("evidence", "").lower()
            for kw in ["email", "password", "phone", "username", "address", "ip_address"]:
                if kw in evidence:
                    pii_items.add(kw.replace("_", " "))
                    
        if pii_items:
            for item in sorted(pii_items):
                md.append(f"- **{item.capitalize()}**: processed for core application functionalities.")
        else:
            md.append("- Basic registration parameters, login credentials, and essential application inputs.")
            
        md.append("")
        md.append("## 2. Legal Basis for Processing")
        md.append("We process personal data based on the following grounds:")
        md.append("- **User Consent**: Where you have explicitly opted-in to receive communications or allowed optional tracking.")
        md.append("- **Contractual Necessity**: To provide you with access to our platform and execute requested services.")
        md.append("- **Security and Safety**: To monitor and protect the integrity of our database and web servers (in accordance with Article 32).")
        md.append("")
        md.append("## 3. Data Retention and Erasure")
        md.append("We store personal data for as long as your account is active or as necessary to fulfill the purposes outlined in this policy. ")
        
        # Deletion status check
        deletion_gaps = [g for g in gaps if g.get("requirement", {}).get("article_reference") == "Article 17"]
        if deletion_gaps and deletion_gaps[0]["status"] == "compliant":
            md.append("Under GDPR Article 17, you have the right to request the deletion of your personal data. We provide an automated data erasure mechanism accessible in your account profile, which purges your records from our primary database systems within 30 days of request.")
        else:
            md.append("Under GDPR Article 17, you have the right to request the deletion of your personal data. To exercise this right, please contact our support team. (Note: Automated self-service deletion is not fully operational in the current system version).")
            
        md.append("")
        md.append("## 4. Third-Party Sharing")
        sharing_gaps = [g for g in gaps if g.get("requirement", {}).get("category") == "third_party_sharing"]
        if sharing_gaps and any(sg["status"] != "compliant" for sg in sharing_gaps):
            md.append("We disclose information to external analytical, payment, or operational partners under strict data processing agreements. Opt-out controls are available where tracking is non-essential.")
        else:
            md.append("We do not sell, rent, or trade your personal data. Essential service providers (e.g. database host, payment gate) are bound by compliance terms.")
            
        return "\n".join(md)

    def generate_remediation_patch(self, project_name: str, gaps: List[Dict[str, Any]]) -> str:
        """Generates a reviewable unified-diff style remediation patch suggestion."""
        patch_lines = [
            f"# Suggested remediation patch for {project_name}",
            "# This is an AI-generated review artifact. Apply manually after engineering review.",
            ""
        ]

        unresolved = [gap for gap in gaps if gap.get("status") != "compliant"]
        if not unresolved:
            patch_lines.extend([
                "diff --git a/COMPLIANCE_NOTES.md b/COMPLIANCE_NOTES.md",
                "new file mode 100644",
                "--- /dev/null",
                "+++ b/COMPLIANCE_NOTES.md",
                "@@",
                "+All evaluated requirements are compliant. No remediation patch is required."
            ])
            return "\n".join(patch_lines)

        for index, gap in enumerate(unresolved, 1):
            requirement = gap.get("requirement", {})
            raw_location = gap.get("code_location") or "COMPLIANCE_REMEDIATION.md"
            file_path = raw_location.split(":")[0]
            agent_name = gap.get("agent_name") or "RemediationEngine"
            title = requirement.get("title", "Compliance requirement")
            article = requirement.get("article_reference", "N/A")
            remediation = gap.get("remediation_plan") or "Implement the missing compliance control."

            patch_lines.extend([
                f"diff --git a/{file_path} b/{file_path}",
                f"--- a/{file_path}",
                f"+++ b/{file_path}",
                "@@",
                f"+# Compliance remediation {index}: {article} - {title}",
                f"+# Generated by {agent_name}",
                f"+# Priority: {gap.get('priority', 'medium')}",
                f"+# Gap: {gap.get('gap_description', 'No gap description provided.')}",
            ])
            for line in remediation.splitlines():
                patch_lines.append(f"+# {line}" if line else "+#")
            patch_lines.append("")

        return "\n".join(patch_lines).rstrip() + "\n"

# Singleton instance
document_generator = DocumentGenerator()
