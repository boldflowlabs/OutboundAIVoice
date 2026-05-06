import { useQuery } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { getCalls } from '../../lib/api'
import { formatDateTime, formatDuration } from '../../lib/utils'
import { useState } from 'react'

export default function CallHistory() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['calls', page],
    queryFn: () => getCalls(page, 25),
  })

  const calls = data?.data || data || []

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Call History</h1>
            <p className="page-subtitle">All outbound calls and their outcomes</p>
          </div>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : calls.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
              No calls yet.
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Lead</th>
                  <th>Outcome</th>
                  <th>Duration</th>
                  <th>Recording</th>
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
                    <td>
                      {c.recording_url ? (
                        <a href={c.recording_url} target="_blank" rel="noopener noreferrer"
                           style={{ color: 'var(--primary)', fontSize: 12 }}>
                          🎧 Listen
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDateTime(c.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ padding: '5px 10px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page}</span>
            <button className="btn btn-ghost btn-sm" disabled={calls.length < 25} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      </main>
    </div>
  )
}
