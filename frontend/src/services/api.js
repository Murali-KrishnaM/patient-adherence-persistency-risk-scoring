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

// Maps the backend's real "status" values to the UI's display labels.
// This is the single place that translation happens — components
// should never invent their own fallback status strings.
const STATUS_LABELS = {
  needs_contact: 'Pending Contact',
  contacted: 'Contacted',
  snoozed: 'Snoozed',
  case_closed: 'Closed',
};

// Single mapping function used for BOTH the queue list and the single-patient
// detail response, so a patient's risk_tier/risk_score/status can never
// disagree between the list view and the detail drawer — they're always
// derived the exact same way from the exact same raw row shape.
function mapPatientRow(r) {
  return {
    ...r,
    patient_name: r.full_name || `Patient ${r.patient_id}`,
    contact_number: r.phone_number || null,
    email: r.email || null,
    risk_score: Math.round((r.risk_probability || 0) * 100),
    contact_status: STATUS_LABELS[r.status] || 'Pending Contact',
  };
}

// Loads the current queue as-is. Use this for the initial page load and
// for refreshing after a status-changing action — it does NOT advance
// the simulated batch.
export async function loadQueueData() {
  const rows = await getQueue({ limit: 100 });
  return rows.map(mapPatientRow);
}

// Advances the simulation to the next batch, then returns the refreshed
// queue. Use this ONLY for the "New Analysis" button. Errors (e.g. "no
// more batches available") are thrown, not swallowed, so the UI can tell
// the user what actually happened instead of pretending it worked.
export async function processPatientData() {
  await simulateNextBatch();
  const rows = await getQueue({ limit: 100 });
  return { source: 'Flask Backend', data: rows.map(mapPatientRow), success: true };
}

export async function fetchPatientDetail(patientId) {
  const row = await getPatientDetail(patientId);
  return mapPatientRow(row);
}