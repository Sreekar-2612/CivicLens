// ============================================================
// CivicLens — Shared Domain Types
// ============================================================

// ---- Enums & Unions ----

export type ProjectStatus =
  | 'planned'
  | 'in_progress'
  | 'delayed'
  | 'pending_audit'
  | 'completed'
  | 'cancelled';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  pending_audit: 'Pending Auditor Approval',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export type ProjectCategory =
  | 'road_construction'
  | 'road_resurfacing'
  | 'water_pipeline'
  | 'drainage'
  | 'electricity'
  | 'telecom'
  | 'gas_pipeline'
  | 'bridge'
  | 'footpath'
  | 'other';

export type ConfidenceIndicator = 'on_track' | 'at_risk' | 'delayed';

export type ReportStatus =
  | 'submitted'
  | 'acknowledged'
  | 'in_review'
  | 'escalated'
  | 'resolved'
  | 'dismissed';

export type ReportCategory =
  | 'stalled_work'
  | 'safety_hazard'
  | 'noise_complaint'
  | 'road_damage'
  | 'water_disruption'
  | 'traffic_disruption'
  | 'quality_concern'
  | 'environmental'
  | 'other';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertStatus =
  | 'pending_review'
  | 'joint_scheduling'
  | 'intentional_overlap'
  | 'dismissed'
  | 'resolved';

export type UserRole = 'public' | 'resident' | 'officer' | 'admin';

// ---- Core Entities ----

export interface Department {
  id: string;
  name: string;
  shortName: string;
  color: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Project {
  id: string;
  title: string;
  purpose: string;
  departmentId: string;
  contractor: string;
  category: ProjectCategory;
  status: ProjectStatus;
  confidenceIndicator: ConfidenceIndicator;

  // Location
  road: string;
  locality: string;
  ward: string;
  location: GeoLocation;

  // Dates
  startDate: string;           // ISO date
  originalEndDate: string;     // Immutable original deadline
  revisedEndDate?: string;     // Updated deadline (if changed)
  actualEndDate?: string;      // Actual completion date

  // Financials
  budgetLakhs?: number;

  // Progress
  progressPercent: number;

  // Metadata
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  type: 'progress' | 'deadline_revision' | 'status_change' | 'milestone' | 'evidence' | 'note';
  title: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  delayReason?: string;
  evidenceUrl?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface CoordinationAlert {
  id: string;
  projectAId: string;
  projectBId: string;
  score: number;
  severity: AlertSeverity;
  reasons: AlertReason[];
  status: AlertStatus;
  decisionNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertReason {
  type: 'same_road' | 'overlapping_dates' | 'nearby_location' | 'interfering_categories' | 'recent_excavation';
  description: string;
  score: number;
}

export interface Report {
  id: string;
  referenceId: string;       // Human-readable reference
  projectId?: string;        // Optional linked project
  category: ReportCategory;
  title: string;
  description: string;
  location: GeoLocation;
  locationDescription: string;
  photoUrl?: string;
  status: ReportStatus;
  reporterName?: string;     // Never exposed publicly
  reporterContact?: string;  // Never exposed publicly
  officerResponse?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  escalatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: 'project' | 'report' | 'alert' | 'user';
  entityId: string;
  action: string;
  details: string;
  performedBy: string;
  performedAt: string;
}

// ---- UI Helper Types ----

export interface FilterState {
  search: string;
  status: ProjectStatus | 'all';
  department: string;
  category: ProjectCategory | 'all';
  ward: string;
  dateRange: { start?: string; end?: string };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ---- Display Helpers ----

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  road_construction: 'Road Construction',
  road_resurfacing: 'Road Resurfacing',
  water_pipeline: 'Water Pipeline',
  drainage: 'Drainage & Sewerage',
  electricity: 'Electrical Works',
  telecom: 'Telecommunications',
  gas_pipeline: 'Gas Pipeline',
  bridge: 'Bridge / Flyover',
  footpath: 'Footpath / Sidewalk',
  other: 'Other',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  acknowledged: 'Acknowledged',
  in_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  stalled_work: 'Stalled Work',
  safety_hazard: 'Safety Hazard',
  noise_complaint: 'Noise / Disruption',
  road_damage: 'Road Damage',
  water_disruption: 'Water Disruption',
  traffic_disruption: 'Traffic Disruption',
  quality_concern: 'Quality Concern',
  environmental: 'Environmental Issue',
  other: 'Other',
};

export const CONFIDENCE_LABELS: Record<ConfidenceIndicator, string> = {
  on_track: 'On Track',
  at_risk: 'At Risk',
  delayed: 'Delayed',
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  pending_review: 'Pending Review',
  joint_scheduling: 'Joint Scheduling',
  intentional_overlap: 'Intentional Overlap',
  dismissed: 'Dismissed',
  resolved: 'Resolved',
};

export interface SummaryStats {
  totalProjects: number;
  activeProjects: number;
  delayedProjects: number;
  completedProjects: number;
  potentialConflicts: number;
  pendingReports: number;
  departmentCount: number;
}

