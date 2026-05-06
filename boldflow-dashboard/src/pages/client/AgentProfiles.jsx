import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import {
  getAgentProfiles, createAgentProfile, updateAgentProfile,
  deleteAgentProfile, setDefaultProfile,
} from '../../lib/api'
import { Plus, Star, Trash2, Edit2 } from 'lucide-react'

export default function AgentProfiles() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['agent-profiles'], queryFn: getAgentProfiles,
  })

  const deleteMut = useMutation({
    mutationFn: deleteAgentProfile,
    onSuccess: () => qc.invalidateQueries(['agent-profiles']),
  })
  const defaultMut = useMutation({
    mutationFn: setDefaultProfile,
    onSuccess: () => qc.invalidateQueries(['agent-profiles']),
  })

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Agent Profiles</h1>
            <p className="page-subtitle">Configure voice, model, and prompt per agent persona</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={15} /> New Profile
          </button>
        </div>

        {isLoading ? (
          <div className="page-loader"><div className="spinner" /></div>
        ) : profiles.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🤖</p>
            <h2>No agent profiles</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>Create a profile to customise voice and personality per campaign.</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
              <Plus size={15} /> Create Profile
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {profiles.map((p) => (
              <div key={p.id} className="card" style={{ position: 'relative' }}>
                {p.is_default ? (
                  <span className="badge badge-green" style={{ position: 'absolute', top: 14, right: 14 }}>
                    <Star size={10} /> Default
                  </span>
                ) : null}
                <h3 style={{ marginBottom: 8 }}>{p.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>🔊 Voice: {p.voice}</span>
                  <span>🤖 Model: {p.model}</span>
                </div>
                {p.system_prompt && (
                  <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8, lineHeight: 1.5 }}>
                    {p.system_prompt.slice(0, 80)}…
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  {!p.is_default && (
                    <button className="btn btn-ghost btn-sm" onClick={() => defaultMut.mutate(p.id)}>
                      <Star size={12} /> Set Default
                    </button>
                  )}
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(p); setShowModal(true) }}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Delete profile?') && deleteMut.mutate(p.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <ProfileModal
            initial={editing}
            onClose={() => setShowModal(false)}
            onSaved={() => { qc.invalidateQueries(['agent-profiles']); setShowModal(false) }}
          />
        )}
      </main>
    </div>
  )
}

function ProfileModal({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    voice: initial?.voice || 'anushka',
    model: initial?.model || 'gpt-4o-mini',
    system_prompt: initial?.system_prompt || '',
    is_default: initial?.is_default ? true : false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setLoading(true); setError('')
    try {
      if (initial) {
        await updateAgentProfile(initial.id, { ...form, is_default: form.is_default })
      } else {
        await createAgentProfile(form)
      }
      onSaved()
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
          <h2>{initial ? 'Edit' : 'New'} Agent Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="label">Profile Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Arjun — Real Estate" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Voice</label>
              <select className="select" value={form.voice} onChange={(e) => setForm({...form, voice: e.target.value})}>
                {['anushka','meera','arjun','kavya','shreya','manisha'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Model</label>
              <select className="select" value={form.model} onChange={(e) => setForm({...form, model: e.target.value})}>
                <option value="gpt-4o-mini">gpt-4o-mini (fast)</option>
                <option value="gpt-4o">gpt-4o (best)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">System Prompt</label>
            <textarea className="textarea" value={form.system_prompt} onChange={(e) => setForm({...form, system_prompt: e.target.value})} placeholder="You are Arjun, a friendly real estate assistant…" style={{ minHeight: 120 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({...form, is_default: e.target.checked})} />
            Set as default profile
          </label>
          {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={handleSave} disabled={loading || !form.name}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
