// api.js
const API_HOST = window.location.hostname || 'localhost';
const API_BASE = `http://${API_HOST}:8000/api`;

export const api = {
  // Regulations API
  async getRegulations() {
    const res = await fetch(`${API_BASE}/regulations`);
    if (!res.ok) throw new Error("Failed to load regulations");
    return res.json();
  },

  async getRegulationTemplates() {
    const res = await fetch(`${API_BASE}/regulations/templates`);
    if (!res.ok) throw new Error("Failed to load templates");
    return res.json();
  },

  async loadTemplate(index) {
    const res = await fetch(`${API_BASE}/regulations/load-gdpr-template?article_index=${index}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to load GDPR template to database");
    return res.json();
  },

  // Projects API
  async getProjects() {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error("Failed to load projects");
    return res.json();
  },

  async createProject(data) {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create project registry");
    return res.json();
  },

  // Analysis API
  async startAnalysis(data) {
    const res = await fetch(`${API_BASE}/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to launch compliance scan");
    return res.json();
  },

  async getAnalyses() {
    const res = await fetch(`${API_BASE}/analysis`);
    if (!res.ok) throw new Error("Failed to load analysis sessions");
    return res.json();
  },

  async getAnalysis(id) {
    const res = await fetch(`${API_BASE}/analysis/${id}`);
    if (!res.ok) throw new Error("Failed to load analysis session details");
    return res.json();
  },

  async createDemoAnalysis() {
    const res = await fetch(`${API_BASE}/analysis/demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to create demo analysis");
    return res.json();
  },

  async checkRegression(id) {
    const res = await fetch(`${API_BASE}/analysis/${id}/regression-check`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to run regression check");
    return res.json();
  },

  async approveRemediation(id, note = '') {
    const res = await fetch(`${API_BASE}/analysis/${id}/approve-remediation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    if (!res.ok) throw new Error("Failed to approve remediation package");
    return res.json();
  },

  async getAnalysisGaps(id) {
    const res = await fetch(`${API_BASE}/analysis/${id}/gaps`);
    if (!res.ok) throw new Error("Failed to load compliance gaps");
    return res.json();
  },

  async getAnalysisAudit(id) {
    const res = await fetch(`${API_BASE}/analysis/${id}/audit-log`);
    if (!res.ok) throw new Error("Failed to load scan progress logs");
    return res.json();
  },

  // Reports markdown raw exporters
  async getReportMarkdown(id) {
    const res = await fetch(`${API_BASE}/reports/analysis/${id}/report`);
    if (!res.ok) throw new Error("Failed to download report");
    return res.text();
  },

  async getRemediationMarkdown(id) {
    const res = await fetch(`${API_BASE}/reports/analysis/${id}/remediation`);
    if (!res.ok) throw new Error("Failed to download remediation guide");
    return res.text();
  },

  async getPrivacyPolicyMarkdown(id) {
    const res = await fetch(`${API_BASE}/reports/analysis/${id}/policy`);
    if (!res.ok) throw new Error("Failed to download policy clauses");
    return res.text();
  },

  async getPatchDiff(id) {
    const res = await fetch(`${API_BASE}/reports/analysis/${id}/patch`);
    if (!res.ok) throw new Error("Failed to download remediation patch");
    return res.text();
  },

  async getDeploymentProof() {
    const res = await fetch(`${API_BASE}/deployment-proof`);
    if (!res.ok) throw new Error("Failed to load deployment proof");
    return res.json();
  }
};
