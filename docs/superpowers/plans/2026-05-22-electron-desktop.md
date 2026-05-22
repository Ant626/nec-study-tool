# Electron Desktop App + PDF Extraction Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pdf-parse with direct pdfjs-dist for cleaner NEC text extraction, then wrap the existing Angular+Express app in an Electron desktop shell with secure Claude API key storage and a Windows NSIS installer.

**Architecture:** pdfjs-dist `getTextContent()` with Y-coordinate-based header/footer filtering replaces pdf-parse. Electron main process finds a free port, spawns `server.mjs` as a child process (via `ELECTRON_RUN_AS_NODE=1`), waits for `[server] Index ready.` on stdout, then opens a `BrowserWindow` at `http://localhost:{port}`. A preload script exposes `window.electronAPI` via `contextBridge` for safeStorage-backed API key persistence.

**Tech Stack:** Electron 33, electron-builder 25, pdfjs-dist 5.4.296, Angular 17 Material, TypeScript, Express 4, vitest 1.6

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `server/pdf.service.ts` | Modify | Replace pdf-parse with pdfjs-dist direct; export `reconstructPageText` |
| `server/pdf.service.spec.ts` | Modify | Add tests for `reconstructPageText` |
| `electron/tsconfig.json` | Create | Compiles `electron/` → `dist-electron/` as CommonJS |
| `electron/main.ts` | Create | Free port, spawn server, BrowserWindow, IPC handlers |
| `electron/preload.ts` | Create | contextBridge exposing `window.electronAPI` |
| `scripts/electron-dev.js` | Create | wait-on + tsc + spawn electron for dev |
| `src/app/components/settings/settings.component.ts` | Create | API key form, isElectron guard |
| `src/app/components/settings/settings.component.html` | Create | Password input + Save button |
| `src/app/components/settings/settings.component.css` | Create | Layout |
| `src/app/app.routes.ts` | Modify | Add `/settings` lazy route |
| `src/app/app.component.html` | Modify | Add Settings nav link |
| `electron-builder.json` | Create | NSIS installer config, asarUnpack server files |
| `package.json` | Modify | `"main"`, new scripts, add electron deps |
| `angular.json` | Modify | Add `pdfjs-dist` to externalDependencies |

---

### Task 1: Install Dependencies and Update Config

**Files:**
- Modify: `package.json`
- Modify: `angular.json`

- [ ] **Step 1: Install Electron and build tooling**

```powershell
cd D:\Developer\Developer\nec-study-app\nec-study-app
npm install --save-dev electron@^33.0.0 electron-builder@^25.0.0 concurrently@^9.0.0 wait-on@^8.0.0
```

Expected: packages added to `devDependencies` in package.json.

- [ ] **Step 2: Add pdfjs-dist as a direct dependency and remove pdf-parse**

```powershell
npm install pdfjs-dist@5.4.296
npm uninstall pdf-parse
```

Expected: `pdfjs-dist` in `dependencies`, `pdf-parse` removed.

- [ ] **Step 3: Add `"main"` field and new scripts to package.json**

Open `package.json`. Add `"main": "dist-electron/main.js"` at the top level (alongside `"name"`, `"version"`). Add these four scripts to the `"scripts"` block:

```json
"electron:dev":   "concurrently \"ng build --watch --configuration development\" \"node scripts/electron-dev.js\"",
"electron:build": "ng build && tsc -p electron/tsconfig.json",
"electron:dist":  "npm run electron:build && electron-builder --win",
"electron:compile": "tsc -p electron/tsconfig.json"
```

- [ ] **Step 4: Mark pdfjs-dist as external in angular.json**

In `angular.json`, find the `"options"` block under `"build"` → `"architect"` → `"build"`. Update `"externalDependencies"` (already has `"pdf-parse"`) to include `pdfjs-dist`:

```json
"externalDependencies": ["pdfjs-dist"]
```

(Remove `"pdf-parse"` since that package is now uninstalled.)

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json angular.json
git commit -m "chore: install electron deps, remove pdf-parse, mark pdfjs-dist external"
```

---

### Task 2: Replace pdf-parse with Direct pdfjs-dist (TDD)

**Files:**
- Modify: `server/pdf.service.spec.ts`
- Modify: `server/pdf.service.ts`

The key improvement: `reconstructPageText` filters items by Y coordinate (removing page headers/footers) and reconstructs lines left-to-right. This is a pure function — export it for testing.

- [ ] **Step 1: Write failing tests for `reconstructPageText`**

Replace the contents of `server/pdf.service.spec.ts` with:

```typescript
// server/pdf.service.spec.ts
import { describe, it, expect } from 'vitest';
import { parseNecText, reconstructPageText } from './pdf.service';

// ─── reconstructPageText tests ────────────────────────────────────────────────

const PAGE_HEIGHT = 792; // standard US Letter in points

type MockItem = { str: string; transform: number[]; hasEOL: boolean };

function item(str: string, x: number, y: number): MockItem {
  return { str, transform: [1, 0, 0, 1, x, y], hasEOL: false };
}

describe('reconstructPageText', () => {
  it('returns body text within the page', () => {
    const result = reconstructPageText([item('Body text', 50, 400)], PAGE_HEIGHT);
    expect(result).toBe('Body text');
  });

  it('filters out header items above 92% of page height', () => {
    // y=750 > 792*0.92=729 → header zone
    const result = reconstructPageText(
      [item('ARTICLE 90 — INTRO', 50, 750), item('Body text', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).not.toContain('ARTICLE 90 — INTRO');
    expect(result).toContain('Body text');
  });

  it('filters out footer items below 5% of page height', () => {
    // y=20 < 792*0.05=39.6 → footer zone
    const result = reconstructPageText(
      [item('42', 300, 20), item('Body text', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).not.toContain('42');
    expect(result).toContain('Body text');
  });

  it('groups items on the same line and sorts left-to-right', () => {
    const result = reconstructPageText(
      [item('World', 200, 400), item('Hello ', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('Hello World');
  });

  it('sorts lines top-to-bottom (higher Y value = higher on page)', () => {
    const result = reconstructPageText(
      [item('Line 2', 50, 300), item('Line 1', 50, 500)],
      PAGE_HEIGHT
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Line 1');
    expect(lines[1]).toBe('Line 2');
  });

  it('groups items within 2pt Y tolerance onto the same line', () => {
    // y=400 and y=401 should be on same line
    const result = reconstructPageText(
      [item('B', 100, 401), item('A ', 50, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('A B');
  });

  it('returns empty string for empty items array', () => {
    expect(reconstructPageText([], PAGE_HEIGHT)).toBe('');
  });

  it('ignores whitespace-only items', () => {
    const result = reconstructPageText(
      [item('   ', 50, 400), item('Text', 100, 400)],
      PAGE_HEIGHT
    );
    expect(result).toBe('Text');
  });
});

// ─── parseNecText tests (unchanged) ───────────────────────────────────────────

const SAMPLE = `
ARTICLE 100 – Definitions
100.1 Scope.
This article contains definitions essential to the application of the NEC.
100.2 Standard Definitions.
Accessible. Admitting close approach; not guarded by locked doors.

ARTICLE 210 – Branch Circuits
210.1 Scope.
This article covers branch circuits except for motor loads.
210.2 Other Articles.
All other applicable articles of the NEC shall apply.
`;

describe('parseNecText', () => {
  it('extracts two articles', () => {
    const articles = parseNecText(SAMPLE);
    expect(articles).toHaveLength(2);
  });

  it('parses article 100 id and title', () => {
    const articles = parseNecText(SAMPLE);
    expect(articles[0].id).toBe('100');
    expect(articles[0].title).toContain('Definition');
  });

  it('extracts sections for article 100', () => {
    const articles = parseNecText(SAMPLE);
    const a100 = articles.find(a => a.id === '100')!;
    expect(a100.sections.length).toBeGreaterThanOrEqual(2);
    expect(a100.sections[0].sectionNumber).toBe('100.1');
    expect(a100.sections[0].content).toContain('definitions');
  });

  it('parses article 210 sections', () => {
    const articles = parseNecText(SAMPLE);
    const a210 = articles.find(a => a.id === '210')!;
    expect(a210.sections.length).toBeGreaterThanOrEqual(1);
    expect(a210.sections[0].sectionNumber).toBe('210.1');
  });

  it('returns empty array for empty text', () => {
    expect(parseNecText('')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```powershell
npx vitest run server/pdf.service.spec.ts
```

Expected: FAIL — `reconstructPageText is not exported from './pdf.service'`

- [ ] **Step 3: Rewrite `server/pdf.service.ts`**

```typescript
// server/pdf.service.ts
import { readFile } from 'node:fs/promises';
import type { NecArticle, NecSection } from './types';

// pdfjs-dist checks for DOMMatrix at module load time — stub it for Node.js 18.
if (typeof (globalThis as Record<string, unknown>)['DOMMatrix'] === 'undefined') {
  (globalThis as Record<string, unknown>)['DOMMatrix'] = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(_init?: unknown) {}
  };
}

const ARTICLE_RE = /^ARTICLE\s+(\d+)\s*[–\-—]?\s*(.*)/i;
const SECTION_RE = /^(\d{2,4}\.\d+[A-Z]?)\s+(.*)/;

/**
 * Filters page header/footer items by Y coordinate and reconstructs clean
 * line-delimited text. Exported for unit testing.
 */
export function reconstructPageText(
  items: Array<{ str: string; transform: number[]; hasEOL: boolean }>,
  pageHeight: number
): string {
  const HEADER_THRESHOLD = pageHeight * 0.92;
  const FOOTER_THRESHOLD = pageHeight * 0.05;
  const Y_TOLERANCE = 2;

  const filtered = items.filter(item => {
    if (!item.str.trim()) return false;
    const y = item.transform[5];
    return y >= FOOTER_THRESHOLD && y <= HEADER_THRESHOLD;
  });

  const lineMap = new Map<number, Array<{ str: string; x: number }>>();
  for (const item of filtered) {
    const y = item.transform[5];
    const x = item.transform[4];
    let lineKey: number | undefined;
    for (const key of lineMap.keys()) {
      if (Math.abs(key - y) <= Y_TOLERANCE) { lineKey = key; break; }
    }
    if (lineKey === undefined) { lineKey = y; lineMap.set(lineKey, []); }
    lineMap.get(lineKey)!.push({ str: item.str, x });
  }

  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, lineItems]) =>
      lineItems.sort((a, b) => a.x - b.x).map(i => i.str).join('')
    )
    .join('\n');
}

export function parseNecText(text: string): NecArticle[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const articleMap = new Map<string, NecArticle>();
  const articleOrder: string[] = [];
  let currentArticle: NecArticle | null = null;
  let currentSection: NecSection | null = null;
  const contentBuffer: string[] = [];

  function flushSection(): void {
    if (currentSection && currentArticle) {
      currentSection.content = contentBuffer.join(' ').trim();
      currentArticle.sections.push({ ...currentSection });
      contentBuffer.length = 0;
      currentSection = null;
    }
  }

  for (const line of lines) {
    const articleMatch = line.match(ARTICLE_RE);
    if (articleMatch) {
      flushSection();
      const id = articleMatch[1];
      if (articleMap.has(id)) {
        currentArticle = articleMap.get(id)!;
      } else {
        currentArticle = { id, number: id, title: articleMatch[2].trim() || 'Unknown', sections: [] };
        articleMap.set(id, currentArticle);
        articleOrder.push(id);
      }
      continue;
    }
    if (!currentArticle) continue;
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch && sectionMatch[1].startsWith(currentArticle.id + '.')) {
      flushSection();
      currentSection = {
        id: sectionMatch[1], articleId: currentArticle.id,
        sectionNumber: sectionMatch[1], sectionTitle: sectionMatch[2].trim(),
        content: '', pageStart: 0
      };
      continue;
    }
    if (currentSection) contentBuffer.push(line);
  }

  flushSection();
  return articleOrder.map(id => articleMap.get(id)!);
}

export class PdfService {
  private articles: NecArticle[] = [];

  async load(pdfPath: string): Promise<void> {
    try {
      const buffer = await readFile(pdfPath);
      const text = await this.extractText(buffer);
      this.articles = parseNecText(text);
      console.log(`[PdfService] Loaded ${this.articles.length} articles`);
    } catch (err) {
      throw new Error(`[PdfService] Failed to load PDF at "${pdfPath}": ${(err as Error).message}`);
    }
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    GlobalWorkerOptions.workerSrc = '';

    const loadingTask = getDocument({ data: new Uint8Array(buffer), disableFontFace: true, verbosity: 0 });
    const pdf = await loadingTask.promise;

    const pageTexts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      pageTexts.push(reconstructPageText(textContent.items as Array<{ str: string; transform: number[]; hasEOL: boolean }>, viewport.height));
      page.cleanup();
    }

    await pdf.destroy();
    return pageTexts.join('\n');
  }

  getArticles(): NecArticle[] { return this.articles; }
  getArticle(id: string): NecArticle | undefined { return this.articles.find(a => a.id === id); }
}
```

- [ ] **Step 4: Run all server tests**

```powershell
npx vitest run
```

Expected:
```
✓ server/pdf.service.spec.ts  (13 tests)
✓ server/search.service.spec.ts  (6 tests)
✓ server/api.routes.spec.ts  (6 tests)
Test Files  3 passed (3)
Tests  25 passed (25)
```

- [ ] **Step 5: Rebuild and smoke-test the server manually**

```powershell
npm run build
$env:NEC_PDF_PATH = "D:\Developer\Developer\nec-study-app\nec-study-app\src\assets\nec-book.pdf"
node dist\nec-study-app\server\server.mjs
```

Wait ~30 seconds. Expected stdout:
```
[server] Loading PDF…
[PdfService] Loaded <N> articles
[server] Index ready.
Node Express server listening on http://localhost:4000
```

Then verify:
```powershell
Invoke-RestMethod http://localhost:4000/api/articles | Select-Object -First 3 | ForEach-Object { "$($_.id) - $($_.title)" }
```

Expected: article 90 now shows "INTRODUCTION" (not "fNTRODUCTION 90.2"), and titles are populated. Kill the server with Ctrl+C.

- [ ] **Step 6: Commit**

```powershell
git add server/pdf.service.ts server/pdf.service.spec.ts
git commit -m "feat: replace pdf-parse with direct pdfjs-dist + header/footer filtering"
```

---

### Task 3: Create Electron Main Process

**Files:**
- Create: `electron/tsconfig.json`
- Create: `electron/main.ts`

- [ ] **Step 1: Create `electron/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "../dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 2: Create `electron/main.ts`**

```typescript
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
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'nec-study-app', 'server', 'server.mjs')
    : path.join(app.getAppPath(), 'dist', 'nec-study-app', 'server', 'server.mjs');

  const pdfPath = isPackaged
    ? path.join(process.resourcesPath, 'nec-book.pdf')
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

    serverProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      if (text.includes('[server] Index ready.')) resolve();
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(data.toString());
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) reject(new Error(`Server exited with code ${code}`));
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
    if (!fs.existsSync(settingsPath)) return '';
    const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) as { encryptedKey?: string };
    if (!data.encryptedKey) return '';
    return safeStorage.decryptString(Buffer.from(data.encryptedKey, 'base64'));
  } catch {
    return '';
  }
});

ipcMain.handle('api-key:save', (_event, key: string) => {
  const encrypted = safeStorage.encryptString(key);
  fs.writeFileSync(settingsPath, JSON.stringify({ encryptedKey: encrypted.toString('base64') }), 'utf-8');
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
```

- [ ] **Step 3: Compile electron TypeScript to verify no errors**

```powershell
npx tsc -p electron/tsconfig.json --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add electron/tsconfig.json electron/main.ts
git commit -m "feat: add electron main process with server spawn and BrowserWindow"
```

---

### Task 4: Create Electron Preload Script

**Files:**
- Create: `electron/preload.ts`

- [ ] **Step 1: Create `electron/preload.ts`**

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveApiKey: (key: string): Promise<void> => ipcRenderer.invoke('api-key:save', key),
  getApiKey: (): Promise<string> => ipcRenderer.invoke('api-key:get')
});
```

- [ ] **Step 2: Compile and verify no errors**

```powershell
npx tsc -p electron/tsconfig.json --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add electron/preload.ts
git commit -m "feat: add electron preload with contextBridge for API key IPC"
```

---

### Task 5: Create Settings Angular Component

**Files:**
- Create: `src/app/components/settings/settings.component.ts`
- Create: `src/app/components/settings/settings.component.html`
- Create: `src/app/components/settings/settings.component.css`

- [ ] **Step 1: Create `src/app/components/settings/settings.component.ts`**

```typescript
// src/app/components/settings/settings.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

declare global {
  interface Window {
    electronAPI?: {
      saveApiKey(key: string): Promise<void>;
      getApiKey(): Promise<string>;
    };
  }
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule, MatCardModule, MatIconModule
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  apiKey = '';
  readonly isElectron = typeof window !== 'undefined' && !!window['electronAPI'];

  constructor(private snackBar: MatSnackBar) {}

  async ngOnInit(): Promise<void> {
    if (this.isElectron) {
      this.apiKey = await window.electronAPI!.getApiKey();
    }
  }

  async save(): Promise<void> {
    await window.electronAPI!.saveApiKey(this.apiKey);
    this.snackBar.open('API key saved', 'OK', { duration: 3000 });
  }
}
```

- [ ] **Step 2: Create `src/app/components/settings/settings.component.html`**

```html
<div class="settings-container">
  <mat-card class="settings-card">
    <mat-card-header>
      <mat-card-title>Settings</mat-card-title>
    </mat-card-header>
    <mat-card-content>
      @if (isElectron) {
        <p class="hint">Your API key is encrypted and stored locally using Windows credential storage.</p>
        <mat-form-field appearance="outline" class="key-field">
          <mat-label>Claude API Key</mat-label>
          <input matInput type="password" [(ngModel)]="apiKey" placeholder="sk-ant-api03-...">
          <mat-icon matSuffix>key</mat-icon>
        </mat-form-field>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="save()">Save</button>
        </div>
      } @else {
        <p>Settings are only available in the desktop application.</p>
      }
    </mat-card-content>
  </mat-card>
</div>
```

- [ ] **Step 3: Create `src/app/components/settings/settings.component.css`**

```css
.settings-container {
  display: flex;
  justify-content: center;
  padding: 32px 16px;
}

.settings-card {
  width: 100%;
  max-width: 480px;
}

.hint {
  color: rgba(0, 0, 0, 0.6);
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.key-field {
  width: 100%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
```

- [ ] **Step 4: Run Angular build to verify no compile errors**

```powershell
npx ng build --configuration development 2>&1 | Select-Object -Last 10
```

Expected: build completes, no TypeScript errors.

- [ ] **Step 5: Commit**

```powershell
git add src/app/components/settings/
git commit -m "feat: add settings component with Claude API key form"
```

---

### Task 6: Add Settings Route and Toolbar Nav Link

**Files:**
- Modify: `src/app/app.routes.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.ts`

- [ ] **Step 1: Add `/settings` route to `src/app/app.routes.ts`**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'browse',
    loadComponent: () =>
      import('./components/browse/browse.component').then(m => m.BrowseComponent)
  },
  {
    path: 'search',
    loadComponent: () =>
      import('./components/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/settings/settings.component').then(m => m.SettingsComponent)
  },
  { path: '', redirectTo: '/browse', pathMatch: 'full' }
];
```

- [ ] **Step 2: Add Settings nav link to `src/app/app.component.html`**

```html
<mat-toolbar color="primary">
  <span>NEC Study App</span>
  <span class="spacer"></span>
  <a mat-button routerLink="/browse" routerLinkActive="active-link">Browse</a>
  <a mat-button routerLink="/search" routerLinkActive="active-link">Search</a>
  <a mat-button routerLink="/settings" routerLinkActive="active-link">Settings</a>
</mat-toolbar>
<router-outlet />
```

- [ ] **Step 3: Add `MatIconModule` to `src/app/app.component.ts` imports (needed by settings)**

The `MatIconModule` is used in the settings template. The component already imports it directly, so no change to `app.component.ts` is needed. Verify the build passes:

```powershell
npx ng build --configuration development 2>&1 | Select-Object -Last 10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```powershell
git add src/app/app.routes.ts src/app/app.component.html
git commit -m "feat: add /settings route and toolbar nav link"
```

---

### Task 7: Create electron-builder.json

**Files:**
- Create: `electron-builder.json`

- [ ] **Step 1: Create `electron-builder.json`**

```json
{
  "appId": "com.nec.studyapp",
  "productName": "NEC Study App",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist-electron/**",
    "dist/nec-study-app/**"
  ],
  "asarUnpack": [
    "dist/nec-study-app/server/**"
  ],
  "extraResources": [
    { "from": "src/assets/nec-book.pdf", "to": "nec-book.pdf" }
  ],
  "win": {
    "target": "nsis",
    "icon": "src/favicon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

Note: `src/favicon.ico` is the existing Angular favicon. electron-builder will use it as the app icon. If it is 16×16 it may produce a warning but will still build.

- [ ] **Step 2: Commit**

```powershell
git add electron-builder.json
git commit -m "chore: add electron-builder.json for Windows NSIS installer"
```

---

### Task 8: Create Dev Script and Wire Everything Together

**Files:**
- Create: `scripts/electron-dev.js`

- [ ] **Step 1: Create `scripts/` directory and `scripts/electron-dev.js`**

```javascript
// scripts/electron-dev.js
const path = require('path');
const { execSync } = require('child_process');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SERVER_ENTRY = path.join(ROOT, 'dist', 'nec-study-app', 'server', 'server.mjs');

async function waitForFile(filePath, timeoutMs = 120000) {
  const fs = require('fs');
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
```

- [ ] **Step 2: Verify the full dev workflow**

Open two terminals.

Terminal 1 — watch build:
```powershell
cd D:\Developer\Developer\nec-study-app\nec-study-app
npm run build
```

Wait for `Application bundle generation complete.`

Terminal 2 — compile electron and launch:
```powershell
cd D:\Developer\Developer\nec-study-app\nec-study-app
npx tsc -p electron/tsconfig.json
npx electron .
```

Expected:
- Electron window opens titled "NEC Study App"
- App loads at localhost, shows the toolbar with Browse / Search / Settings
- Browse tab shows article list, clicking an article shows sections
- Search tab accepts queries and returns results
- Settings tab shows the API key password field

Kill Electron when done.

- [ ] **Step 3: Commit**

```powershell
git add scripts/electron-dev.js
git commit -m "chore: add electron-dev.js script for dev workflow"
```

---

### Task 9: Build Windows Installer and Verify

**Files:** none (output only)

- [ ] **Step 1: Run the full production build**

```powershell
cd D:\Developer\Developer\nec-study-app\nec-study-app
npm run electron:dist
```

This runs: `ng build` → `tsc -p electron/tsconfig.json` → `electron-builder --win`.

Expected: `release/NEC Study App Setup.exe` is created (~180MB). The terminal shows `target=nsis` and a file path under `release/`.

- [ ] **Step 2: Run the installer and verify**

Double-click `release\NEC Study App Setup.exe`. Walk through the NSIS installer. After installation, launch "NEC Study App" from the Start menu or desktop shortcut.

Expected:
- App opens as a native Windows window (no browser needed)
- PDF loads automatically (bundled in `resources/nec-book.pdf`)
- Browse and Search work correctly
- Settings → enter a Claude API key → Save → close app → reopen → key is pre-populated

- [ ] **Step 3: Final commit**

```powershell
git add package.json package-lock.json angular.json
git commit -m "chore: finalize electron build pipeline and package.json main field"
```

---

## Self-Review Checklist (completed inline)

- **Spec coverage:**
  - ✅ PDF extraction improvement → Task 2
  - ✅ pdfjs-dist direct via `getTextContent()` → Task 2, Step 3
  - ✅ Y-coordinate header/footer filtering → Task 2, `reconstructPageText`
  - ✅ Line reconstruction → Task 2, `reconstructPageText`
  - ✅ Remove pdf-parse, promote pdfjs-dist → Task 1
  - ✅ Electron main process → Task 3
  - ✅ Free port → Task 3, `findFreePort()`
  - ✅ `ELECTRON_RUN_AS_NODE=1` spawn → Task 3, `startServer()`
  - ✅ Wait for `[server] Index ready.` → Task 3, stdout handler
  - ✅ Preload + contextBridge → Task 4
  - ✅ safeStorage API key → Task 3 IPC handlers
  - ✅ Settings component → Task 5
  - ✅ `/settings` route + nav link → Task 6
  - ✅ electron-builder.json with asarUnpack + extraResources → Task 7
  - ✅ Dev script → Task 8
  - ✅ Windows NSIS installer → Task 9

- **Placeholder scan:** No TBD/TODO. All steps have actual code.

- **Type consistency:** `reconstructPageText` signature is identical in spec file and implementation. `window.electronAPI` declared globally in settings.component.ts and matches preload.ts exactly.
