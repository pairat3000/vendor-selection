import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FinalScore } from '@/features/scoring/types'
import type { ScoringCategory, ScoringCriteria } from '@/features/scoring/types'
import type { RequestVendor } from '@/features/requests/types'

interface Props {
  requestId: string
  finalScores: FinalScore[]
  requestVendors: RequestVendor[]
  vendorName: (vendorId: string) => string
}

interface AvgRow { vendor_id: string; criteria_id: string; avg_score: number }

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)

export default function CompareDashboard({ requestId, finalScores, requestVendors, vendorName }: Props) {
  const [categories, setCategories] = useState<ScoringCategory[]>([])
  const [criteria, setCriteria] = useState<ScoringCriteria[]>([])
  const [avgScores, setAvgScores] = useState<AvgRow[]>([])
  const [loading, setLoading] = useState(true)

  const cancelledRef = useRef(false)
  useEffect(() => {
    cancelledRef.current = false
    void (async () => {
      setLoading(true)
      const [catRes, critRes, avgRes] = await Promise.all([
        supabase.from('scoring_categories').select('*').eq('request_id', requestId).order('sort_order'),
        supabase.from('scoring_criteria').select('*').eq('request_id', requestId).order('sort_order'),
        supabase.rpc('get_criteria_avg_scores', { p_request_id: requestId }),
      ])
      if (cancelledRef.current) return
      setCategories(catRes.data ?? [])
      setCriteria(critRes.data ?? [])
      setAvgScores(avgRes.data ?? [])
      setLoading(false)
    })()
    return () => { cancelledRef.current = true }
  }, [requestId])

  // vendor ids เรียงตามคะแนนรวม (สูง→ต่ำ)
  const vendorIds = finalScores.slice().sort((a, b) => b.final_score - a.final_score).map((f) => f.vendor_id)
  const finalById = Object.fromEntries(finalScores.map((f) => [f.vendor_id, f.final_score]))
  const priceById = Object.fromEntries(requestVendors.map((rv) => [rv.vendor_id, rv.quotation_price]))

  const avgFor = (vendorId: string, criteriaId: string): number | null => {
    const row = avgScores.find((a) => a.vendor_id === vendorId && a.criteria_id === criteriaId)
    return row ? row.avg_score : null
  }

  // คะแนนถ่วงน้ำหนักรวมของหมวด (เฉลี่ย × weight /100)
  const categoryWeighted = (vendorId: string, items: ScoringCriteria[]): number =>
    items.reduce((sum, c) => sum + ((avgFor(vendorId, c.id) ?? 0) * c.weight) / 100, 0)

  // ความคุ้มค่า = คะแนนรวม ต่อ ราคา 1 ล้านบาท
  const valueIndex = (vendorId: string): number | null => {
    const price = priceById[vendorId]
    const score = finalById[vendorId] ?? 0
    if (!price || price <= 0) return null
    return (score / price) * 1_000_000
  }

  // หา vendor ที่ดีที่สุดในแต่ละมิติ (สำหรับไฮไลต์)
  const bestBy = (vals: Record<string, number | null>, mode: 'max' | 'min'): string | null => {
    const entries = Object.entries(vals).filter(([, v]) => v != null) as [string, number][]
    if (entries.length === 0) return null
    return entries.reduce((best, cur) =>
      mode === 'max' ? (cur[1] > best[1] ? cur : best) : (cur[1] < best[1] ? cur : best),
    )[0]
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (vendorIds.length === 0) {
    return <p className="text-sm text-gray-400">ยังไม่มีผลคะแนนสำหรับเปรียบเทียบ</p>
  }

  const sortedCats = categories.slice().sort((a, b) => a.sort_order - b.sort_order)
  const uncategorized = criteria.filter((c) => !c.category_id)

  // best per dimension
  const bestScore = bestBy(Object.fromEntries(vendorIds.map((v) => [v, finalById[v] ?? null])), 'max')
  const bestPrice = bestBy(Object.fromEntries(vendorIds.map((v) => [v, priceById[v] ?? null])), 'min')
  const bestValue = bestBy(Object.fromEntries(vendorIds.map((v) => [v, valueIndex(v)])), 'max')

  const Cell = ({ children, best }: { children: React.ReactNode; best: boolean }) => (
    <td className={`px-4 py-2.5 text-right text-sm tabular-nums ${best ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'}`}>
      {children}
    </td>
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-left font-medium text-gray-600">เกณฑ์เปรียบเทียบ</th>
            {vendorIds.map((vid, i) => (
              <th key={vid} className="px-4 py-3 text-right font-semibold text-gray-800">
                <div className="flex items-center justify-end gap-1.5">
                  {i === 0 && <span>🏆</span>}
                  <span>{vendorName(vid)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* คะแนนรวม */}
          <tr className="bg-blue-50/40">
            <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">คะแนนรวม (เต็ม 100)</td>
            {vendorIds.map((vid) => (
              <Cell key={vid} best={vid === bestScore}>
                {(finalById[vid] ?? 0).toFixed(1)}
              </Cell>
            ))}
          </tr>

          {/* ราคา */}
          <tr>
            <td className="px-4 py-2.5 text-sm font-medium text-gray-700">ราคาเสนอ (บาท)</td>
            {vendorIds.map((vid) => {
              const p = priceById[vid]
              return (
                <Cell key={vid} best={vid === bestPrice}>
                  {p != null ? `฿${fmtMoney(p)}` : '—'}
                </Cell>
              )
            })}
          </tr>

          {/* ความคุ้มค่า */}
          <tr>
            <td className="px-4 py-2.5 text-sm font-medium text-gray-700">
              ความคุ้มค่า <span className="text-xs text-gray-400">(คะแนน/ล้านบาท)</span>
            </td>
            {vendorIds.map((vid) => {
              const v = valueIndex(vid)
              return (
                <Cell key={vid} best={vid === bestValue}>
                  {v != null ? v.toFixed(1) : '—'}
                </Cell>
              )
            })}
          </tr>

          {/* คะแนนรายหมวด */}
          {sortedCats.map((cat) => {
            const items = criteria.filter((c) => c.category_id === cat.id)
            if (items.length === 0) return null
            const catWeightTotal = items.reduce((s, c) => s + c.weight, 0)
            const vals = Object.fromEntries(vendorIds.map((v) => [v, categoryWeighted(v, items)]))
            const best = bestBy(vals, 'max')
            return (
              <tr key={cat.id}>
                <td className="px-4 py-2.5 text-sm text-gray-600">
                  {cat.name} <span className="text-xs text-gray-400">(เต็ม {catWeightTotal})</span>
                </td>
                {vendorIds.map((vid) => (
                  <Cell key={vid} best={vid === best}>
                    {categoryWeighted(vid, items).toFixed(1)}
                  </Cell>
                ))}
              </tr>
            )
          })}

          {/* หัวข้อที่ไม่มีหมวด */}
          {uncategorized.length > 0 && uncategorized.map((c) => {
            const vals = Object.fromEntries(vendorIds.map((v) => [v, avgFor(v, c.id)]))
            const best = bestBy(vals, 'max')
            return (
              <tr key={c.id}>
                <td className="px-4 py-2.5 text-sm text-gray-600">
                  {c.name} <span className="text-xs text-gray-400">({c.weight}%)</span>
                </td>
                {vendorIds.map((vid) => {
                  const a = avgFor(vid, c.id)
                  return (
                    <Cell key={vid} best={vid === best}>
                      {a != null ? a.toFixed(1) : '—'}
                    </Cell>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
        ช่องไฮไลต์เขียว = ดีที่สุดในแต่ละเกณฑ์ · คะแนนรายหมวดเป็นค่าถ่วงน้ำหนักแล้ว
      </p>
    </div>
  )
}
