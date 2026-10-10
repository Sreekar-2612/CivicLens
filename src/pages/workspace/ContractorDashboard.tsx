import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitTask } from '../../services/workflowService'
import { uploadEvidenceFile } from '../../services/storageService'
import { PROJECT_STATUS_LABELS } from '../../types'
import { useWorkspace } from './useWorkspace'
import { SubmissionHistory } from './SubmissionHistory'

const inputClass = 'block w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 bg-white'
export function ContractorDashboard() {
  const { user, data, loading, error, refresh, isCurrent } = useWorkspace()
  const [projectId, setProjectId] = useState('')
  const [submissionType, setSubmissionType] = useState<'progress' | 'milestone' | 'completion'>('progress')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [formKey, setFormKey] = useState(0)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || busy || !data || !isCurrent()) return
    const form = new FormData(event.currentTarget)
    const availableProjects = data.projects.filter(project => !['completed', 'cancelled'].includes(project.status))
    const selected = availableProjects.find(project => project.id === projectId)?.id || availableProjects[0]?.id || ''
    const file = form.get('evidence') as File | null
    const progressPercent = submissionType === 'completion' ? 100 : Number(form.get('progress'))
    setBusy(true); setActionError(''); setMessage('')
    try {
      if (submissionType === 'completion' && !file?.size) throw new Error('Upload an evidence photo for completion review.')
      const evidencePath = file?.size ? await uploadEvidenceFile(file, 'projects') : undefined
      if (!isCurrent()) return
      await submitTask(user, { projectId: selected, title: String(form.get('title') || '').trim(), description: String(form.get('description') || '').trim(), progressPercent, submissionType, evidencePath })
      if (isCurrent()) { setMessage('Work submitted for auditor review.'); setFormKey(value => value + 1); refresh() }
    } catch (cause) { if (isCurrent()) setActionError(cause instanceof Error ? cause.message : 'Submission failed.') }
    finally { if (isCurrent()) setBusy(false) }
  }
  if (loading) return <p role="status">Loading assigned work…</p>
  if (error) return <div role="alert"><p className="text-red-700">{error}</p><button onClick={refresh} className="border rounded-lg p-2 mt-3">Try again</button></div>
  if (!data) return null
  const activeProjects = data.projects.filter(project => !['completed', 'cancelled'].includes(project.status))
  const selectedProject = activeProjects.find(project => project.id === projectId) || activeProjects[0]
  return <div className="space-y-6">
    <section><h2 className="text-2xl font-bold">Assigned work</h2><p className="text-slate-600 mt-1">Submit progress, milestones, and completion evidence for independent review. Corrections are submitted as a new record.</p></section>
    {data.projects.length === 0 && <p className="bg-white border rounded-xl p-6">No projects assigned. Ask your administrator to assign a project to your account.</p>}
    <div className="grid sm:grid-cols-2 gap-4">{data.projects.map(project => <article key={project.id} className="bg-white border rounded-xl p-4 space-y-2"><h3 className="font-semibold">{project.title}</h3><p className="text-sm text-slate-600">{project.road} · {project.locality}</p><p className="text-sm">{PROJECT_STATUS_LABELS[project.status]} · Recorded progress {project.progressPercent}%</p><Link className="text-sm text-blue-700" to={`/projects/${project.id}`}>View project</Link></article>)}</div>
    {activeProjects.length > 0 && <section className="bg-white border rounded-xl p-5">
      <h2 className="text-lg font-bold mb-4">Submit work for review</h2>
      <form key={formKey} onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-medium">Project<select className={inputClass} value={selectedProject?.id || ''} onChange={event => setProjectId(event.target.value)} required>{activeProjects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}</select></label>
          <div className="grid sm:grid-cols-2 gap-4"><label className="block text-sm font-medium">Submission type<select className={inputClass} value={submissionType} onChange={event => setSubmissionType(event.target.value as typeof submissionType)}><option value="progress">Progress update</option><option value="milestone">Milestone</option><option value="completion">Final completion</option></select></label>
            <label className="block text-sm font-medium">Reported progress (%)<input key={`${selectedProject?.id}:${submissionType}`} name="progress" type="number" min="0" max="100" step="1" required readOnly={submissionType === 'completion'} defaultValue={submissionType === 'completion' ? 100 : selectedProject?.progressPercent || 0} className={inputClass} /></label></div>
          <label className="block text-sm font-medium">Title<input name="title" required maxLength={200} className={inputClass} /></label>
          <label className="block text-sm font-medium">Work completed and review context<textarea name="description" required maxLength={5000} rows={4} className={inputClass} /></label>
          <label className="block text-sm font-medium">Evidence photo {submissionType === 'completion' ? '(required)' : '(optional)'}<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp" required={submissionType === 'completion'} className="block mt-2 text-sm" /><span className="block text-xs text-slate-500 mt-1">JPEG, PNG or WebP, up to 10 MB.</span></label>
          {submissionType === 'completion' && <p className="text-sm text-slate-600">Completion is recorded only after auditor approval.</p>}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-60">{busy ? 'Submitting…' : 'Submit for review'}</button>
        </fieldset>
      </form>
    </section>}
    {actionError && <p role="alert" className="text-red-700">{actionError}</p>}{message && <p role="status" className="text-green-700">{message}</p>}
    <SubmissionHistory data={data} />
  </div>
}
