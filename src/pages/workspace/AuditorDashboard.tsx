import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EvidencePhoto } from '../../components/EvidencePhoto'
import { reviewTask } from '../../services/workflowService'
import { useWorkspace } from './useWorkspace'
import { SubmissionHistory } from './SubmissionHistory'
import { ResidentIssues } from './ResidentIssues'

export function AuditorDashboard() {
  const { user, data, loading, error, refresh, isCurrent } = useWorkspace()
  const [comments, setComments] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string>()
  const [actionError, setActionError] = useState('')
  const [message, setMessage] = useState('')
  async function review(id: string, decision: 'approved' | 'changes_requested') {
    if (!user || busy || !isCurrent()) return
    setActionError(''); setMessage('')
    const reason = (comments[id] || '').trim()
    if (decision === 'changes_requested' && !reason) { setActionError('Explain the corrections needed before requesting changes.'); return }
    setBusy(id)
    try {
      await reviewTask(user, id, decision, reason)
      if (isCurrent()) { setMessage(decision === 'approved' ? 'Submission approved.' : 'Corrections requested.'); setComments(current => ({ ...current, [id]: '' })); refresh() }
    } catch (cause) { if (isCurrent()) setActionError(cause instanceof Error ? cause.message : 'Review failed.') }
    finally { if (isCurrent()) setBusy(undefined) }
  }
  if (loading) return <p role="status">Loading review queue…</p>
  if (error) return <div role="alert"><p className="text-red-700">{error}</p><button onClick={refresh} className="border rounded-lg p-2 mt-3">Try again</button></div>
  if (!data || !user) return null
  const pending = data.submissions.filter(item => item.status === 'submitted' && item.submittedBy !== user.id)
  return <div className="space-y-6">
    <section><h2 className="text-2xl font-bold">Review queue</h2><p className="mt-1 text-slate-600">Review evidence for your assigned projects. Approved completion submissions mark the project completed.</p></section>
    {data.projects.length === 0 && <p className="bg-white border rounded-xl p-6">No projects assigned. Ask your administrator to assign projects for review.</p>}
    {data.projects.length > 0 && pending.length === 0 && <p className="bg-white border rounded-xl p-6">No submissions awaiting your review.</p>}
    {actionError && <p role="alert" className="text-red-700">{actionError}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    {pending.map(item => {
      const project = data.projects.find(value => value.id === item.projectId)
      return <article key={item.id} className="bg-white border rounded-xl p-5 space-y-4">
        <div><h3 className="text-lg font-semibold text-[#021217]">{item.title}</h3><Link to={`/projects/${item.projectId}`} className="text-[#021217] hover:text-[#11e852] font-semibold text-sm">{project?.title || item.projectId}</Link><p className="text-sm text-[#536267] mt-1">{item.submissionType} · Submitted {new Date(item.createdAt).toLocaleString()}</p></div>
        <p className="text-sm">Recorded project progress: {project?.progressPercent ?? 'Unknown'}% · Contractor reported: {item.progressPercent}%</p>
        <p className="whitespace-pre-wrap text-sm">{item.description}</p>
        {item.evidencePath ? <EvidencePhoto path={item.evidencePath} alt={`Evidence for ${item.title}`} className="max-h-80 rounded-lg object-contain" /> : <p className="text-sm text-slate-600">No evidence photo attached.</p>}
        <label className="block text-sm font-medium">Review comments (required for corrections)<textarea rows={3} maxLength={5000} disabled={!!busy} value={comments[item.id] || ''} onChange={event => setComments(current => ({ ...current, [item.id]: event.target.value }))} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label>
        <div className="flex flex-wrap gap-3"><button disabled={!!busy} onClick={() => void review(item.id, 'approved')} className="bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-60">{busy === item.id ? 'Saving review…' : item.submissionType === 'completion' ? 'Approve completion' : 'Approve submission'}</button><button disabled={!!busy} onClick={() => void review(item.id, 'changes_requested')} className="border border-amber-600 text-amber-900 rounded-lg px-4 py-2 disabled:opacity-60">Request corrections</button></div>
      </article>
    })}
    <ResidentIssues data={data} user={user} refresh={refresh} isCurrent={isCurrent} />
    <SubmissionHistory data={data} />
  </div>
}
