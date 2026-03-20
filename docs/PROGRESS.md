# Progress Tracker

## Current Status
🔄 **Rebuild in progress**. Multi-function plugin support implemented across IPC and UI layers. Final integration testing pending.

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| (start) | Use Angular instead of React | Requested by design spec |
| (start) | No separate backend process | All DLL logic moves to Electron main process |
| (start) | IPC replaces HTTP/REST | No localhost server needed, cleaner architecture |
| (start) | `contextBridge` with whitelist | Secure Electron pattern, `nodeIntegration: false` |
| (start) | File passed as Base64 string | Keeps file handling in renderer (File API), no fs over IPC |
| (start) | Portable build (no installer) | Offline + xcopy-deployable requirement |
| (start) | `edge-js` for DLL interop | Hosts CLR inside Node.js, no separate .NET process |
| (start) | Target Windows 10 + 11, clean machines | Widest compatibility, assume nothing pre-installed |
| (start) | Bundle VC++ Redist + .NET 6 Runtime in delivery folder | edge-js requires both on clean machines |
| (redesign) | Multi-function plugin model | Each plugin exposes N named functions, each with own params + JSON result |
| (redesign) | Reflection dispatch inside DLL | Shell passes functionName; DLL routes via BindingFlags.NonPublic reflection |
| (redesign) | Result as opaque JSON viewer | Shell never interprets result keys — DLL author owns result shape |
| (redesign) | `plugins:update` → `plugins:execute` | Rename reflects that functions return output, not just apply settings |
| (redesign) | New `plugins:functions` IPC channel | Retrieves function manifest from DLL before showing param form |
| (redesign) | Function selector as tab strip | Compact, scannable, supports 1–many functions |
| (redesign) | Result viewer region in side panel | Persistent area below form; expands on first Execute |

---

## Phase 1 — Project Scaffolding
- [x] Initialize root `package.json` with Electron + Electron Builder deps
- [x] Scaffold Angular app in `/renderer` using Angular CLI
- [x] Configure Angular to output into `renderer/dist/`
- [x] Create `main/main.ts`
- [x] Create `main/preload.ts` with updated channel whitelist:
      `plugins:list`, `plugins:functions`, `plugins:params`, `plugins:execute`
- [x] Verify Electron opens Angular app in a BrowserWindow
- [x] Configure `scripts/build.js` for portable build
- [x] Confirm `plugins/` folder copies into build output

## Phase 2 — Main Process IPC Layer
- [x] Create / update `main/ipc/pluginScanner.ts` — scans `plugins/dlls/`
- [x] Create / update `main/ipc/pluginLoader.ts`:
  - [x] Load DLL via `edge-js`
  - [x] Call `DLL.GetFunctions()` → return function manifest
  - [x] Call `DLL.GetParams({ functionName })` → return param schema
  - [x] Call `DLL.Execute({ functionName, parameters })` → return result object
- [x] Create / update `main/ipc/handlers.ts` — register all 4 channels:
  - [x] `plugins:list`
  - [x] `plugins:functions`
  - [x] `plugins:params`
  - [x] `plugins:execute`
- [x] Test all 4 channels with a mock DLL that implements GetFunctions, GetParams, Execute

## Phase 3 — Angular UI

### Services
- [x] Update `plugin.service.ts` — add `getFunctions()` and `execute()` methods,
      rename `updateParams()` → `execute()`
- [x] Keep `file.service.ts` unchanged

### Components — existing (update)
- [x] `plugin-grid` — no change needed
- [x] `plugin-icon` — no change needed
- [x] `side-panel` — add regions: function-selector slot, result-viewer slot; increase width to 400px
- [x] `dynamic-form` — must accept `functionName` input; reset on function change

### Components — new
- [x] **`function-selector`** component:
  - [x] Horizontal scrollable tab strip
  - [x] Active tab highlights in `$accent` blue
  - [x] Description tooltip on hover
  - [x] Shimmer loading state
  - [x] Error + Retry state
  - [x] Emits `functionSelected` EventEmitter
- [x] **`result-viewer`** component:
  - [x] Hidden (height 0) before first result
  - [x] Expands with `max-height` animation on result arrival
  - [x] Syntax-highlighted JSON display (using `ngx-json-viewer`)
  - [x] Copy to clipboard button
  - [x] Error state (red box, DLL error message)
  - [x] Loading/spinner state during Execute

### Controls — no change needed
- [x] `text-control`
- [x] `number-control`
- [x] `boolean-control`
- [x] `range-control`
- [x] `file-control`

### Wiring
- [x] Execute button → `plugin.service.execute()` → result → `result-viewer`
- [x] Function tab change → reload params → reset form → clear result viewer
- [x] All error states (unresponsive, load failure, execute failure, file too large)
- [x] Rename "Apply" button label to "Execute"

### SCSS
- [x] Add `$bg-result: #0a2240` variable
- [x] Add JSON syntax highlight variables (`$json-key`, `$json-string`, etc.)
- [x] Style `function-selector` tab strip per UI.md
- [x] Style `result-viewer` per UI.md

## Phase 4 — Integration & Polish
- [ ] End-to-end test with a real .dll plugin that has 2+ functions
- [ ] Test function with no params (empty form — Execute should still work)
- [ ] Test function that returns a deeply nested JSON object
- [ ] Test switching functions mid-session (form resets, result clears)
- [x] Skeleton animations on function selector and form area
- [ ] Tooltip on red-dot icon cards
- [ ] Final portable build test on clean machine

## Phase 5 — Delivery Package Assembly
*(same as before — see DELIVERY_PACKAGE.md)*
- [ ] `npm run build:portable` → `dist/win-unpacked/`
- [ ] Assemble `Shell-Gems-Delivery/` folder
- [ ] Test on clean Windows 10 VM
- [ ] Test on clean Windows 11 VM
- [ ] Zip and deliver

---

## Known Issues / Blockers
_None — update this section as you work._
