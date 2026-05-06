import { useState, useEffect } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import { CSVImporter } from '../../components/campaigns/CSVImporter'
import { dispatchCall } from '../../lib/api'
import { PhoneCall, Trash2 } from 'lucide-react'

const LS_KEY = 'boldflow_leads'

function loadLeads() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function saveLeads(leads) {
  localStorage.setItem(LS_KEY, JSON.stringify(leads))
}

export default function Leads() {
  const [leads, setLeads] = useState(loadLeads)
  const [showImporter, setShowImporter] = useState(false)
  // callState: { [index]: 'loading' | 'ok' | 'err' | msg }
  const [callState, setCallState] = useState({})

  // Keep localStorage in sync whenever leads change
  useEffect(() => { saveLeads(leads) }, [leads])

  const handleImport = (data) => {
    const merged = [...leads, ...data]
    setLeads(merged)
    setShowImporter(false)
  }

  const handleClear = () => {
    if (window.confirm('Clear all leads?')) {
      setLeads([])
      setCallState({})
    }
  }

  const handleRemoveLead = (i) => {
    const next = leads.filter((_, idx) => idx !== i)
    setLeads(next)
    setCallState((prev) => {
      const c = { ...prev }
      delete c[i]
      return c
    })
  }

  const handleCall = async (lead, i) => {
    setCallState((s) => ({ ...s, [i]: 'loading' }))
    try {
      await dispatchCall({
        phone: lead.phone,
        lead_name: lead.lead_name,
        business_name: lead.business_name,
        service_type: lead.service_type,
      })
      setCallState((s) => ({ ...s, [i]: 'ok' }))
      setTimeout(() => setCallState((s) => { const c = { ...s }; delete c[i]; return c }), 4000)
    } catch (err) {
      setCallState((s) => ({ ...s, [i]: err.message || 'Failed' }))
      setTimeout(() => setCallState((s) => { const c = { ...s }; delete c[i]; return c }), 5000)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Leads</h1>
            <p className="page-subtitle">Import and call your leads</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {leads.length > 0 && (
              <button className="btn btn-ghost" onClick={handleClear}>
                <Trash2 size={14} /> Clear All
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowImporter(!showImporter)}>
              {showImporter ? 'Close' : '📂 Import CSV'}
            </button>
          </div>
        </div>

        {showImporter && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 16 }}>Import Leads</h2>
            <CSVImporter
              onImport={handleImport}
              onCancel={() => setShowImporter(false)}
            />
          </div>
        )}

        {leads.length > 0 ? (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2>Leads ({leads.length})</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Business</th>
                  <th>Service</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((r, i) => {
                  const cs = callState[i]
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td>{r.lead_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.phone}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.business_name || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.service_type || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={cs === 'loading'}
                            onClick={() => handleCall(r, i)}
                            title={`Call ${r.phone}`}
                          >
                            {cs === 'loading'
                              ? <span className="spinner" style={{ width: 12, height: 12 }} />
                              : <><PhoneCall size={12} /> Call</>}
                          </button>
                          {cs === 'ok' && (
                            <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Dispatched</span>
                          )}
                          {cs && cs !== 'loading' && cs !== 'ok' && (
                            <span style={{ fontSize: 12, color: 'var(--red)' }}>✗ {cs}</span>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveLead(i)}
                            title="Remove lead"
                            style={{ padding: '4px 6px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : !showImporter ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
            <h2>No leads yet</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
              Import a CSV file to see your leads here. They'll persist across page refreshes.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowImporter(true)}>
              📂 Import CSV
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
