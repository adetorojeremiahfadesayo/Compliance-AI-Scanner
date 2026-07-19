// api.js
// Defaults to a same-origin relative path so the app works behind HTTPS and any
// reverse proxy. In dev, Vite proxies /api to the backend (see vite.config.js);
// in production, nginx proxies it. Override with VITE_API_BASE for split hosting.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_STORAGE_KEY = 'compliance_autopilot_api_token';

export function getApiToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

export function setApiToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Shared fetch wrapper: attaches the access token (no-op server-side unless
// API_ACCESS_TOKEN is configured on the backend) and broadcasts a window event
// on 401 so <TokenGate/> can prompt for the token without every call site
// needing to know about auth.
async function request(path, options = {}) {
  const token = getApiToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['X-API-Token'] = token;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('api:unauthorized'));
  }
  return res;
}

export const api = {
  // Regulations API
  async getRegulations() {
    const res = await request(`/regulations`);
    if (!res.ok) throw new Error("Failed to load regulations");
    return res.json();
  },

  async getRegulationTemplates() {
    const res = await request(`/regulations/templates`);
    if (!res.ok) throw new Error("Failed to load templates");
    return res.json();
  },

  async getRulePack(industry, country) {
    const res = await request(`/regulations/rule-pack?industry=${encodeURIComponent(industry)}&country=${encodeURIComponent(country)}`);
    if (!res.ok) throw new Error("Failed to load rule pack");
    return res.json();
  },

  async loadTemplate(index) {
    const res = await request(`/regulations/load-gdpr-template?article_index=${index}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to load GDPR template to database");
    return res.json();
  },

  async createRegulation(data) {
    const res = await request(`/regulations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create custom regulation");
    return res.json();
  },

  async createRegulationFromRulePack(industry, country) {
    const res = await request(`/regulations/from-rule-pack?industry=${encodeURIComponent(industry)}&country=${encodeURIComponent(country)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to load rule pack regulation");
    return res.json();
  },

  // Projects API
  async getProjects() {
    const res = await request(`/projects`);
    if (!res.ok) throw new Error("Failed to load projects");
    return res.json();
  },

  async createProject(data) {
    const res = await request(`/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to create project registry");
    return res.json();
  },

  async setMonitoring(projectId, enabled, intervalMinutes = 60) {
    const res = await request(`/projects/${projectId}/monitoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, interval_minutes: intervalMinutes })
    });
    if (!res.ok) throw new Error("Failed to update monitoring settings");
    return res.json();
  },

  async setAutoPr(projectId, enabled) {
    const res = await request(`/projects/${projectId}/auto-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error("Failed to update auto-PR setting");
    return res.json();
  },

  // Analysis API
  async startAnalysis(data) {
    const res = await request(`/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to launch compliance scan");
    return res.json();
  },

  async startMultiAnalysis(projectId, regulationIds) {
    const res = await request(`/analysis/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, regulation_ids: regulationIds })
    });
    if (!res.ok) throw new Error("Failed to launch multi-framework scan");
    return res.json();
  },

  async createFixPr(analysisId, gapIds = null) {
    const res = await request(`/analysis/${analysisId}/create-fix-pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gapIds ? { gap_ids: gapIds } : {})
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.detail || "Failed to create fix PR");
    return body;
  },

  async generateFixes(analysisId, gapIds = null) {
    const res = await request(`/analysis/${analysisId}/generate-fixes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gap_ids: gapIds })
    });
    const body = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error(body.detail || "Failed to generate code fixes");
    return body;
  },

  async getCodeFixes(analysisId) {
    const res = await request(`/analysis/${analysisId}/code-fixes`);
    if (!res.ok) throw new Error("Failed to load code fixes");
    return res.json();
  },

  async getAnalyses() {
    const res = await request(`/analysis`);
    if (!res.ok) throw new Error("Failed to load analysis sessions");
    return res.json();
  },

  async getAnalysis(id) {
    const res = await request(`/analysis/${id}`);
    if (!res.ok) throw new Error("Failed to load analysis session details");
    return res.json();
  },

  async createDemoAnalysis() {
    const res = await request(`/analysis/demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to create demo analysis");
    return res.json();
  },

  async createDemoAnalysisForCodebase(codebaseId, countryId) {
    const res = await request(`/analysis/demo/${codebaseId}?country_id=${countryId}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to create industry demo analysis");
    return res.json();
  },

  async checkRegression(id) {
    const res = await request(`/analysis/${id}/regression-check`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error("Failed to run regression check");
    return res.json();
  },

  async approveRemediation(id, note = '') {
    const res = await request(`/analysis/${id}/approve-remediation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    if (!res.ok) throw new Error("Failed to approve remediation package");
    return res.json();
  },

  async getAnalysisGaps(id) {
    const res = await request(`/analysis/${id}/gaps`);
    if (!res.ok) throw new Error("Failed to load compliance gaps");
    return res.json();
  },

  async getCodeInspector(id) {
    const res = await request(`/analysis/${id}/code-inspector`);
    if (!res.ok) throw new Error("Failed to load code inspector");
    return res.json();
  },

  async getAnalysisAudit(id) {
    const res = await request(`/analysis/${id}/audit-log`);
    if (!res.ok) throw new Error("Failed to load scan progress logs");
    return res.json();
  },

  // Reports markdown raw exporters
  async getReportMarkdown(id) {
    const res = await request(`/reports/analysis/${id}/report`);
    if (!res.ok) throw new Error("Failed to download report");
    return res.text();
  },

  async getRemediationMarkdown(id) {
    const res = await request(`/reports/analysis/${id}/remediation`);
    if (!res.ok) throw new Error("Failed to download remediation guide");
    return res.text();
  },

  async getPrivacyPolicyMarkdown(id) {
    const res = await request(`/reports/analysis/${id}/policy`);
    if (!res.ok) throw new Error("Failed to download policy clauses");
    return res.text();
  },

  async getPatchDiff(id) {
    const res = await request(`/reports/analysis/${id}/patch`);
    if (!res.ok) throw new Error("Failed to download remediation patch");
    return res.text();
  },

  async getDeploymentProof() {
    // Deployment proof stays unauthenticated on the backend (judges need it
    // reachable without a secret), so this bypasses the token wrapper.
    const res = await fetch(`${API_BASE}/deployment-proof`);
    if (!res.ok) throw new Error("Failed to load deployment proof");
    return res.json();
  }
};
