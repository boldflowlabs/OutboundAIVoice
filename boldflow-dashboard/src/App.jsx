import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ClientGuard } from './components/layout/AuthGuard'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/client/Dashboard'
import Campaigns from './pages/client/Campaigns'
import CampaignDetail from './pages/client/CampaignDetail'
import Leads from './pages/client/Leads'
import CallHistory from './pages/client/CallHistory'
import AgentProfiles from './pages/client/AgentProfiles'
import Settings from './pages/client/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Protected client routes */}
        <Route path="/dashboard" element={<ClientGuard><Dashboard /></ClientGuard>} />
        <Route path="/campaigns" element={<ClientGuard><Campaigns /></ClientGuard>} />
        <Route path="/campaigns/:id" element={<ClientGuard><CampaignDetail /></ClientGuard>} />
        <Route path="/leads" element={<ClientGuard><Leads /></ClientGuard>} />
        <Route path="/calls" element={<ClientGuard><CallHistory /></ClientGuard>} />
        <Route path="/agents" element={<ClientGuard><AgentProfiles /></ClientGuard>} />
        <Route path="/settings" element={<ClientGuard><Settings /></ClientGuard>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
