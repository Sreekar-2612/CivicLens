import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { GlobalMapBackground } from './components/layout/GlobalMapBackground'
const PublicLayout = lazy(() => import('./components/layout/PublicLayout').then(module => ({ default: module.PublicLayout })))
const OfficerLayout = lazy(() => import('./components/layout/OfficerLayout').then(module => ({ default: module.OfficerLayout })))
const WorkspaceLayout = lazy(() => import('./components/layout/WorkspaceLayout').then(module => ({ default: module.WorkspaceLayout })))
const ContractorDashboard = lazy(() => import('./pages/workspace/ContractorDashboard').then(module => ({ default: module.ContractorDashboard })))
const AuditorDashboard = lazy(() => import('./pages/workspace/AuditorDashboard').then(module => ({ default: module.AuditorDashboard })))
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })))
const ProjectExplorer = lazy(() => import('./pages/ProjectExplorer').then(module => ({ default: module.ProjectExplorer })))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(module => ({ default: module.ProjectDetail })))
const ScorecardPage = lazy(() => import('./pages/ScorecardPage').then(module => ({ default: module.ScorecardPage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then(module => ({ default: module.ReportPage })))
const ReportTrackPage = lazy(() => import('./pages/ReportTrackPage').then(module => ({ default: module.ReportTrackPage })))
const RoadViewPage = lazy(() => import('./pages/RoadViewPage').then(module => ({ default: module.RoadViewPage })))
const OfficerDashboard = lazy(() => import('./pages/officer/OfficerDashboard').then(module => ({ default: module.OfficerDashboard })))
const OfficerProjectNew = lazy(() => import('./pages/officer/OfficerProjectNew').then(module => ({ default: module.OfficerProjectNew })))
const OfficerProjectEdit = lazy(() => import('./pages/officer/OfficerProjectEdit').then(module => ({ default: module.OfficerProjectEdit })))
const OfficerCoordination = lazy(() => import('./pages/officer/OfficerCoordination').then(module => ({ default: module.OfficerCoordination })))
const OfficerReports = lazy(() => import('./pages/officer/OfficerReports').then(module => ({ default: module.OfficerReports })))
const OfficerNotifications = lazy(() => import('./pages/officer/OfficerNotifications').then(module => ({ default: module.OfficerNotifications })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })))
const AssistantPage = lazy(() => import('./pages/AssistantPage').then(module => ({ default: module.AssistantPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })))
const FreshCivicMockPage = lazy(() => import('./pages/FreshCivicMockPage').then(module => ({ default: module.FreshCivicMockPage })))

export default function App() {
  return (
    <>
      <GlobalMapBackground />
      <Suspense fallback={<div role="status" className="p-6 text-sm text-slate-600">Loading page...</div>}>
      <Routes>
        {/* Fresh Civic Design System Prototype Mock */}
        <Route path="/mock-preview" element={<FreshCivicMockPage />} />

        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectExplorer />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/roads/:id" element={<RoadViewPage />} />
          <Route path="/scorecard" element={<ScorecardPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/reports/track" element={<ReportTrackPage />} />
          <Route path="/reports/:id" element={<ReportTrackPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Route>

        {/* Officer / Department routes */}
        <Route element={<OfficerLayout />}>
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/projects/new" element={<OfficerProjectNew />} />
          <Route path="/officer/projects/:id/edit" element={<OfficerProjectEdit />} />
          <Route path="/officer/coordination" element={<OfficerCoordination />} />
          <Route path="/officer/reports" element={<OfficerReports />} />
          <Route path="/officer/notifications" element={<OfficerNotifications />} />
        </Route>

        {/* Admin */}
        <Route element={<WorkspaceLayout role="contractor" />}>
          <Route path="/contractor" element={<ContractorDashboard />} />
        </Route>
        <Route element={<WorkspaceLayout role="auditor" />}>
          <Route path="/auditor" element={<AuditorDashboard />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/assign" element={<AdminPage />} />
          <Route path="/admin/roles" element={<AdminPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </>
  )
}
