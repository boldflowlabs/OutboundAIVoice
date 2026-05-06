/**
 * Central API client — all calls to server.py go through here.
 * Base URL is set via VITE_API_URL in .env (e.g. https://api.boldflow.in)
 */

const BASE = import.meta.env.VITE_API_URL || ''

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Calls ─────────────────────────────────────────────────────────
export const getCalls = (page = 1, limit = 20) =>
  req('GET', `/api/calls?page=${page}&limit=${limit}`)

export const dispatchCall = (data) => req('POST', '/api/call', {
  phone: data.phone_number || data.phone,
  lead_name: data.lead_name || 'there',
  business_name: data.business_name || '',
  service_type: data.service_type || '',
})

// ── Stats ─────────────────────────────────────────────────────────
export const getStats = () => req('GET', '/api/stats')

// ── Campaigns ─────────────────────────────────────────────────────
export const getCampaigns = () => req('GET', '/api/campaigns')
export const getCampaign = (id) => req('GET', `/api/campaigns/${id}`)
export const createCampaign = (data) => req('POST', '/api/campaigns', data)
export const deleteCampaign = (id) => req('DELETE', `/api/campaigns/${id}`)
export const runCampaign = (id) => req('POST', `/api/campaigns/${id}/run`)
export const updateCampaignStatus = (id, status) =>
  req('PATCH', `/api/campaigns/${id}/status`, { status })

// ── Agent Profiles ─────────────────────────────────────────────────
export const getAgentProfiles = () => req('GET', '/api/agent-profiles')
export const getAgentProfile = (id) => req('GET', `/api/agent-profiles/${id}`)
export const createAgentProfile = (data) => req('POST', '/api/agent-profiles', data)
export const updateAgentProfile = (id, data) => req('PUT', `/api/agent-profiles/${id}`, data)
export const deleteAgentProfile = (id) => req('DELETE', `/api/agent-profiles/${id}`)
export const setDefaultProfile = (id) =>
  req('POST', `/api/agent-profiles/${id}/set-default`)

// ── CRM ────────────────────────────────────────────────────────────
export const getContacts = () => req('GET', '/api/crm')
export const getContactCalls = (phone) =>
  req('GET', `/api/crm/calls?phone=${encodeURIComponent(phone)}`)

// ── Settings ───────────────────────────────────────────────────────
export const getSettings = () => req('GET', '/api/settings')
export const saveSettings = (settings) => req('POST', '/api/settings', { settings })

// ── Prompt ─────────────────────────────────────────────────────────
export const getPrompt = () => req('GET', '/api/prompt')
export const savePrompt = (prompt) => req('POST', '/api/prompt', { prompt })
export const resetPrompt = () => req('DELETE', '/api/prompt')

// ── Appointments ───────────────────────────────────────────────────
export const getAppointments = (date) =>
  req('GET', `/api/appointments${date ? `?date=${date}` : ''}`)

// ── Logs ───────────────────────────────────────────────────────────
export const getLogs = (limit = 200) => req('GET', `/api/logs?limit=${limit}`)
export const clearLogs = () => req('DELETE', '/api/logs')

// ── Health ─────────────────────────────────────────────────────────
export const healthCheck = () => req('GET', '/health')
