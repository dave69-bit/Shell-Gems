# API Contract — Angular Renderer ↔ Electron Main (IPC)

## Overview
There is no HTTP server. All communication between the Angular UI and the DLL layer
uses Electron's IPC mechanism via the `contextBridge`.

Each plugin can expose **multiple named functions**. Each function declares its own
parameter schema and returns a JSON result. The Shell selects the function first,
renders its parameters, then calls `plugins:execute`. The DLL handles function
dispatch internally via reflection.

## How to Call from Angular

```typescript
// In any Angular service:
const plugins   = await window.electronAPI.invoke('plugins:list');
const functions = await window.electronAPI.invoke('plugins:functions', { pluginId: 'my-plugin' });
const params    = await window.electronAPI.invoke('plugins:params',    { pluginId: 'my-plugin', functionName: 'Compress' });
const result    = await window.electronAPI.invoke('plugins:execute',   { pluginId: 'my-plugin', functionName: 'Compress', params: { ... } });
```

**Rule:** Never call `window.electronAPI` from a component. Always use a service.

---

## IPC Channels

### 1. `plugins:list`
Returns all plugins found in `plugins/dlls/` at startup.

**Invoke:** No payload.

**Response (success):**
```json
{
  "success": true,
  "plugins": [
    {
      "id": "file-toolkit",
      "name": "File Toolkit",
      "iconPath": "plugins/icons/file-toolkit.png",
      "status": "active"
    },
    {
      "id": "network-monitor",
      "name": "Network Monitor",
      "iconPath": "plugins/icons/network-monitor.png",
      "status": "error",
      "error": "Failed to load assembly"
    }
  ]
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "Could not scan plugins directory"
}
```

---

### 2. `plugins:functions`
Returns the list of functions exposed by a plugin, along with each function's
display name and description. This is the first call after a plugin is selected.

**Invoke payload:**
```json
{ "pluginId": "file-toolkit" }
```

**Response (success):**
```json
{
  "success": true,
  "pluginId": "file-toolkit",
  "functions": [
    {
      "name": "Compress",
      "label": "Compress File",
      "description": "Compresses an input file using GZIP and returns the compressed bytes."
    },
    {
      "name": "ExtractMetadata",
      "label": "Extract Metadata",
      "description": "Reads file headers and returns structured metadata as JSON."
    },
    {
      "name": "ValidateSchema",
      "label": "Validate CSV Schema",
      "description": "Checks a CSV file against an expected column schema."
    }
  ]
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "Plugin file-toolkit could not be loaded"
}
```

> `name` is the **exact method name** in the DLL — it is used as-is for reflection dispatch.
> `label` is the human-readable display string shown in the UI.

---

### 3. `plugins:params`
Returns the UI parameter schema for a specific function within a plugin.
Called after the user selects a function.

**Invoke payload:**
```json
{ "pluginId": "file-toolkit", "functionName": "Compress" }
```

**Response (success):**
```json
{
  "success": true,
  "pluginId": "file-toolkit",
  "functionName": "Compress",
  "params": [
    {
      "key": "inputFile",
      "type": "file",
      "label": "Input File",
      "accept": ".csv,.txt,.log",
      "maxSizeKb": 10240,
      "required": true
    },
    {
      "key": "level",
      "type": "range",
      "label": "Compression Level",
      "min": 1,
      "max": 9,
      "step": 1,
      "defaultValue": 6
    },
    {
      "key": "stripHeaders",
      "type": "boolean",
      "label": "Strip Header Row",
      "defaultValue": false
    }
  ]
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "Function 'Compress' not found on plugin file-toolkit"
}
```

---

### 4. `plugins:execute`
Executes a named function on a plugin DLL, passing the user-provided parameter values.
Returns a structured JSON result from the DLL.

Replaces the former `plugins:update` channel.

**Invoke payload:**
```json
{
  "pluginId": "file-toolkit",
  "functionName": "Compress",
  "params": {
    "inputFile": "SGVsbG8gV29ybGQ=",
    "level": 7,
    "stripHeaders": true
  }
}
```

> `file` type parameters are always passed as Base64-encoded strings.
> All other types are passed as their native JSON types (string, number, boolean).

**Response (success):**
```json
{
  "success": true,
  "pluginId": "file-toolkit",
  "functionName": "Compress",
  "result": {
    "compressedSizeBytes": 1042,
    "originalSizeBytes": 8192,
    "ratio": 0.127,
    "outputFile": "SGVsbG8gV29ybGQ=",
    "durationMs": 34
  }
}
```

> The `result` field is always a JSON object — its shape is defined entirely by the DLL.
> The Shell renders it as a formatted JSON viewer; it does not interpret the keys.

**Response (failure):**
```json
{
  "success": false,
  "error": "DLL method 'Compress' threw an exception: index out of range"
}
```

---

## Parameter Schema — Full Type Reference

| Type | Required Fields | Optional Fields | Value sent to DLL |
|------|----------------|-----------------|-------------------|
| `text` | `key`, `type`, `label` | `defaultValue`, `required`, `placeholder` | `string` |
| `number` | `key`, `type`, `label` | `defaultValue`, `min`, `max`, `required` | `number` |
| `boolean` | `key`, `type`, `label` | `defaultValue` | `boolean` |
| `range` | `key`, `type`, `label`, `min`, `max`, `step` | `defaultValue` | `number` |
| `file` | `key`, `type`, `label` | `accept`, `maxSizeKb`, `required` | `string` (Base64) |

---

## DLL Contract — What the Plugin Must Implement

Every plugin DLL must expose a class with three **public** async methods whose signatures
are dictated by `edge-js` (`Task<object> Method(dynamic input)`). Each public method
is kept as thin as possible — it unpacks the `dynamic` payload immediately and delegates
to a clean private method with an explicit, typed signature. No `dynamic` propagates
beyond the public boundary.

---

### Method 1: `GetFunctions`
Returns the function manifest — the list of functions the plugin exposes.

`dynamic input` is unused; the method is parameterless in practice.

```csharp
// edge-js entry point — thin wrapper
public async Task<object> GetFunctions(dynamic input)
{
    return await GetFunctions();
}

// Clean implementation — no dynamic
private async Task<object> GetFunctions()
{
    return new object[] {
        new {
            name        = "Compress",
            label       = "Compress File",
            description = "Compresses an input file using GZIP and returns compressed bytes."
        },
        new {
            name        = "ExtractMetadata",
            label       = "Extract Metadata",
            description = "Reads file headers and returns structured metadata as JSON."
        }
    };
}
```

---

### Method 2: `GetParams`
Returns the parameter schema for a specific function name.

```csharp
// edge-js entry point — unpacks dynamic immediately
public async Task<object> GetParams(dynamic input)
{
    string functionName = (string)input.functionName;
    return await GetParams(functionName);
}

// Clean implementation — typed signature
private async Task<object> GetParams(string functionName)
{
    switch (functionName)
    {
        case "Compress":
            return new object[] {
                new { key = "inputFile",    type = "file",    label = "Input File",
                      required = true,  accept = ".csv,.txt,.log", maxSizeKb = 10240 },
                new { key = "level",        type = "range",   label = "Compression Level",
                      min = 1, max = 9, step = 1, defaultValue = 6 },
                new { key = "stripHeaders", type = "boolean", label = "Strip Header Row",
                      defaultValue = false }
            };

        case "ExtractMetadata":
            return new object[] {
                new { key = "inputFile", type = "file", label = "Input File", required = true }
            };

        default:
            throw new Exception($"Unknown function: {functionName}");
    }
}
```

---

### Method 3: `Execute`
Dispatches to the correct private function method by name using reflection.
Returns a JSON-serializable result object.

```csharp
// edge-js entry point — unpacks dynamic immediately
public async Task<object> Execute(dynamic input)
{
    string functionName                    = (string)input.functionName;
    IDictionary<string, object> parameters = (IDictionary<string, object>)input.parameters;
    return await Execute(functionName, parameters);
}

// Clean dispatcher — typed signature, uses reflection to route by function name
private async Task<object> Execute(string functionName, IDictionary<string, object> parameters)
{
    var method = GetType().GetMethod(
        functionName,
        BindingFlags.NonPublic | BindingFlags.Instance
    );

    if (method == null)
        throw new Exception($"No method '{functionName}' found on this plugin.");

    return await (Task<object>)method.Invoke(this, new object[] { parameters });
}

// ── Private function implementations ────────────────────────────────────────
// Each function receives a clean IDictionary — no dynamic anywhere below this line.
// Cast values to the expected type; edge-js maps JS types as follows:
//   JS number  → int or double   JS boolean → bool   JS string → string

private async Task<object> Compress(IDictionary<string, object> parameters)
{
    string base64Input = (string)parameters["inputFile"];
    int    level       = (int)   parameters["level"];
    bool   stripHdr    = (bool)  parameters["stripHeaders"];

    byte[] inputBytes = Convert.FromBase64String(base64Input);
    // ... compression logic ...

    return new {
        compressedSizeBytes = 1042,
        originalSizeBytes   = inputBytes.Length,
        ratio               = 0.127,
        durationMs          = 34
    };
}

private async Task<object> ExtractMetadata(IDictionary<string, object> parameters)
{
    string base64Input = (string)parameters["inputFile"];
    byte[] inputBytes  = Convert.FromBase64String(base64Input);
    // ... metadata extraction logic ...

    return new {
        rowCount    = 512,
        columnCount = 7,
        encoding    = "UTF-8",
        sizeBytes   = inputBytes.Length
    };
}
```

---

### Summary: public vs private method responsibilities

| Layer | Signature | Responsibility |
|-------|-----------|----------------|
| Public (edge-js boundary) | `Task<object> Method(dynamic input)` | Unpack `dynamic`, cast to typed values, delegate — nothing else |
| Private dispatcher | `Task<object> Execute(string, IDictionary<string, object>)` | Route by function name via reflection |
| Private functions | `Task<object> FunctionName(IDictionary<string, object>)` | Business logic — cast params, do work, return result object |

> **Reflection binding rule:** The `name` value returned by `GetFunctions` must exactly
> match the private method name. The dispatcher uses `BindingFlags.NonPublic | BindingFlags.Instance`.
> Adding a new function = add a private method + one entry in `GetFunctions()`. No other changes needed.

---

## `_meta` — Optional Display Hints for the Result Viewer

The DLL result may include a reserved `_meta` key that tells the Shell how to display
each field in the collapsible tree. `_meta` is entirely optional — if absent, the Shell
auto-formats key names and shows raw values. If present, it is stripped from the tree
before rendering so the user never sees it.

### `_meta` Shape

```json
{
  "compressedSizeBytes": 1042,
  "originalSizeBytes":   8192,
  "ratio":               0.127,
  "durationMs":          34,
  "outputFile":          "SGVsbG8gV29ybGQ=",
  "success":             true,

  "_meta": {
    "compressedSizeBytes": { "label": "Compressed Size",  "format": "bytes"       },
    "originalSizeBytes":   { "label": "Original Size",    "format": "bytes"       },
    "ratio":               { "label": "Compression Ratio","format": "percent"     },
    "durationMs":          { "label": "Processing Time",  "unit":   "ms"          },
    "outputFile":          { "label": "Output File",      "format": "base64file",
                             "filename": "output.gz"                               },
    "success":             { "label": "Status",           "format": "boolean"     }
  }
}
```

### `_meta` Entry Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `label` | no | Human-readable key name shown in the tree. If absent, the Shell auto-formats the raw key. |
| `format` | no | How to render the value (see table below). If absent, value shown as-is. |
| `unit` | no | Short string appended after the value: `34 ms`, `5 sec`. Used when `format` is absent. |
| `filename` | only for `base64file` | Suggested filename for the download button. |

### Supported `format` Values

| `format` | Input type | Displayed as |
|----------|-----------|--------------|
| `"bytes"` | `number` | `1,042 bytes` → auto-scales to `1.0 KB`, `1.2 MB` above 1024 |
| `"percent"` | `number` | `0.127` → `12.7%` |
| `"boolean"` | `boolean` | `true` → `✅ Yes` / `false` → `❌ No` |
| `"date"` | ISO 8601 `string` | `"2024-03-15T10:30:00Z"` → `15 Mar 2024, 10:30` |
| `"base64file"` | Base64 `string` | Renders as a **Download** button — raw Base64 is never shown |
| *(absent)* | any | Raw value; numbers locale-formatted with thousands separator |

### `base64file` — Why It Matters

If a function returns a processed file as a Base64 string and `_meta` is not set,
the tree will show the raw Base64 — a wall of characters meaningless to a simple user.
When `format: "base64file"` is present, the Shell renders a **Download** button instead.
The user clicks it and the browser saves the file using the provided `filename`.

This is the most important `_meta` format hint to include whenever a function returns file content.

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, payload?: unknown) => {
    const allowed = [
      'plugins:list',
      'plugins:functions',
      'plugins:params',
      'plugins:execute'
    ];
    if (!allowed.includes(channel)) throw new Error(`Blocked channel: ${channel}`);
    return ipcRenderer.invoke(channel, payload);
  }
});
```

---

## File Handling — Where Base64 Encoding Happens

Files are handled **entirely in the renderer** using the browser's native File API.

```typescript
// file.service.ts (Angular)
async readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

The resulting Base64 string is included in the `plugins:execute` payload like any other param.
The DLL receives the string and is responsible for decoding it.

---

## UI Flow Summary

```
plugins:list
    └─► user clicks plugin
         └─► plugins:functions
                  └─► user selects function
                           └─► plugins:params
                                    └─► user fills form + clicks Execute
                                             └─► plugins:execute
                                                      └─► JSON result displayed in panel
```
