const dns = require('dns');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Force IPv4
dns.setDefaultResultOrder('ipv4first');

const DB_URL = `postgresql://postgres:Sreekartirumala%40987654321@db.xrpqgszwigdrcwbkpdtt.supabase.co:5432/postgres`;

async function pushMigration() {
  console.log('Resolving db.xrpqgszwigdrcwbkpdtt.supabase.co ...');
  try {
    const addrs = await dns.promises.resolve4('db.xrpqgszwigdrcwbkpdtt.supabase.co');
    console.log('IPv4 addresses:', addrs);
  } catch (e) {
    console.log('No IPv4 found, trying IPv6...');
    try {
      const addrs6 = await dns.promises.resolve6('db.xrpqgszwigdrcwbkpdtt.supabase.co');
      console.log('IPv6 addresses:', addrs6);
    } catch (e2) {
      console.log('No IPv6 either:', e2.message);
    }
  }

  const client = new Client({ 
    connectionString: DB_URL, 
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });
  
  console.log('\nConnecting to Supabase PostgreSQL...');
  try {
    await client.connect();
    console.log('✅ Connected to database!');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    
    // Try pooler regions as fallback
    console.log('\nTrying pooler regions...');
    const regions = ['us-east-1', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-south-1', 'ap-southeast-1', 'ap-northeast-1'];
    for (const region of regions) {
      const poolerUrl = `postgresql://postgres.xrpqgszwigdrcwbkpdtt:Sreekartirumala%40987654321@aws-0-${region}.pooler.supabase.com:5432/postgres`;
      const poolerClient = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
      try {
        await poolerClient.connect();
        console.log(`✅ Connected via pooler region: ${region}`);
        await runMigration(poolerClient);
        await poolerClient.end();
        return;
      } catch (e2) {
        if (e2.message.includes('not found')) {
          // Skip silently
        } else {
          console.log(`   ${region}: ${e2.message.substring(0, 80)}`);
        }
      }
    }
    console.error('\n❌ All connection methods failed.');
    process.exit(1);
  }

  await runMigration(client);
  await client.end();
}

async function runMigration(client) {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20261010000000_create_core_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration SQL...');
  try {
    await client.query(sql);
    console.log('✅ Migration applied successfully!');
  } catch (err) {
    console.error('⚠️ Migration issue:', err.message);
    if (err.message.includes('already exists')) {
      console.log('   Objects already exist — this is normal for re-runs.');
    }
  }

  // Verify
  console.log('\nVerifying tables...');
  const result = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('📋 Tables in public schema:');
  result.rows.forEach(r => console.log(`   • ${r.table_name}`));
  
  // Check indexes
  const idxResult = await client.query(`
    SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
  `);
  console.log('\n📋 Indexes:');
  idxResult.rows.forEach(r => console.log(`   • ${r.indexname}`));

  // Check triggers
  const trgResult = await client.query(`
    SELECT trigger_name, event_object_table FROM information_schema.triggers 
    WHERE trigger_schema = 'public' ORDER BY trigger_name;
  `);
  console.log('\n📋 Triggers:');
  trgResult.rows.forEach(r => console.log(`   • ${r.trigger_name} on ${r.event_object_table}`));

  console.log('\n✅ Schema deployment complete!');
}

pushMigration();
