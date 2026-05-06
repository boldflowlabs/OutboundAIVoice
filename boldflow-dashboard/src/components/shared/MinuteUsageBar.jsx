/**
 * MinuteUsageBar — shows a usage bar that turns yellow at 70% and red at 90%.
 * Displays overage cost at ₹3.50/min when the client exceeds their plan limit.
 */
export function MinuteUsageBar({ used = 0, included = 1000 }) {
  const pct = included === Infinity ? 0 : Math.min(100, (used / included) * 100)
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#eab308' : '#22c55e'
  const overageMinutes = Math.max(0, used - included)
  const overageCharge = (overageMinutes * 3.5).toFixed(0)

  return (
    <div style={{
      padding: '12px 16px',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: 'var(--text-muted)' }}>
          🔋 <strong style={{ color: 'var(--text)' }}>{used.toLocaleString()}</strong>
          {' / '}
          {included === Infinity ? '∞' : included.toLocaleString()} min used
        </span>
        {overageMinutes > 0 && (
          <span style={{ color: 'var(--red)', fontWeight: 600 }}>
            ⚠️ +{overageMinutes} min overage (₹{overageCharge})
          </span>
        )}
      </div>
      <div style={{ width: '100%', background: 'var(--border)', borderRadius: 99, height: 6 }}>
        <div style={{
          width: `${pct}%`, height: 6, borderRadius: 99,
          background: color,
          transition: 'width 0.6s ease',
        }} />
      </div>
      {pct > 90 && (
        <p style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>
          Nearing limit — contact support to upgrade your plan.
        </p>
      )}
    </div>
  )
}
