import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'
import { Plus } from 'lucide-react'
import { formatDate } from '../../lib/utils'

async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, plan, minutes_included, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export default function ClientList() {
  const { data: clients = [], isLoading } = useQuery({ queryKey: ['admin-clients'], queryFn: getClients })

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>All Clients</h1>
            <p className="page-subtitle">Manage all BoldFlow client accounts</p>
          </div>
          <Link to="/admin/clients/new" className="btn btn-primary">
            <Plus size={15} /> New Client
          </Link>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Business</th><th>Plan</th><th>Minutes</th><th>Since</th></tr>
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
