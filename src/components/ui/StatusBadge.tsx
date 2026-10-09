import type { ProjectStatus, ConfidenceIndicator, AlertSeverity, ReportStatus } from '../../types'
import {
  PROJECT_STATUS_LABELS, CONFIDENCE_LABELS,
  ALERT_SEVERITY_LABELS, REPORT_STATUS_LABELS
} from '../../types'
import {
  Clock, CheckCircle2, AlertTriangle, XCircle,
  CircleDot, Pause, TrendingUp
} from 'lucide-react'

const statusIcons: Record<ProjectStatus, React.ElementType> = {
  planned: Clock,
  in_progress: TrendingUp,
  delayed: AlertTriangle,
  completed: CheckCircle2,
  cancelled: XCircle,
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const Icon = statusIcons[status]
  return (
    <span className={`status-badge status-${status}`}>
      <Icon className="w-3 h-3" />
      {PROJECT_STATUS_LABELS[status]}
    </span>
  )
}

export function ConfidenceBadge({ indicator }: { indicator: ConfidenceIndicator }) {
  return (
    <span className={`status-badge confidence-${indicator}`}>
      <CircleDot className="w-3 h-3" />
      {CONFIDENCE_LABELS[indicator]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  return (
    <span className={`status-badge severity-${severity}`}>
      {ALERT_SEVERITY_LABELS[severity]}
    </span>
  )
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const colors: Record<ReportStatus, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    acknowledged: 'bg-teal-100 text-teal-800',
    in_review: 'bg-amber-100 text-amber-800',
    escalated: 'bg-red-100 text-red-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`status-badge ${colors[status]}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}
