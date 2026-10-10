import { EvidencePhoto } from '../../components/EvidencePhoto'
import type { WorkspaceData } from '../../services/workflowService'

export function SubmissionHistory({ data, projectId }: { data: WorkspaceData; projectId?: string }) {
  const submissions = data.submissions.filter(item => !projectId || item.projectId === projectId)
  return <section className="space-y-3"><h2 className="text-lg font-bold">Submission and review history</h2>
    {submissions.length === 0 && <p className="text-sm text-slate-600">No submissions yet.</p>}
    {submissions.map(item => <article key={item.id} className="bg-white border rounded-xl p-4 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="text-xs font-semibold rounded-full bg-slate-100 px-3 py-1">{item.status === 'submitted' ? 'Awaiting review' : item.status === 'approved' ? 'Approved' : 'Changes requested'}</span></div>
      <p className="text-sm text-slate-600">{data.projects.find(project => project.id === item.projectId)?.title} · {item.submissionType} · Reported {item.progressPercent}% · {new Date(item.createdAt).toLocaleString()}</p>
      <p className="text-sm whitespace-pre-wrap">{item.description}</p>
      {item.evidencePath && <EvidencePhoto path={item.evidencePath} alt={`Evidence for ${item.title}`} className="max-h-64 rounded-lg object-contain" />}
      {data.reviews.filter(review => review.submissionId === item.id).map(review => <div key={review.id} className="bg-slate-50 border-l-4 border-[#11e852] p-3 text-sm">
        <p className="font-semibold">{review.decision === 'approved' ? 'Approved' : 'Changes requested'} · {new Date(review.createdAt).toLocaleString()}</p>
        <p className="whitespace-pre-wrap">{review.comments || 'No additional comments.'}</p>
      </div>)}
    </article>)}
  </section>
}
