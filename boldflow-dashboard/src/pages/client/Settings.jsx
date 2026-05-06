import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import { getSettings, saveSettings } from '../../lib/api'
import { Save } from 'lucide-react'

const SECTIONS = [
  {
    title: 'LiveKit',
    keys: ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
    descriptions: {
      LIVEKIT_URL: 'wss://your-project.livekit.cloud',
      LIVEKIT_API_KEY: 'API key from LiveKit Cloud',
      LIVEKIT_API_SECRET: 'API secret from LiveKit Cloud',
    },
  },
  {
    title: 'SIP / Vobiz',
    keys: ['VOBIZ_SIP_DOMAIN', 'VOBIZ_USERNAME', 'VOBIZ_PASSWORD', 'VOBIZ_OUTBOUND_NUMBER', 'OUTBOUND_TRUNK_ID'],
    descriptions: {
      VOBIZ_OUTBOUND_NUMBER: 'E.164 format: +918880001234',
      OUTBOUND_TRUNK_ID: 'Auto-filled after trunk setup',
    },
  },
  {
    title: 'AI / LLM',
    keys: ['OPENAI_API_KEY', 'OPENAI_MODEL', 'SARVAM_API_KEY', 'SARVAM_STT_MODEL', 'SARVAM_TTS_MODEL', 'SARVAM_TTS_SPEAKER'],
    descriptions: {
      OPENAI_MODEL: 'Default: gpt-4o-mini',
      SARVAM_TTS_SPEAKER: 'Default: anushka',
    },
  },
  {
    title: 'S3 Recording',
    keys: ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT_URL'],
    descriptions: { S3_REGION: 'Default: ap-northeast-1' },
  },
]

const SENSITIVE = ['LIVEKIT_API_SECRET', 'VOBIZ_PASSWORD', 'OPENAI_API_KEY', 'SARVAM_API_KEY', 'S3_SECRET_ACCESS_KEY']

export default function Settings() {
  const { data: current = {} } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [edits, setEdits] = useState({})
  const [saved, setSaved] = useState(false)

  const mut = useMutation({
    mutationFn: () => saveSettings(edits),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500) },
  })

  const merged = { ...current, ...edits }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Settings</h1>
            <p className="page-subtitle">API keys and configuration — saved to Supabase settings table</p>
          </div>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={Object.keys(edits).length === 0 || mut.isPending}>
            {mut.isPending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save</>}
            {saved && ' ✓'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SECTIONS.map((sec) => (
            <div key={sec.title} className="card">
              <h2 style={{ marginBottom: 16 }}>{sec.title}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {sec.keys.map((k) => (
                  <div key={k} className="form-group">
                    <label className="label">{k}</label>
                    {sec.descriptions?.[k] && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 3, display: 'block' }}>
                        {sec.descriptions[k]}
                      </span>
                    )}
                    <input
                      className="input"
                      type={SENSITIVE.includes(k) ? 'password' : 'text'}
                      value={edits[k] ?? (SENSITIVE.includes(k) && merged[k] ? '••••••••' : (merged[k] || ''))}
                      onChange={(e) => setEdits({ ...edits, [k]: e.target.value })}
                      placeholder={SENSITIVE.includes(k) ? '(encrypted)' : ''}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 16, textAlign: 'center' }}>
          ⚠️ VPS environment variables override DB settings. Changes here apply as fallback only.
        </p>
      </main>
    </div>
  )
}
