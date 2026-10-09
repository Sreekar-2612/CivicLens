import { Link } from 'react-router-dom'
import type { Project, Department } from '../../types'
import { PROJECT_CATEGORY_LABELS } from '../../types'
import { StatusBadge, ConfidenceBadge } from './StatusBadge'
import { MapPin, Calendar, Building2, TrendingUp } from 'lucide-react'
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
      className="card card-interactive block p-4 no-underline text-inherit"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--navy-900)] leading-tight line-clamp-2">
            {project.title}
          </h3>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="space-y-2 text-xs text-[var(--neutral-500)]">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{project.road}, {project.locality}</span>
        </div>
        {department && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: department.color }}
              />
              {department.shortName}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {format(new Date(project.startDate), 'MMM yyyy')} — {format(new Date(endDate), 'MMM yyyy')}
            {hasRevision && (
              <span className="text-amber-600 font-medium ml-1">(revised)</span>
            )}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {(project.status === 'in_progress' || project.status === 'delayed') && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--neutral-500)] flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Progress
            </span>
            <span className="font-semibold text-[var(--navy-700)]">{project.progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-[var(--neutral-200)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.status === 'delayed' ? 'bg-red-400' : 'bg-teal-500'
              }`}
              style={{ width: `${project.progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Category and confidence */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--neutral-100)]">
        <span className="text-xs text-[var(--neutral-400)]">
          {PROJECT_CATEGORY_LABELS[project.category]}
        </span>
        <ConfidenceBadge indicator={project.confidenceIndicator} />
      </div>
    </Link>
  )
}
