/** Format seconds into m:ss */
export function formatDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Format phone for display */
export function formatPhone(phone) {
  return phone || '—'
}

/** Format ISO timestamp to readable local date/time */
export function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Format just the date */
export function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** outcome → badge CSS class */
export function outcomeClass(outcome) {
  const o = (outcome || '').toLowerCase()
  if (o.includes('booked') || o.includes('qualified')) return 'badge-green'
  if (o.includes('no answer') || o.includes('failed')) return 'badge-red'
  if (o.includes('callback') || o.includes('interested')) return 'badge-blue'
  return 'badge-gray'
}

/** status → badge CSS class for campaigns */
export function statusClass(status) {
  const s = (status || '').toLowerCase()
  if (s === 'active') return 'badge-green'
  if (s === 'paused') return 'badge-yellow'
  if (s === 'completed') return 'badge-blue'
  return 'badge-gray'
}
