import { Routes, Route } from 'react-router-dom'
import { PublicLayout } from './components/layout/PublicLayout'
import { OfficerLayout } from './components/layout/OfficerLayout'
import { HomePage } from './pages/HomePage'
import { ProjectExplorer } from './pages/ProjectExplorer'
import { ProjectDetail } from './pages/ProjectDetail'
import { ScorecardPage } from './pages/ScorecardPage'
import { ReportPage } from './pages/ReportPage'
import { ReportTrackPage } from './pages/ReportTrackPage'
import { RoadViewPage } from './pages/RoadViewPage'
import { OfficerDashboard } from './pages/officer/OfficerDashboard'
import { OfficerProjectNew } from './pages/officer/OfficerProjectNew'
import { OfficerProjectEdit } from './pages/officer/OfficerProjectEdit'
import { OfficerCoordination } from './pages/officer/OfficerCoordination'
import { OfficerReports } from './pages/officer/OfficerReports'
import { AdminPage } from './pages/AdminPage'
import { AssistantPage } from './pages/AssistantPage'
import { NotFoundPage } from './pages/NotFoundPage'

import { FreshCivicMockPage } from './pages/FreshCivicMockPage'

export default function App() {
  return (
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
      </Route>

      {/* Admin */}
      <Route element={<PublicLayout />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
