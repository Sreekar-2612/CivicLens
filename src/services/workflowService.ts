import type { Project } from '../types'
import { dataRepository, applyDemoWorkflowProjectState } from './dataRepository'
import { supabase } from './supabaseClient'
import { mapDbProjectToDomain } from './supabaseRepository'

export interface WorkflowActor { id: string; role: string; departmentId?: string; displayName: string; isDemoUser: boolean }
export interface WorkflowAssignment { projectId: string; userId: string; assignmentRole: 'contractor' | 'auditor' }
export interface TaskSubmission {
  id: string; projectId: string; submittedBy: string; title: string; description: string;
  progressPercent: number; submissionType: 'progress' | 'milestone' | 'completion';
  evidencePath?: string; status: 'submitted' | 'approved' | 'changes_requested'; createdAt: string;
}
export interface TaskReview { id: string; submissionId: string; reviewedBy: string; decision: 'approved' | 'changes_requested'; comments: string; createdAt: string }
export interface WorkspaceData { projects: Project[]; assignments: WorkflowAssignment[]; submissions: TaskSubmission[]; reviews: TaskReview[] }
export interface SubmitTaskInput { projectId: string; title: string; description: string; progressPercent: number; submissionType: TaskSubmission['submissionType']; evidencePath?: string }
const STORE = 'civiclens_workflow_v1'
let memory: { submissions: TaskSubmission[]; reviews: TaskReview[]; projectIds?: string[] } = { submissions: [], reviews: [] }
function load() {
  const stored = globalThis.localStorage?.getItem(STORE)
  return stored ? JSON.parse(stored) as typeof memory : memory
}
function save(state: typeof memory) {
  globalThis.localStorage?.setItem(STORE, JSON.stringify(state))
  memory = state
}
function requireRole(user: WorkflowActor, role?: string) {
  if (!user || !['contractor', 'auditor'].includes(user.role) || (role && user.role !== role)) throw new Error('Insufficient permissions')
  if (!supabase && (!user.isDemoUser || user.id !== `usr-demo-${user.role}`)) throw new Error('Only the designated demo account can use the local workspace')
}
async function invoke(name: string, body?: Record<string, any>) {
  if (!supabase) throw new Error('Supabase is unavailable')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error || !data?.success) throw new Error(data?.error || error?.message || 'Workflow request failed')
  return data
}
function mapSubmission(row: Record<string, any>): TaskSubmission {
  return { id: row.id, projectId: row.project_id, submittedBy: row.submitted_by, title: row.title, description: row.description, progressPercent: row.progress_percent, submissionType: row.submission_type, evidencePath: row.evidence_path || undefined, status: row.status, createdAt: row.created_at }
}
function mapReview(row: Record<string, any>): TaskReview {
  return { id: row.id, submissionId: row.submission_id, reviewedBy: row.reviewed_by, decision: row.decision, comments: row.comments, createdAt: row.created_at }
}
export async function getWorkspace(user: WorkflowActor): Promise<WorkspaceData> {
  requireRole(user)
  if (supabase) {
    const result = await invoke('get-workspace')
    return { projects: result.projects.map(mapDbProjectToDomain), assignments: result.assignments.map((a: Record<string, any>) => ({ projectId: a.project_id, userId: a.user_id, assignmentRole: a.assignment_role })), submissions: result.submissions.map(mapSubmission), reviews: result.reviews.map(mapReview) }
  }
  // Explicit demo assignments are stable and deliberately limited to two active Roads projects.
  const state = load()
  if (!state.projectIds) {
    state.projectIds = (await dataRepository.getProjects()).filter(p => p.departmentId === 'dept-roads' && p.status !== 'completed').slice(0, 2).map(p => p.id)
    save(state)
  }
  const assigned = await Promise.all(state.projectIds.map(id => dataRepository.getProject(id)))
  const projects = assigned.filter((p): p is Project => !!p && p.departmentId === user.departmentId && p.departmentId === 'dept-roads')
  const assignments: WorkflowAssignment[] = projects.flatMap(p => [
    { projectId: p.id, userId: 'usr-demo-contractor', assignmentRole: 'contractor' as const },
    { projectId: p.id, userId: 'usr-demo-auditor', assignmentRole: 'auditor' as const },
  ])
  const ids = new Set(projects.map(p => p.id))
  const submissions = state.submissions.filter(s => ids.has(s.projectId) && (user.role === 'auditor' || s.submittedBy === user.id))
  return { projects, assignments, submissions, reviews: state.reviews.filter(r => submissions.some(s => s.id === r.submissionId)) }
}
export async function submitTask(user: WorkflowActor, input: SubmitTaskInput): Promise<void> {
  requireRole(user, 'contractor')
  if (input.title.trim().length < 3 || input.title.length > 200) throw new Error('Title must contain 3 to 200 characters')
  if (input.description.trim().length < 10 || input.description.length > 10000) throw new Error('Describe the work in 10 to 10000 characters')
  if (!Number.isInteger(input.progressPercent) || input.progressPercent < 0 || input.progressPercent > 100) throw new Error('Progress must be an integer from 0 to 100')
  if (!['progress', 'milestone', 'completion'].includes(input.submissionType)) throw new Error('Invalid submission type')
  if (input.submissionType === 'completion' && (input.progressPercent !== 100 || !input.evidencePath)) throw new Error('Completion requires 100% progress and evidence')
  if (input.submissionType !== 'completion' && input.progressPercent === 100) throw new Error('Use a completion submission for 100% progress')
  if (supabase) { await invoke('submit-task', input); return }
  const workspace = await getWorkspace(user)
  const project = workspace.projects.find(p => p.id === input.projectId)
  if (!project || !workspace.assignments.some(a => a.projectId === input.projectId && a.userId === user.id && a.assignmentRole === 'contractor')) throw new Error('Project assignment required')
  if (project.status === 'completed' || project.status === 'pending_audit') throw new Error('Project is completed or awaiting completion review')
  if (input.progressPercent < project.progressPercent) throw new Error('Progress cannot decrease')
  if (workspace.submissions.some(s => s.projectId === input.projectId && s.status === 'submitted')) throw new Error('Review the pending submission before submitting again')
  const state = load()
  state.submissions.unshift({ ...input, title: input.title.trim(), description: input.description.trim(), id: crypto.randomUUID(), submittedBy: user.id, status: 'submitted', createdAt: new Date().toISOString() })
  if (input.submissionType === 'completion') await applyDemoWorkflowProjectState(input.projectId, { status: 'pending_audit' })
  save(state)
}
export async function reviewTask(user: WorkflowActor, submissionId: string, decision: TaskReview['decision'], comments: string): Promise<void> {
  requireRole(user, 'auditor')
  if (!['approved', 'changes_requested'].includes(decision)) throw new Error('Invalid review decision')
  if (comments.length > 5000 || (decision === 'changes_requested' && comments.trim().length < 5)) throw new Error('Explain the changes required in 5 to 5000 characters')
  if (supabase) { await invoke('review-task', { submissionId, decision, comments }); return }
  const workspace = await getWorkspace(user)
  const submission = workspace.submissions.find(s => s.id === submissionId)
  if (!submission || !workspace.assignments.some(a => a.projectId === submission.projectId && a.userId === user.id && a.assignmentRole === 'auditor')) throw new Error('Auditor assignment required')
  if (submission.submittedBy === user.id) throw new Error('You cannot review your own submission')
  if (submission.status !== 'submitted') throw new Error('Submission already reviewed')
  const state = load()
  const now = new Date().toISOString()
  if (decision === 'approved') {
    const project = workspace.projects.find(p => p.id === submission.projectId)!
    await applyDemoWorkflowProjectState(submission.projectId, { progressPercent: Math.max(project.progressPercent, submission.progressPercent), ...(submission.submissionType === 'completion' ? { status: 'completed' as const, actualEndDate: now.slice(0, 10) } : {}) })
  } else if (submission.submissionType === 'completion') {
    await applyDemoWorkflowProjectState(submission.projectId, { status: 'in_progress' })
  }
  state.submissions.find(s => s.id === submissionId)!.status = decision
  state.reviews.unshift({ id: crypto.randomUUID(), submissionId, reviewedBy: user.id, decision, comments: comments.trim(), createdAt: now })
  save(state)
}
