import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import {
  LayoutDashboard, Megaphone, Users, Phone, UserCog,
  Settings, LogOut, ChevronRight,
} from 'lucide-react'
import './Sidebar.css'

const CLIENT_NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campaigns',  icon: Megaphone,        label: 'Campaigns' },
  { to: '/leads',      icon: Users,            label: 'Leads' },
  { to: '/calls',      icon: Phone,            label: 'Call History' },
  { to: '/agents',     icon: UserCog,          label: 'Agent Profiles' },
  { to: '/settings',   icon: Settings,         label: 'Settings' },
]


export default function Sidebar() {
  const { clientName, role, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navItems = CLIENT_NAV

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">B</div>
        <div>
          <div className="sidebar-brand-name">BoldFlow AI</div>
          <div className="sidebar-brand-sub">Voice Platform</div>
        </div>
      </div>

      {/* Client name */}
      <div className="sidebar-client">
        <div className="sidebar-client-avatar">
          {(clientName || 'U')[0].toUpperCase()}
        </div>
        <div className="sidebar-client-info">
          <div className="sidebar-client-name">{clientName || 'User'}</div>
          <div className="sidebar-client-role">Client</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <Icon size={16} />
            <span>{label}</span>
            <ChevronRight size={12} className="sidebar-chevron" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={15} />
        Sign out
      </button>
    </aside>
  )
}
