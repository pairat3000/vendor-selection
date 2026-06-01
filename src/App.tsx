import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import VendorsPage from '@/features/vendors/VendorsPage'
import VendorNewPage from '@/features/vendors/VendorNewPage'
import VendorDetailPage from '@/features/vendors/VendorDetailPage'
import VendorEditPage from '@/features/vendors/VendorEditPage'
import RequestsPage from '@/features/requests/RequestsPage'
import RequestNewPage from '@/features/requests/RequestNewPage'
import RequestDetailPage from '@/features/requests/RequestDetailPage'
import ScoringPage from '@/features/scoring/ScoringPage'
import ApprovalRulesPage from '@/features/approvals/ApprovalRulesPage'
import FieldManagerPage from '@/features/vendors/FieldManagerPage'

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <BrowserRouter basename="/vendor-selection">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/vendors/new" element={<VendorNewPage />} />
            <Route path="/vendors/:id" element={<VendorDetailPage />} />
            <Route path="/vendors/:id/edit" element={<VendorEditPage />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/new" element={<RequestNewPage />} />
            <Route path="/requests/:id" element={<RequestDetailPage />} />
            <Route path="/requests/:id/scoring" element={<ScoringPage />} />

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/approval-rules" element={<ApprovalRulesPage />} />
              <Route path="/admin/fields" element={<FieldManagerPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
