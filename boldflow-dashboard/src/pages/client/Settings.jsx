import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Sidebar from '../../components/layout/Sidebar'
import { getSettings, saveSettings, setupTrunk } from '../../lib/api'
import { Save, RefreshCw } from 'lucide-react'

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
    title: 'Telnyx Telephony',
    keys: ['TELNYX_API_KEY', 'TELNYX_CONNECTION_ID', 'TELNYX_OUTBOUND_VOICE_PROFILE_ID', 'OUTBOUND_TRUNK_ID'],
    descriptions: {
      TELNYX_API_KEY: 'Telnyx API key (v2)',
      TELNYX_CONNECTION_ID: 'Associated Credential/IP connection ID',
      TELNYX_OUTBOUND_VOICE_PROFILE_ID: 'OVP ID with whitelisted markets and spending limit',
      OUTBOUND_TRUNK_ID: 'LiveKit SIP trunk ID (default fallback)',
    },
  },
  {
    title: 'Google Gemini Live / AI',
    keys: ['GEMINI_API_KEY', 'GEMINI_VOICE', 'GEMINI_MODEL', 'OPENAI_API_KEY', 'OPENAI_MODEL'],
    descriptions: {
      GEMINI_API_KEY: 'Google Studio API Key (or GOOGLE_API_KEY)',
      GEMINI_VOICE: 'Voice name for RealtimeModel (Aoede, Puck, Charon, Kore, Fenrir, Leda, Orus, Zephyr)',
      GEMINI_MODEL: 'Default: gemini-2.0-flash-exp (or gemini-2.5-flash)',
      OPENAI_API_KEY: 'OpenAI API key (used for memory compression)',
      OPENAI_MODEL: 'Default: gpt-4o-mini',
    },
  },
  {
    title: 'Target Market Numbers & Trunks',
    keys: [
      'TELNYX_NUMBER_US', 'OUTBOUND_TRUNK_ID_US',
      'TELNYX_NUMBER_UK', 'OUTBOUND_TRUNK_ID_UK',
      'TELNYX_NUMBER_CA', 'OUTBOUND_TRUNK_ID_CA',
      'TELNYX_NUMBER_AU', 'OUTBOUND_TRUNK_ID_AU',
      'TELNYX_NUMBER_AE', 'OUTBOUND_TRUNK_ID_AE'
    ],
    descriptions: {
      TELNYX_NUMBER_US: 'US Caller ID (strict E.164)',
      TELNYX_NUMBER_UK: 'UK Caller ID (strict E.164)',
      TELNYX_NUMBER_CA: 'Canada Caller ID (strict E.164)',
      TELNYX_NUMBER_AU: 'Australia Caller ID (strict E.164)',
      TELNYX_NUMBER_AE: 'UAE/Dubai Caller ID (strict E.164)',
      OUTBOUND_TRUNK_ID_US: 'LiveKit US SIP Outbound Trunk ID',
      OUTBOUND_TRUNK_ID_UK: 'LiveKit UK SIP Outbound Trunk ID',
      OUTBOUND_TRUNK_ID_CA: 'LiveKit Canada SIP Outbound Trunk ID',
      OUTBOUND_TRUNK_ID_AU: 'LiveKit Australia SIP Outbound Trunk ID',
      OUTBOUND_TRUNK_ID_AE: 'LiveKit UAE SIP Outbound Trunk ID',
    },
  },
  {
    title: 'S3 Recording',
    keys: ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT_URL'],
    descriptions: { S3_REGION: 'Default: ap-northeast-1' },
  },
]

const SENSITIVE = ['LIVEKIT_API_SECRET', 'TELNYX_API_KEY', 'GEMINI_API_KEY', 'OPENAI_API_KEY', 'S3_SECRET_ACCESS_KEY']

export default function Settings() {
  const { data: current = {}, refetch } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [edits, setEdits] = useState({})
  const [saved, setSaved] = useState(false)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionMsg, setProvisionMsg] = useState('')

  const mut = useMutation({
    mutationFn: () => saveSettings(edits),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); refetch(); setEdits({}); },
  })

  const handleProvision = async () => {
    setProvisioning(true)
    setProvisionMsg('')
    try {
      const res = await setupTrunk()
      setProvisionMsg(`✅ Telephony provisioning successful! Main Trunk ID: ${res.trunk_id}`)
      refetch()
    } catch (err) {
      setProvisionMsg(`❌ Provisioning failed: ${err.message}`)
    } finally {
      setProvisioning(false)
    }
  }

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
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={handleProvision} disabled={provisioning} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              {provisioning ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <RefreshCw size={14} />}
              Provision Telnyx Trunks
            </button>
            <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={Object.keys(edits).length === 0 || mut.isPending}>
              {mut.isPending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <><Save size={14} /> Save</>}
              {saved && ' ✓'}
            </button>
          </div>
        </div>

        {provisionMsg && (
          <div style={{
            background: provisionMsg.startsWith('✅') ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${provisionMsg.startsWith('✅') ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.25)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 14,
            color: provisionMsg.startsWith('✅') ? 'var(--green)' : 'var(--red)',
          }}>
            {provisionMsg}
          </div>
        )}

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
