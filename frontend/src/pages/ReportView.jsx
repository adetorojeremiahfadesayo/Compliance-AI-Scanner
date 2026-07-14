import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Code, Bot, UserCheck } from 'lucide-react';
import RequirementCard from '../components/RequirementCard';
import CodeViewer from '../components/CodeViewer';
import { api } from '../services/api';

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

  return (
    <div className="fade-in">
      {/* Back navigation */}
      <button 
        onClick={() => navigate(`/analysis/${id}`)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back to Scan Trace
      </button>

      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>Compliance Audit Report</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
            Comprehensive analysis results for project: <strong style={{ color: 'var(--text-primary)' }}>{analysis?.project?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleDownload('report')} className="btn-secondary">
            <Download size={16} /> Export Markdown
          </button>
          <button onClick={() => handleDownload('remediation')} className="btn-primary">
            <FileText size={16} /> Remediation Guide
          </button>
          <button onClick={() => handleDownload('patch')} className="btn-secondary">
            <Download size={16} /> Patch Diff
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Bot size={18} color="var(--accent-purple)" />
          <div>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>AI Provider</span>
            <span style={{ fontWeight: '700' }}>{analysis?.model_provider || 'Qwen Cloud'}</span>
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
          <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>Models Used</span>
          <span style={{ fontWeight: '700', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{analysis?.model_names || 'qwen-max, qwen-plus'}</span>
        </div>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <UserCheck size={18} color={analysis?.remediation_approval_status === 'approved' ? 'var(--status-compliant)' : 'var(--status-partial)'} />
          <div>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)' }}>Remediation Review</span>
            <span style={{ fontWeight: '700', color: analysis?.remediation_approval_status === 'approved' ? 'var(--status-compliant)' : 'var(--status-partial)' }}>
              {analysis?.remediation_approval_status || 'pending_review'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid split */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '32px' }}>
        {/* Left column - findings details */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Evaluated Requirements</h3>
          <div>
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
              />
            ))}
          </div>
        </div>

        {/* Right column - codebase visualizer & quick stats */}
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code size={16} color="var(--accent-blue)" />
            Codebase Audit Inspector
          </h3>
          <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '16px' }}>
              File under inspection: <code style={{ color: 'var(--accent-purple)' }}>{inspector?.file_path || 'Loading code references...'}</code>
            </span>
            <CodeViewer code={inspector?.code || ''} annotations={inspector?.annotations || []} />
          </div>

          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>GDPR Policy Export</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
              Based on the compliance controls identified, click below to export customized disclosure clauses ready for your public Privacy Policy.
            </p>
            <button onClick={() => handleDownload('policy')} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              <Download size={14} /> Export Privacy Policy Clauses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportView;
