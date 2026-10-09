import { Link } from 'react-router-dom'
import type { Project, Department } from '../../types'
import { PROJECT_CATEGORY_LABELS } from '../../types'
import { StatusBadge, ConfidenceBadge } from './StatusBadge'
import { MapPin, Calendar, Building2, TrendingUp, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'

interface ProjectCardProps {
  project: Project
  department?: Department
}

export function ProjectCard({ project, department }: ProjectCardProps) {
  const endDate = project.revisedEndDate || project.originalEndDate
  const hasRevision = !!project.revisedEndDate

  return (
    <Link
      to={`/projects/${project.id}`}
      className="bg-white border border-[#E3EAF2] hover:border-[#2F6BFF]/40 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all block no-underline text-inherit group"
    >
      <div className="flex items-start justify-between gap-2.5 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono font-bold text-[#64748B]">
              {project.id.toUpperCase()}
            </span>
            {project.budgetLakhs && (
              <span className="text-[10px] font-bold text-[#2F6BFF] bg-[#EAF1FF] px-1.5 py-0.2 rounded">
                ₹{project.budgetLakhs}L
              </span>
            )}
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#1E293B] group-hover:text-[#2F6BFF] transition-colors leading-snug line-clamp-2">
            {project.title}
          </h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="space-y-1.5 text-xs text-[#64748B]">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#2F6BFF] shrink-0" />
          <span className="truncate font-medium text-[#1E293B]">{project.road}, {project.locality}</span>
        </div>
        {department && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
            <span className="truncate">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: department.color }}
              />
              {department.shortName} • {project.contractor}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
          <span>
            {format(new Date(project.startDate), 'MMM yyyy')} — {format(new Date(endDate), 'MMM yyyy')}
            {hasRevision && (
              <span className="text-[#D13B41] font-semibold ml-1">(revised)</span>
            )}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {(project.status === 'in_progress' || project.status === 'delayed') && (
        <div className="mt-2.5 pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#64748B] flex items-center gap-1 font-medium text-[11px]">
              <TrendingUp className="w-3 h-3 text-[#12B5A6]" /> Progress
            </span>
            <span className="font-bold text-[#1E293B] text-[11px]">{project.progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.status === 'delayed' ? 'bg-[#FF5A5F]' : 'bg-[#12B5A6]'
              }`}
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Category and confidence badge */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#F1F5F9]">
        <span className="text-[11px] font-medium text-[#64748B]">
          {PROJECT_CATEGORY_LABELS[project.category]}
        </span>
        <ConfidenceBadge indicator={project.confidenceIndicator} />
      </div>
    </Link>
  )
}
