import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { getCampaign } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import { ArrowLeft } from 'lucide-react'

export default function CampaignDetail() {
  const { id } = useParams()
  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', id], queryFn: () => getCampaign(id),
  })

  const contacts = JSON.parse(campaign?.contacts_json || '[]')

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <Link to="/campaigns" style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, textDecoration: 'none' }}>
              <ArrowLeft size={13} /> Back to Campaigns
            </Link>
            <h1>{campaign?.name || '…'}</h1>
          </div>
          {campaign && <StatusBadge value={campaign.status} type="status" />}
        </div>

        {isLoading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="grid-3">
              <div className="card-elevated">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>SCHEDULE</div>
                <div style={{ fontWeight: 600 }}>{campaign.schedule_type} @ {campaign.schedule_time}</div>
              </div>
              <div className="card-elevated">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>RESULTS</div>
                <div style={{ fontWeight: 600 }}>
                  {campaign.total_dispatched ?? 0} dispatched · {campaign.total_failed ?? 0} failed
                </div>
              </div>
              <div className="card-elevated">
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>CREATED</div>
                <div style={{ fontWeight: 600 }}>{formatDateTime(campaign.created_at)}</div>
              </div>
            </div>

            <div className="card">
              <h2 style={{ marginBottom: 16 }}>Leads ({contacts.length})</h2>
              {contacts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No contacts in this campaign.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Phone</th><th>Business</th></tr>
                  </thead>
                  <tbody>
                    {contacts.map((c, i) => (
                      <tr key={i}>
                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                        <td>{c.lead_name || '—'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.phone}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{c.business_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {campaign.system_prompt && (
              <div className="card">
                <h2 style={{ marginBottom: 12 }}>System Prompt</h2>
                <pre style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {campaign.system_prompt}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
