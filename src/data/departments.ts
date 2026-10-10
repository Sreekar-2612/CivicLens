// ============================================================
// QuickSort — Departments Master Data (Matched to Supabase DB)
// ============================================================
import type { Department } from '../types';

export const departments: Department[] = [
  {
    id: 'dept-pwd',
    name: 'Public Works Department',
    shortName: 'PWD',
    color: '#e2c09c',
    contactEmail: 'pwd@pmc.gov.in',
    contactPhone: '020-2501-0000',
  },
  {
    id: 'dept-water',
    name: 'Water Supply Department',
    shortName: 'WSD',
    color: '#12B5A6',
    contactEmail: 'water@pmc.gov.in',
    contactPhone: '020-2501-0001',
  },
  {
    id: 'dept-electric',
    name: 'Electrical Department',
    shortName: 'ELEC',
    color: '#FFB020',
    contactEmail: 'electric@msedcl.gov.in',
    contactPhone: '020-2501-0002',
  },
  {
    id: 'dept-telecom',
    name: 'Telecom Infrastructure',
    shortName: 'TELE',
    color: '#8B6CF0',
    contactEmail: 'infra@dot.gov.in',
    contactPhone: '020-2501-0003',
  },
  {
    id: 'dept-gas',
    name: 'Gas Pipeline Authority',
    shortName: 'GAS',
    color: '#FF5A5F',
    contactEmail: 'gas@mngl.in',
    contactPhone: '020-2501-0004',
  },
  {
    id: 'dept-drain',
    name: 'Drainage & Sewage',
    shortName: 'DRN',
    color: '#38A9F5',
    contactEmail: 'drainage@pmc.gov.in',
    contactPhone: '020-2501-0005',
  },
  // Compatibility aliases for legacy IDs
  {
    id: 'dept-roads',
    name: 'Public Works & Roads',
    shortName: 'PWD',
    color: '#e2c09c',
    contactEmail: 'pwd@pmc.gov.in',
  },
  {
    id: 'dept-drainage',
    name: 'Drainage & Sewage',
    shortName: 'DRN',
    color: '#38A9F5',
    contactEmail: 'drainage@pmc.gov.in',
  },
  {
    id: 'dept-electricity',
    name: 'Electrical Infrastructure',
    shortName: 'ELEC',
    color: '#FFB020',
    contactEmail: 'electric@msedcl.gov.in',
  },
];

export const departmentMap = new Map(departments.map(d => [d.id, d]));
