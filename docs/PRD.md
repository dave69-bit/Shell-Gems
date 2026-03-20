# PRD — Product Requirements Document

## What We Are Building
A portable desktop application called **Shell-Plugin**.

It presents a mobile-inspired icon grid of installed plugins. Clicking a plugin opens a sliding
side panel. The user selects a function from the plugin's function list, fills in that function's
parameters, clicks Execute, and sees the JSON result — all without leaving the panel.
Everything runs offline, from a single folder, with no installation required.

## Who Is It For
Power users or internal teams who need a unified, clean interface to interact with multiple
independent tools (DLLs) without those tools needing to know about each other.

## Portability Requirement
The app must be **xcopy-deployable**: copy the folder to any Windows machine and run it.
No Node.js, no .NET runtime, no internet connection required on the target machine.

---

## Core Features

### 1. Plugin Grid (Home Screen)
- Scan `<app-root>/plugins/dlls/` on launch and display each DLL as an icon card
- Responsive CSS Grid layout — adapts to window size
- Each card shows: plugin icon, plugin name
- Status dot per card: green (loaded), red (failed to load)

### 2. Side Panel (Plugin Drawer)
- Slides in from the right on plugin icon click
- Header: plugin name + icon + close button
- Three stacked regions: Function Selector, Parameter Form, Result Viewer
- Closing resets all state for that plugin

### 3. Function Selector
Each plugin exposes one or more named functions. After clicking a plugin:
- The Shell calls `plugins:functions` to get the function list
- Functions are displayed as a horizontal tab strip at the top of the panel
- Selecting a function loads its parameter schema and resets the form
- Each function tab shows its `label`; hovering shows the `description` as a tooltip

### 4. Dynamic Parameter Form
The Shell builds the form entirely from the selected function's parameter schema.
Supported types:

| Type | UI Control | Value Passed to DLL |
|------|-----------|---------------------|
| `text` | Text input | String |
| `number` | Number input (min/max enforced) | Number |
| `boolean` | Toggle switch | Boolean |
| `range` | Slider with live value display | Number |
| `file` | Label + Browse button + selected filename | Base64 string of file content |

Switching function tabs resets the form to the new function's default values.

### 5. File Parameter (Detail)
- Shows a "Browse…" button and a label displaying the selected filename
- On selection, reads the file content and encodes it as a Base64 string
- The Base64 string is what gets passed to the DLL — not the path
- Supports optional `accept` filter (e.g. `".csv,.txt"`) defined in the schema
- File size limit: configurable per-parameter via `maxSizeKb` in schema (default: 10MB)

### 6. Execute and JSON Result Display
- The Execute button sends `{ pluginId, functionName, params }` via `plugins:execute`
- The DLL dispatches to the right internal method using .NET reflection
- The result is a JSON object whose shape is defined entirely by the DLL
- The Shell displays the result in a syntax-highlighted, scrollable JSON viewer
- The result area is hidden before the first Execute and expands when a result arrives
- Each new Execute replaces the previous result
- A Copy button lets the user copy the raw JSON to clipboard

### 7. Reflection-Based Function Dispatch (DLL Side)
- The DLL exposes three public methods: `GetFunctions`, `GetParams`, `Execute`
- `Execute` receives `{ functionName, params }` and uses `BindingFlags.NonPublic | BindingFlags.Instance`
  reflection to call the matching private method by name
- Adding a new function to a plugin requires zero Shell changes — only a new private method
  and an entry in `GetFunctions`

### 8. Plugin Independence
- Each plugin operates in complete isolation
- Plugin A cannot access data or state belonging to Plugin B
- A DLL crash must not affect the Shell or other plugins (caught in main process)

### 9. Health Check on Activation
- Before rendering the side panel, the Shell pings the plugin via `plugins:functions`
- Unresponsive → show error with Retry button
- User cancels → close panel, reset state

### 10. Error Handling
- DLL fails to load at startup → log error, show red status dot, skip and continue
- Function list fetch fails → show Retry button in panel
- Params fetch fails → show Retry button in form area
- Execute fails → show inline error in result viewer, do not close panel
- File too large → show inline validation error before sending

---

## What This Project Is NOT
- Not a cloud or networked application — localhost and offline only
- Not a plugin installer or marketplace
- The Shell does not execute DLL code in the renderer — only the main process does
- No user accounts, no persistence of form values between sessions
- The Shell does not interpret result JSON — it only displays it

## Success Criteria
- Launching the app shows all plugins within 2 seconds on a cold start
- Clicking a plugin icon opens its panel and function list within 500ms
- Selecting a function renders its form within 200ms
- Execute sends data, receives result, and displays JSON within the DLL's processing time + 100ms overhead
- Dropping a new DLL in `/plugins/dlls/` and restarting the app shows it in the grid
- Adding a new function to an existing DLL (without Shell changes) makes it appear in the function selector on next restart
- The entire app folder can be copied to a new machine and run without any setup
