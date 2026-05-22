// scripts/electron-dev.js
const path = require('path');
const { execSync, spawn } = require('child_process');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(ROOT, 'dist', 'nec-study-app', 'server', 'server.mjs');

async function waitForFile(filePath, timeoutMs = 120000) {
  const start = Date.now();
  while (!fs.existsSync(filePath)) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for ${filePath}`);
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function main() {
  console.log('[electron-dev] Waiting for Angular build...');
  await waitForFile(SERVER_ENTRY);

  console.log('[electron-dev] Compiling Electron TypeScript...');
  execSync('npx tsc -p electron/tsconfig.json', { stdio: 'inherit', cwd: ROOT });

  console.log('[electron-dev] Launching Electron...');
  const child = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    cwd: ROOT
  });

  child.on('close', () => process.exit());
}

main().catch(err => { console.error(err); process.exit(1); });
