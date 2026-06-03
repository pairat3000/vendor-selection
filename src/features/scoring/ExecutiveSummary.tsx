import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ScoringCategory, ScoringCriteria, FinalScore } from './types'
import type { RequestVendor } from '@/features/requests/types'

interface Props {
  requestId: string
  requestTitle: string
  budget: number
  categories: ScoringCategory[]
  criteria: ScoringCriteria[]
  finalScores: FinalScore[]
  requestVendors: (RequestVendor & { vendor_name: string })[]
  scorerCount: number
}

interface AvgRow { vendor_id: string; criteria_id: string; avg_score: number }

const fmtMoney = (n: number) => new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)

export default function ExecutiveSummary({
  requestId, requestTitle, budget, categories, criteria, finalScores, requestVendors, scorerCount,
}: Props) {
  const [avgScores, setAvgScores] = useState<AvgRow[]>([])
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    void (async () => {
      const { data } = await supabase.rpc('get_criteria_avg_scores', { p_request_id: requestId })
      if (!cancelledRef.current) setAvgScores(data ?? [])
    })()
    return () => { cancelledRef.current = true }
  }, [requestId])

  const vName = (id: string) => requestVendors.find((rv) => rv.vendor_id === id)?.vendor_name ?? id
  const priceById = Object.fromEntries(requestVendors.map((rv) => [rv.vendor_id, rv.quotation_price]))

  const ranked = finalScores.slice().sort((a, b) => b.final_score - a.final_score)
  if (ranked.length === 0) return null

  const winner = ranked[0]
  const runnerUp = ranked.length > 1 ? ranked[1] : null
  const margin = runnerUp ? winner.final_score - runnerUp.final_score : 0

  const avgFor = (vid: string, cid: string): number => {
    const r = avgScores.find((a) => a.vendor_id === vid && a.criteria_id === cid)
    return r ? r.avg_score : 0
  }
  const categoryWeighted = (vid: string, items: ScoringCriteria[]) =>
    items.reduce((s, c) => s + (avgFor(vid, c.id) * c.weight) / 100, 0)

  const valueIndex = (vid: string): number | null => {
    const price = priceById[vid]
    const score = ranked.find((r) => r.vendor_id === vid)?.final_score ?? 0
    if (!price || price <= 0) return null
    return (score / price) * 1_000_000
  }
  const hasPrices = requestVendors.some((rv) => rv.quotation_price != null)

  const sortedCats = categories.slice().sort((a, b) => a.sort_order - b.sort_order)
  const maxScore = Math.max(...ranked.map((r) => r.final_score), 1)

  // best per dimension
  const bestValueVid = (() => {
    const vals = ranked.map((r) => ({ vid: r.vendor_id, v: valueIndex(r.vendor_id) })).filter((x) => x.v != null)
    if (vals.length === 0) return null
    return vals.reduce((b, c) => ((c.v ?? 0) > (b.v ?? 0) ? c : b)).vid
  })()
  const bestPriceVid = (() => {
    const vals = requestVendors.filter((rv) => rv.quotation_price != null)
    if (vals.length === 0) return null
    return vals.reduce((b, c) => ((c.quotation_price ?? 0) < (b.quotation_price ?? 0) ? c : b)).vendor_id
  })()

  return (
    <div className="space-y-5">
      {/* ── Recommendation hero ───────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Vendor ที่แนะนำ</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold text-gray-900">
              🏆 {vName(winner.vendor_id)}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              อันดับ 1 จาก {ranked.length} ราย · ประเมินโดย {scorerCount} ผู้ให้คะแนน
              {runnerUp && <> · นำอันดับ 2 อยู่ <span className="font-semibold text-green-700">{margin.toFixed(1)} คะแนน</span></>}
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600">{winner.final_score.toFixed(1)}</div>
            <div className="text-sm text-gray-400">คะแนนรวม / 100</div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Vendors ที่ประเมิน', value: String(ranked.length), icon: '🏢' },
          { label: 'ผู้ให้คะแนน', value: String(scorerCount), icon: '👥' },
          { label: 'เกณฑ์การประเมิน', value: String(criteria.length), icon: '📋' },
          { label: 'งบประมาณ', value: `฿${fmtMoney(budget)}`, icon: '💰' },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-lg">{k.icon}</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Score comparison bar chart ─────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">เปรียบเทียบคะแนนรวม</h3>
        <div className="space-y-3">
          {ranked.map((r, i) => (
            <div key={r.vendor_id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-gray-800">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                    i === 0 ? 'bg-green-500' : i === 1 ? 'bg-gray-400' : 'bg-gray-300'
                  }`}>{i + 1}</span>
                  {vName(r.vendor_id)}
                </span>
                <span className="font-bold text-gray-900">{r.final_score.toFixed(1)}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-blue-400'}`}
                  style={{ width: `${String((r.final_score / maxScore) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category leaders ───────────────────────────────────── */}
      {sortedCats.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">หมวด (คะแนนถ่วงน้ำหนัก)</th>
                {ranked.map((r) => (
                  <th key={r.vendor_id} className="px-4 py-3 text-right font-semibold text-gray-800">{vName(r.vendor_id)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedCats.map((cat) => {
                const items = criteria.filter((c) => c.category_id === cat.id)
                if (items.length === 0) return null
                const vals = ranked.map((r) => ({ vid: r.vendor_id, v: categoryWeighted(r.vendor_id, items) }))
                const best = vals.reduce((b, c) => (c.v > b.v ? c : b)).vid
                const catWeight = items.reduce((s, c) => s + c.weight, 0)
                return (
                  <tr key={cat.id}>
                    <td className="px-4 py-2.5 text-gray-600">{cat.name} <span className="text-xs text-gray-400">(เต็ม {catWeight})</span></td>
                    {ranked.map((r) => {
                      const v = categoryWeighted(r.vendor_id, items)
                      return (
                        <td key={r.vendor_id} className={`px-4 py-2.5 text-right tabular-nums ${
                          r.vendor_id === best ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'
                        }`}>{v.toFixed(1)}</td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Price & value ──────────────────────────────────────── */}
      {hasPrices && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-600">มิติด้านราคา</th>
                {ranked.map((r) => (
                  <th key={r.vendor_id} className="px-4 py-3 text-right font-semibold text-gray-800">{vName(r.vendor_id)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-2.5 text-gray-600">ราคาเสนอ (บาท)</td>
                {ranked.map((r) => {
                  const p = priceById[r.vendor_id]
                  return (
                    <td key={r.vendor_id} className={`px-4 py-2.5 text-right tabular-nums ${
                      r.vendor_id === bestPriceVid ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'
                    }`}>{p != null ? `฿${fmtMoney(p)}` : '—'}</td>
                  )
                })}
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-gray-600">ความคุ้มค่า <span className="text-xs text-gray-400">(คะแนน/ล้านบาท)</span></td>
                {ranked.map((r) => {
                  const v = valueIndex(r.vendor_id)
                  return (
                    <td key={r.vendor_id} className={`px-4 py-2.5 text-right tabular-nums ${
                      r.vendor_id === bestValueVid ? 'bg-green-50 font-bold text-green-700' : 'text-gray-700'
                    }`}>{v != null ? v.toFixed(1) : '—'}</td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        💡 {requestTitle} · ช่องไฮไลต์เขียว = ดีที่สุดในมิตินั้น · คะแนนเป็นค่าเฉลี่ยถ่วงน้ำหนักจากผู้ให้คะแนนที่ส่งครบ
      </p>
    </div>
  )
}
