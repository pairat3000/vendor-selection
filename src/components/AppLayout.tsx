import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/vendors', label: 'Vendor Registry', icon: '🏢' },
  { to: '/requests', label: 'Requests', icon: '📋' },
]

const APPROVER_NAV_ITEMS: NavItem[] = [
  { to: '/approvals', label: 'รออนุมัติ', icon: '✅' },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/approvals', label: 'รออนุมัติ', icon: '✅' },
  { to: '/admin/approvals', label: 'Approval Overview', icon: '📊' },
  { to: '/admin/users', label: 'ผู้ใช้งานระบบ', icon: '👥' },
  { to: '/admin/fields', label: 'Custom Fields', icon: '🔧' },
  { to: '/admin/approval-rules', label: 'Approval Rules', icon: '⚙️' },
]

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const navItems = [
    ...NAV_ITEMS,
    ...(profile?.role === 'approver' ? APPROVER_NAV_ITEMS : []),
    ...(profile?.role === 'admin' ? ADMIN_NAV_ITEMS : []),
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-bold text-blue-600">Vendor Selection</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {(profile?.full_name ?? '').charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
