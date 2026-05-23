// electron/main.ts
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import * as path from 'path';
import * as net from 'net';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

function startServer(port: number): Promise<void> {
  const isPackaged = app.isPackaged;

  const serverPath = isPackaged
    ? path.join((process as NodeJS.Process & { resourcesPath: string }).resourcesPath, 'app.asar.unpacked', 'dist', 'nec-study-app', 'server', 'server.mjs')
    : path.join(app.getAppPath(), 'dist', 'nec-study-app', 'server', 'server.mjs');

  const pdfPath = isPackaged
    ? path.join((process as NodeJS.Process & { resourcesPath: string }).resourcesPath, 'nec-book.pdf')
    : path.join(app.getAppPath(), 'src', 'assets', 'nec-book.pdf');

  return new Promise((resolve, reject) => {
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(port),
        NEC_PDF_PATH: pdfPath
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let settled = false;
    let stdoutBuf = '';

    const timeout = setTimeout(() => {
      if (!settled) reject(new Error('Server startup timed out after 60 seconds'));
    }, 60_000);

    serverProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuf += data.toString();
      process.stdout.write(data);
      if (!settled && stdoutBuf.includes('[server] Index ready.')) {
        clearTimeout(timeout);
        settled = true;
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (!settled) reject(new Error(`Server exited (code ${code ?? 'null'}) before emitting ready signal`));
    });
  });
}

function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'NEC Study App',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

ipcMain.handle('api-key:get', () => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return '';
    if (!fs.existsSync(settingsPath)) return '';
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as { encryptedKey?: string };
    if (!data.encryptedKey) return '';
    return safeStorage.decryptString(Buffer.from(data.encryptedKey, 'base64'));
  } catch {
    return '';
  }
});

ipcMain.handle('api-key:save', (_event, key: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this system');
  }
  const encrypted = safeStorage.encryptString(key);
  const tmp = settingsPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ encryptedKey: encrypted.toString('base64') }), 'utf-8');
  fs.renameSync(tmp, settingsPath);
});

app.whenReady().then(async () => {
  const port = await findFreePort();
  await startServer(port);
  createWindow(port);
  app.on('activate', () => { if (mainWindow === null) createWindow(port); });
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  app.quit();
});
