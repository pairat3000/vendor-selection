import { useAuthStore } from '@/stores/authStore'

export default function DashboardPage() {
  const { profile } = useAuthStore()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">
        ยินดีต้อนรับ, {profile?.full_name || 'User'} ({profile?.role})
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Requests ทั้งหมด', value: '—', icon: '📋' },
          { label: 'รอ Scoring', value: '—', icon: '📝' },
          { label: 'รออนุมัติ', value: '—', icon: '⏳' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="text-2xl">{stat.icon}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
