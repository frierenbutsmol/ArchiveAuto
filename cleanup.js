#!/usr/bin/env node
// Removes the leftovers from the Supabase -> own-server move.
//
// Run from the project root (the folder that contains App.js):
//   node cleanup.js                          shows what would happen, changes nothing
//   node cleanup.js --apply                  does it
//   node cleanup.js --apply --rename-server  also moves supabase/server to server/
//
// Tip: commit your work first (git add -A && git commit -m "before cleanup") so you can undo with git.
// After --apply, run `npm install` once so package-lock.json matches package.json.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const apply = process.argv.includes('--apply');
const renameServer = process.argv.includes('--rename-server');
const p = (...a) => path.join(root, ...a);

if (!fs.existsSync(p('App.js')) || !fs.existsSync(p('package.json'))) {
  console.error('Run this from the project root (the folder that contains App.js and package.json).');
  process.exit(1);
}

console.log(apply ? 'APPLYING changes\n' : 'DRY RUN - nothing will be changed (add --apply to do it)\n');

// ---- helpers ----
function jsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') jsFiles(full, out); }
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}
// App code that stays (everything except the files this script deletes).
const REMOVE_SCREENS = ['Documents.js', 'MaintenanceHistory.js', 'PartsReplaced.js', 'RepairLog.js'];
const keptCode = [
  p('App.js'), p('index.js'),
  ...jsFiles(p('components')).filter((f) => !REMOVE_SCREENS.includes(path.basename(f))),
  ...jsFiles(p('lib')).filter((f) => path.basename(f) !== 'supabase.js'),
  ...jsFiles(p('constants')),
].filter((f) => fs.existsSync(f));
const usedBy = (re) => keptCode.filter((f) => re.test(fs.readFileSync(f, 'utf8')));

let blocked = 0;
function remove(rel, why, guard) {
  const full = p(rel);
  if (!fs.existsSync(full)) { console.log(`  skip     ${rel} (not there)`); return; }
  if (guard) {
    const users = guard();
    if (users.length) {
      blocked++;
      console.log(`  KEEP     ${rel}  <- still imported by: ${users.map((u) => path.relative(root, u)).join(', ')}`);
      return;
    }
  }
  console.log(`  ${apply ? 'deleted ' : 'delete  '} ${rel}  (${why})`);
  if (apply) fs.rmSync(full, { recursive: true, force: true });
}

// ---- 1. Supabase leftovers ----
console.log('Supabase leftovers');
remove('lib/supabase.js', 'old client', () => usedBy(/['"][^'"]*\/supabase['"]/));
remove('supabase/functions', 'old edge function, replaced by POST /ai-chat');
remove('supabase/config.toml', 'Supabase CLI config');
remove('supabase/.temp', 'Supabase CLI cache');

// ---- 2. Unused screens and starter-template files ----
console.log('\nUnused screens and starter-template files');
for (const f of REMOVE_SCREENS) {
  const name = f.replace('.js', '');
  remove(`components/${f}`, 'early mockup, not in the app', () => usedBy(new RegExp(`['"][^'"]*/${name}['"]`)));
}
remove('src', 'Expo starter template, not loaded by index.js/App.js', () => usedBy(/['"][^'"]*\bsrc\//) );
remove('scripts/reset-project.js', 'resets the starter template');
remove('AGENTS.md', 'describes Expo Router, which this app does not use');
if (apply && fs.existsSync(p('scripts')) && fs.readdirSync(p('scripts')).length === 0) fs.rmdirSync(p('scripts'));

// ---- 3. package.json ----
console.log('\npackage.json');
const pkgPath = p('package.json');
const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(pkgRaw);
for (const dep of ['@supabase/supabase-js', 'react-native-url-polyfill']) {
  if (!pkg.dependencies || !(dep in pkg.dependencies)) { console.log(`  skip     ${dep} (not listed)`); continue; }
  const users = usedBy(new RegExp(`['"]${dep.replace(/[/-]/g, '\\$&')}`));
  if (users.length) {
    blocked++;
    console.log(`  KEEP     ${dep}  <- still imported by: ${users.map((u) => path.relative(root, u)).join(', ')}`);
    continue;
  }
  console.log(`  ${apply ? 'removed ' : 'remove  '} ${dep}`);
  delete pkg.dependencies[dep];
}
if (apply) {
  const eol = pkgRaw.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2).replace(/\n/g, eol) + eol);
}

// ---- 4. .env ----
console.log('\n.env');
const envPath = p('.env');
if (!fs.existsSync(envPath)) console.log('  skip     .env (not there)');
else {
  const raw = fs.readFileSync(envPath, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const kept = lines.filter((l) => !/^\s*EXPO_PUBLIC_SUPABASE_/.test(l));
  const n = lines.length - kept.length;
  console.log(`  ${apply ? 'removed ' : 'remove  '} ${n} EXPO_PUBLIC_SUPABASE_* line(s)`);
  if (apply && n) fs.writeFileSync(envPath, kept.join(eol));
}

// ---- 5. Optional: rename the server folder ----
if (renameServer) {
  console.log('\nServer folder');
  if (fs.existsSync(p('supabase/server')) && !fs.existsSync(p('server'))) {
    console.log(`  ${apply ? 'moved   ' : 'move    '} supabase/server -> server`);
    if (apply) {
      fs.renameSync(p('supabase/server'), p('server'));
      if (fs.existsSync(p('supabase')) && fs.readdirSync(p('supabase')).length === 0) fs.rmdirSync(p('supabase'));
    }
    // render.yaml tells Render where the server lives; keep it in step with the move.
    const ry = p('render.yaml');
    if (fs.existsSync(ry)) {
      const text = fs.readFileSync(ry, 'utf8');
      if (text.includes('rootDir: supabase/server')) {
        console.log(`  ${apply ? 'updated ' : 'update  '} render.yaml  (rootDir: supabase/server -> server)`);
        if (apply) fs.writeFileSync(ry, text.replace('rootDir: supabase/server', 'rootDir: server'));
      }
    }
  } else console.log('  skip     (supabase/server missing, or server/ already exists)');
}

console.log('');
if (blocked) console.log(`${blocked} item(s) were kept because something still uses them (listed above).`);
if (apply) console.log('Done. Now run: npm install' + (renameServer ? '   and start the server from the new server/ folder.' : ''));
else console.log('This was a dry run. Re-run with --apply to make the changes.');