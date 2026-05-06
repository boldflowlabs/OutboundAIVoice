import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/layout/Sidebar'
import { supabase } from '../../lib/supabase'

export default function CreateClient() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', plan: 'basic', minutes_included: 1000 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      // 1. Create Supabase Auth user
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })
      if (authErr) throw authErr

      // 2. Insert into clients table
      const { error: dbErr } = await supabase.from('clients').insert({
        auth_user_id: authData.user.id,
        name: form.name,
        plan: form.plan,
        minutes_included: Number(form.minutes_included),
      })
      if (dbErr) throw dbErr

      navigate('/admin/clients')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Create Client</h1>
            <p className="page-subtitle">Provision a new BoldFlow client account</p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 480 }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="label">Business Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Kerala Homes Realty" required />
            </div>
            <div className="form-group">
              <label className="label">Login Email *</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="label">Temporary Password *</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="label">Plan</label>
                <select className="select" value={form.plan} onChange={(e) => setForm({...form, plan: e.target.value})}>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="form-group">
                <label className="label">Minutes Included</label>
                <input className="input" type="number" min={100} value={form.minutes_included} onChange={(e) => setForm({...form, minutes_included: e.target.value})} />
              </div>
            </div>
            {error && <p style={{ color: 'var(--red)', fontSize: 13 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Create Client →'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
