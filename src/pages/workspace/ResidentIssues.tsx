import { useState } from 'react'
import type { FormEvent } from 'react'
import { EvidencePhoto } from '../../components/EvidencePhoto'
import { ProjectMap } from '../../components/map/ProjectMap'
import { assignContractor } from '../../services/workflowService'
import type { WorkflowActor, WorkspaceData } from '../../services/workflowService'

export function ResidentIssues({ data, user, refresh, isCurrent }: { data: WorkspaceData; user: WorkflowActor; refresh: () => void; isCurrent: () => boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const reports = data.reports || []
  const projects = data.projects.filter(p => !['completed', 'cancelled', 'pending_audit'].includes(p.status))
  async function dispatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !isCurrent()) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setMessage('')
    try {
      await assignContractor(user, String(form.get('project')), String(form.get('contractor')), String(form.get('report') || '') || undefined)
      if (isCurrent()) { setMessage('Contractor assigned. Linked issues are visible in their workspace.'); refresh() }
    } catch (cause) { if (isCurrent()) setError(cause instanceof Error ? cause.message : 'Assignment failed') }
    finally { if (isCurrent()) setBusy(false) }
  }
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">Resident issues</h2>
    <p className="text-sm text-slate-600">Issues linked to your assigned projects. Orange map markers show resident reports.</p>
    <div className="h-80 rounded-xl border overflow-hidden"><ProjectMap projects={data.projects} departments={[]} reports={reports} height="100%" /></div>
    {user.role === 'auditor' && <form onSubmit={dispatch} className="bg-white border rounded-xl p-5 space-y-3">
      <h3 className="font-semibold">Assign a contractor</h3>
      <p className="text-sm text-slate-600">Assign an existing project, or link an unassigned issue to a project you review. Existing contractor assignments are retained.</p>
      <fieldset disabled={busy || !projects.length || !data.contractors?.length} className="grid sm:grid-cols-3 gap-3">
        <label className="text-sm">Project<select name="project" required className="block border rounded-lg p-2 w-full"><option value="">Choose project</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label className="text-sm">Contractor<select name="contractor" required className="block border rounded-lg p-2 w-full"><option value="">Choose contractor</option>{data.contractors?.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select></label>
        <label className="text-sm">Resident issue (optional)<select name="report" className="block border rounded-lg p-2 w-full"><option value="">Project assignment only</option>{reports.filter(r => r.status !== 'resolved').map(r => <option key={r.id} value={r.id}>{r.referenceId} — {r.title}</option>)}</select></label>
        <button className="bg-[#021217] text-white rounded-lg p-2 disabled:opacity-50">{busy ? 'Assigning…' : 'Assign contractor'}</button>
      </fieldset>
      {!data.contractors?.length && <p className="text-sm">No verified contractors in your department. An administrator must register their role and department first.</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    </form>}
    {!reports.length && <p className="bg-white border rounded-xl p-5">No resident issues for your assigned projects.</p>}
    <div className="grid sm:grid-cols-2 gap-4">{reports.map(report => <article key={report.id} className="bg-white border rounded-xl p-5 space-y-2">
      <p className="text-xs text-slate-600">{report.referenceId} · {report.status.replaceAll('_', ' ')}</p>
      <h3 className="font-semibold">{report.title}</h3><p className="text-sm whitespace-pre-wrap">{report.description}</p>
      <p className="text-sm">{report.locationDescription}</p>
      <p className="text-sm">{data.projects.find(p => p.id === report.projectId)?.title || 'Unlinked issue — choose an assigned project before dispatching'}</p>
      {report.photoUrl && <EvidencePhoto path={report.photoUrl} alt={`Issue evidence ${report.referenceId}`} className="max-h-48 rounded-lg object-contain" />}
    </article>)}</div>
  </section>
}
