import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, MapPin } from 'lucide-react'
import type { Project } from '../../types'
import { PROJECT_STATUS_LABELS } from '../../types'
import { EvidencePhoto } from '../EvidencePhoto'
import { EmptyState, LoadingState } from './SharedStates'

export function DatabaseProjectGallery({ projects, loading, error }: {
  projects: Project[]; loading: boolean; error: string | null
}) {
  const photographedProjects = projects.filter(project => Boolean(project.photoUrl))

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[#f1f3d8] text-[#021217] border border-[#e2c09c] text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-3 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#11e852] animate-ping" />
          <span>VERIFIED RESIDENT EVIDENCE &amp; AUDITS</span>
        </div>
        <h2 className="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#021217]">
          Resident-Reported Field Evidence
        </h2>
        <p className="text-xs sm:text-sm text-[#536267] max-w-2xl mx-auto mt-2 leading-relaxed">
          On-site photographic audits uploaded by residents during issue reporting, verified against active municipal corridors and work permits in the database.
        </p>
      </div>

      {loading ? (
        <LoadingState message="Loading verified field evidence from database…" />
      ) : error ? (
        <p role="alert" className="text-center text-sm text-red-700">
          Field evidence could not be loaded from database.
        </p>
      ) : photographedProjects.length === 0 ? (
        <EmptyState
          title="No Resident Evidence Photos Yet"
          description="When residents lodge civic reports with on-site photos, verified evidence will appear here directly from the database."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {photographedProjects.map(project => (
            <div
              key={project.id}
              className="group relative bg-white/95 backdrop-blur-md border border-[#e2c09c] hover:border-[#11e852] rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.015] transition-all duration-300 flex flex-col justify-between"
            >
              {/* Photo Area */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#021217]">
                <EvidencePhoto
                  path={project.photoUrl!}
                  alt={`Resident evidence for ${project.title}`}
                  className="w-full h-full object-cover group-hover:scale-108 group-hover:brightness-105 transition-all duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#021217] via-[#021217]/30 to-black/25 pointer-events-none" />

                {/* Corridor & Project ID Badges */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2 z-10">
                  <span className="text-[10px] font-mono font-bold text-[#f1f3d8] bg-[#021217]/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                    {project.id.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-[#021217] bg-[#e2c09c] px-2.5 py-1 rounded-full shadow-xs uppercase tracking-wide">
                    {project.road}
                  </span>
                </div>

                {/* Verified Resident Evidence Tag */}
                <div className="absolute top-3.5 right-3.5 z-10">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#11e852] bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-full border border-[#11e852]/40">
                    <ShieldCheck className="w-3 h-3 text-[#11e852]" />
                    <span>Citizen Upload</span>
                  </span>
                </div>

                {/* Status & Title Overlay */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white pointer-events-none z-10">
                  <span className="text-[10px] font-bold text-[#11e852] uppercase tracking-wider block mb-1">
                    • {PROJECT_STATUS_LABELS[project.status]?.toUpperCase() || project.status.toUpperCase()} · {project.progressPercent}% COMPLETE
                  </span>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-base sm:text-lg leading-snug drop-shadow-md text-white line-clamp-2">
                    {project.title}
                  </h3>
                </div>
              </div>

              {/* Card Body with strict DB fields */}
              <div className="p-5 space-y-3 bg-white flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-[#536267] mb-2 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[#088c2e] shrink-0" />
                    <span>{project.road}, {project.locality} · {project.ward}</span>
                  </div>
                  <p className="text-xs text-[#536267] leading-relaxed line-clamp-3">
                    {project.purpose}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#e2c09c]/30 flex items-center justify-between text-xs font-semibold">
                  <div className="truncate pr-2">
                    <span className="text-[#021217]">Contractor: {project.contractor}</span>
                    {project.budgetLakhs != null && project.budgetLakhs > 0 && (
                      <span className="text-[#536267] font-normal block text-[11px]">
                        Budget: ₹{project.budgetLakhs} Lakhs
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#021217] hover:text-[#088c2e] hover:underline shrink-0 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>View Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#021217] group-hover:text-[#088c2e]" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
