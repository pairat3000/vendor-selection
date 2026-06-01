import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ScoringCriteria, FinalScore } from '@/features/scoring/types'

export interface ExportData {
  requestTitle: string
  exportDate: string
  criteria: ScoringCriteria[]
  vendors: { id: string; name: string }[]
  finalScores: FinalScore[]
  // Only active+submitted scorers: scorerId → vendorId → criteriaId → score
  scorerScores: Record<string, Record<string, Record<string, number>>>
  scorerNames: Record<string, string>
}

function vendorName(data: ExportData, vendorId: string): string {
  return data.vendors.find((v) => v.id === vendorId)?.name ?? vendorId
}

function avgScore(data: ExportData, vendorId: string, criteriaId: string): number {
  const scorerIds = Object.keys(data.scorerScores)
  if (scorerIds.length === 0) return 0
  const total = scorerIds.reduce((sum, sid) => {
    const vendorMap = data.scorerScores[sid] ?? {}
    const criteriaMap = vendorMap[vendorId] ?? {}
    return sum + (criteriaMap[criteriaId] ?? 0)
  }, 0)
  return total / scorerIds.length
}

// ─── XLSX Export ───────────────────────────────────────────────────────────

export function exportXLSX(data: ExportData) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Summary — vendor name จาก data.vendors (ไม่ใช้ fs.vendor_name ที่ undefined)
  const sorted = data.finalScores.slice().sort((a, b) => b.final_score - a.final_score)
  const summaryRows: (string | number)[][] = [
    ['Vendor Selection Scoring Report'],
    [`Project: ${data.requestTitle}`],
    [`Export Date: ${data.exportDate}`],
    [`Scorers: ${String(Object.keys(data.scorerScores).length)} คน`],
    [],
    ['Rank', 'Vendor', 'Final Score (avg)', 'Scorers'],
    ...sorted.map((fs, i) => [
      i + 1,
      vendorName(data, fs.vendor_id),
      Number(fs.final_score.toFixed(2)),
      fs.scorer_count,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')

  // Sheet 2: Criteria Detail — avg score ต่อ criteria ต่อ vendor
  const criteriaRows: (string | number)[][] = [
    ['Criteria', 'Weight (%)', ...data.vendors.map((v) => v.name)],
    ...data.criteria.map((c) => [
      c.name,
      c.weight,
      ...data.vendors.map((v) => Number(avgScore(data, v.id, c.id).toFixed(2))),
    ]),
    // Weighted avg row
    ['Weighted Avg', 100, ...data.vendors.map((v) => {
      const ws = data.criteria.reduce((sum, c) => sum + (avgScore(data, v.id, c.id) * c.weight) / 100, 0)
      return Number(ws.toFixed(2))
    })],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(criteriaRows), 'Criteria Detail')

  // Sheet 3: Per-Scorer Breakdown — เฉพาะ scorers ที่มีข้อมูลจริง
  const scorerIds = Object.keys(data.scorerScores)
  const breakdownRows: (string | number)[][] = [
    ['Scorer', 'Vendor', ...data.criteria.map((c) => `${c.name} (${String(c.weight)}%)`), 'Weighted Score'],
  ]
  scorerIds.forEach((sid) => {
    data.vendors.forEach((v) => {
      const scores = (data.scorerScores[sid] ?? {})[v.id] ?? {}
      const ws = data.criteria.reduce((sum, c) => sum + ((scores[c.id] ?? 0) * c.weight) / 100, 0)
      breakdownRows.push([
        data.scorerNames[sid] ?? sid,
        v.name,
        ...data.criteria.map((c) => scores[c.id] ?? 0),
        Number(ws.toFixed(2)),
      ])
    })
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(breakdownRows), 'Per-Scorer Breakdown')

  const fileName = `${data.requestTitle.replace(/\s+/g, '-')}-scoring-report-${data.exportDate}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// ─── PDF Export ────────────────────────────────────────────────────────────

export function exportPDF(data: ExportData) {
  const doc = new jsPDF()
  const scorerCount = Object.keys(data.scorerScores).length

  // Header
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('Vendor Selection Scoring Report', 14, 20)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Project: ${data.requestTitle}`, 14, 30)
  doc.text(`Export Date: ${data.exportDate}    Scorers: ${String(scorerCount)} คน`, 14, 36)

  // Section 1: Scoring Summary
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Scoring Summary', 14, 48)

  const sorted = data.finalScores.slice().sort((a, b) => b.final_score - a.final_score)
  autoTable(doc, {
    startY: 52,
    head: [['Rank', 'Vendor', 'Final Score', 'Scorers']],
    body: sorted.map((fs, i) => [
      `${String(i + 1)}${i === 0 ? '  Winner' : ''}`,
      vendorName(data, fs.vendor_id),      // ← ใช้ vendorName() แทน fs.vendor_name
      fs.final_score.toFixed(2),
      String(fs.scorer_count),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 2: { halign: 'right' } },
  })

  // Section 2: Criteria & Average Scores
  const lastY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Criteria & Average Scores', 14, lastY)

  autoTable(doc, {
    startY: lastY + 4,
    head: [['Criteria', 'Weight', ...data.vendors.map((v) => v.name)]],
    body: [
      ...data.criteria.map((c) => [
        c.name,
        `${String(c.weight)}%`,
        ...data.vendors.map((v) => avgScore(data, v.id, c.id).toFixed(1)),
      ]),
      // Weighted total row
      ['Weighted Total', '100%', ...data.vendors.map((v) => {
        const ws = data.criteria.reduce((sum, c) => sum + (avgScore(data, v.id, c.id) * c.weight) / 100, 0)
        return ws.toFixed(2)
      })],
    ],
    theme: 'grid',
    headStyles: { fillColor: [55, 65, 81] },
    columnStyles: { 1: { halign: 'center' } },
  })

  const fileName = `${data.requestTitle.replace(/\s+/g, '-')}-scoring-report-${data.exportDate}.pdf`
  doc.save(fileName)
}
