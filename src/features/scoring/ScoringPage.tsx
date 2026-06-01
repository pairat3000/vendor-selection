import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useScoringStore } from '@/stores/scoringStore'
import { useRequestStore } from '@/stores/requestStore'
import { useVendorStore } from '@/stores/vendorStore'
import { useAuthStore } from '@/stores/authStore'
import CriteriaEditor from './CriteriaEditor'
import ScoringMatrix from './ScoringMatrix'
import ScorerManager from './ScorerManager'
import ResultsPanel from './ResultsPanel'
import ExportButton from './ExportButton'
import type { RequestVendor } from '@/features/requests/types'

type Tab = 'score' | 'scorers' | 'results'

export default function ScoringPage() {
  const { id: requestId } = useParams<{ id: string }>()
  const { criteria, scorers, isUnlocked, finalScores, loading,
    fetchCriteria, fetchScorers, fetchMyScores, checkUnlocked, fetchFinalScores,
    submitScores } = useScoringStore()
  const { requests, fetchRequests, fetchRequestVendors } = useRequestStore()
  const { vendors, fetchVendors } = useVendorStore()
  const { user, profile } = useAuthStore()

  const [tab, setTab] = useState<Tab>('score')
  const [requestVendors, setRequestVendors] = useState<(RequestVendor & { vendor_name: string })[]>([])
  const [submitting, setSubmitting] = useState(false)

  const request = requests.find((r) => r.id === requestId)
  const myScorer = scorers.find((s) => s.user_id === user?.id && s.is_active)
  const isOwner = request?.owner_id === user?.id
  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    if (!requestId) return
    if (requests.length === 0) void fetchRequests()
    void fetchVendors()
    void fetchCriteria(requestId)
    void fetchScorers(requestId)
    void checkUnlocked(requestId)
  }, [requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!requestId) return
    void fetchRequestVendors(requestId).then((rvs) => {
      const mapped = rvs.map((rv) => ({
        ...rv,
        vendor_name: vendors.find((v) => v.id === rv.vendor_id)?.name ?? rv.vendor_id,
      }))
      setRequestVendors(mapped)
    })
  }, [requestId, vendors.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (myScorer) void fetchMyScores(myScorer.id)
  }, [myScorer?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isUnlocked && requestId) void fetchFinalScores(requestId)
  }, [isUnlocked, requestId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!myScorer) return
    setSubmitting(true)
    await submitScores(myScorer.id)
    await checkUnlocked(requestId ?? '')
    setSubmitting(false)
  }

  const vendorNames = Object.fromEntries(requestVendors.map((rv) => [rv.vendor_id, rv.vendor_name]))

  if (!requestId) return null

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="mb-2 text-sm text-gray-500">
        <Link to="/requests" className="hover:underline">Requests</Link>
        <span className="mx-2">/</span>
        <span>{request?.title ?? requestId}</span>
        <span className="mx-2">/</span>
        <span>Scoring</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scoring — {request?.title}</h1>
        {myScorer && (
          <p className="mt-1 text-sm text-gray-500">
            คุณ{myScorer.submitted_at ? 'ส่งคะแนนแล้ว' : 'ยังไม่ได้ส่งคะแนน'}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-gray-200">
        {([
          { key: 'score', label: '📝 กรอกคะแนน' },
          { key: 'scorers', label: '👥 Scorers', show: isOwner || isAdmin },
          { key: 'results', label: '📊 ผลรวม' },
        ] as { key: Tab; label: string; show?: boolean }[])
          .filter((t) => t.show !== false)
          .map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key) }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
      </div>

      {/* Tab: Score */}
      {tab === 'score' && (
        <div className="space-y-6">
          {(isOwner || isAdmin) && (
            <CriteriaEditor requestId={requestId} criteria={criteria} />
          )}
          {myScorer ? (
            <ScoringMatrix
              scorerId={myScorer.id}
              requestId={requestId}
              criteria={criteria}
              vendors={requestVendors}
              submitted={!!myScorer.submitted_at}
              onSubmit={() => void handleSubmit()}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
              คุณไม่ได้เป็น scorer ของ request นี้
            </div>
          )}
          {submitting && <p className="text-sm text-blue-600">กำลังส่งคะแนน...</p>}
        </div>
      )}

      {/* Tab: Scorers */}
      {tab === 'scorers' && (isOwner || isAdmin) && (
        <ScorerManager
          requestId={requestId}
          scorers={scorers}
          requestVendorIds={requestVendors.map((rv) => rv.vendor_id)}
          vendorNames={vendorNames}
        />
      )}

      {/* Tab: Results */}
      {tab === 'results' && (
        <div className="space-y-4">
          {isUnlocked && (
            <div className="flex justify-end">
              <ExportButton
                requestId={requestId}
                requestTitle={request?.title ?? requestId}
                criteria={criteria}
                vendors={requestVendors.map((rv) => ({ id: rv.vendor_id, name: rv.vendor_name }))}
                finalScores={finalScores}
                isUnlocked={isUnlocked}
              />
            </div>
          )}
          <ResultsPanel
            isUnlocked={isUnlocked}
            finalScores={finalScores}
            scorers={scorers}
            loading={loading}
            vendorNames={vendorNames}
          />
        </div>
      )}
    </div>
  )
}
