import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, FileText, Code, Bot, UserCheck } from 'lucide-react';
import RequirementCard from '../components/RequirementCard';
import CodeViewer from '../components/CodeViewer';
import { api } from '../services/api';
import ConfidenceInstrument from '../components/ConfidenceInstrument';
import PageContext from '../components/PageContext';
import OperationalPanel from '../components/OperationalPanel';
import ScanField from '../components/ScanField';

const MOCK_CODE = `import os
import logging
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True)
    email = db.Column(db.String(120), unique=True)
    password = db.Column(db.String(120))  # plaintext security violation

@app.route("/register", methods=["POST"])
def register_user():
    data = request.json
    # PII logging leak violation
    logging.info(f"Registering user details: {data}")
    
    new_user = User(
        username=data["username"],
        email=data["email"],
        password=data["password"]  # stored unhashed
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "Registration successful."}), 201
`;

const MOCK_ANNOTATIONS = [
  { line_number: 13, status: "non_compliant", description: "PII field (password) model declaration contains plaintext database storage capability." },
  { line_number: 18, status: "partial", description: "Logging statement leaks raw email parameter contents into default stdout streams." },
  { line_number: 23, status: "non_compliant", description: "Standard plain text variable assignments violate GDPR password hashing principles." }
];

const MOCK_INSPECTOR = {
  file_path: "demo-repo/app.py",
  code: MOCK_CODE,
  annotations: MOCK_ANNOTATIONS
};

const EMPTY_INSPECTOR = {
  file_path: "No referenced file available",
  code: "",
  annotations: []
};

const MOCK_GAPS = [
  {
    id: 101,
    status: "non_compliant",
    gap_description: "PII field (email) is saved to the SQLite database without encryption, and unhashed plain passwords are saved during user registration.",
    code_location: "demo-repo/app.py:L13-23",
    priority: "critical",
    remediation_plan: `1. **Install Password Hashing Library:** Install bcrypt via pip.
2. **Update User Register Controller:** Update the register endpoint to hash passwords before storing them.
3. **Example Implementation:**
\`\`\`python
import bcrypt

hashed = bcrypt.hashpw(data["password"].encode('utf-8'), bcrypt.gensalt())
user.password = hashed.decode('utf-8')
\`\`\``,
    requirement: {
      article_reference: "Article 32(1)(a)",
      title: "Password & PII Encryption",
      description: "Passwords must never be stored in plaintext. They must be secured using cryptographic hashing algorithms. Sensitive data at rest must be encrypted.",
      severity: "critical",
      category: "security",
      verification_criteria: "Check for usage of hashing modules (bcrypt, passlib) in user models."
    }
  },
  {
    id: 102,
    status: "partial",
    gap_description: "Logging configuration outputs debug statements showing user variables including user registration payloads containing emails.",
    code_location: "demo-repo/app.py:L18",
    priority: "high",
    remediation_plan: `1. **Sanitize Log Parameters:** Do not write statements logging raw user variables or inputs.
2. **Implement Masking Helper:** Write a utility function to replace sensitive parameters (emails, passwords) with asterisks before outputting.`,
    requirement: {
      article_reference: "Article 32(1)(d)",
      title: "Logging Restrictions for Sensitive Data",
      description: "Do not leak personal data, passwords, session tokens, or SSNs in application logs or system output streams.",
      severity: "high",
      category: "security",
      verification_criteria: "Scan print statements and logger outputs for references to PII."
    }
  },
  {
    id: 103,
    status: "non_compliant",
    gap_description: "The application routes lack any route handling a DELETE operation to purge user database profiles and session records.",
    code_location: "demo-repo/app.py",
    priority: "critical",
    remediation_plan: `1. **Create Account Deletion Route:** Add a DELETE endpoint under the user profile routes.
2. **Purge Database Entries:** Ensure that deletions run database cascades to clean up dependent records.
3. **Example Endpoint:**
\`\`\`python
@app.route("/api/user/<int:user_id>", methods=["DELETE"])
def delete_profile(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Profile purged successfully."}), 200
\`\`\``,
    requirement: {
      article_reference: "Article 17(1)",
      title: "Automated Data Erasure Endpoint",
      description: "Users must have the ability to delete all personal information stored about them upon request without manual admin overhead.",
      severity: "critical",
      category: "deletion",
      verification_criteria: "Look for delete methods or endpoints associated with user profile routes."
    }
  }
];

function ReportView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [inspector, setInspector] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await api.getAnalysis(id);
        const reportGaps = await api.getAnalysisGaps(id);
        setAnalysis(data);
        setGaps(reportGaps);
        try {
          const inspectorData = await api.getCodeInspector(id);
          setInspector(inspectorData);
        } catch {
          setInspector(EMPTY_INSPECTOR);
        }
      } catch {
        // Fallback for presentation
        setAnalysis({
          id: 2,
          overall_score: 41.6,
          model_provider: "Qwen Cloud",
          model_names: "qwen-max, qwen-plus",
          remediation_approval_status: "pending_review",
          project: { name: "demo-repo" },
          regulation: { name: "GDPR Article 17 & 32 Audit" }
        });
        setGaps(MOCK_GAPS);
        setInspector(MOCK_INSPECTOR);
      }
    }
    loadReport();
  }, [id]);

  const handleDownload = async (type) => {
    try {
      let content = '';
      if (type === 'report') {
        content = await api.getReportMarkdown(id);
      } else if (type === 'remediation') {
        content = await api.getRemediationMarkdown(id);
      } else if (type === 'patch') {
        content = await api.getPatchDiff(id);
      } else {
        content = await api.getPrivacyPolicyMarkdown(id);
      }
      
      // Basic download anchor trigger
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-${type}-scan-${id}.${type === 'patch' ? 'diff' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert("Report downloading is only active for database completed runs. Showing visual preview.");
    }
  };

  const selectedGap = gaps.find((gap) => gap.id === selectedFindingId) || gaps[0];
  const activeLine = Number(selectedGap?.code_location?.match(/L(\d+)/)?.[1]) || null;

  return (
    <div className="confidence-report">
      <PageContext
        title="Confidence Report"
        description={`${analysis?.project?.name || 'Repository'} compliance evidence and remediation record.`}
        status={<span className={`badge ${analysis?.remediation_approval_status === 'approved' ? 'badge-compliant' : 'badge-partial'}`}><UserCheck size={12} /> {analysis?.remediation_approval_status || 'pending_review'}</span>}
        backAction={{ label: 'Back to Scan Confidence', onClick: () => navigate(`/analysis/${id}`) }}
        actions={(
          <>
            <button type="button" onClick={() => handleDownload('report')} className="btn-secondary compact-action"><Download size={15} /> Export Markdown</button>
            <button type="button" onClick={() => handleDownload('remediation')} className="btn-primary compact-action"><FileText size={15} /> Remediation Guide</button>
            <button type="button" onClick={() => handleDownload('patch')} className="btn-secondary compact-action"><Download size={15} /> Patch Diff</button>
          </>
        )}
      />

      <section className="confidence-stage confidence-stage--report">
        <ConfidenceInstrument
          score={analysis?.overall_score || 0}
          status="complete"
          progress={100}
          meta={[
            { label: 'Project', value: analysis?.project?.name },
            { label: 'Regulation', value: analysis?.regulation?.name },
            { label: 'Provider', value: analysis?.model_provider || 'Qwen Cloud' },
            { label: 'Models', value: analysis?.model_names || 'qwen-max, qwen-plus' },
          ]}
        />
        <div className="confidence-stage__field">
          <ScanField mode="evidence" findings={gaps} focusId={selectedGap ? `finding-${selectedGap.id}` : null} />
          <div className="confidence-stage__field-label"><span>Finding topology</span><strong>{selectedGap?.requirement?.article_reference || `${gaps.length} findings`}</strong></div>
        </div>
      </section>

      <section className="report-context-strip">
        <div><Bot size={15} /><span>Provider</span><strong>{analysis?.model_provider || 'Qwen Cloud'}</strong></div>
        <div><Code size={15} /><span>Models</span><strong className="mono">{analysis?.model_names || 'qwen-max, qwen-plus'}</strong></div>
        <div><UserCheck size={15} /><span>Review</span><strong>{analysis?.remediation_approval_status || 'pending_review'}</strong></div>
        <div><span>Critical</span><strong className="is-risk">{gaps.filter((gap) => gap.priority === 'critical').length}</strong></div>
      </section>

      <div className="report-evidence-grid">
        <OperationalPanel title="Evaluated Requirements" meta={`${gaps.length} findings`}>
          <div className="requirement-list">
            {gaps.map((gap) => (
              <RequirementCard 
                key={gap.id}
                title={gap.requirement?.title}
                article_reference={gap.requirement?.article_reference}
                status={gap.status}
                severity={gap.requirement?.severity}
                description={gap.requirement?.description}
                gap_description={gap.gap_description}
                remediation_plan={gap.remediation_plan}
                code_location={gap.code_location}
                agent_name={gap.agent_name}
                selected={selectedGap?.id === gap.id}
                onSelect={() => setSelectedFindingId(gap.id)}
              />
            ))}
          </div>
        </OperationalPanel>

        <div className="report-evidence-grid__inspector">
          <OperationalPanel title="Codebase Audit Inspector" meta={inspector?.file_path || 'Loading code references'}>
            <div className="code-inspector-pad">
              <CodeViewer code={inspector?.code || ''} annotations={inspector?.annotations || []} activeLine={activeLine} />
            </div>
          </OperationalPanel>
          <OperationalPanel title="Policy Export" meta="Existing report action">
            <div className="policy-export">
              <p>Export the disclosure clauses generated from the identified controls.</p>
              <button type="button" onClick={() => handleDownload('policy')} className="btn-secondary"><Download size={14} /> Export Privacy Policy Clauses</button>
            </div>
          </OperationalPanel>
        </div>
      </div>
    </div>
  );
}

export default ReportView;
