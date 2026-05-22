# Electron Desktop App Design

## Goal

Convert the NEC Study App from an Angular SSR web server into a Windows desktop application using Electron. The existing Express backend and Angular frontend are preserved unchanged. The desktop shell adds secure Claude API key storage (infrastructure only — no AI features yet) and packages everything as a Windows NSIS installer.

## Architecture

Electron's **main process** (`electron/main.ts`) owns the Node.js runtime. On startup it:

1. Finds a free TCP port using Node's `net` module.
2. Sets `NEC_PDF_PATH` to the bundled PDF location and starts the Express server by importing `dist/nec-study-app/server/server.mjs`.
3. Waits for the server to emit its ready log, then opens a `BrowserWindow` pointed at `http://localhost:{port}`.

The Angular app inside the `BrowserWindow` communicates with Express via HTTP exactly as it does today. No changes to Angular components, services, or the Express API.

A **preload script** (`electron/preload.ts`) uses `contextBridge` to expose `window.electronAPI` to the renderer with two methods:

- `saveApiKey(key: string): Promise<void>` — encrypts the key via `safeStorage.encryptString()` and writes it to a JSON file in `app.getPath('userData')`.
- `getApiKey(): Promise<string>` — reads and decrypts the stored key; returns `''` if none is saved.

`safeStorage` is backed by Windows DPAPI, the same credential store Windows uses for browser passwords. The key is never stored in plaintext.

## Components

### `electron/main.ts`
- Entry point for the Electron main process.
- Responsibilities: free-port discovery, `NEC_PDF_PATH` resolution (packaged vs dev), Express server spawn, `BrowserWindow` creation, IPC handler registration for `api-key:get` and `api-key:save`.
- Window config: 1200×800 minimum size, title "NEC Study App", `webPreferences: { preload, contextIsolation: true, nodeIntegration: false }`.

### `electron/preload.ts`
- Runs in renderer context with Node access, before page scripts.
- Exposes `window.electronAPI` via `contextBridge.exposeInMainWorld`.
- Two channels: `api-key:get` (invoke) and `api-key:save` (invoke).

### `electron/tsconfig.json`
- Compiles `electron/` TypeScript to `dist-electron/` as CommonJS (`"module": "commonjs"`, `"target": "ES2022"`).

### `src/app/components/settings/settings.component`
- New Angular standalone component at route `/settings`.
- Password input bound to the Claude API key, Save button, success/error status message.
- On init: calls `window.electronAPI.getApiKey()` to pre-populate the field if a key exists.
- On save: calls `window.electronAPI.saveApiKey(key)`.
- Guarded: only renders the `electronAPI` form when `window.electronAPI` exists (so the route also works in browser dev mode, showing a "desktop only" notice).

### `src/app/app.routes.ts`
- Adds `{ path: 'settings', loadComponent: () => import('./components/settings/settings.component')... }`.

### `src/app/app.component.html`
- Adds a Settings nav link in the Material toolbar alongside Browse and Search.

### `electron-builder.json`
- `appId`: `com.nec.studyapp`
- `productName`: `NEC Study App`
- `win.target`: `nsis`
- `win.icon`: `src/assets/icons/icon.ico` (to be created)
- `extraResources`: `[{ "from": "src/assets/nec-book.pdf", "to": "nec-book.pdf" }]` — bundles the PDF into `resources/nec-book.pdf` in the installed app.
- `directories.output`: `release/`

## PDF Extraction Improvement

The current `pdf-parse` wrapper produces low-quality text: page headers/footers bleed into content (causing duplicate article detection), and some ligatures render incorrectly (`fI` → `fi`, `pmnitted` → `permitted`).

**Replacement approach:** Use `pdfjs-dist` directly via `getTextContent()`, which returns each text item with its X/Y position on the page. This enables two improvements:

1. **Header/footer filtering** — discard any text item whose Y coordinate falls in the top 8% or bottom 5% of the page viewport. These are running headers like "ARTICLE 90 — INTRODUCTION" and page numbers that were polluting the article/section parser.

2. **Line reconstruction** — group text items by Y coordinate (within a 2pt tolerance), sort groups top-to-bottom, then join items within each line. This produces clean line-delimited text that `parseNecText` can parse reliably.

`pdf-parse` is removed as a dependency. `pdfjs-dist` (already installed transitively) becomes a direct dependency. The worker is disabled for Node.js (`GlobalWorkerOptions.workerSrc = ''`), and the existing `DOMMatrix` stub is kept since pdfjs-dist still checks for it at init time.

**Changes confined to `server/pdf.service.ts`:**
- Remove `createRequire` / `_require('pdf-parse')` block
- Import `getDocument` and `GlobalWorkerOptions` from `pdfjs-dist/legacy/build/pdf.mjs`
- New private `extractText(buffer: Buffer): Promise<string>` method — loads the doc, iterates pages, filters by Y position, reconstructs lines, joins pages with `\n`
- `load()` calls `extractText()` instead of pdf-parse

`parseNecText` and all other server services remain unchanged.

## PDF Path Resolution

```typescript
const pdfPath = app.isPackaged
  ? path.join(process.resourcesPath, 'nec-book.pdf')
  : path.resolve(process.cwd(), 'src', 'assets', 'nec-book.pdf');
```

## Build Scripts

Added to `package.json`:

```json
"electron:dev":   "concurrently \"ng build --watch --configuration development\" \"node scripts/electron-dev.js\"",
"electron:build": "ng build && tsc -p electron/tsconfig.json",
"electron:dist":  "npm run electron:build && electron-builder --win"
```

`scripts/electron-dev.js` — waits for `dist/nec-study-app/server/server.mjs` to exist (using `wait-on`), then spawns `electron .`.

## New devDependencies

- `electron` — desktop shell
- `electron-builder` — packages + creates Windows NSIS installer
- `concurrently` — run Angular watch + Electron dev in parallel
- `wait-on` — wait for dist file before launching Electron in dev mode
- `pdfjs-dist` — promoted from transitive to direct dependency (replaces pdf-parse)

## Output

- **Dev**: `npm run electron:dev` — opens a desktop window backed by a live-reloading Angular build.
- **Installer**: `npm run electron:dist` → `release/NEC Study App Setup.exe` (~180MB NSIS installer, installs to `%LOCALAPPDATA%\Programs\nec-study-app\`).

## Out of Scope (This Iteration)

- Actual Claude API calls — key storage is wired up but no AI features are built.
- Auto-update of the NEC PDF — infrastructure placeholder only.
- Mac/Linux builds.
- Custom window chrome / frameless window.
- Further PDF parsing improvements beyond header/footer filtering (e.g., table detection, multi-column layout).
