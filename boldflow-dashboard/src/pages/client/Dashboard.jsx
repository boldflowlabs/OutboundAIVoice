import { useQuery } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import { MinuteUsageBar } from '../../components/shared/MinuteUsageBar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { getStats, getCalls } from '../../lib/api'
import { formatDateTime, formatDuration } from '../../lib/utils'
import { useAuthStore } from '../../store/authStore'
import { Phone, Megaphone, CheckCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const { clientName, minutesIncluded } = useAuthStore()

  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats, refetchInterval: 30_000 })
  const { data: callsData } = useQuery({ queryKey: ['calls', 1], queryFn: () => getCalls(1, 8) })

  const calls = callsData?.data || callsData || []
  const totalCalls   = stats?.total_calls   ?? 0
  const todayCalls   = stats?.today_calls   ?? 0
  const booked       = stats?.total_booked  ?? 0
  const minutesUsed  = stats?.minutes_used  ?? 0

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div className="page-title">
            <h1>🏠 {clientName}</h1>
            <p className="page-subtitle">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Usage bar */}
        <div style={{ marginBottom: 24 }}>
          <MinuteUsageBar used={minutesUsed} included={minutesIncluded} />
        </div>

        {/* Stats grid */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <StatCard icon={<Megaphone size={18} />} label="Total Calls" value={totalCalls} delta="All time" />
          <StatCard icon={<Phone size={18} />} label="Calls Today" value={todayCalls} delta="Last 24 hours" />
          <StatCard icon={<CheckCircle size={18} />} label="Appointments" value={booked} delta="Total booked" color="var(--green)" />
          <StatCard icon={<TrendingUp size={18} />} label="Minutes Used" value={minutesUsed} delta={`of ${minutesIncluded === Infinity ? '∞' : minutesIncluded} included`} />
        </div>

        {/* Recent calls */}
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Recent Calls</h2>
          {calls.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
              No calls yet. Start a campaign to see activity here.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Lead</th>
                  <th>Outcome</th>
                  <th>Duration</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.phone_number}</td>
                    <td>{c.lead_name || '—'}</td>
                    <td><StatusBadge value={c.outcome} /></td>
                    <td>{formatDuration(c.duration_seconds)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDateTime(c.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, delta, color }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: color || 'var(--primary)' }}>{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value" style={{ color: color || 'var(--text)' }}>{value}</div>
      <div className="stat-delta">{delta}</div>
    </div>
  )
}
