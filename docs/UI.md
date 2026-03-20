# UI/UX Design Guidelines

## Design Philosophy
The Shell should feel like a **mobile home screen on a desktop**.
Clean, minimal, icon-driven. No menus, no toolbars, no clutter.
Everything the user needs is one click away.

---

## Home Screen — Plugin Grid

### Layout
- CSS Grid: `repeat(auto-fill, minmax(120px, 1fr))`
- Outer padding: `24px`
- Gap between cards: `20px`
- Background: `#1a1a2e` (deep navy)

### Plugin Icon Card (`plugin-icon` component)
- Size: `120px × 140px`
- Background: `#16213e`, `border-radius: 16px`
- Icon image: `64px × 64px`, centered
- Plugin name: `12px`, white, centered, max 2 lines, ellipsis overflow
- Hover: `box-shadow: 0 0 12px rgba(100, 180, 255, 0.4)`, transition `150ms`
- Click: `transform: scale(0.96)`, transition `100ms`

### Status Dot
- Position: bottom-right corner of card, `10px` diameter
- `#4caf50` green = loaded successfully
- `#f44336` red = failed to load
- `#9e9e9e` gray = unknown / pending

---

## Side Panel — Plugin Drawer (`side-panel` component)

The panel is divided into **three stacked regions** that are always visible once a plugin
is selected. The function selector is always at the top; the form and result regions
below it update as the user interacts.

```
┌─────────────────────────────────┐
│  HEADER  (plugin name + close)  │  fixed, 64px
├─────────────────────────────────┤
│  FUNCTION SELECTOR              │  fixed, ~56px
│  [ Compress ] [ Extract ] [...] │
├─────────────────────────────────┤
│                                 │
│  PARAMETER FORM (scrollable)    │  flex-grow, min-height 120px
│                                 │
├─────────────────────────────────┤
│  RESULT VIEWER (scrollable)     │  flex-grow, min-height 80px
│  { "key": "value", ... }        │  visible after first Execute;
│                                 │  collapsed/empty before that
├─────────────────────────────────┤
│  FOOTER  (Execute button)       │  fixed, 72px
└─────────────────────────────────┘
```

### Container
- Fixed, right side, full height (`100vh`)
- Width: `400px` (increased from 360px to accommodate result viewer)
- Background: `#0f3460`
- Opens: `transform: translateX(100%)` → `translateX(0)`, `250ms cubic-bezier(0.4, 0, 0.2, 1)`
- Closes: reverse, `200ms`
- Left shadow: `box-shadow: -4px 0 24px rgba(0,0,0,0.5)`
- Overlay behind panel: semi-transparent black `rgba(0,0,0,0.4)`, click to close

### Panel Header
- Plugin icon `32px` + name `18px bold` white, side by side
- Close (✕) button: top-right, `24px`, muted color, hover turns white
- Bottom border: `1px solid rgba(255,255,255,0.1)`
- Padding: `20px`

---

## Function Selector (`function-selector` component)

Displayed immediately below the panel header. Renders the list of functions returned
by `plugins:functions` as a horizontal tab strip.

### Tab Strip
- Horizontal scrollable row of pill/tab buttons
- Padding: `12px 20px`
- Tab button:
  - `padding: 6px 14px`
  - `border-radius: 20px`
  - `font-size: 13px`
  - Inactive: `background: transparent`, `color: #a0aec0`, `border: 1px solid rgba(255,255,255,0.15)`
  - Active: `background: #4299e1`, `color: white`, `border: 1px solid #4299e1`
  - Hover (inactive): `background: rgba(255,255,255,0.07)`, `color: white`
  - Transition: `150ms`
- If only one function exists: still render the single tab (no hiding)
- If more than 5 functions: strip scrolls horizontally; no wrapping

### Function Description Tooltip
- When a tab is hovered, show the function's `description` as a tooltip below the tab strip
- Tooltip style: `10px`, `#a0aec0`, italic, fades in `150ms`
- Max width `360px`, wraps to multiple lines if needed

### Loading State
- Three shimmer pill-shaped placeholders while `plugins:functions` is in-flight

### Error State
```
  ⚠️  Could not load functions
  [ Retry ]
```
- Centered in the selector region

---

## Form Area

Appears below the function selector. Rebuilt from scratch whenever the user
switches to a different function tab.

- Padding: `20px`
- Control spacing: `16px` between each
- Label style: `11px`, `#a0aec0`, uppercase, `letter-spacing: 0.08em`, `margin-bottom: 6px`
- Input base style: full width, `background: #1a1a2e`, `color: white`,
  `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 8px`, `padding: 10px 12px`
- Focus: border color → `#4299e1`
- When function changes: form resets to default values for the new function

---

## Control Styles

### Text Control
- Standard text input, themed as above
- Placeholder: `#4a5568`

### Number Control
- `<input type="number">` styled same as text
- Min/max enforced via Angular form validators
- Invalid state: red border `#f44336` + inline error message below

### Boolean Control (Toggle)
- Full-width row: label on left, toggle switch on right
- Toggle: custom CSS, `44px × 24px`
- On state: `#4299e1` blue track, white thumb
- Off state: `#4a5568` gray track, white thumb
- Transition: `200ms`

### Range Control
- Custom styled `<input type="range">`
- Live value badge displayed to the right of the slider
- Min/max labels at each end in muted text `10px`
- Track: `#4a5568`, filled portion: `#4299e1`
- Thumb: white circle, `18px`

### File Control
- Row layout: Browse button (left) + filename label (right)
- Browse button: outlined style, `border: 1px solid #4299e1`, `color: #4299e1`,
  `border-radius: 6px`, `padding: 8px 16px`, hover: fills blue
- Filename label: muted gray, italic, truncated with ellipsis
- No file selected state: "No file chosen" in `#4a5568`
- File too large: red inline error below the row
- Accepted file types shown as hint: e.g. "Accepts: .csv, .txt" in `10px` muted text

---

## Result Viewer (`result-viewer` component)

Appears below the form area. Displays the JSON result returned by `plugins:execute`
as a **collapsible tree** — the same interaction model users know from browser DevTools.
This handles flat results, deeply nested objects, and arrays uniformly without any
special-casing in the Shell.

### Library
Use **`ngx-json-viewer`** (lightweight, Angular-native, no heavyweight dependencies).
Install: `npm install ngx-json-viewer`
Import `NgxJsonViewerModule` in the feature module.
Theme it via CSS variable overrides to match the dark palette (see Color Palette below).

### Tree Behaviour

- **All nodes start collapsed** — the user sees only the top-level keys on first render
- Clicking any node toggles it open/closed
- A `▶` chevron indicates collapsible nodes (objects, arrays); leaf nodes have no chevron
- Arrays show their item count when collapsed: `rows  [ 3 items ]`
- Objects show their key count when collapsed: `fileInfo  { 4 keys }`
- Two toolbar buttons sit above the tree:
  - **Expand all** — recursively opens every node
  - **Collapse all** — recursively closes every node back to top-level
- A **Copy JSON** button copies the raw result (minus `_meta`) to clipboard;
  briefly shows `"✓ Copied"` for 1.5s then resets

### `_meta` Key Handling

If the DLL result contains a `_meta` key (see API_CONTRACT), the Shell uses it
to display human-readable labels and formatted values in the tree, then **strips
`_meta` from the tree entirely** so it is never shown to the user.

Without `_meta` the tree renders raw key names, auto-formatted:
`camelCase` / `snake_case` → split on word boundaries, capitalised.

`_meta` format hints change how leaf values are displayed:

| `format` hint | Raw value | Displayed as |
|---------------|-----------|--------------|
| `"bytes"` | `1042` | `1,042 bytes` (auto-scales to KB/MB above 1024) |
| `"percent"` | `0.127` | `12.7%` |
| `"boolean"` | `true` | `✅ Yes` / `❌ No` |
| `"date"` | `"2024-03-15T10:30:00Z"` | `15 Mar 2024, 10:30` |
| `"base64file"` | `"SGVsbG8..."` | Download button — never shows raw Base64 |
| *(absent)* | any | Raw value, numbers locale-formatted |

The `base64file` format is critical: a Base64 string shown raw is meaningless to a
simple user. When this format hint is present, the leaf node renders as a
**Download** button using the `filename` field from `_meta` as the suggested filename.

### Visual Structure

```
┌─────────────────────────────────────────┐
│  RESULT              [⊞ Expand] [⊟ All]  [⎘ Copy] │
├─────────────────────────────────────────┤
│  ▼  (root)                              │
│     ▶  fileInfo      { 4 keys }         │  ← collapsed object
│     ▼  rows          [ 3 items ]        │  ← expanded array
│         ▶  [0]       { 2 keys }         │
│         ▶  [1]       { 2 keys }         │
│         ▶  [2]       { 2 keys }         │
│     📄  Processing Time   34 ms         │  ← leaf with _meta label + unit
│     📄  Status            ✅ Yes        │  ← leaf with boolean format
└─────────────────────────────────────────┘
```

### Container Styles
- Top border: `1px solid rgba(255,255,255,0.1)`
- Section label: `"RESULT"` in `11px`, `#a0aec0`, uppercase, `letter-spacing: 0.08em`
- Toolbar (label + buttons) row: `padding: 12px 20px 8px`, space-between layout
- Tree area:
  - `background: #0a2240`
  - `border-radius: 8px`
  - `margin: 0 20px 12px`
  - `padding: 12px`
  - `overflow-y: auto`
  - `max-height: 260px`
- Tree row height: `26px`, `font-size: 13px`
- Chevron `▶ / ▼`: `#4299e1`, `10px`, rotates `90deg` on expand, transition `150ms`
- Indentation per level: `16px`
- Hover row: `background: rgba(255,255,255,0.04)`

### States

**Empty (before first Execute):**
- Region collapsed to `0px`, `overflow: hidden`, invisible

**Loading (Execute in progress):**
- Region expands to `80px`
- Spinner centered, label `"Executing…"` in `#a0aec0`, `12px`

**Success:**
- Region expands, tree rendered, all nodes collapsed by default
- Height animates `0` → content via `max-height` transition `300ms ease`

**Error:**
- Region expands
- Error box: `background: rgba(244, 67, 54, 0.1)`, `border: 1px solid rgba(244, 67, 54, 0.3)`
- `#f44336` error text, `12px`, padding `12px 16px`
- Error message from DLL shown verbatim

Each new Execute result replaces the previous one; tree resets to fully collapsed.

---

## Panel Footer

- Fixed at the bottom of the panel
- Padding: `20px`
- Top border: `1px solid rgba(255,255,255,0.1)`
- **Execute** button (renamed from "Apply"): full width, `background: #4299e1`, white bold text, `border-radius: 8px`, `padding: 12px`
- Hover: `background: #3182ce`
- Active/loading: shows spinner inside button + "Executing…" text, button disabled
- Disabled (form invalid): `opacity: 0.4`, `cursor: not-allowed`
- Success: brief `#4caf50` flash for 300ms then returns to blue — result is shown in Result Viewer, not the footer

---

## Error & Loading States

### Loading (fetching functions or params)
- Skeleton shimmer placeholders — 3–4 gray animated bars in the relevant region
- Shimmer: CSS animation `background: linear-gradient(90deg, #16213e, #1e2f4e, #16213e)`

### Plugin Unresponsive
```
      ⚠️  Plugin is not responding
      [        Retry        ]
```
- Centered vertically in form area
- Retry: outlined button, same style as Browse

### Plugin Load Error (on grid)
- Red status dot on icon card
- Tooltip on hover: shows error message

---

## Color Palette (SCSS Variables)

```scss
$bg-app:        #1a1a2e;   // App background
$bg-surface:    #16213e;   // Cards, icon backgrounds
$bg-panel:      #0f3460;   // Side panel
$bg-result:     #0a2240;   // Result tree area (darker than panel)
$accent:        #4299e1;   // Buttons, active states, focus borders, tree chevrons
$accent-hover:  #3182ce;   // Hover on accent elements
$text-primary:  #ffffff;   // Headings, values
$text-muted:    #a0aec0;   // Labels, hints, secondary text, tree keys
$text-disabled: #4a5568;   // Placeholders, off states
$success:       #4caf50;   // Execute confirmation flash
$error:         #f44336;   // Errors, validation failures

$border:        rgba(255, 255, 255, 0.1);   // Dividers, subtle borders
```

### `ngx-json-viewer` Theme Overrides

Override the library's default light theme in `global.scss`:

```scss
ngx-json-viewer {
  .segment-type-string  .segment-value { color: #68d391; }  // green
  .segment-type-number  .segment-value { color: #f6ad55; }  // orange
  .segment-type-boolean .segment-value { color: #76e4f7; }  // cyan
  .segment-type-null    .segment-value { color: #fc8181; }  // red
  .segment-key                         { color: #a0aec0; }  // muted white
  .segment-separator                   { color: #4a5568; }
  .toggler                             { color: #4299e1; }  // accent blue
  .segment                             { font-size: 13px; line-height: 26px; }
  .segment:hover                       { background: rgba(255,255,255,0.04); }
}

---

## Animation Summary

| Interaction | Animation |
|------------|-----------|
| Panel open | Slide in from right, 250ms ease |
| Panel close | Slide out to right, 200ms ease |
| Overlay | Fade in, 200ms |
| Icon hover | Glow shadow, 150ms |
| Icon click | Scale 0.96, 100ms |
| Function tab switch | Instant form reset, no animation |
| Toggle switch | Track color + thumb slide, 200ms |
| Execute button loading | Spinner inside button |
| Result viewer expand | max-height 0 → content, 300ms ease |
| Execute success flash | Green flash on button, 300ms, resets |
| Tree node expand/collapse | Chevron rotates 90°, 150ms |
| Skeleton | Shimmer sweep, infinite loop |
| Copy JSON confirm | "✓ Copied" text for 1.5s then resets |
