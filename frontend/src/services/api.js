// api.js
// Defaults to a same-origin relative path so the app works behind HTTPS and any
// reverse proxy. In dev, Vite proxies /api to the backend (see vite.config.js);
// in production, nginx proxies it. Override with VITE_API_BASE for split hosting.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

  async getRulePack(industry, country) {
    const res = await fetch(`${API_BASE}/regulations/rule-pack?industry=${encodeURIComponent(industry)}&country=${encodeURIComponent(country)}`);
    if (!res.ok) throw new Error("Failed to load rule pack");
    return res.json();
  },

  async loadTemplate(index) {
    const res = await fetch(`${API_BASE}/regulations/load-gdpr-template?article_index=${index}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to load GDPR template to database");
    return res.json();
  },

  async createRegulation(data) {
    const res = await fetch(`${API_BASE}/regulations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create custom regulation");
    return res.json();
  },

  async createRegulationFromRulePack(industry, country) {
    const res = await fetch(`${API_BASE}/regulations/from-rule-pack?industry=${encodeURIComponent(industry)}&country=${encodeURIComponent(country)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to load rule pack regulation");
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

  async setMonitoring(projectId, enabled, intervalMinutes = 60) {
    const res = await fetch(`${API_BASE}/projects/${projectId}/monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, interval_minutes: intervalMinutes })
    });
    if (!res.ok) throw new Error("Failed to update monitoring settings");
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

  async startMultiAnalysis(projectId, regulationIds) {
    const res = await fetch(`${API_BASE}/analysis/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, regulation_ids: regulationIds })
    });
    if (!res.ok) throw new Error("Failed to launch multi-framework scan");
    return res.json();
  },

  async createFixPr(analysisId) {
    const res = await fetch(`${API_BASE}/analysis/${analysisId}/create-fix-pr`, {
      method: 'POST'
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || "Failed to create fix PR");
    return body;
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

  async createDemoAnalysisForCodebase(codebaseId, countryId) {
    const res = await fetch(`${API_BASE}/analysis/demo/${codebaseId}?country_id=${countryId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to create industry demo analysis");
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

  async getCodeInspector(id) {
    const res = await fetch(`${API_BASE}/analysis/${id}/code-inspector`);
    if (!res.ok) throw new Error("Failed to load code inspector");
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
