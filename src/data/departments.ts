// ============================================================
// CivicLens — Departments Seed Data
// ============================================================
import type { Department } from '../types';

export const departments: Department[] = [
  {
    id: 'dept-roads',
    name: 'Roads & Infrastructure Department',
    shortName: 'Roads',
    color: '#6366f1',
    contactEmail: 'roads@civiclens.demo',
  },
  {
    id: 'dept-water',
    name: 'Water Supply & Sanitation Department',
    shortName: 'Water',
    color: '#0ea5e9',
    contactEmail: 'water@civiclens.demo',
  },
  {
    id: 'dept-drainage',
    name: 'Drainage & Sewerage Department',
    shortName: 'Drainage',
    color: '#8b5cf6',
    contactEmail: 'drainage@civiclens.demo',
  },
  {
    id: 'dept-electricity',
    name: 'Electrical Infrastructure Department',
    shortName: 'Electrical',
    color: '#f59e0b',
    contactEmail: 'electrical@civiclens.demo',
  },
  {
    id: 'dept-telecom',
    name: 'Telecommunications Department',
    shortName: 'Telecom',
    color: '#10b981',
    contactEmail: 'telecom@civiclens.demo',
  },
];

export const departmentMap = new Map(departments.map(d => [d.id, d]));
