// All displayed application records come from Supabase.
import type { Project, ProjectUpdate, Milestone, Department, Report, CoordinationAlert,
  FilterState, ReportStatus, AlertStatus } from '../types'
import { isSupabaseConfigured } from './supabaseClient'
import { SupabaseDataRepository } from './supabaseRepository'

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
  getDataSourceMode(): { isSupabase: boolean; label: string; mode: 'supabase' | 'unavailable' };
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


export async function applyDemoWorkflowProjectState(_id: string, _updates: Partial<Project>): Promise<void> {
  throw new Error('Project changes require the Supabase database.')
}

const supabaseRepo = new SupabaseDataRepository()
export const dataRepository: DataRepository = {
  getDataSourceMode: () => ({
    isSupabase: isSupabaseConfigured(),
    label: isSupabaseConfigured() ? 'Supabase database' : 'Supabase connection is unavailable',
    mode: isSupabaseConfigured() ? 'supabase' : 'unavailable',
  }),
  getDepartments: () => supabaseRepo.getDepartments(),
  getDepartment: (id) => supabaseRepo.getDepartment(id),
  getProjects: (f) => supabaseRepo.getProjects(f),
  getProject: (id) => supabaseRepo.getProject(id),
  getProjectsByRoad: (r) => supabaseRepo.getProjectsByRoad(r),
  getProjectsByDepartment: (d) => supabaseRepo.getProjectsByDepartment(d),
  getProjectsByWard: (w) => supabaseRepo.getProjectsByWard(w),
  getProjectUpdates: (p) => supabaseRepo.getProjectUpdates(p),
  getMilestones: (p) => supabaseRepo.getMilestones(p),
  addProjectUpdate: (p, u) => supabaseRepo.addProjectUpdate(p, u),
  getReports: () => supabaseRepo.getReports(),
  getReport: (id) => supabaseRepo.getReport(id),
  getReportByReference: (ref) => supabaseRepo.getReportByReference(ref),
  getReportsByProject: (p) => supabaseRepo.getReportsByProject(p),
  getAlerts: () => supabaseRepo.getAlerts(),
  getAlert: (id) => supabaseRepo.getAlert(id),
  getAlertsByProject: (p) => supabaseRepo.getAlertsByProject(p),
  getSummaryStats: () => supabaseRepo.getSummaryStats(),
  addProject: (d) => supabaseRepo.addProject(d),
  updateProject: (id, u, dr, a) => supabaseRepo.updateProject(id, u, dr, a),
  addReport: (d) => supabaseRepo.addReport(d),
  updateReportStatus: (id, s, r) => supabaseRepo.updateReportStatus(id, s, r),
  updateAlertStatus: (id, s, n) => supabaseRepo.updateAlertStatus(id, s, n),
  getUniqueRoads: () => supabaseRepo.getUniqueRoads(),
};
