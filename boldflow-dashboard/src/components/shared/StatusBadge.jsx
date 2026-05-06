import { outcomeClass, statusClass } from '../../lib/utils'

/** Generic status badge — automatically picks color from outcome or status string */
export function StatusBadge({ value, type = 'outcome' }) {
  const cls = type === 'status' ? statusClass(value) : outcomeClass(value)
  return <span className={`badge ${cls}`}>{value || '—'}</span>
}
