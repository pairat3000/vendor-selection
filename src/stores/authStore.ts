import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

interface Profile {
  id: string
  full_name: string
  role: UserRole
  is_active: boolean
}

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  // actions
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  initialize: async () => {
    try {
      // Get existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        // ถ้าถูกปิดใช้งานระหว่างที่ session ยังไม่หมดอายุ → เด้งออก
        if (profile && !profile.is_active) {
          await supabase.auth.signOut()
          set({ session: null, user: null, profile: null, loading: false })
          return
        }
        set({ session, user: session.user, profile, loading: false })
      } else {
        set({ loading: false })
      }
    } catch {
      // Network error or Supabase unavailable — still clear loading so UI can show login
      set({ loading: false })
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchProfile(session.user.id).then((profile) => {
          if (profile && !profile.is_active) {
            void supabase.auth.signOut()
            set({ session: null, user: null, profile: null })
            return
          }
          set({ session, user: session.user, profile })
        })
      } else {
        set({ session: null, user: null, profile: null })
      }
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // ผู้ใช้ถูกปิดใช้งาน (banned) → ข้อความภาษาไทยที่ชัดเจน
      const msg = error.message.toLowerCase()
      if (msg.includes('banned') || msg.includes('blocked')) {
        return { error: 'บัญชีนี้ถูกปิดการใช้งาน — กรุณาติดต่อผู้ดูแลระบบ' }
      }
      if (msg.includes('invalid login credentials')) {
        return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
      }
      return { error: error.message }
    }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', userId)
    .single()
  if (error ?? !data) return null
  return data
}
