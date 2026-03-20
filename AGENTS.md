# AGENTS.md — Time Tracker AI Rules

## Project Overview

This is a vanilla JavaScript Progressive Web App (PWA).

Files:

* index.html
* app.js
* styles.css
* service-worker.js

No frameworks. No build system. No transpilers.

---

## 🚫 Critical Non-Negotiable Rules

1. Do NOT refactor unrelated code.
2. Do NOT rewrite entire files unless explicitly instructed.
3. Do NOT rename:

   * DOM IDs
   * class names
   * function names
   * localStorage keys
4. Do NOT remove or alter existing event listeners unless required.
5. Do NOT modify service-worker caching logic unless explicitly requested.
6. Do NOT introduce duplicate logic or parallel implementations.

---

## ⚠️ High-Risk Areas (Handle Carefully)

### Tab Navigation System

Depends on:

* #tabDashboard
* #tabLogs
* #tabSettings
* setTab()

Breaking event listeners will make the app unusable.

---

### Edit Mode System

Single source of truth:

* #editModeToggle (checkbox)

UI must be controlled ONLY through:

* renderEditModeUI()

Rules:

* ON → show banner
* OFF → hide banner
* No duplicate UI logic allowed

---

### Logs Rendering

* renderLogs() must NOT duplicate UI state logic
* renderEditModeUI() should be called ONCE at the top only
* Do NOT change sorting, filtering, or mapping logic

---

## 🧠 Change Strategy

* Make the smallest possible change
* Preserve all existing behavior
* Do NOT “clean up” or “optimize” code unless asked
* Do NOT restructure working code
* Prefer patching over rewriting

---

## 🧪 Validation Checklist (Must Pass)

After any change:

* Tabs switch correctly
* Logs render correctly
* Edit Mode banner behaves correctly
* No console errors
* No duplicate event listeners
* App works a
## Auto-Tests Mindset Rules

Before making any code change, act as if this project has strict automated tests.

### Always verify these behaviors mentally before finalizing changes

#### Tab Navigation
- Clicking Dashboard opens the dashboard panel
- Clicking Logs opens the logs panel
- Clicking Settings opens the settings panel
- Active tab styling and aria-selected update correctly

#### Edit Mode
- Edit Mode OFF hides the Logs banner
- Edit Mode ON shows the Logs banner
- Toggle state remains correct after refresh
- Toggle state remains correct after switching tabs

#### Logs Rendering
- Logs still render without errors
- Filters still work
- Manual log actions still work
- Edit and delete controls only appear when expected

#### App Stability
- No duplicate event listeners
- No duplicate render calls unless intentional
- No broken DOM references
- No syntax errors
- No changes to unrelated behaviors

### Change safety rule
For every requested fix, assume there is a hidden regression test that will fail if:
- an existing feature breaks
- a listener disappears
- a state key changes
- a DOM ID changes
- render order changes unexpectedly

### Output rule
When making edits:
- prefer minimal diffs
- explain what risk was avoided
- list what behaviors were preserved
