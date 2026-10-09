const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRef = 'xrpqgszwigdrcwbkpdtt';
const functionsDir = path.join(__dirname, 'supabase', 'functions');

const functions = fs.readdirSync(functionsDir).filter(f => {
  if (f.startsWith('_')) return false;
  return fs.statSync(path.join(functionsDir, f)).isDirectory();
});

console.log(`Found ${functions.length} Edge Functions to deploy:`);
functions.forEach(f => console.log(` • ${f}`));

console.log('\n--- Starting Supabase Edge Function Deployments ---\n');

for (const fn of functions) {
  console.log(`Deploying function [${fn}]...`);
  try {
    const cmd = `npx supabase functions deploy ${fn} --no-verify-jwt --project-ref ${projectRef}`;
    const output = execSync(cmd, { cwd: __dirname, encoding: 'utf-8' });
    console.log(`  ✅ ${fn} deployed successfully!`);
    console.log(`     Endpoint: https://${projectRef}.supabase.co/functions/v1/${fn}`);
  } catch (err) {
    console.error(`  ❌ Failed to deploy [${fn}]:`, err.stdout || err.message);
  }
}

console.log('\n✅ All Edge Function deployments process finished!');
