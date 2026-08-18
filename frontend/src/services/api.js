const API_BASE_URL = localStorage.getItem('medcare_api_url') || 'http://localhost:5000';

export function getApiUrl() {
  return API_BASE_URL;
}
export function setApiUrl(url) {
  localStorage.setItem('medcare_api_url', url);
}
// Legacy aliases so existing imports don't crash the build
export const getFastApiUrl = getApiUrl;
export const setFastApiUrl = setApiUrl;

async function handle(response) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return response.json();
}

export async function checkApiHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/stats`);
    return res.ok ? { online: true } : { online: false, error: 'Server returned error status' };
  } catch (err) {
    return { online: false, error: err.message };
  }
}
export const checkFastApiHealth = checkApiHealth;

export async function getStats() {
  return handle(await fetch(`${API_BASE_URL}/api/stats`));
}

export async function getQueue({ tier, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (tier) params.set('tier', tier);
  params.set('limit', limit);
  return handle(await fetch(`${API_BASE_URL}/api/queue?${params}`));
}

export async function getPatientDetail(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}`));
}

export async function markContacted(patientId, notes) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  }));
}

export async function markClosed(patientId, reason) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }));
}

export async function markSnoozed(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/snooze`, { method: 'POST' }));
}

export async function simulateNextBatch() {
  return handle(await fetch(`${API_BASE_URL}/api/simulate-next-batch`, { method: 'POST' }));
}

// Legacy shim: old code called this with (patientRecords, file) and got
// back objects shaped like { patient_name, risk_score (0-100), contact_status, ... }.
// This bridges to the real /api/queue endpoint but does NOT fully match
// the old shape yet (no patient_name/contact_number/email from this route,
// risk_score is derived from risk_probability). Component-level fixes still needed.
export async function processPatientData() {
  const rows = await getQueue({ limit: 100 });
  const mapped = rows.map(r => ({
    ...r,
    patient_name: r.patient_name || `Patient ${r.patient_id}`,
    contact_number: r.contact_number || '(555) 019-2834',
    email: r.email || `patient_${r.patient_id}@medcare-demo.com`,
    risk_score: Math.round((r.risk_probability || 0) * 100),
    contact_status: r.contact_status || 'Pending Contact',
  }));
  return { source: 'Flask Backend', data: mapped, success: true };
}