const dns = require('dns');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

dns.setDefaultResultOrder('ipv4first');

const DB_URL = `postgresql://postgres.xrpqgszwigdrcwbkpdtt:Sreekartirumala%40987654321@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`;

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('✅ Connected to remote database!\n');

  // 1. Execute SQL Migration
  const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20261010000001_add_extended_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('Executing extended tables migration (20261010000001_add_extended_tables.sql)...');
  try {
    await client.query(sql);
    console.log('✅ Migration applied successfully!\n');
  } catch (err) {
    console.error('⚠️ Migration note:', err.message);
  }

  // 2. Seed Contractors
  console.log('Seeding contractors...');
  const contractors = [
    { company_name: 'Hindustan Construction Co.', contact_person: 'Rajesh Sharma', email: 'r.sharma@hcc.com', phone: '+91-9823011223', rating: 4.6, active_projects_count: 3 },
    { company_name: 'Tata Projects Ltd.', contact_person: 'Anita Deshmukh', email: 'anita.d@tataprojects.com', phone: '+91-9822055667', rating: 4.8, active_projects_count: 5 },
    { company_name: 'Larsen & Toubro Ltd.', contact_person: 'Vikram Patel', email: 'v.patel@lntecc.com', phone: '+91-9890123456', rating: 4.9, active_projects_count: 7 },
    { company_name: 'Sterlite Technologies', contact_person: 'Amit Verma', email: 'a.verma@sterlite.com', phone: '+91-9876543210', rating: 4.2, active_projects_count: 2 },
    { company_name: 'NCC Limited', contact_person: 'Suresh Kulkarni', email: 'suresh.k@nccltd.in', phone: '+91-9850011447', rating: 4.4, active_projects_count: 4 },
    { company_name: 'MNGL Gas Distribution', contact_person: 'Priya Joshi', email: 'p.joshi@mngl.in', phone: '+91-9821199887', rating: 4.5, active_projects_count: 2 },
  ];

  for (const c of contractors) {
    await client.query(
      `INSERT INTO contractors (company_name, contact_person, email, phone, rating, active_projects_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (company_name) DO NOTHING`,
      [c.company_name, c.contact_person, c.email, c.phone, c.rating, c.active_projects_count]
    );
  }
  console.log('   ✅ Contractors seeded.');

  // 3. Seed Clashes
  console.log('Seeding clashes...');
  const clashes = [
    {
      id: 'clash-001',
      title: 'Water Pipeline vs. Underground Power Ducting Conflict',
      road_name: 'JM Road',
      project_a_id: 'proj-0002',
      project_b_id: 'proj-0003',
      department_a_id: 'dept-water',
      department_b_id: 'dept-electric',
      conflict_type: 'trenching_sequence',
      severity: 'high',
      status: 'pending_review',
      suggested_resolution: 'Delay power cable trenching by 14 days until water pipeline hydrostatic testing completes.',
      joint_inspection_date: '2026-10-18',
    },
    {
      id: 'clash-002',
      title: 'Simultaneous Digging on FC Road Bottleneck',
      road_name: 'FC Road',
      project_a_id: 'proj-0001',
      project_b_id: 'proj-0004',
      department_a_id: 'dept-pwd',
      department_b_id: 'dept-telecom',
      conflict_type: 'simultaneous_digging',
      severity: 'critical',
      status: 'pending_review',
      suggested_resolution: 'Implement single-lane diversion schedule and joint duct sharing agreement.',
      joint_inspection_date: '2026-10-20',
    }
  ];

  for (const cl of clashes) {
    await client.query(
      `INSERT INTO clashes (id, title, road_name, project_a_id, project_b_id, department_a_id, department_b_id, conflict_type, severity, status, suggested_resolution, joint_inspection_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [cl.id, cl.title, cl.road_name, cl.project_a_id, cl.project_b_id, cl.department_a_id, cl.department_b_id, cl.conflict_type, cl.severity, cl.status, cl.suggested_resolution, cl.joint_inspection_date]
    );
  }
  console.log('   ✅ Clashes seeded.');

  // 4. Seed Grievances
  console.log('Seeding grievances...');
  const grievances = [
    {
      id: 'rep-001',
      reference_id: 'GRV-2026-8801',
      project_id: 'proj-0003',
      category: 'delay',
      title: 'JM Road Trench left open past deadline without safety barricades',
      description: 'The electrical department trench has been unattended for 5 days. Deep excavation poses fall hazard for pedestrians near Goodluck Chowk.',
      road_name: 'JM Road',
      locality: 'Shivaji Nagar',
      ward: 'Ward 5',
      reporter_name: 'Rohan Deshpande',
      reporter_contact: 'rohan.d@gmail.com',
      status: 'investigating',
      officer_response: 'Site supervisor instructed to install reflective barricades immediately.',
      upvotes: 24,
    },
    {
      id: 'rep-002',
      reference_id: 'GRV-2026-8802',
      project_id: 'proj-0005',
      category: 'safety',
      title: 'Dust pollution and missing water spraying on Sinhagad Road',
      description: 'Heavy dust from storm drain digging causing respiratory discomfort for local shop owners.',
      road_name: 'Sinhagad Road',
      locality: 'Vadgaon Budruk',
      ward: 'Ward 12',
      reporter_name: 'Sneha Kulkarni',
      reporter_contact: 'sneha.k@outlook.com',
      status: 'submitted',
      upvotes: 18,
    }
  ];

  for (const g of grievances) {
    await client.query(
      `INSERT INTO grievances (id, reference_id, project_id, category, title, description, road_name, locality, ward, reporter_name, reporter_contact, status, officer_response, upvotes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO NOTHING`,
      [g.id, g.reference_id, g.project_id, g.category, g.title, g.description, g.road_name, g.locality, g.ward, g.reporter_name, g.reporter_contact, g.status, g.officer_response, g.upvotes]
    );
  }
  console.log('   ✅ Grievances seeded.');

  // 5. Seed Contractor Evaluations
  console.log('Seeding contractor evaluations...');
  await client.query(`
    INSERT INTO contractor_evaluations (contractor_name, project_id, quality_score, timeliness_score, safety_score, cooperation_score, overall_rating, comments)
    VALUES 
      ('Hindustan Construction Co.', 'proj-0001', 4.5, 4.2, 4.8, 4.6, 4.5, 'High quality asphalt laying, good compliance with safety standards.'),
      ('MNGL Gas Distribution', 'proj-0006', 4.8, 4.9, 4.7, 4.8, 4.8, 'Completed 5 days ahead of schedule with zero trench safety violations.')
    ON CONFLICT DO NOTHING;
  `);
  console.log('   ✅ Contractor evaluations seeded.');

  // 6. Seed Audit Logs
  console.log('Seeding audit logs...');
  await client.query(`
    INSERT INTO audit_logs (action_type, entity_type, entity_id, actor_name, details)
    VALUES 
      ('CREATE_PROJECT', 'projects', 'proj-0001', 'PWD Admin Officer', '{"title": "MG Road Resurfacing Phase 2", "budget": 850}'),
      ('REVISE_DEADLINE', 'projects', 'proj-0003', 'MSEDCL Chief Engineer', '{"previous_end_date": "2026-12-31", "revised_end_date": "2027-03-15", "reason": "Delay in high-voltage transformer clearance"}')
    ON CONFLICT DO NOTHING;
  `);
  console.log('   ✅ Audit logs seeded.');

  // 7. Verify all tables in public schema
  console.log('\n--- Final Schema Table List ---');
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('📋 All Tables in Supabase public schema:');
  res.rows.forEach(r => console.log(`   • ${r.table_name}`));

  await client.end();
  console.log('\n✅ All extended tables created and seeded successfully!');
}

main().catch(console.error);
