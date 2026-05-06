import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,        // 'admin' | 'client'
      clientId: null,
      clientName: null,
      minutesIncluded: 1000,
      plan: 'basic',

      /** Sign in with email + password, then detect role from Supabase clients table */
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Check if this user is an admin (by email env var) or a client
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
        if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
          set({
            user: data.user,
            role: 'admin',
            clientId: null,
            clientName: 'BoldFlow Admin',
            minutesIncluded: Infinity,
          })
          return
        }

        // Look up in clients table
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .select('id, name, plan, minutes_included')
          .eq('auth_user_id', data.user.id)
          .single()

        if (clientErr || !client) {
          // Authenticated user but no client record — treat as admin fallback
          set({ user: data.user, role: 'admin', clientId: null, clientName: 'Admin' })
          return
        }

        set({
          user: data.user,
          role: 'client',
          clientId: client.id,
          clientName: client.name,
          minutesIncluded: client.minutes_included ?? 1000,
          plan: client.plan ?? 'basic',
        })
      },

      /** Restore session from Supabase on page reload */
      restoreSession: async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
          set({ user: null, role: null, clientId: null })
          return
        }
        const user = data.session.user
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
        if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) {
          set({ user, role: 'admin', clientId: null, clientName: 'BoldFlow Admin' })
          return
        }
        const { data: client } = await supabase
          .from('clients')
          .select('id, name, plan, minutes_included')
          .eq('auth_user_id', user.id)
          .single()
        if (client) {
          set({
            user, role: 'client', clientId: client.id,
            clientName: client.name, minutesIncluded: client.minutes_included ?? 1000,
          })
        } else {
          set({ user, role: 'admin', clientId: null, clientName: 'Admin' })
        }
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, role: null, clientId: null, clientName: null })
      },
    }),
    {
      name: 'boldflow-auth',
      partialize: (s) => ({ user: s.user, role: s.role, clientId: s.clientId, clientName: s.clientName }),
    }
  )
)
