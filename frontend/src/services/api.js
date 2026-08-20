const API_BASE_URL = localStorage.getItem('medcare_api_url') || 'http://localhost:5000';

export function getApiUrl() {
  return API_BASE_URL;
}
export function setApiUrl(url) {
  localStorage.setItem('medcare_api_url', url);
}
export const getFastApiUrl = getApiUrl;
export const setFastApiUrl = setApiUrl;

export function getAuthToken() {
  return localStorage.getItem('medcare_auth_token');
}
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('medcare_auth_token', token);
  } else {
    localStorage.removeItem('medcare_auth_token');
  }
}

async function handle(response) {
  if (response.status === 401) {
    setAuthToken(null);
    window.dispatchEvent(new Event('auth-failed'));
    throw new Error('Unauthorized');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

function getHeaders(customHeaders = {}) {
  const token = getAuthToken();
  const headers = { ...customHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handle(res);
  setAuthToken(data.token);
  return data.user;
}

export async function getMe() {
  const token = getAuthToken();
  if (!token) throw new Error('No token');
  const res = await fetch(`${API_BASE_URL}/api/me`, { headers: getHeaders() });
  const data = await handle(res);
  return data.user;
}

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`, { headers: getHeaders() });
    return res.ok ? { online: true } : { online: false, error: 'Server returned error status' };
  } catch (err) {
    return { online: false, error: err.message };
  }
}
export const checkFastApiHealth = checkApiHealth;

export async function getStats() {
  return handle(await fetch(`${API_BASE_URL}/api/stats`, { headers: getHeaders() }));
}

export async function getQueue({ tier, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (tier) params.set('tier', tier);
  params.set('limit', limit);
  return handle(await fetch(`${API_BASE_URL}/api/queue?${params}`, { headers: getHeaders() }));
}

export async function getPatientDetail(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}`, { headers: getHeaders() }));
}

export async function markContacted(patientId, notes) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/contact`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ notes }),
  }));
}

export async function markClosed(patientId, reason) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/close`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  }));
}

export async function markSnoozed(patientId, days = null) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/snooze`, { 
    method: 'POST', 
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days })
  }));
}

export async function resetPatientStatus(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/reset`, { method: 'POST', headers: getHeaders() }));
}

export async function addPatientNote(patientId, notes) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/notes`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ notes }),
  }));
}

export async function simulateNextBatch() {
  return handle(await fetch(`${API_BASE_URL}/api/simulate-next-batch`, { method: 'POST', headers: getHeaders() }));
}

export async function updatePatientPii(patientId, data) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/pii`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  }));
}

export async function getBatchStatus() {
  return handle(await fetch(`${API_BASE_URL}/api/batches-available`, { headers: getHeaders() }));
}

export async function getBatches() {
  return handle(await fetch(`${API_BASE_URL}/api/batches`, { headers: getHeaders() }));
}

export async function getBatchPatients(batchNumber) {
  return handle(await fetch(`${API_BASE_URL}/api/batch/${batchNumber}/patients`, { headers: getHeaders() }));
}

export async function getPatientHistory(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/history`, { headers: getHeaders() }));
}

// True counts across the WHOLE warehouse (not just the capped table view).
// /api/stats already groups by risk_tier + status, so this needs no new
// backend endpoint -- just filter/sum client-side.
export async function getActiveSummary() {
  const stats = await getStats();
  const active = stats.breakdown.filter(
    (row) => row.status === 'needs_contact' || row.status === 'snoozed'
  );
  const total = active.reduce((sum, row) => sum + Number(row.n), 0);
  const highRisk = active
    .filter((row) => row.risk_tier === 'High')
    .reduce((sum, row) => sum + Number(row.n), 0);
  return { total, highRisk };
}

const STATUS_LABELS = {
  needs_contact: 'Pending Contact',
  contacted: 'Contacted',
  snoozed: 'Snoozed',
  case_closed: 'Closed',
};

function mapPatientRow(r) {
  return {
    ...r,
    patient_name: r.full_name || '',
    contact_number: r.phone_number || '',
    email: r.email || '',
    risk_score: Math.round((r.risk_probability || 0) * 100),
    contact_status: STATUS_LABELS[r.status] || 'Pending Contact',
  };
}

export async function loadQueueData() {
  const rows = await getQueue({ limit: 100 });
  return rows.map(mapPatientRow);
}

export async function processPatientData() {
  await simulateNextBatch();
  const rows = await getQueue({ limit: 100 });
  return { source: 'Flask Backend', data: rows.map(mapPatientRow), success: true };
}

export async function fetchPatientDetail(patientId) {
  const row = await getPatientDetail(patientId);
  return mapPatientRow(row);
}