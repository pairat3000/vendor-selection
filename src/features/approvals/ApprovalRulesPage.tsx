import { useEffect, useState } from 'react'
import { useApprovalStore } from '@/stores/approvalStore'

const fmt = (n: number | null) =>
  n == null ? '∞' : new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)

export default function ApprovalRulesPage() {
  const { rules, fetchRules, saveRule, deleteRule } = useApprovalStore()
  const [showForm, setShowForm] = useState(false)
  const [minBudget, setMinBudget] = useState('')
  const [maxBudget, setMaxBudget] = useState('')
  const [role, setRole] = useState('approver')
  const [level, setLevel] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { void fetchRules() }, [fetchRules])

  const handleSave = async () => {
    if (!minBudget || !role || !level) { setError('กรุณากรอกข้อมูลให้ครบ'); return }
    setSaving(true); setError(null)
    const { error: err } = await saveRule({
      min_budget: parseFloat(minBudget),
      max_budget: maxBudget ? parseFloat(maxBudget) : null,
      approver_role: role,
      level: parseInt(level),
    })
    setSaving(false)
    if (err) { setError(err); return }
    setMinBudget(''); setMaxBudget(''); setRole('approver'); setLevel('1')
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Rules</h1>
          <p className="mt-1 text-sm text-gray-500">กำหนด threshold การอนุมัติตามมูลค่างบประมาณ</p>
        </div>
        <button onClick={() => { setShowForm(true) }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + เพิ่ม Rule
        </button>
      </div>

      {/* Default info */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Default rules:</strong> &lt;500K = 1 ชั้น · 500K–1M = 2 ชั้น · &gt;1M = 3 ชั้น
        <br />Rules นี้มีผลกับ request ใหม่ที่สร้างหลังบันทึก — ไม่ย้อนหลัง
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="mb-4 font-semibold text-gray-900">เพิ่ม Approval Rule</h3>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Min Budget (บาท)</label>
              <input type="number" value={minBudget} onChange={(e) => { setMinBudget(e.target.value) }}
                className="input w-full text-sm" placeholder="0" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Max Budget (ว่าง = ไม่จำกัด)</label>
              <input type="number" value={maxBudget} onChange={(e) => { setMaxBudget(e.target.value) }}
                className="input w-full text-sm" placeholder="ไม่จำกัด" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Approver Role</label>
              <input value={role} onChange={(e) => { setRole(e.target.value) }}
                className="input w-full text-sm" placeholder="approver" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Level</label>
              <input type="number" min="1" value={level} onChange={(e) => { setLevel(e.target.value) }}
                className="input w-full text-sm" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">ยกเลิก</button>
            <button onClick={() => void handleSave()} disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'บันทึก...' : 'บันทึก Rule'}
            </button>
          </div>
        </div>
      )}

      {/* Rules table */}
      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          ยังไม่มี rules — กด "+ เพิ่ม Rule"
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Level</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Min Budget</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Max Budget</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Approver Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                      L{r.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">฿{fmt(r.min_budget)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.max_budget != null ? `฿${fmt(r.max_budget)}` : '∞'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{r.approver_role}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void deleteRule(r.id)}
                      className="text-sm text-red-500 hover:underline">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
