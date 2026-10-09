const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhycHFnc3p3aWdkcmN3YmtwZHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NzAxOTIsImV4cCI6MjEwNzE0NjE5Mn0.ahFaf2jxd1j3FfXT-EaFM-ausFHJVaETtHW3NN39Aa8';
const baseUrl = 'https://xrpqgszwigdrcwbkpdtt.supabase.co/functions/v1';

async function testEndpoints() {
  const tests = [
    { name: 'get-departments', method: 'GET' },
    { name: 'get-projects', method: 'POST', body: {} },
    { name: 'get-summary-stats', method: 'GET' },
    { name: 'get-clashes', method: 'GET' },
    { name: 'get-grievances', method: 'GET' },
  ];

  console.log('--- Testing Deployed Supabase Edge Functions ---');
  for (const t of tests) {
    try {
      const opts = {
        method: t.method,
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        }
      };
      if (t.body) opts.body = JSON.stringify(t.body);

      const res = await fetch(`${baseUrl}/${t.name}`, opts);
      const json = await res.json();
      if (res.ok && json.success) {
        console.log(`✅ ${t.name}: Status ${res.status} OK | Data received:`, Object.keys(json).filter(k => k !== 'success'));
      } else {
        console.log(`❌ ${t.name}: Status ${res.status} |`, json);
      }
    } catch (err) {
      console.error(`❌ ${t.name} error:`, err.message);
    }
  }
}

testEndpoints();
