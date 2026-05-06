import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/** Blocks non-admin users from admin routes */
export function AdminGuard({ children }) {
  const { user, role } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}

/** Blocks unauthenticated users from client routes */
export function ClientGuard({ children }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return children
}
