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
      className="bg-white/95 backdrop-blur-xs border border-[#e2c09c]/60 hover:border-[#11e852] rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 hover:scale-[1.015] transition-all duration-300 block no-underline text-inherit group cursor-pointer"
    >
      {/* Project Photo Banner with Hover Zoom Effect */}
      {project.photoUrl && (
        <div className="relative h-40 w-full overflow-hidden bg-[#021217]/5">
          <img
            src={project.photoUrl}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-105 transition-all duration-500 ease-out"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#021217]/70 via-transparent to-black/20" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <span className="text-[10px] font-mono font-bold text-[#f1f3d8] bg-[#021217]/80 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20">
              {project.id.toUpperCase()}
            </span>
            {project.budgetLakhs && (
              <span className="text-[10px] font-bold text-[#021217] bg-[#e2c09c] px-2 py-0.5 rounded-full shadow-xs">
                ₹{project.budgetLakhs}L
              </span>
            )}
          </div>
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge status={project.status} />
          </div>
          <div className="absolute bottom-2.5 left-2.5 right-2.5">
            <span className="text-[10px] font-semibold text-[#f1f3d8]/90 tracking-wide uppercase bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded">
              {PROJECT_CATEGORY_LABELS[project.category] || project.category.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Title without photo if photoUrl wasn't available */}
        {!project.photoUrl && (
          <div className="flex items-start justify-between gap-2.5 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-mono font-bold text-[#64748B]">
                  {project.id.toUpperCase()}
                </span>
                {project.budgetLakhs && (
                  <span className="text-[10px] font-bold text-[#021217] bg-[#e2c09c]/30 border border-[#e2c09c]/50 px-1.5 py-0.2 rounded">
                    ₹{project.budgetLakhs}L
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={project.status} />
          </div>
        )}

        <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#021217] group-hover:text-[#088c2e] transition-colors leading-snug line-clamp-2">
          {project.title}
        </h3>

        <div className="space-y-1.5 text-xs text-[#536267]">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#088c2e] shrink-0" />
            <span className="truncate font-medium text-[#021217]">{project.road}, {project.locality}</span>
          </div>
          {department && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#536267] shrink-0" />
              <span className="truncate">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ backgroundColor: department.color }}
                />
                <span className="font-semibold text-[#021217]">{department.shortName}</span> • {project.contractor}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[#536267] shrink-0" />
            <span>
              {format(new Date(project.startDate), 'MMM yyyy')} — {format(new Date(endDate), 'MMM yyyy')}
              {hasRevision && (
                <span className="text-[#ff0000] font-bold ml-1">(revised)</span>
              )}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {(project.status === 'in_progress' || project.status === 'delayed') && (
          <div className="pt-2 border-t border-[#e2c09c]/30">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#536267] flex items-center gap-1 font-medium text-[11px]">
                <TrendingUp className="w-3 h-3 text-[#11e852]" /> Progress
              </span>
              <span className="font-extrabold text-[#021217] text-[11px]">{project.progressPercent}%</span>
            </div>
            <div className="h-1.5 bg-[#f1f3d8] rounded-full overflow-hidden border border-[#e2c09c]/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  project.status === 'delayed' ? 'bg-[#ff0000]' : 'bg-[#11e852]'
                }`}
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e2c09c]/30 text-[11px]">
          <span className="font-medium text-[#536267]">
            {project.ward}
          </span>
          <ConfidenceBadge indicator={project.confidenceIndicator} />
        </div>
      </div>
    </Link>
  )
}
