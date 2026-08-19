const API_BASE_URL = localStorage.getItem('medcare_api_url') || 'http://localhost:5000';

export function getApiUrl() {
  return API_BASE_URL;
}
export function setApiUrl(url) {
  localStorage.setItem('medcare_api_url', url);
}
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

export async function resetPatientStatus(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/reset`, { method: 'POST' }));
}

export async function simulateNextBatch() {
  return handle(await fetch(`${API_BASE_URL}/api/simulate-next-batch`, { method: 'POST' }));
}

export async function getBatchStatus() {
  return handle(await fetch(`${API_BASE_URL}/api/batches-available`));
}

export async function getBatches() {
  return handle(await fetch(`${API_BASE_URL}/api/batches`));
}

export async function getBatchPatients(batchNumber) {
  return handle(await fetch(`${API_BASE_URL}/api/batch/${batchNumber}/patients`));
}

export async function getPatientHistory(patientId) {
  return handle(await fetch(`${API_BASE_URL}/api/patient/${patientId}/history`));
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
    patient_name: r.full_name || `Patient ${r.patient_id}`,
    contact_number: r.phone_number || null,
    email: r.email || null,
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