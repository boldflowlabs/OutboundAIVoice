import { useState } from 'react'
import Papa from 'papaparse'

/**
 * CSVImporter — file picker with smart header detection + preview table.
 *
 * Handles Google Sheets exports where:
 *  - There are metadata / empty rows before the actual header row
 *  - Columns are named "Phone Number", "Lead Name", "Business Name", "Service Type"
 *  - The first column may be empty (leading comma)
 *
 * Accepted column aliases (case-insensitive):
 *   phone    → phone, phone number, mobile, mobile number, contact
 *   name     → lead_name, lead name, name, contact name
 *   business → business_name, business name, company
 *   service  → service_type, service type, service
 *
 * Props:
 *   onImport(contacts[]) — called with validated contacts array
 *   onCancel()           — go back
 */
export function CSVImporter({ onImport, onCancel }) {
  const [preview, setPreview] = useState(null)
  const [errors, setErrors] = useState([])
  const [fileName, setFileName] = useState('')

  /** Normalise a header string for alias matching */
  const norm = (s) => (s || '').toLowerCase().replace(/[\s_-]+/g, '')

  /** Map a normalised header to a field key */
  const fieldOf = (h) => {
    if (['phone', 'phonenumber', 'mobile', 'mobilenumber', 'contact'].includes(h)) return 'phone'
    if (['leadname', 'lead', 'name', 'contactname', 'leadname'].includes(h)) return 'lead_name'
    if (['businessname', 'business', 'company'].includes(h)) return 'business_name'
    if (['servicetype', 'service'].includes(h)) return 'service_type'
    return null
  }

  const handleFile = (file) => {
    if (!file) return
    setFileName(file.name)

    Papa.parse(file, {
      header: false,        // parse as raw rows so we can find the header ourselves
      skipEmptyLines: false,
      complete: ({ data: rawRows }) => {
        // ── 1. Find the header row ──────────────────────────────────────
        // The header row is the first row that contains at least one recognised field alias
        let headerRowIdx = -1
        let colMap = {}   // field → column index

        for (let r = 0; r < rawRows.length; r++) {
          const row = rawRows[r]
          const candidate = {}
          row.forEach((cell, c) => {
            const key = fieldOf(norm(cell))
            if (key && !(key in candidate)) candidate[key] = c
          })
          if ('phone' in candidate) {
            headerRowIdx = r
            colMap = candidate
            break
          }
        }

        if (headerRowIdx === -1) {
          setErrors([
            'Could not find a phone column in your CSV.',
            'Make sure a column is labelled: phone, Phone Number, mobile, etc.',
          ])
          setPreview([])
          return
        }

        // ── 2. Parse data rows ──────────────────────────────────────────
        const dataRows = rawRows.slice(headerRowIdx + 1)
        const valid = []
        const errs  = []

        dataRows.forEach((row, i) => {
          const phone = (row[colMap.phone] || '').trim()
          const name  = colMap.lead_name     != null ? (row[colMap.lead_name]     || '').trim() : ''
          const biz   = colMap.business_name != null ? (row[colMap.business_name] || '').trim() : ''
          const svc   = colMap.service_type  != null ? (row[colMap.service_type]  || '').trim() : ''

          // Skip completely blank rows
          if (!phone && !name && !biz && !svc) return

          if (!phone) {
            errs.push(`Row ${headerRowIdx + i + 2}: Missing phone number`)
          } else {
            valid.push({
              phone,
              lead_name:     name || 'there',
              business_name: biz  || undefined,
              service_type:  svc  || undefined,
            })
          }
        })

        setPreview(valid)
        setErrors(errs)
      },
      error: (err) => setErrors([`Parse error: ${err.message}`]),
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onClick={() => document.getElementById('csv-file-input').click()}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          <p style={{ fontWeight: 600 }}>Drop CSV file here or click to browse</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Required column: <code>phone</code> or <code>Phone Number</code>
            <br />Optional: <code>Lead Name</code>, <code>Business Name</code>, <code>Service Type</code>
            <br /><span style={{ opacity: 0.6 }}>Google Sheets exports are supported — metadata rows are skipped automatically.</span>
          </p>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,.08)',
          border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginTop: 12,
        }}>
          <p style={{ fontWeight: 600, color: 'var(--red)', marginBottom: 4, fontSize: 13 }}>
            {errors.length} issue{errors.length > 1 ? 's' : ''} found:
          </p>
          {errors.slice(0, 8).map((e, i) => (
            <p key={i} style={{ fontSize: 12, color: 'var(--red)' }}>• {e}</p>
          ))}
          {errors.length > 8 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>…and {errors.length - 8} more</p>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>
              ✅ {preview.length} valid lead{preview.length !== 1 ? 's' : ''}
            </span>
            {errors.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ({errors.length} row{errors.length > 1 ? 's' : ''} skipped)
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {fileName}
            </span>
          </div>

          <table className="table" style={{ fontSize: 12, marginBottom: 12 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                {preview[0]?.business_name && <th>Business</th>}
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 5).map((r, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td>{r.lead_name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.phone}</td>
                  {preview[0]?.business_name && <td>{r.business_name || '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 5 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              …and {preview.length - 5} more rows
            </p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPreview(null); setErrors([]); setFileName('') }}>
              ← Change file
            </button>
            {onCancel && (
              <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
            )}
            <button
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => onImport(preview)}
            >
              Import {preview.length} Leads →
            </button>
          </div>
        </div>
      )}

      {/* No valid rows but no parse errors — show re-upload option */}
      {preview && preview.length === 0 && errors.length === 0 && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No leads found in file.</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => { setPreview(null); setErrors([]) }}>
            ← Try another file
          </button>
        </div>
      )}
    </div>
  )
}
