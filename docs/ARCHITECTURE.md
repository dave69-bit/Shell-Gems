# Architecture

## Why Angular Can't Call DLLs Directly
Angular runs inside Electron's **Renderer process** — a sandboxed Chromium browser context.
Browser sandboxes have no access to the OS, filesystem, or native libraries by design.
DLL calls require Node.js APIs (`require`, native modules) which are only available in the
**Main process**. The solution is IPC: Angular sends a message, Main calls the DLL, returns the result.

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ELECTRON APP (one process tree)               │
│                                                                      │
│  ┌─────────────────────────────┐      ┌───────────────────────────┐  │
│  │     RENDERER PROCESS        │      │       MAIN PROCESS        │  │
│  │     (Angular UI)            │      │       (Node.js)           │  │
│  │                             │ IPC  │                           │  │
│  │  - Plugin grid              │◄────►│  - Scans plugins/dlls/    │  │
│  │  - Function selector        │      │  - Loads DLLs via edge-js │  │
│  │  - Side panel               │      │  - Handles IPC channels   │  │
│  │  - Dynamic form controls    │      │  - File system access     │  │
│  │  - JSON result viewer       │      │  - Reflection dispatch    │  │
│  │  - File browse + Base64     │      │                           │  │
│  └─────────────────────────────┘      └───────────────────────────┘  │
│                                                                      │
│                    plugins/                                          │
│                    ├── dlls/        ← .dll files live here           │
│                    └── icons/       ← plugin icon images             │
└──────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| UI Framework | Angular (latest stable) | Component architecture, two-way binding for dynamic forms |
| Desktop Shell | Electron | Exposes Node.js APIs to a web UI |
| DLL Interop | `edge-js` | Loads and calls .NET DLLs from Node.js main process |
| IPC Bridge | Electron `contextBridge` + `ipcMain` | Secure renderer↔main communication |
| Styling | SCSS + CSS Grid | Responsive layout, scoped styles per component |
| Bundler | Angular CLI + Electron Builder | Single portable output folder |

## Plugin Model

Each plugin DLL is a self-contained unit that exposes **multiple named functions**.
The Shell never knows what a function does — it only knows its parameter schema and
how to display the JSON result it returns.

The DLL has two distinct layers:

**Public layer (edge-js boundary):** Three methods with the mandatory `Task<object> Method(dynamic input)` signature. Each is a thin wrapper that unpacks the `dynamic` payload and immediately delegates to the private layer. No logic lives here.

**Private layer (no dynamic):** Clean, typed methods with explicit signatures. All business logic, parameter casting, and reflection dispatch live here.

```
Plugin DLL — Public surface (edge-js boundary)
├── GetFunctions(dynamic)  →  delegates → GetFunctions()
├── GetParams(dynamic)     →  unpacks functionName → GetParams(string)
└── Execute(dynamic)       →  unpacks functionName + parameters
                                    → Execute(string, IDictionary<string, object>)

Plugin DLL — Private implementation (no dynamic)
├── GetFunctions()
├── GetParams(string functionName)
├── Execute(string functionName, IDictionary<string, object> parameters)  ← reflection dispatcher
│       calls private method by name via BindingFlags.NonPublic | Instance
│
├── Compress(IDictionary<string, object>)        → returns JSON-serializable object
├── ExtractMetadata(IDictionary<string, object>) → returns JSON-serializable object
└── ValidateSchema(IDictionary<string, object>)  → returns JSON-serializable object
```

`dynamic` never propagates past the public boundary. All type casting happens once, at the top of each public method, before delegation.

## IPC Communication Pattern

```
Angular Component
      │
      ▼
Angular Service (e.g. PluginService)
      │  calls window.electronAPI.invoke('channel:name', payload)
      ▼
preload.ts  (contextBridge exposes electronAPI)
      │
      ▼
main/ipc/handlers.ts  (ipcMain.handle)
      │
      ├── plugins:list       → pluginScanner.ts
      ├── plugins:functions  → pluginLoader.ts → DLL.GetFunctions()
      ├── plugins:params     → pluginLoader.ts → DLL.GetParams(functionName)
      └── plugins:execute    → pluginLoader.ts → DLL.Execute(functionName, params)
                                                      │
                                                      └── DLL uses reflection
                                                          to call internal method
```

**Rule:** Angular components never call `window.electronAPI` directly.
They always go through an Angular service. This keeps components testable and decoupled.

## User Interaction Flow

```
1. App loads → plugins:list → plugin grid rendered
       │
       ▼
2. User clicks plugin → plugins:functions → function list rendered in side panel
       │
       ▼
3. User selects a function → plugins:params → dynamic form rendered for that function
       │
       ▼
4. User fills form → clicks Execute → plugins:execute → JSON result displayed in panel
       │
       ▼
5. User can select a different function (step 3) or close the panel
```

The side panel is divided into three regions:
- **Function selector** (top) — tab/list of available functions
- **Parameter form** (middle) — dynamic controls for the selected function
- **Result viewer** (bottom) — formatted JSON output, appears after Execute

## Folder Structure

```
shell-plugin/
│
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md          ← This file
│   ├── API_CONTRACT.md
│   ├── UI.md
│   └── PROGRESS.md
│
├── package.json
├── scripts/build.js
│
├── main/
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
│       ├── pluginScanner.ts     ← Scans plugins/dlls/ on startup
│       ├── pluginLoader.ts      ← Loads DLLs via edge-js; calls GetFunctions,
│       │                           GetParams, Execute on the DLL
│       └── handlers.ts          ← Registers all ipcMain.handle channels:
│                                   plugins:list, plugins:functions,
│                                   plugins:params, plugins:execute
│
├── renderer/
│   ├── angular.json
│   ├── tsconfig.json
│   └── src/
│       ├── main.ts
│       └── app/
│           ├── app.module.ts
│           ├── app.component.ts
│           ├── services/
│           │   ├── plugin.service.ts    ← Wraps all window.electronAPI calls
│           │   └── file.service.ts      ← File reading + Base64 encoding
│           └── components/
│               ├── plugin-grid/         ← Home screen icon grid
│               ├── plugin-icon/         ← Single icon card + status dot
│               ├── side-panel/          ← Sliding drawer (hosts all 3 regions)
│               ├── function-selector/   ← NEW: tab/list of functions for a plugin
│               ├── dynamic-form/        ← Builds controls from param schema
│               ├── result-viewer/       ← NEW: formatted JSON output display
│               └── controls/
│                   ├── text-control/
│                   ├── number-control/
│                   ├── boolean-control/
│                   ├── range-control/
│                   └── file-control/
│
└── plugins/
    ├── dlls/
    └── icons/
```

## Portability Design

The app is built as a **self-contained portable package** using Electron Builder:

- Output: a single folder (`dist/win-unpacked/`) that can be zipped and copied anywhere
- No installer required — just run `ShellPlugin.exe`
- All Node modules bundled — no `npm install` needed on target
- No .NET runtime needed — `edge-js` bundles the CLR host
- All paths resolved via `app.getAppPath()` — never hardcoded
- `plugins/` folder is copied into the dist output and resolved at runtime

### Portability Rules for Claude
- Never use `__dirname` alone — always combine with `app.getAppPath()`
- Never reference `node_modules` paths at runtime
- Never use `process.cwd()` for plugin resolution
- The plugins path is always: `path.join(app.getAppPath(), 'plugins')`

## Key Design Decisions

### No Separate Backend Process
All logic lives in Electron's main process.
This eliminates the need to manage a separate server process, port conflicts, or startup ordering.

### contextBridge (not nodeIntegration)
`nodeIntegration: false` is enforced. Angular accesses Node.js only through the
whitelisted `contextBridge` API defined in `preload.ts`.

### edge-js for DLL Interop
`edge-js` is the most reliable way to call .NET DLLs from Node.js without a separate process.
It hosts the CLR inside the Node.js process. Called only from the main process.

### Reflection-Based Dispatch Inside the DLL
The Shell does not need to know anything about what a function does.
It passes `{ functionName, params }` to `Execute()` and the DLL uses
`BindingFlags.NonPublic | BindingFlags.Instance` reflection to route to the right method.

The DLL uses a two-layer design to keep `dynamic` contained at the edge-js boundary:
- Public methods (`dynamic input`) unpack the payload and immediately delegate — no logic
- Private methods use typed signatures (`string`, `IDictionary<string, object>`) — all logic lives here

This means adding a new function to a plugin requires **zero Shell changes** —
only a new private method and an entry in `GetFunctions()`.

### Function Schema Ownership
The DLL owns the parameter schema for each of its functions.
The Shell never hardcodes parameter names, types, or validation rules.
All of this comes from `GetParams(functionName)` at runtime.

### Result as Opaque JSON
The Shell treats the `result` object from `Execute()` as an opaque JSON structure.
It renders it in a syntax-highlighted, collapsible JSON viewer — it does not interpret keys.
This means the DLL author has full freedom over what the result shape looks like.

### File as Base64
Files selected by the user are read in the renderer via the File API (no fs needed),
encoded to Base64, and passed to the DLL as a string. Decoding is the DLL's responsibility.

## Port Configuration
No port needed — IPC replaces HTTP. There is no localhost server.
