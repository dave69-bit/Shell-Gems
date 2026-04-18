# Shell-Gems — Installation Guide for Technicians

**Application:** Shell-Gems
**Delivery type:** Portable (no installer — copy and run)
**Target systems:** Windows 10 / Windows 11 (64-bit)
**Internet required:** NO — everything runs fully offline

---

## What Is in This Folder

```
Shell-Gems-Portable/
├── Shell-Gems-Native/           ← The application (entire folder)
│   ├── ShellGems.Host.exe       ← Launch this to start the app
│   ├── renderer/                ← Frontend UI files
│   └── plugins/
│       ├── dlls/                ← Plugin files (.dll)
│       └── icons/               ← Plugin icons
├── prerequisites/
│   ├── dotnet-runtime-installer.exe  ← Microsoft .NET Runtime (required)
│   └── MicrosoftEdgeWebview2Setup.exe ← WebView2 Runtime (required)
└── INSTALL.md                   ← This file
```

---

## Step-by-Step Installation

### STEP 1 — Copy the App Folder to the Target Machine

Copy the entire `Shell-Gems-Native/` folder to the desired location on the target machine.

Recommended location:
```
C:\Apps\Shell-Gems\
```

> ⚠️ Do NOT place the folder under `C:\Program Files\` — Windows may block
> the app from writing to that path. Use `C:\Apps\` or the Desktop instead.

---

### STEP 2 — Install Prerequisites

These must be installed ONCE on each machine before the first launch.
They are standard Microsoft packages and are safe to install.

#### 2a — .NET Runtime

1. Open the `prerequisites\` folder
2. Double-click `dotnet-runtime-installer.exe`
3. Click **Install**
4. Wait for the installation to complete
5. Click **Close**

#### 2b — WebView2 Runtime

1. Still in the `prerequisites\` folder
2. Double-click `MicrosoftEdgeWebview2Setup.exe`
3. Click **Install** (if prompted "Already installed", you can skip)
4. Wait for completion and click **Close**

#### 2c — Restart the Machine

Restart Windows now to ensure all prerequisites are fully active.

---

### STEP 3 — Launch the Application

1. Navigate to the `Shell-Gems-Native\` folder
2. Double-click **ShellGems.Host.exe**
3. The application should open and display the plugin grid

---

## Adding or Updating Plugin Files

To add a new plugin or replace an existing one:

1. Close the application if it is running
2. Copy the new `.dll` file into:
   ```
   Shell-Gems-Native\plugins\dlls\
   ```
3. Copy the plugin's icon image (`.png`) into:
   ```
   Shell-Gems-Native\plugins\icons\
   ```
4. Launch `ShellGems.Host.exe` — the new plugin will appear in the grid

---

## Moving the App to a Different Location

The app is fully portable. To move it:

1. Close the application
2. Copy or move the entire `Shell-Gems-Native\` folder to the new location
3. Launch `ShellGems.Host.exe` from the new location

---

## Uninstalling

1. Close the application
2. Delete the `Shell-Gems-Native\` folder

---

## Troubleshooting

### App does not open / crashes immediately
- Make sure both prerequisites in Step 2 were installed successfully
- Make sure the machine has been restarted after installing prerequisites
- Make sure the `Shell-Gems-Native\` folder is NOT inside `C:\Program Files\`
- Try right-clicking `ShellGems.Host.exe` → **Run as administrator**

### Plugin shows a red dot
- The `.dll` file may be missing from `plugins\dlls\`
- The `.dll` file may be blocked by Windows — right-click the `.dll` file → **Properties** → **Unblock**

### App opens but shows a blank screen
- Wait 10 seconds — the first launch may be slower on some machines
- If still blank, restart the application

### Nothing happens when double-clicking ShellGems.Host.exe
- Check that you are running 64-bit Windows
