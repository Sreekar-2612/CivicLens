// ============================================================
// CivicLens — Data Access Layer
// DataRepository interface with unified Supabase adapter & seed fallback
// Enforces deadline immutability and lifecycle audit logging
// ============================================================
import type {
  Project, ProjectUpdate, Milestone,
  Department, Report, CoordinationAlert,
  FilterState, ProjectCategory, ReportStatus, AlertStatus,
} from '../types';
import { departments, departmentMap } from '../data/departments';
import { projects, projectMap } from '../data/projects';
import { projectUpdates, milestones } from '../data/updates';
import { reports, coordinationAlerts } from '../data/reports';
import { isSupabaseConfigured } from './supabaseClient';
import { SupabaseDataRepository } from './supabaseRepository';
import { detectClashes } from './clashEngine';
import {
  validateProjectCreation,
  validateDeadlineRevision,
  validateProgressUpdate,
} from './projectValidation';

// ---- Repository Interface ----
export interface DataRepository {
  // Departments
  getDepartments(): Promise<Department[]>;
  getDepartment(id: string): Promise<Department | undefined>;

  // Projects
  getProjects(filters?: Partial<FilterState>): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByRoad(road: string): Promise<Project[]>;
  getProjectsByDepartment(departmentId: string): Promise<Project[]>;
  getProjectsByWard(ward: string): Promise<Project[]>;

  // Project Updates
  getProjectUpdates(projectId: string): Promise<ProjectUpdate[]>;
  getMilestones(projectId: string): Promise<Milestone[]>;
  addProjectUpdate(projectId: string, update: Partial<ProjectUpdate>): Promise<ProjectUpdate>;

  // Reports
  getReports(): Promise<Report[]>;
  getReport(id: string): Promise<Report | undefined>;
  getReportByReference(referenceId: string): Promise<Report | undefined>;
  getReportsByProject(projectId: string): Promise<Report[]>;

  // Coordination Alerts
  getAlerts(): Promise<CoordinationAlert[]>;
  getAlert(id: string): Promise<CoordinationAlert | undefined>;
  getAlertsByProject(projectId: string): Promise<CoordinationAlert[]>;

  // Summary Stats
  getSummaryStats(): Promise<SummaryStats>;

  // Mutations & Road queries
  addProject(data: Partial<Project>): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>, delayReason?: string, authorName?: string): Promise<Project | undefined>;
  addReport(data: Partial<Report>): Promise<Report>;
  updateReportStatus(id: string, status: ReportStatus, officerResponse?: string): Promise<Report | undefined>;
  updateAlertStatus(id: string, status: AlertStatus, decisionNotes?: string): Promise<CoordinationAlert | undefined>;
  getUniqueRoads(): Promise<{ road: string; count: number; activeCount: number; wards: string[] }[]>;

  // Source info
  getDataSourceMode(): { isSupabase: boolean; label: string; mode: 'supabase' | 'fallback' };
}

export interface SummaryStats {
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  completedProjects: number;
  potentialConflicts: number;
  pendingReports: number;
  departmentCount: number;
}

// ---- Helpers ----
function normalizeRoad(road: string): string {
  return road.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesSearch(project: Project, search: string): boolean {
  const s = search.toLowerCase();
  return (
    project.title.toLowerCase().includes(s) ||
    project.road.toLowerCase().includes(s) ||
    project.locality.toLowerCase().includes(s) ||
    project.ward.toLowerCase().includes(s) ||
    project.purpose.toLowerCase().includes(s) ||
    project.contractor.toLowerCase().includes(s)
  );
}

// LocalStorage persistent stores with fallback to seed data
function loadStore<T>(key: string, initialData: T[]): T[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.warn(`Failed to load ${key} from localStorage:`, e);
  }
  return [...initialData];
}

function saveStore<T>(key: string, data: T[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

// In-memory mutable stores with localStorage persistence
const projectStore: Project[] = loadStore('civiclens_projects', projects);
const reportStore: Report[] = loadStore('civiclens_reports', reports);
const alertStore: CoordinationAlert[] = loadStore('civiclens_alerts', coordinationAlerts);
const updateStore: ProjectUpdate[] = loadStore('civiclens_updates', projectUpdates);
const milestoneStore: Milestone[] = loadStore('civiclens_milestones', milestones);

// Local simulation only. Real approval is enforced atomically by database RPCs.
export async function applyDemoWorkflowProjectState(id: string, updates: Partial<Project>): Promise<void> {
  if (isSupabaseConfigured()) throw new Error('Demo workflow is unavailable with Supabase configured.');
  const index = projectStore.findIndex(project => project.id === id);
  if (index < 0) throw new Error('Project not found.');
  projectStore[index] = { ...projectStore[index], ...updates, id, updatedAt: new Date().toISOString() };
  saveStore('civiclens_projects', projectStore);
  syncDetectedClashes();
}

function syncDetectedClashes(): void {
  const detected = detectClashes(projectStore);
  const currentIds = new Set(detected.map(alert => alert.id));
  const pairKey = (alert: CoordinationAlert) => [alert.projectAId, alert.projectBId].sort().join('|');
  let changed = false;
  for (let i = alertStore.length - 1; i >= 0; i--) {
    if (alertStore[i].id.startsWith('clash-auto-') &&
        alertStore[i].status === 'pending_review' && !currentIds.has(alertStore[i].id)) {
      alertStore.splice(i, 1);
      changed = true;
    }
  }
  const existingPairs = new Map(alertStore.map(alert => [pairKey(alert), alert]));
  for (const alert of detected) {
    const existing = existingPairs.get(pairKey(alert));
    if (!existing) {
      alertStore.unshift(alert);
      existingPairs.set(pairKey(alert), alert);
      changed = true;
    } else if (existing.id.startsWith('clash-auto-') &&
      (existing.score !== alert.score || JSON.stringify(existing.reasons) !== JSON.stringify(alert.reasons))) {
      existing.score = alert.score;
      existing.severity = alert.severity;
      existing.reasons = alert.reasons;
      existing.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) saveStore('civiclens_alerts', alertStore);
}

export class SeedDataRepository implements DataRepository {
  getDataSourceMode() {
    return {
      isSupabase: false,
      label: 'Local In-Memory Seed Repository (Supabase Unconfigured)',
      mode: 'fallback' as const,
    };
  }

  // -- Departments --
  async getDepartments(): Promise<Department[]> {
    return [...departments];
  }

  async getDepartment(id: string): Promise<Department | undefined> {
    return departmentMap.get(id);
  }

  // -- Projects --
  async getProjects(filters?: Partial<FilterState>): Promise<Project[]> {
    let result = projectStore.filter(p => p.isPublished);

    if (filters) {
      if (filters.search) {
        result = result.filter(p => matchesSearch(p, filters.search!));
      }
      if (filters.status && filters.status !== 'all') {
        result = result.filter(p => p.status === filters.status);
      }
      if (filters.department && filters.department !== 'all') {
        result = result.filter(p => p.departmentId === filters.department);
      }
      if (filters.category && filters.category !== 'all') {
        result = result.filter(p => p.category === (filters.category as ProjectCategory));
      }
      if (filters.ward && filters.ward !== 'all') {
        result = result.filter(p => p.ward === filters.ward);
      }
    }

    return result;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return projectStore.find(p => p.id === id);
  }

  async getProjectsByRoad(road: string): Promise<Project[]> {
    const normalized = normalizeRoad(road);
    return projectStore.filter(
      p => normalizeRoad(p.road) === normalized || p.road.toLowerCase().includes(road.toLowerCase())
    );
  }

  async getProjectsByDepartment(departmentId: string): Promise<Project[]> {
    return projectStore.filter(p => p.departmentId === departmentId);
  }

  async getProjectsByWard(ward: string): Promise<Project[]> {
    return projectStore.filter(p => p.ward === ward);
  }

  // -- Updates --
  async getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
    return updateStore
      .filter(u => u.projectId === projectId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMilestones(projectId: string): Promise<Milestone[]> {
    return milestoneStore
      .filter(m => m.projectId === projectId)
      .sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }

  async addProjectUpdate(projectId: string, update: Partial<ProjectUpdate>): Promise<ProjectUpdate> {
    const newUpdate: ProjectUpdate = {
      id: `upd-${Date.now().toString().slice(-4)}`,
      projectId,
      type: update.type || 'progress',
      title: update.title || 'Project Update',
      description: update.description || '',
      previousValue: update.previousValue,
      newValue: update.newValue,
      delayReason: update.delayReason,
      evidenceUrl: update.evidenceUrl,
      authorId: update.authorId || 'officer-1',
      authorName: update.authorName || 'Field Engineer',
      createdAt: new Date().toISOString(),
    };
    updateStore.unshift(newUpdate);
    saveStore('civiclens_updates', updateStore);
    return newUpdate;
  }

  // -- Reports --
  async getReports(): Promise<Report[]> {
    return [...reportStore].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getReport(id: string): Promise<Report | undefined> {
    return reportStore.find(r => r.id === id);
  }

  async getReportByReference(referenceId: string): Promise<Report | undefined> {
    return reportStore.find(r => r.referenceId.toLowerCase() === referenceId.toLowerCase());
  }

  async getReportsByProject(projectId: string): Promise<Report[]> {
    return reportStore.filter(r => r.projectId === projectId);
  }

  // -- Alerts --
  async getAlerts(): Promise<CoordinationAlert[]> {
    syncDetectedClashes();
    return [...alertStore].sort((a, b) => b.score - a.score);
  }

  async getAlert(id: string): Promise<CoordinationAlert | undefined> {
    syncDetectedClashes();
    return alertStore.find(a => a.id === id);
  }

  async getAlertsByProject(projectId: string): Promise<CoordinationAlert[]> {
    syncDetectedClashes();
    return alertStore.filter(
      a => a.projectAId === projectId || a.projectBId === projectId
    );
  }

  // -- Stats --
  async getSummaryStats(): Promise<SummaryStats> {
    syncDetectedClashes();
    const published = projectStore.filter(p => p.isPublished);
    return {
      totalProjects: published.length,
      activeProjects: published.filter(p => p.status === 'in_progress' || p.status === 'planned').length,
      delayedProjects: published.filter(p => p.status === 'delayed' || p.confidenceIndicator === 'delayed').length,
      completedProjects: published.filter(p => p.status === 'completed').length,
      potentialConflicts: alertStore.filter(a => a.status === 'pending_review').length,
      pendingReports: reportStore.filter(r => r.status === 'submitted' || r.status === 'acknowledged').length,
      departmentCount: departments.length,
    };
  }

  // -- Mutations --
  async addProject(data: Partial<Project>): Promise<Project> {
    if (data.status === 'completed' || data.status === 'pending_audit') {
      throw new Error('Completion and audit status must use the contractor submission and auditor review workflow.');
    }
    // 1. Validation check
    const validation = validateProjectCreation(data);
    if (!validation.isValid) {
      throw new Error(`Project creation rejected: ${validation.errors.join(' ')}`);
    }

    const id = `proj-${Date.now().toString().slice(-4)}`;
    const newProject: Project = {
      id,
      title: data.title!.trim(),
      purpose: data.purpose?.trim() || 'Public infrastructure works',
      departmentId: data.departmentId!,
      contractor: data.contractor!.trim(),
      category: data.category || 'road_construction',
      status: data.status || 'planned',
      confidenceIndicator: data.confidenceIndicator || 'on_track',
      road: data.road!.trim(),
      locality: data.locality?.trim() || 'Central Zone',
      ward: data.ward || 'Ward 1',
      location: data.location || { lat: 18.5204, lng: 73.8567 },
      startDate: data.startDate!,
      originalEndDate: data.originalEndDate!,
      budgetLakhs: data.budgetLakhs || 50,
      progressPercent: data.progressPercent || 0,
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projectStore.unshift(newProject);
    saveStore('civiclens_projects', projectStore);

    syncDetectedClashes();

    return newProject;
  }

  async updateProject(
    id: string,
    updates: Partial<Project>,
    delayReason?: string,
    authorName?: string
  ): Promise<Project | undefined> {
    const idx = projectStore.findIndex(p => p.id === id);
    if (idx === -1) return undefined;

    const current = projectStore[idx];
    if ((updates.status === 'completed' || updates.status === 'pending_audit') && updates.status !== current.status) {
      throw new Error('Completion and audit status must use the contractor submission and auditor review workflow.');
    }
    if (current.status === 'pending_audit' && updates.status && updates.status !== current.status) {
      throw new Error('An auditor must review the pending completion submission.');
    }
    if (current.status === 'completed' && ((updates.status && updates.status !== current.status) ||
      (updates.progressPercent !== undefined && updates.progressPercent !== 100))) {
      throw new Error('Approved completed work cannot be reopened through the project editor.');
    }

    // Check progress validation
    if (updates.progressPercent !== undefined) {
      const pVal = validateProgressUpdate(current, updates.progressPercent, updates.status);
      if (!pVal.isValid) {
        throw new Error(`Progress update rejected: ${pVal.errors.join(' ')}`);
      }
    }

    // Check deadline revision validation
    let hasDeadlineChange = false;
    const effectiveCurrentDeadline = current.revisedEndDate || current.originalEndDate;
    if (updates.revisedEndDate && updates.revisedEndDate !== effectiveCurrentDeadline) {
      hasDeadlineChange = true;
      const dVal = validateDeadlineRevision(current, updates.revisedEndDate, delayReason);
      if (!dVal.isValid) {
        throw new Error(`Deadline revision rejected: ${dVal.errors.join(' ')}`);
      }
    }

    // IMMUTABILITY: Remove originalEndDate from updates to strictly prevent changes!
    const { originalEndDate, ...allowedUpdates } = updates;

    const updatedProject: Project = {
      ...current,
      ...allowedUpdates,
      updatedAt: new Date().toISOString(),
    };
    projectStore[idx] = updatedProject;
    saveStore('civiclens_projects', projectStore);
    syncDetectedClashes();

    // Automatically record deadline revision audit history
    if (hasDeadlineChange) {
      const historyUpdate: ProjectUpdate = {
        id: `upd-${Date.now().toString().slice(-4)}`,
        projectId: id,
        type: 'deadline_revision',
        title: `Deadline revised to ${updates.revisedEndDate}`,
        description: delayReason || 'Deadline revision recorded',
        previousValue: effectiveCurrentDeadline,
        newValue: updates.revisedEndDate,
        delayReason: delayReason,
        authorId: 'officer-audit',
        authorName: authorName || 'Authorized Officer',
        createdAt: new Date().toISOString(),
      };
      updateStore.unshift(historyUpdate);
      saveStore('civiclens_updates', updateStore);
    }

    return updatedProject;
  }

  async addReport(data: Partial<Report>): Promise<Report> {
    const count = reportStore.length + 1;
    const refCode = `CL-2026-${String(count).padStart(4, '0')}`;
    const newReport: Report = {
      id: `rpt-${Date.now().toString().slice(-4)}`,
      referenceId: refCode,
      category: data.category || 'stalled_work',
      title: data.title || 'Citizen Ground Report',
      description: data.description || '',
      location: data.location || { lat: 18.5204, lng: 73.8567 },
      locationDescription: data.locationDescription || '',
      photoUrl: data.photoUrl,
      status: 'submitted',
      projectId: data.projectId,
      reporterName: data.reporterName,
      reporterContact: data.reporterContact,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    };
    reportStore.unshift(newReport);
    saveStore('civiclens_reports', reportStore);
    return newReport;
  }

  async updateReportStatus(id: string, status: ReportStatus, officerResponse?: string): Promise<Report | undefined> {
    const idx = reportStore.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    const now = new Date().toISOString();
    const updated: Report = {
      ...reportStore[idx],
      status,
      updatedAt: now,
      ...(officerResponse ? { officerResponse } : {}),
      ...(status === 'acknowledged' && !reportStore[idx].acknowledgedAt ? { acknowledgedAt: now } : {}),
      ...(status === 'resolved' ? { resolvedAt: now } : {}),
      ...(status === 'escalated' ? { escalatedAt: now } : {}),
    };
    reportStore[idx] = updated;
    saveStore('civiclens_reports', reportStore);
    return updated;
  }

  async updateAlertStatus(id: string, status: AlertStatus, decisionNotes?: string): Promise<CoordinationAlert | undefined> {
    const idx = alertStore.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    const updated: CoordinationAlert = {
      ...alertStore[idx],
      status,
      decisionNotes: decisionNotes || alertStore[idx].decisionNotes,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    alertStore[idx] = updated;
    saveStore('civiclens_alerts', alertStore);
    return updated;
  }

  async getUniqueRoads(): Promise<{ road: string; count: number; activeCount: number; wards: string[] }[]> {
    const map = new Map<string, { count: number; activeCount: number; wards: Set<string> }>();
    for (const p of projectStore) {
      const existing = map.get(p.road) || { count: 0, activeCount: 0, wards: new Set() };
      existing.count += 1;
      if (p.status === 'in_progress' || p.status === 'planned') {
        existing.activeCount += 1;
      }
      existing.wards.add(p.ward);
      map.set(p.road, existing);
    }
    return Array.from(map.entries()).map(([road, val]) => ({
      road,
      count: val.count,
      activeCount: val.activeCount,
      wards: Array.from(val.wards),
    }));
  }
}

// Singleton instances
const seedRepo = new SeedDataRepository();
const supabaseRepo = new SupabaseDataRepository();

// Intelligently routed data repository
export const dataRepository: DataRepository = {
  getDataSourceMode: () => {
    if (isSupabaseConfigured()) {
      return {
        isSupabase: true,
        label: 'Connected: Supabase PostgreSQL Database',
        mode: 'supabase' as const,
      };
    }
    return seedRepo.getDataSourceMode();
  },

  getDepartments: () => (isSupabaseConfigured() ? supabaseRepo.getDepartments() : seedRepo.getDepartments()),
  getDepartment: (id) => (isSupabaseConfigured() ? supabaseRepo.getDepartment(id) : seedRepo.getDepartment(id)),
  getProjects: (f) => (isSupabaseConfigured() ? supabaseRepo.getProjects(f) : seedRepo.getProjects(f)),
  getProject: (id) => (isSupabaseConfigured() ? supabaseRepo.getProject(id) : seedRepo.getProject(id)),
  getProjectsByRoad: (r) => (isSupabaseConfigured() ? supabaseRepo.getProjectsByRoad(r) : seedRepo.getProjectsByRoad(r)),
  getProjectsByDepartment: (d) => (isSupabaseConfigured() ? supabaseRepo.getProjectsByDepartment(d) : seedRepo.getProjectsByDepartment(d)),
  getProjectsByWard: (w) => (isSupabaseConfigured() ? supabaseRepo.getProjectsByWard(w) : seedRepo.getProjectsByWard(w)),
  getProjectUpdates: (p) => (isSupabaseConfigured() ? supabaseRepo.getProjectUpdates(p) : seedRepo.getProjectUpdates(p)),
  getMilestones: (p) => (isSupabaseConfigured() ? supabaseRepo.getMilestones(p) : seedRepo.getMilestones(p)),
  addProjectUpdate: (p, u) => (isSupabaseConfigured() ? supabaseRepo.addProjectUpdate(p, u) : seedRepo.addProjectUpdate(p, u)),
  getReports: () => (isSupabaseConfigured() ? supabaseRepo.getReports() : seedRepo.getReports()),
  getReport: (id) => (isSupabaseConfigured() ? supabaseRepo.getReport(id) : seedRepo.getReport(id)),
  getReportByReference: (ref) => (isSupabaseConfigured() ? supabaseRepo.getReportByReference(ref) : seedRepo.getReportByReference(ref)),
  getReportsByProject: (p) => (isSupabaseConfigured() ? supabaseRepo.getReportsByProject(p) : seedRepo.getReportsByProject(p)),
  getAlerts: () => (isSupabaseConfigured() ? supabaseRepo.getAlerts() : seedRepo.getAlerts()),
  getAlert: (id) => (isSupabaseConfigured() ? supabaseRepo.getAlert(id) : seedRepo.getAlert(id)),
  getAlertsByProject: (p) => (isSupabaseConfigured() ? supabaseRepo.getAlertsByProject(p) : seedRepo.getAlertsByProject(p)),
  getSummaryStats: () => (isSupabaseConfigured() ? supabaseRepo.getSummaryStats() : seedRepo.getSummaryStats()),
  addProject: (d) => (isSupabaseConfigured() ? supabaseRepo.addProject(d) : seedRepo.addProject(d)),
  updateProject: (id, u, dr, a) => (isSupabaseConfigured() ? supabaseRepo.updateProject(id, u, dr, a) : seedRepo.updateProject(id, u, dr, a)),
  addReport: (d) => (isSupabaseConfigured() ? supabaseRepo.addReport(d) : seedRepo.addReport(d)),
  updateReportStatus: (id, s, r) => (isSupabaseConfigured() ? supabaseRepo.updateReportStatus(id, s, r) : seedRepo.updateReportStatus(id, s, r)),
  updateAlertStatus: (id, s, n) => (isSupabaseConfigured() ? supabaseRepo.updateAlertStatus(id, s, n) : seedRepo.updateAlertStatus(id, s, n)),
  getUniqueRoads: () => (isSupabaseConfigured() ? supabaseRepo.getUniqueRoads() : seedRepo.getUniqueRoads()),
};
