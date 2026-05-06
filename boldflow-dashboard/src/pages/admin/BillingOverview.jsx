import Sidebar from '../../components/layout/Sidebar'

export default function BillingOverview() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>Billing Overview</h1>
            <p className="page-subtitle">Revenue and usage across all clients</p>
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>💰</p>
          <h2>Coming in Week 4</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            Billing dashboard with per-client usage, overage charges, and invoice generation.
          </p>
        </div>
      </main>
    </div>
  )
}
