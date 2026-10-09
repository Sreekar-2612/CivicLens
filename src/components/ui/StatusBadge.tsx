import type { ProjectStatus, ConfidenceIndicator, AlertSeverity, ReportStatus } from '../../types'
import {
  PROJECT_STATUS_LABELS, CONFIDENCE_LABELS,
  ALERT_SEVERITY_LABELS, REPORT_STATUS_LABELS
} from '../../types'
import {
  Clock, CheckCircle2, AlertTriangle, XCircle,
  CircleDot, TrendingUp, ShieldAlert, Check
} from 'lucide-react'

export function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === 'in_progress') {
    return (
      <span className="badge ongoing">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]"></span>
        {PROJECT_STATUS_LABELS[status]}
      </span>
    )
  }
  if (status === 'delayed') {
    return (
      <span className="badge delayed">
        <AlertTriangle className="w-3 h-3 text-[#D13B41]" />
        {PROJECT_STATUS_LABELS[status]}
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="badge completed">
        <Check className="w-3 h-3 text-[#0E7A55]" />
        {PROJECT_STATUS_LABELS[status]}
      </span>
    )
  }
  if (status === 'planned') {
    return (
      <span className="badge planned">
        <Clock className="w-3 h-3 text-[#1B7FC4]" />
        {PROJECT_STATUS_LABELS[status]}
      </span>
    )
  }
  return (
    <span className="badge bg-[#F1F5F9] text-[#64748B]">
      <XCircle className="w-3 h-3" />
      {PROJECT_STATUS_LABELS[status] || status}
    </span>
  )
}

export function ConfidenceBadge({ indicator }: { indicator: ConfidenceIndicator }) {
  if (indicator === 'on_track') {
    return (
      <span className="badge bg-[#E3F7F5] text-[#12B5A6]">
        <CheckCircle2 className="w-3 h-3 text-[#12B5A6]" />
        {CONFIDENCE_LABELS[indicator]}
      </span>
    )
  }
  if (indicator === 'at_risk') {
    return (
      <span className="badge bg-[#FFF4DB] text-[#9A6200]">
        <AlertTriangle className="w-3 h-3 text-[#FFB020]" />
        {CONFIDENCE_LABELS[indicator]}
      </span>
    )
  }
  return (
    <span className="badge bg-[#FFE9EA] text-[#D13B41]">
      <AlertTriangle className="w-3 h-3 text-[#FF5A5F]" />
      {CONFIDENCE_LABELS[indicator]}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  if (severity === 'critical') {
    return (
      <span className="badge clash">
        <ShieldAlert className="w-3 h-3 text-[#C41F4F]" />
        {ALERT_SEVERITY_LABELS[severity]}
      </span>
    )
  }
  if (severity === 'high') {
    return (
      <span className="badge bg-[#FFE9EA] text-[#D13B41]">
        <AlertTriangle className="w-3 h-3 text-[#FF5A5F]" />
        {ALERT_SEVERITY_LABELS[severity]}
      </span>
    )
  }
  if (severity === 'medium') {
    return (
      <span className="badge bg-[#FFF4DB] text-[#9A6200]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]"></span>
        {ALERT_SEVERITY_LABELS[severity]}
      </span>
    )
  }
  return (
    <span className="badge bg-[#E6F4FE] text-[#1B7FC4]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#38A9F5]"></span>
      {ALERT_SEVERITY_LABELS[severity]}
    </span>
  )
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    submitted: 'bg-[#E6F4FE] text-[#1B7FC4]',
    acknowledged: 'bg-[#E3F7F5] text-[#12B5A6]',
    in_review: 'bg-[#FFF4DB] text-[#9A6200]',
    escalated: 'bg-[#FFE9EA] text-[#D13B41]',
    resolved: 'bg-[#E1F8EF] text-[#0E7A55]',
    dismissed: 'bg-[#F1F5F9] text-[#64748B]',
  }
  return (
    <span className={`badge ${styles[status]}`}>
      {REPORT_STATUS_LABELS[status]}
    </span>
  )
}
