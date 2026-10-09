// ============================================================
// CivicLens — Project Updates Seed Data
// ============================================================
import type { ProjectUpdate, Milestone } from '../types';

export const projectUpdates: ProjectUpdate[] = [
  // proj-001 (MG Road Resurfacing — completed)
  {
    id: 'upd-001',
    projectId: 'proj-001',
    type: 'milestone',
    title: 'Excavation and base preparation completed',
    description: 'Old surface removed and base course compacted across all 4 lanes.',
    authorId: 'officer-1',
    authorName: 'Rajesh Patil',
    createdAt: '2026-04-10T10:00:00Z',
  },
  {
    id: 'upd-002',
    projectId: 'proj-001',
    type: 'progress',
    title: 'Bituminous layer application — 65% complete',
    description: 'Hot-mix asphalt application completed from Shivajinagar junction to Deccan crossing.',
    previousValue: '40',
    newValue: '65',
    authorId: 'officer-1',
    authorName: 'Rajesh Patil',
    createdAt: '2026-05-20T14:00:00Z',
  },
  {
    id: 'upd-003',
    projectId: 'proj-001',
    type: 'status_change',
    title: 'Project completed',
    description: 'Final layer and lane markings completed. Road opened to traffic.',
    previousValue: 'in_progress',
    newValue: 'completed',
    authorId: 'officer-1',
    authorName: 'Rajesh Patil',
    createdAt: '2026-07-15T14:00:00Z',
  },

  // proj-006 (JM Road Electrical — delayed)
  {
    id: 'upd-004',
    projectId: 'proj-006',
    type: 'progress',
    title: 'Trench excavation started — Northern section',
    description: 'Trenching work commenced from JM Road north end. Traffic management plan activated.',
    previousValue: '0',
    newValue: '12',
    authorId: 'officer-2',
    authorName: 'Sneha Kulkarni',
    createdAt: '2026-07-20T09:00:00Z',
  },
  {
    id: 'upd-005',
    projectId: 'proj-006',
    type: 'deadline_revision',
    title: 'Deadline extended — Utility conflict',
    description: 'Unexpected encounter with undocumented gas pipeline required rerouting. Additional soil testing and safety clearances needed.',
    delayReason: 'Unmapped subsurface utility conflict requiring rerouting and safety clearances',
    previousValue: '2026-12-31',
    newValue: '2027-03-15',
    authorId: 'officer-2',
    authorName: 'Sneha Kulkarni',
    createdAt: '2026-09-15T11:00:00Z',
  },
  {
    id: 'upd-006',
    projectId: 'proj-006',
    type: 'progress',
    title: 'Cable conduit installation — 28% complete',
    description: 'Conduit laying resumed after safety clearance. Southern section scheduling adjusted.',
    previousValue: '18',
    newValue: '28',
    authorId: 'officer-2',
    authorName: 'Sneha Kulkarni',
    createdAt: '2026-10-02T14:00:00Z',
  },

  // proj-009 (Baner Road Drainage — delayed)
  {
    id: 'upd-007',
    projectId: 'proj-009',
    type: 'deadline_revision',
    title: 'Deadline extended — Monsoon-related delays',
    description: 'Heavy monsoon rainfall caused repeated flooding of excavation trenches, halting work for 6 weeks.',
    delayReason: 'Severe monsoon flooding prevented trench work for 6 weeks; soil stabilization required before resumption',
    previousValue: '2026-09-30',
    newValue: '2027-01-31',
    authorId: 'officer-3',
    authorName: 'Amit Deshmukh',
    createdAt: '2026-09-10T10:00:00Z',
  },

  // proj-014 (Aundh Road — at risk)
  {
    id: 'upd-008',
    projectId: 'proj-014',
    type: 'deadline_revision',
    title: 'Deadline extended — Utility relocation complexity',
    description: 'Relocation of underground utilities taking longer than estimated due to discovery of additional uncharted services.',
    delayReason: 'Uncharted underground utilities discovered requiring additional survey and relocation work',
    previousValue: '2026-12-31',
    newValue: '2027-04-15',
    authorId: 'officer-1',
    authorName: 'Rajesh Patil',
    createdAt: '2026-09-25T14:00:00Z',
  },

  // proj-024 (Viman Nagar Drainage — delayed)
  {
    id: 'upd-009',
    projectId: 'proj-024',
    type: 'deadline_revision',
    title: 'Deadline extended — Land acquisition delays',
    description: 'Delayed land acquisition for drain alignment at two critical points. Legal clearances pending.',
    delayReason: 'Land acquisition delays at two critical alignment points; legal clearances pending from revenue department',
    previousValue: '2026-08-31',
    newValue: '2027-02-28',
    authorId: 'officer-3',
    authorName: 'Amit Deshmukh',
    createdAt: '2026-08-20T10:00:00Z',
  },
];

export const milestones: Milestone[] = [
  // proj-003 (FC Road Drainage)
  { id: 'ms-001', projectId: 'proj-003', title: 'Survey and design approval', targetDate: '2026-08-31', completedDate: '2026-08-28', status: 'completed' },
  { id: 'ms-002', projectId: 'proj-003', title: 'Phase 1 excavation (North section)', targetDate: '2026-10-15', status: 'pending' },
  { id: 'ms-003', projectId: 'proj-003', title: 'Phase 2 excavation (South section)', targetDate: '2026-11-30', status: 'pending' },
  { id: 'ms-004', projectId: 'proj-003', title: 'Concrete lining and cover slabs', targetDate: '2026-12-31', status: 'pending' },
  { id: 'ms-005', projectId: 'proj-003', title: 'Surface restoration and handover', targetDate: '2027-01-15', status: 'pending' },

  // proj-007 (Sinhagad Road Flyover)
  { id: 'ms-006', projectId: 'proj-007', title: 'Foundation piling completed', targetDate: '2026-03-31', completedDate: '2026-04-10', status: 'completed' },
  { id: 'ms-007', projectId: 'proj-007', title: 'Pier construction — Phase 1', targetDate: '2026-08-31', completedDate: '2026-09-05', status: 'completed' },
  { id: 'ms-008', projectId: 'proj-007', title: 'Pier construction — Phase 2', targetDate: '2027-01-31', status: 'pending' },
  { id: 'ms-009', projectId: 'proj-007', title: 'Deck slab casting', targetDate: '2027-03-31', status: 'pending' },
  { id: 'ms-010', projectId: 'proj-007', title: 'Finishing and load testing', targetDate: '2027-05-31', status: 'pending' },

  // proj-006 (JM Road Electrical — delayed)
  { id: 'ms-011', projectId: 'proj-006', title: 'Route survey and permits', targetDate: '2026-07-31', completedDate: '2026-07-25', status: 'completed' },
  { id: 'ms-012', projectId: 'proj-006', title: 'Trench excavation — North', targetDate: '2026-09-30', status: 'overdue' },
  { id: 'ms-013', projectId: 'proj-006', title: 'Cable pulling and jointing', targetDate: '2026-11-30', status: 'pending' },
  { id: 'ms-014', projectId: 'proj-006', title: 'Testing and commissioning', targetDate: '2027-02-28', status: 'pending' },
];
