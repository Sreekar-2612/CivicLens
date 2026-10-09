// ============================================================
// CivicLens — Reports & Coordination Alerts Seed Data
// ============================================================
import type { Report, CoordinationAlert } from '../types';

export const reports: Report[] = [
  {
    id: 'rpt-001',
    referenceId: 'CL-2026-0001',
    projectId: 'proj-006',
    category: 'stalled_work',
    title: 'JM Road excavation abandoned for 3 weeks',
    description: 'The trench along JM Road near Goodluck Chowk has been left open and unattended for over 3 weeks. Steel plates covering the trench are shifting, creating a safety hazard for two-wheelers.',
    location: { lat: 18.5256, lng: 73.8438 },
    locationDescription: 'JM Road, near Goodluck Chowk, Shivajinagar',
    status: 'acknowledged',
    acknowledgedAt: '2026-09-25T10:00:00Z',
    officerResponse: 'Thank you for reporting. Work was paused due to subsurface utility conflict. Safety barriers have been reinforced and work will resume by October 10.',
    createdAt: '2026-09-22T08:30:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
  },
  {
    id: 'rpt-002',
    referenceId: 'CL-2026-0002',
    projectId: 'proj-009',
    category: 'road_damage',
    title: 'Baner Road sinkhole near drain excavation',
    description: 'A significant sinkhole (approximately 1m x 0.5m) has appeared on Baner Road near the ongoing drain construction. Multiple vehicles have been damaged. Urgent repair needed.',
    location: { lat: 18.5588, lng: 73.7872 },
    locationDescription: 'Baner Road, opposite Westend Mall',
    status: 'escalated',
    acknowledgedAt: '2026-10-02T09:00:00Z',
    escalatedAt: '2026-10-03T14:00:00Z',
    officerResponse: 'Report escalated to emergency repair team. Temporary barricades installed.',
    createdAt: '2026-10-01T17:00:00Z',
    updatedAt: '2026-10-03T14:00:00Z',
  },
  {
    id: 'rpt-003',
    referenceId: 'CL-2026-0003',
    category: 'water_disruption',
    title: 'No water supply for 4 days — Model Colony',
    description: 'Residents of Model Colony lanes 2–5 have had no water supply since Monday. No prior notification was provided. Multiple families relying on tanker water.',
    location: { lat: 18.5168, lng: 73.8355 },
    locationDescription: 'Model Colony, Lanes 2–5, Shivajinagar',
    status: 'submitted',
    createdAt: '2026-10-04T07:00:00Z',
    updatedAt: '2026-10-04T07:00:00Z',
  },
  {
    id: 'rpt-004',
    referenceId: 'CL-2026-0004',
    projectId: 'proj-007',
    category: 'traffic_disruption',
    title: 'Sinhagad Road flyover causing 45-min delays',
    description: 'Traffic delays during peak hours have increased to 45 minutes due to the flyover construction. Lane closures and diversions are poorly signposted.',
    location: { lat: 18.4852, lng: 73.8248 },
    locationDescription: 'Sinhagad Road — Paud Road junction, Vadgaon Budruk',
    status: 'resolved',
    acknowledgedAt: '2026-09-18T11:00:00Z',
    resolvedAt: '2026-09-28T16:00:00Z',
    officerResponse: 'Additional traffic marshals deployed. Improved signage installed. Evening lane closure hours adjusted from 10 PM to 5 AM.',
    createdAt: '2026-09-16T18:00:00Z',
    updatedAt: '2026-09-28T16:00:00Z',
  },
  {
    id: 'rpt-005',
    referenceId: 'CL-2026-0005',
    projectId: 'proj-024',
    category: 'safety_hazard',
    title: 'Uncovered drain trench near school — Viman Nagar',
    description: 'An uncovered drainage trench near Vibgyor School on Viman Nagar Main Road poses a serious safety risk to schoolchildren. No barricades or warning signs.',
    location: { lat: 18.5672, lng: 73.9138 },
    locationDescription: 'Viman Nagar Main Road, near Vibgyor School',
    status: 'acknowledged',
    acknowledgedAt: '2026-10-05T08:30:00Z',
    officerResponse: 'Safety barricades and reflective warning signs being installed today. Contractor instructed to cover trench sections near the school by end of day.',
    createdAt: '2026-10-04T19:00:00Z',
    updatedAt: '2026-10-05T08:30:00Z',
  },
];

export const coordinationAlerts: CoordinationAlert[] = [
  // Conflict 1: MG Road — recently resurfaced, now water pipeline planned
  {
    id: 'alert-001',
    projectAId: 'proj-002', // Water pipeline (proposed)
    projectBId: 'proj-001', // Road resurfacing (completed)
    score: 80,
    severity: 'critical',
    reasons: [
      { type: 'same_road', description: 'Both projects are on Mahatma Gandhi Road, Shivajinagar', score: 40 },
      { type: 'recent_excavation', description: 'Road resurfacing completed just 3 months ago (July 2026). New excavation would undo recent ₹1.85 Cr investment.', score: 30 },
      { type: 'interfering_categories', description: 'Water pipeline trenching will require cutting through recently restored road surface', score: 10 },
    ],
    status: 'pending_review',
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
  },
  // Conflict 2: FC Road — overlapping drainage and telecom
  {
    id: 'alert-002',
    projectAId: 'proj-004', // Telecom (planned)
    projectBId: 'proj-003', // Drainage (in progress)
    score: 70,
    severity: 'high',
    reasons: [
      { type: 'same_road', description: 'Both projects are on Fergusson College Road, Deccan Gymkhana', score: 40 },
      { type: 'overlapping_dates', description: 'Telecom start date (Oct 2026) overlaps with ongoing drainage work (ends Jan 2027)', score: 30 },
    ],
    status: 'joint_scheduling',
    decisionNotes: 'Joint scheduling review initiated. Telecom department to coordinate trench sharing with drainage contractor.',
    reviewedBy: 'Rajesh Patil',
    reviewedAt: '2026-10-05T11:00:00Z',
    createdAt: '2026-09-25T09:00:00Z',
    updatedAt: '2026-10-05T11:00:00Z',
  },
  // Conflict 3: JM Road — recently resurfaced, electrical trenching underway
  {
    id: 'alert-003',
    projectAId: 'proj-006', // Electrical (in progress)
    projectBId: 'proj-005', // Road restoration (completed)
    score: 70,
    severity: 'high',
    reasons: [
      { type: 'same_road', description: 'Both projects are on Jungli Maharaj Road, Shivajinagar', score: 40 },
      { type: 'recent_excavation', description: 'Road surface restoration completed just 2 months before electrical trenching began', score: 20 },
      { type: 'interfering_categories', description: 'Underground cabling requires trenching through recently restored road surface', score: 10 },
    ],
    status: 'intentional_overlap',
    decisionNotes: 'Overlap accepted after review. Electrical department has committed to full surface restoration of affected sections upon completion. Cost-sharing agreement signed for road repair.',
    reviewedBy: 'Sneha Kulkarni',
    reviewedAt: '2026-07-15T14:00:00Z',
    createdAt: '2026-06-28T10:00:00Z',
    updatedAt: '2026-07-15T14:00:00Z',
  },
];
