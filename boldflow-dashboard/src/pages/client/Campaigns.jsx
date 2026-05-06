import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { CSVImporter } from '../../components/campaigns/CSVImporter'
import {
  getCampaigns, createCampaign, deleteCampaign,
  runCampaign, updateCampaignStatus, dispatchCall,
} from '../../lib/api'
import { formatDateTime } from '../../lib/utils'
import { Plus, Play, Pause, Trash2, ChevronRight, PhoneCall } from 'lucide-react'

export default function Campaigns() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'], queryFn: getCampaigns, refetchInterval: 15_000,
  })

  const deleteMut = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => qc.invalidateQueries(['campaigns']),
  })
  const runMut = useMutation({
    mutationFn: runCampaign,
    onSuccess: () => qc.invalidateQueries(['campaigns']),
  })
  const statusMut = useMutation({
    mutationFn: ({ id, status }) => updateCampaignStatus(id, status),
    onSuccess: () => qc.invalidateQueries(['campaigns']),
  })

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Campaigns</h1>
            <p className="page-subtitle">Create and manage outbound calling campaigns</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} /> New Campaign
          </button>
        </div>

        {/* ── Single Call ─────────────────────────────────────── */}
        <SingleCallCard />

        {isLoading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : campaigns.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📣</p>
            <h2>No campaigns yet</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
              Create your first campaign to start reaching leads.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
              <Plus size={15} /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Schedule</th>
                  <th>Dispatched</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/campaigns/${c.id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                        {c.name} <ChevronRight size={12} />
                      </Link>
                    </td>
                    <td><StatusBadge value={c.status} type="status" /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {c.schedule_type} @ {c.schedule_time}
                    </td>
                    <td>{c.total_dispatched ?? 0} / {JSON.parse(c.contacts_json || '[]').length}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDateTime(c.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" title="Run now" onClick={() => runMut.mutate(c.id)}>
                          <Play size={13} />
                        </button>
                        {c.status === 'active' ? (
                          <button className="btn btn-ghost btn-sm" title="Pause" onClick={() => statusMut.mutate({ id: c.id, status: 'paused' })}>
                            <Pause size={13} />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" title="Resume" onClick={() => statusMut.mutate({ id: c.id, status: 'active' })}>
                            <Play size={13} />
                          </button>
                        )}
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete"
                          onClick={() => window.confirm('Delete this campaign?') && deleteMut.mutate(c.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && <CreateCampaignModal onClose={() => setShowModal(false)} />}
      </main>
    </div>
  )
}

// ── Single Call Card ──────────────────────────────────────────────────────────
function SingleCallCard() {
  const [phone, setPhone] = useState('')
  const [name, setName]   = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'err'
  const [msg, setMsg]     = useState('')

  const fire = async () => {
    if (!phone.trim()) return
    setStatus('loading')
    setMsg('')
    try {
      await dispatchCall({ phone_number: phone.trim(), lead_name: name.trim() || 'there' })
      setStatus('ok')
      setMsg('📞 Call dispatched successfully!')
      setPhone('')
      setName('')
    } catch (err) {
      setStatus('err')
      setMsg(err.message || 'Failed to dispatch call')
    }
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <PhoneCall size={18} style={{ color: 'var(--primary)' }} />
        <h2 style={{ fontSize: '1rem', margin: 0 }}>Single Call</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Dial one number immediately</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ flex: '1 1 180px', minWidth: 160 }}
          placeholder="Phone number (e.g. +919876543210)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fire()}
        />
        <input
          className="input"
          style={{ flex: '1 1 140px', minWidth: 120 }}
          placeholder="Lead name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fire()}
        />
        <button
          className="btn btn-primary"
          disabled={!phone.trim() || status === 'loading'}
          onClick={fire}
          style={{ whiteSpace: 'nowrap' }}
        >
          {status === 'loading'
            ? <span className="spinner" style={{ width: 16, height: 16 }} />
            : <><PhoneCall size={14} /> Call Now</>}
        </button>
      </div>
      {msg && (
        <p style={{
          marginTop: 10, fontSize: 13,
          color: status === 'ok' ? 'var(--green)' : 'var(--red)',
        }}>{msg}</p>
      )}
    </div>
  )
}

function CreateCampaignModal({ onClose }) {
  const qc = useQueryClient()
  const [step, setStep] = useState(1) // 1: details, 2: CSV, 3: review
  const [form, setForm] = useState({
    name: '', schedule_type: 'once', schedule_time: '09:00', call_delay_seconds: 3,
    system_prompt: '',
  })
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await createCampaign({ ...form, contacts, call_delay_seconds: Number(form.call_delay_seconds) })
      qc.invalidateQueries(['campaigns'])
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>New Campaign — Step {step}/3</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="label">Campaign Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="May Week 1" />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="label">Schedule Type</label>
                <select className="select" value={form.schedule_type} onChange={(e) => setForm({...form, schedule_type: e.target.value})}>
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Time</label>
                <input className="input" type="time" value={form.schedule_time} onChange={(e) => setForm({...form, schedule_time: e.target.value})} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Delay Between Calls (seconds)</label>
              <input className="input" type="number" min={1} value={form.call_delay_seconds} onChange={(e) => setForm({...form, call_delay_seconds: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="label">Custom System Prompt (optional)</label>
              <textarea className="textarea" value={form.system_prompt} onChange={(e) => setForm({...form, system_prompt: e.target.value})} placeholder="Leave blank to use the default prompt from Settings…" />
            </div>
            <button className="btn btn-primary" disabled={!form.name} onClick={() => setStep(2)}>
              Next: Import Leads →
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <CSVImporter
              onImport={(data) => { setContacts(data); setStep(3) }}
              onCancel={() => setStep(1)}
            />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card-elevated">
              <p><strong>{form.name}</strong></p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                {form.schedule_type} @ {form.schedule_time} · {form.call_delay_seconds}s delay · {contacts.length} leads
              </p>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleCreate} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : `🚀 Launch Campaign (${contacts.length} leads)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
