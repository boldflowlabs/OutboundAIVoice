import Sidebar from '../../components/layout/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Shield } from 'lucide-react'
import { formatDate } from '../../lib/utils'

async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, plan, minutes_included, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export default function AdminDashboard() {
  const { data: clients = [], isLoading } = useQuery({ queryKey: ['admin-clients'], queryFn: getClients })

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1><Shield size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} />Admin Dashboard</h1>
            <p className="page-subtitle">Overview of all BoldFlow clients</p>
          </div>
        </div>

        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Total Clients</div>
            <div className="stat-value">{clients.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Plans</div>
            <div className="stat-value">{clients.filter(c => c.plan !== 'inactive').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Minutes Allocated</div>
            <div className="stat-value">{clients.reduce((s, c) => s + (c.minutes_included || 0), 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Clients</h2>
          {isLoading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Plan</th><th>Minutes Included</th><th>Since</th></tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><span className="badge badge-blue">{c.plan}</span></td>
                    <td>{(c.minutes_included || 0).toLocaleString()}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(c.created_at)}</td>
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
