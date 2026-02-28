# Contributing Guide (Time Tracker)

This repo is a simple static app:
- `index.html` (UI + element IDs)
- `styles.css` (layout + theme)
- `app.js` (state + logic)

Because the files are tightly coupled, small ID mismatches can break the app.
Follow the workflow below.

---

## Golden Rules

1. **Never commit directly to `main`**
   - `main` should stay deployable at all times.

2. **One feature or fix per branch**
   - Keep PRs small and easy to review.

3. **No drive-by refactors**
   - Don’t rename variables, reorganize code, or change storage formats unless the task requires it.

4. **If you change an element ID in one file, update the other file in the same commit**
   - `index.html` IDs must match `app.js` `getElementById()` calls.

---

## Branch Naming

Use one of these formats:

- `feature/<short-kebab-name>`
- `bugfix/<short-kebab-name>`
- `chore/<short-kebab-name>`

Examples:
- `feature/logs-tab`
- `bugfix/break-cycle`
- `chore/readme-update`

---

## Local Run (quick)

Option A (Python):
```bash
python3 -m http.server 4173

---

## Option B (Node):
```bash
npx serve .

---

Then open http://localhost:4173
