const dns = require('dns');
const { Client } = require('pg');
dns.setDefaultResultOrder('ipv4first');

const DB_URL = `postgresql://postgres.xrpqgszwigdrcwbkpdtt:Sreekartirumala%40987654321@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`;

async function seedDepartments() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
  
  console.log('Connecting to Supabase...');
  await client.connect();
  console.log('✅ Connected!\n');

  // Seed departments
  const departments = [
    { id: 'dept-pwd', name: 'Public Works Department', short_name: 'PWD', department_type: 'municipal', color: '#2F6BFF', contact_email: 'pwd@pmc.gov.in', contact_phone: '020-2501-0000' },
    { id: 'dept-water', name: 'Water Supply Department', short_name: 'WSD', department_type: 'municipal', color: '#12B5A6', contact_email: 'water@pmc.gov.in', contact_phone: '020-2501-0001' },
    { id: 'dept-electric', name: 'Electrical Department', short_name: 'ELEC', department_type: 'utility', color: '#FFB020', contact_email: 'electric@msedcl.gov.in', contact_phone: '020-2501-0002' },
    { id: 'dept-telecom', name: 'Telecom Infrastructure', short_name: 'TELE', department_type: 'utility', color: '#8B6CF0', contact_email: 'infra@dot.gov.in', contact_phone: '020-2501-0003' },
    { id: 'dept-gas', name: 'Gas Pipeline Authority', short_name: 'GAS', department_type: 'utility', color: '#FF5A5F', contact_email: 'gas@mngl.in', contact_phone: '020-2501-0004' },
    { id: 'dept-drain', name: 'Drainage & Sewage', short_name: 'DRN', department_type: 'municipal', color: '#38A9F5', contact_email: 'drainage@pmc.gov.in', contact_phone: '020-2501-0005' },
  ];

  console.log('Seeding departments...');
  for (const dept of departments) {
    try {
      await client.query(
        `INSERT INTO departments (id, name, short_name, department_type, color, contact_email, contact_phone) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         ON CONFLICT (id) DO UPDATE SET name = $2, short_name = $3, color = $5`,
        [dept.id, dept.name, dept.short_name, dept.department_type, dept.color, dept.contact_email, dept.contact_phone]
      );
      console.log(`   ✅ ${dept.short_name}: ${dept.name}`);
    } catch (err) {
      console.error(`   ❌ ${dept.short_name}: ${err.message}`);
    }
  }

  // Seed sample projects
  console.log('\nSeeding sample projects...');
  const projects = [
    {
      id: 'proj-0001',
      title: 'MG Road Resurfacing Phase 2',
      purpose: 'Complete road resurfacing with improved drainage on MG Road between Shivaji Nagar and Camp',
      department_id: 'dept-pwd',
      contractor_name: 'Hindustan Construction Co.',
      category: 'road_resurfacing',
      road_name: 'MG Road',
      locality: 'Shivaji Nagar',
      ward: 'Ward 5',
      latitude: 18.5314,
      longitude: 73.8446,
      budget: 850,
      status: 'in_progress',
      publication_status: 'published',
      start_date: '2026-08-01',
      original_end_date: '2027-02-28',
      progress_percent: 42,
      confidence_indicator: 'on_track',
    },
    {
      id: 'proj-0002',
      title: 'Karve Road Water Pipeline Replacement',
      purpose: 'Replace aging cast-iron water mains with HDPE pipes along Karve Road corridor',
      department_id: 'dept-water',
      contractor_name: 'Tata Projects Ltd.',
      category: 'water_pipeline',
      road_name: 'Karve Road',
      locality: 'Deccan Gymkhana',
      ward: 'Ward 8',
      latitude: 18.5074,
      longitude: 73.8378,
      budget: 1200,
      status: 'in_progress',
      publication_status: 'published',
      start_date: '2026-07-15',
      original_end_date: '2027-01-15',
      progress_percent: 65,
      confidence_indicator: 'on_track',
    },
    {
      id: 'proj-0003',
      title: 'JM Road Underground Cable Ducting',
      purpose: 'Underground cable ducting for power distribution along JM Road',
      department_id: 'dept-electric',
      contractor_name: 'Larsen & Toubro Ltd.',
      category: 'electricity',
      road_name: 'JM Road',
      locality: 'Shivaji Nagar',
      ward: 'Ward 5',
      latitude: 18.5282,
      longitude: 73.8458,
      budget: 620,
      status: 'delayed',
      publication_status: 'published',
      start_date: '2026-06-01',
      original_end_date: '2026-12-31',
      revised_end_date: '2027-03-15',
      progress_percent: 30,
      confidence_indicator: 'delayed',
    },
    {
      id: 'proj-0004',
      title: 'FC Road Fiber Optic Rollout',
      purpose: '5G-ready fiber optic cable installation along FC Road',
      department_id: 'dept-telecom',
      contractor_name: 'Sterlite Technologies',
      category: 'telecom',
      road_name: 'FC Road',
      locality: 'Deccan Gymkhana',
      ward: 'Ward 8',
      latitude: 18.5186,
      longitude: 73.8398,
      budget: 380,
      status: 'planned',
      publication_status: 'published',
      start_date: '2026-11-01',
      original_end_date: '2027-04-30',
      progress_percent: 0,
      confidence_indicator: 'on_track',
    },
    {
      id: 'proj-0005',
      title: 'Sinhagad Road Storm Drain Expansion',
      purpose: 'Expand storm water drainage capacity to prevent monsoon flooding',
      department_id: 'dept-drain',
      contractor_name: 'NCC Limited',
      category: 'drainage',
      road_name: 'Sinhagad Road',
      locality: 'Vadgaon Budruk',
      ward: 'Ward 12',
      latitude: 18.4768,
      longitude: 73.8285,
      budget: 950,
      status: 'in_progress',
      publication_status: 'published',
      start_date: '2026-05-01',
      original_end_date: '2027-03-31',
      progress_percent: 55,
      confidence_indicator: 'at_risk',
    },
    {
      id: 'proj-0006',
      title: 'Baner Road Gas Pipeline Extension',
      purpose: 'Extend PNG gas pipeline network to new residential developments in Baner',
      department_id: 'dept-gas',
      contractor_name: 'MNGL Gas Distribution',
      category: 'gas_pipeline',
      road_name: 'Baner Road',
      locality: 'Baner',
      ward: 'Ward 3',
      latitude: 18.5590,
      longitude: 73.7868,
      budget: 720,
      status: 'completed',
      publication_status: 'published',
      start_date: '2026-02-01',
      original_end_date: '2026-09-30',
      actual_end_date: '2026-09-25',
      progress_percent: 100,
      confidence_indicator: 'on_track',
    },
  ];

  for (const proj of projects) {
    try {
      const cols = Object.keys(proj).join(', ');
      const placeholders = Object.keys(proj).map((_, i) => `$${i + 1}`).join(', ');
      const vals = Object.values(proj);
      await client.query(
        `INSERT INTO projects (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
        vals
      );
      console.log(`   ✅ ${proj.id}: ${proj.title}`);
    } catch (err) {
      console.error(`   ❌ ${proj.id}: ${err.message}`);
    }
  }

  // Final verification
  console.log('\n--- Final Verification ---');
  const deptCount = await client.query('SELECT count(*) FROM departments');
  const projCount = await client.query('SELECT count(*) FROM projects');
  console.log(`📊 Departments: ${deptCount.rows[0].count}`);
  console.log(`📊 Projects: ${projCount.rows[0].count}`);

  await client.end();
  console.log('\n✅ Database fully seeded and ready!');
}

seedDepartments().catch(console.error);
