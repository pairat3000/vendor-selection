import { useEffect, useState } from 'react'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/database'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'it_user', label: 'IT User' },
  { value: 'scorer', label: 'Scorer' },
  { value: 'approver', label: 'Approver' },
]

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  it_user: 'bg-blue-100 text-blue-700',
  scorer: 'bg-amber-100 text-amber-700',
  approver: 'bg-green-100 text-green-700',
}

const ROLE_INFO: Record<UserRole, { label: string; dot: string; desc: string }> = {
  admin: {
    label: 'Admin',
    dot: 'bg-purple-500',
    desc: 'สิทธิ์สูงสุด — จัดการผู้ใช้, vendor, custom fields, ตั้ง approval rules, ดูภาพรวมทั้งหมด และอนุมัติได้ทุกชั้น',
  },
  it_user: {
    label: 'IT User',
    dot: 'bg-blue-500',
    desc: 'สร้าง Selection Request, เพิ่ม vendor, แนบ quotation, กำหนดเกณฑ์และ scorer, ส่งเข้าอนุมัติ (กรอกคะแนนได้ถ้าถูกตั้งเป็น scorer)',
  },
  scorer: {
    label: 'Scorer',
    dot: 'bg-amber-500',
    desc: 'กรอกคะแนน vendor แบบ blind ของตัวเอง — เห็นเฉพาะ request ที่ถูกมอบหมาย ไม่เห็นคะแนนคนอื่นจนกว่าทุกคนจะส่งครบ',
  },
  approver: {
    label: 'Approver',
    dot: 'bg-green-500',
    desc: 'อนุมัติ/ส่งกลับ request เฉพาะชั้นที่ถูก assign ใน Approval Rules — เห็นเฉพาะรายการที่ถึงคิวตัวเอง',
  },
}

export default function UsersPage() {
  const { users, loading, fetchUsers, createUser, updateRole, toggleActive, resetPassword, deleteUser } = useUserStore()
  const { user: currentUser } = useAuthStore()

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('it_user')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => { void fetchUsers() }, [fetchUsers])

  const flash = (msg: string) => {
    setNotice(msg)
    setTimeout(() => { setNotice(null) }, 3000)
  }

  const handleCreate = async () => {
    if (!email || !password || !fullName) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    if (password.length < 6) { setError('รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร'); return }
    setSaving(true); setError(null)
    const { error: err } = await createUser({ email, password, full_name: fullName, role })
    setSaving(false)
    if (err) { setError(err); return }
    setEmail(''); setPassword(''); setFullName(''); setRole('it_user'); setShowForm(false)
    await fetchUsers()
    flash('สร้างผู้ใช้สำเร็จ')
  }

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    const { error: err } = await updateRole(id, newRole)
    if (err) { flash('แก้ role ไม่สำเร็จ: ' + err); return }
    flash('อัปเดต role แล้ว')
  }

  const handleToggle = async (id: string, current: boolean) => {
    await toggleActive(id, !current)
    flash(current ? 'ปิดการใช้งานแล้ว' : 'เปิดการใช้งานแล้ว')
  }

  const handleReset = async (id: string, name: string) => {
    const pw = prompt(`ตั้งรหัสผ่านใหม่สำหรับ ${name} (อย่างน้อย 6 ตัว):`)
    if (!pw) return
    if (pw.length < 6) { flash('รหัสผ่านสั้นเกินไป'); return }
    const { error: err } = await resetPassword(id, pw)
    flash(err ? 'รีเซ็ตไม่สำเร็จ: ' + err : 'รีเซ็ตรหัสผ่านแล้ว')
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบผู้ใช้ "${name}" ถาวร? ข้อมูลที่ผูกไว้ (scores ฯลฯ) จะถูกลบตาม`)) return
    const { error: err } = await deleteUser(id)
    flash(err ? 'ลบไม่สำเร็จ: ' + err : 'ลบผู้ใช้แล้ว')
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ผู้ใช้งานระบบ</h1>
          <p className="mt-1 text-sm text-gray-500">{users.length} ผู้ใช้ · จัดการสิทธิ์และบัญชี</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(null) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + เพิ่มผู้ใช้
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {notice}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 font-semibold text-gray-900">เพิ่มผู้ใช้ใหม่</h3>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">ชื่อ-นามสกุล</label>
              <input value={fullName} onChange={(e) => { setFullName(e.target.value) }}
                className="input w-full text-sm" placeholder="ชื่อ นามสกุล" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">อีเมล</label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value) }}
                className="input w-full text-sm" placeholder="user@dohome.co.th" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">รหัสผ่านเริ่มต้น</label>
              <input type="text" value={password} onChange={(e) => { setPassword(e.target.value) }}
                className="input w-full text-sm" placeholder="อย่างน้อย 6 ตัวอักษร" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
              <select value={role} onChange={(e) => { setRole(e.target.value as UserRole) }}
                className="input w-full text-sm">
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              {/* คำอธิบาย role ที่กำลังเลือก */}
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ROLE_INFO[role].dot}`} />
                <p className="text-xs leading-relaxed text-gray-600">{ROLE_INFO[role].desc}</p>
              </div>
            </div>
          </div>

          {/* ตารางสรุปสิทธิ์ทุก role */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold text-gray-500">สิทธิ์แต่ละ Role</p>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <div key={r.value} className="flex items-start gap-2">
                  <span className={`mt-1 inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[r.value]}`}>
                    {ROLE_INFO[r.value].label}
                  </span>
                  <p className="text-xs leading-relaxed text-gray-600">{ROLE_INFO[r.value].desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
            <button onClick={() => void handleCreate()} disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'กำลังสร้าง...' : 'สร้างผู้ใช้'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ชื่อ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">อีเมล</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">สถานะ</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.full_name || '—'}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(คุณ)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => void handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[u.role]} disabled:cursor-not-allowed`}
                      >
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-xs">
                        <button onClick={() => void handleReset(u.id, u.full_name)}
                          className="text-blue-600 hover:underline">รีเซ็ตรหัส</button>
                        {!isSelf && (
                          <>
                            <button onClick={() => void handleToggle(u.id, u.is_active)}
                              className="text-amber-600 hover:underline">
                              {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                            </button>
                            <button onClick={() => void handleDelete(u.id, u.full_name)}
                              className="text-red-500 hover:underline">ลบ</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
