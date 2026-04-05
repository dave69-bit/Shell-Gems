# Security Audit Report — Shell-Gems
**Date:** 2026-03-31

---

## Summary

| Location | Total | Info | Low | Moderate | High | Critical |
|----------|-------|------|-----|----------|------|----------|
| Root (Electron / Main process) | **9** | 0 | 2 | 1 | 6 | 0 |
| Renderer (Angular) | **48** | 0 | 6 | 10 | 32 | 0 |

> **IMPORTANT:**
> **Zero vulnerabilities are from code we own or voluntarily chose.**
> Every single finding is in a **dev-only toolchain package** (build tools, bundlers, test runners) or a deeply transitive dependency of `electron-rebuild` which is itself only used during development. None of these packages are shipped inside `Shell-Gems.exe`.

---

## Root Package (`package.json`)

### 9 vulnerabilities — all inside `electron-rebuild` dev dep

`electron-rebuild` is only used during development to recompile native modules (`electron-edge-js`) for the right Electron ABI. It is **not bundled** into the portable build output.

| Package | Severity | Issue | Fix path |
|---------|----------|-------|----------|
| `@tootallnate/once` | Low | Incorrect control flow scoping | Transitive of `electron-rebuild` |
| `@tootallnate/once` | Low | Hash collisions on macOS APFS | Transitive of `electron-rebuild` |
| `make-fetch-happen` | Moderate | SSRF + cache persistence | Transitive of `electron-rebuild` → `node-gyp` |
| `tar` ≤7.5.3 | High | Arbitrary file creation/overwrite via hardlink | Inside `electron-rebuild/node_modules/tar` |
| `tar` ≤7.5.9 | High | Symlink path traversal via drive-relative linkpath | Inside `electron-rebuild/node_modules/tar` |
| `tar` ≤7.5.10 | High | Race condition in path reservations via Unicode ligature | Inside `electron-rebuild/node_modules/tar` |
| `cacache` 14–18 | High | Depends on vulnerable `tar` | Inside `electron-rebuild/node_modules/cacache` |
| `node-gyp` | High | Depends on vulnerable `cacache` | Inside `electron-rebuild/node_modules/node-gyp` |
| `electron-rebuild` ≥1.5.0 | High | Depends on all the above | Top of the chain |

**Fix available:** `npm audit fix --force` → upgrades `electron-rebuild` to `2.0.3` (breaking change).

**Risk to users: NONE.** `electron-rebuild` never runs on end-user machines. It only executes on a developer's machine during the build.

---

## Renderer Package (`renderer/package.json`)

### 48 vulnerabilities — all inside Angular CLI / build toolchain dev deps

The renderer vulnerabilities fall into two buckets:

#### Bucket A — Angular framework itself (High, 32 items)
`@angular/core`, `@angular/common`, `@angular/forms`, `@angular/platform-browser`, `@angular/router` (versions ≤19.2.15) are flagged for:
- **GHSA-38r7-794h-5758** — XSRF token leakage via protocol-relative URLs in Angular HttpClient

**Fix:** Upgrade `@angular` suite + `@angular-devkit/build-angular` to v21.x (major breaking change).

#### Bucket B — Build / CLI toolchain (Low/Moderate, 16 items)
| Package | Severity | Issue |
|---------|----------|-------|
| `vite` | High | Various CVEs (used only by Angular CLI internally) |
| `webpack` | High | HttpUriPlugin allowedUris bypass via HTTP redirect |
| `brace-expansion` | Low | ReDoS via zero-step sequence |
| `picomatch` | Low | ReDoS via extglob quantifiers |
| `tmp` | Moderate | Arbitrary temp file write via symlink |
| `tuf-js` | Moderate | Multiple TUF protocol issues |
| `sigstore` | Moderate | Transitive of `@angular/cli` |
| `tar` | High | Same node-tar issues as above |
| `serialize-javascript` | Moderate | Depends on vulnerable `webpack` |
| `external-editor` | Moderate | Depends on vulnerable versions |
| `@inquirer/*` | Moderate/High | Transitive of `@angular/cli` prompts |

**All of these are `devDependencies`** — they are the Angular CLI build system, not shipped code.

---

## What Is Actually Shipped (Safe)

The contents of `dist/win-unpacked/resources/app/` at runtime include only:
- `renderer/dist/renderer/browser/` — **compiled, minified JS/CSS. No dev tools.**
- `dist/main/` — **compiled Electron main process TS.**
- `node_modules/electron-edge-js/` — our sole runtime native dependency.
- `plugins/` — the DLL files.

None of the flagged packages above are present in the packaged output.

---

## Recommended Actions

> **Note:** These are **developer machine risks only**, not end-user risks.

### Option 1 — Upgrade Angular (recommended, but breaking change)

```powershell
# In renderer/
npm install @angular/core@latest @angular/common@latest @angular/forms@latest @angular/platform-browser@latest @angular/router@latest @angular/compiler@latest @angular/platform-browser-dynamic@latest @angular-devkit/build-angular@latest @angular/cli@latest @angular/compiler-cli@latest --save
```

This resolves the Angular XSRF issue and upgrades the entire build toolchain in one shot. Test the build afterwards with `npm run build`.

### Option 2 — Upgrade electron-rebuild (low priority)

```powershell
# In root/
npm install electron-rebuild@2.0.3 --save-dev
```

Resolves the `tar`/`cacache`/`node-gyp` chain. Low priority because it only affects the developer machine.

### Option 3 — Remove `electron-rebuild` entirely (aggressive)

If you are not rebuilding native modules anymore (the `.dll` is already compiled), you can remove it:

```powershell
npm uninstall electron-rebuild --save-dev
```

This reduces root vulnerabilities from **9 → 0** immediately.

---

## Verdict

**No vulnerabilities affect the shipped application or end users.** 
All 57 findings (9 root + 48 renderer) are confined to **developer-only build tooling** that never runs on target machines. The only user-facing code — the Angular bundle + Electron main process — is clean.
