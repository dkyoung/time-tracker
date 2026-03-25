# Time Tracker

Time Tracker is a lightweight, web-first time tracking Progressive Web App (PWA) built for fast daily use. It focuses on practical work-hour logging with a local-first data model, so users can clock sessions, track breaks, review totals, and manage corrections without creating an account or relying on a backend service.

## Purpose

Many workers need a simple way to track real hours worked, breaks taken, missed breaks, and weekly totals without adopting a complex payroll or project-management platform.

This app exists to provide a focused, day-to-day workflow for:

- starting and ending work sessions quickly,
- capturing break activity,
- correcting mistakes when needed,
- and keeping a usable personal record of worked time.

## Who This Is For

Time Tracker is designed for practical individual and small-team use cases, including:

- Hourly workers
- Independent contractors
- Freelancers
- Field workers
- Small business operators
- Anyone who needs a fast personal work log

## Current Working Features

The following capabilities are implemented in the current repository:

### Session and break tracking

- Clock in / clock out workflow
- Running timer and session status
- Break start/end controls with planned break structure (15m / 30m / 15m)
- Skip-break flow with a required reason and skip tracking summary

### Dashboard summaries

- Today gross time
- Today break time
- Today net time
- Week net time
- Month net time
- Display mode toggle between `HH:MM` and decimal-hour formatting

### Logs and corrections

- Logs tab with filter controls (type, date, source, notes)
- Manual log entry form for work sessions and breaks
- Edit Mode toggle for correcting log entries
- Log editor modal for updating entries
- Manual log delete option (for manual entries)

### Backup and data portability

- Local browser storage persistence
- Manual JSON export backup
- Manual JSON import restore
- Optional automatic backup to a selected file on browsers that support the File System Access API
- Last backup/import status labels

### Weekly sharing

- Share Weekly Hours action (uses native share where available)
- Copy Weekly Hours action with clipboard fallback

### PWA behavior

- Web app manifest for installable app metadata
- Service worker registration and app-shell caching
- In-app update banner and refresh action when a new service worker is installed

## Benefits

For end users, this approach provides:

- Fast daily logging with minimal friction
- Better visibility into actual worked versus break time
- A practical correction workflow for missed or inaccurate entries
- Portable backup/restore through JSON files
- No required account for core usage today

## How It Works

A typical workflow:

1. Open the app and clock in to start the work session timer.
2. Start and end breaks as needed (or skip a break with a required reason).
3. Review totals on the dashboard throughout the day and week.
4. Open Logs to review history and apply filters.
5. Enable Edit Mode when corrections are needed, then update entries.
6. Export a manual backup file regularly, and import it when restoring data.
7. Share or copy weekly hours when reporting time.

## Technology Overview

Current stack and architecture:

- HTML, CSS, and vanilla JavaScript (no framework/build pipeline)
- Progressive Web App structure (`manifest.json` + `service-worker.js`)
- Local-first browser storage (`localStorage`) for app data and settings
- Static deployment-friendly app shell suitable for GitHub Pages-style hosting

## Current Limitations

This is an active MVP and has intentional constraints:

- Data is local-first and primarily device/browser scoped
- No account system or built-in cloud sync yet
- Automatic file backup depends on browser support for File System Access APIs
- Browser storage behavior and quota policies can vary by platform/device
- Mobile UX and performance continue to be refined

## Roadmap and Future Direction

Planned evolution is focused on strengthening the existing product without overstating current capabilities.

### Product roadmap (planned)

- Performance optimization and mobile-first UX refinement
- Enhanced reporting views (for example, clearer weekly totals within broader monthly context)
- Additional contractor/freelancer-oriented workflows and quality-of-life features
- More polished deployment and release process for production web usage
- Potential migration path from GitHub Pages-style MVP hosting toward Vercel-hosted production-grade web deployment
- Evaluation of Capacitor wrapping for broader native mobile distribution using the same core web codebase

> Note: Vercel and Capacitor are planned direction items, not currently integrated in this repository.

## Why This Architecture Direction Makes Sense

The project follows a practical progression:

1. Start lean with a static, local-first PWA MVP.
2. Validate real daily workflows and reduce friction in core use cases.
3. Improve performance, UX quality, and reliability based on usage.
4. Expand deployment maturity for web, then evaluate native packaging.

This sequence keeps delivery grounded while preserving a shared web codebase path that can later support broader platform distribution.

## Getting Started

### Run locally

1. Clone the repository:
   ```bash
   git clone https://github.com/dkyoung/time-tracker.git
   cd time-tracker
   ```
2. Open `index.html` directly in a browser for basic local use, **or** serve the folder with a simple static server for service-worker behavior.

Example (Python):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

### Deploy as a static web app

The app can be deployed from static files (for example, via GitHub Pages-style hosting) because it has no required backend for current core functionality.

## Project Status

Time Tracker is an active PWA MVP:

- Stable enough for practical day-to-day personal logging
- Actively evolving toward a more polished, production-ready time-tracking experience
- Focused on improving quality and deployment maturity before expanding into broader platform packaging

## Feature Checklist

### Available now

- [x] Clock in / clock out
- [x] Break tracking and skip-break notes
- [x] Dashboard time summaries (day/week/month)
- [x] Log filters and manual entries
- [x] Edit Mode log corrections
- [x] Manual export/import backups
- [x] Optional automatic file backup (supported browsers)
- [x] Weekly share/copy workflow
- [x] PWA manifest + service worker caching

### Planned next

- [ ] Expanded reporting views
- [ ] Additional contractor/freelancer workflow features
- [ ] Production-grade web deployment hardening
- [ ] Evaluate Capacitor-based native packaging path

## Contributing

Contributions are welcome. For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).
