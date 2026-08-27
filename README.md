<div align="center">

<img src="public/tk-icon.svg" alt="tk" width="96" height="96" />

# tk — Time, tracked.

Dark-mode black & gold time tracking app. Vite + React + TypeScript, Supabase backend, Vercel-ready.

<p>
  <a href="https://github.com/yamlyeti/tk">GitHub</a>
</p>

</div>

---

## Features

### Time tracking

- **Start/stop timer** — one active timer at a time, live `HH:MM:SS` display
- **Pause/resume** — pause for a break or interruption and resume later; paused time is automatically tracked and excluded from the entry's duration, however many times you pause
- **Manual time entry** — for the timer you forgot to start: duration mode (`3h 15m`) or time-range mode (`9:00 → 17:00`, duration auto-calculated)
- **Edit any entry** — adjust start/end time on a completed entry; duration recalculates automatically, with validation that end comes after start
- **Tags with autocomplete** — suggestions drawn from tags you've actually used before, arrow-key navigation, comma-separated for multiple
- **Notes on entries** — optional multi-line notes, full-text search indexed in Postgres (`tsvector`/GIN)
- **Draggable, collapsible workspace** — reorder and collapse the Timer / Goals / Pomodoro cards on the tracker page to match how you work (`@hello-pangea/dnd`)

### Stay focused

- **Goals** — daily and weekly time targets with animated gradient progress bars
- **Pomodoro timer** — configurable work/break intervals, progress ring, session counter
- **Idle detection** — auto-pauses after inactivity; when you're back, choose to keep or discard the idle time
- **Timer notifications** — desktop alerts at 30-minute, 1h, 2h, 4h, and 8h milestones on an active timer
- **Keyboard shortcuts** — `Alt+S` start/stop · `Alt+P` pause/resume · `Alt+N` focus new entry · `Ctrl+/` shortcuts help · `Esc` close

### Projects & organizations

- **Projects** — create, edit, delete; tags, description, GitHub link
- **Organization hierarchy** — group projects under an organization (`Organization → Projects → Time Entries`); owner/admin/member roles, per-org stats (projects, members, total hours tracked)
- **Project teams** — assign specific users to a project with their own owner/admin/member role, independent of organization membership

### Reporting

- **Four report views** — Overview, By Project, By Tag, By Day — each with progress bars and percentage breakdowns
- **Filtering** — project, tag, custom date range, plus one-click quick filters (today / yesterday / last 7 days / last 30 days / all time)
- **CSV export** — date, description, project, tags, start/end time, duration

### Billing

- **Billable vs. non-billable** — mark time entries billable, filter by either
- **Per-project/org/user rates** — billable amounts computed from configured hourly rates
- **Invoice builder** — add custom line items (with a one-click "friend discount" shortcut), notes, and a live computed total
- **Email an invoice** — sends via a Supabase Edge Function (`send-invoice`)
- **CSV export** for billing records

### Admin & access

- **Email/password auth** via Supabase, session handled automatically
- **Admin approval workflow** — new signups land in `pending` and are blocked from the app (enforced by RLS, not just the UI) until an admin approves; denied users see a clear message on login
- **User management** — search/filter by name, email, role, or status; role assignment (admin/member); activate/deactivate; CSV export
- **Personal profile page**

### PWA

- Installable on Android (Chrome → Add to Home screen) and iOS (Share → Add to Home Screen)
- Offline app shell via `vite-plugin-pwa`; Workbox caches Google Fonts (cache-first) and leaves Supabase calls network-only, so you never see stale data
- Black-and-gold **tk** mark as the icon and OS theme color

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite · React 19 · TypeScript |
| Backend | Supabase (Postgres · Auth · Row Level Security · Edge Functions) |
| Hosting | Vercel (`vercel.json` configured; not yet linked/deployed) |
| Drag & drop | `@hello-pangea/dnd` |
| PWA | `vite-plugin-pwa` |

---

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. In Supabase, run the schema. The base schema lives in `multi-user-setup.sql` and `supabase-setup.sql`; feature-specific tables and columns were added incrementally via the `migration-*.sql` files at the repo root (organizations, user approval, pause/resume, notes, billable rates, etc.) — each is also documented in its matching `*_FEATURE.md` file. There's no single consolidated, idempotent schema file yet (worth doing before this repo is handed to anyone else), so on a fresh Supabase project, check the migration files' `create table` statements against what's already there before running them.

4. Start dev:

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Vercel deploy

`vercel.json` is already configured (build command, SPA rewrites for the client-side routes). Not yet linked to a Vercel project — to deploy:

```bash
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel deploy --prod
```

---

## Project layout

```text
src/
  components/   TimeTracker, Dashboard, ProjectsView, OrganizationManagement,
                ProjectTeamManagement, ProjectBillingReport, UserApprovals,
                Goals, PomodoroTimer, KeyboardShortcuts, Auth, …
  contexts/     AuthContext, ThemeContext
  lib/          supabase client
  types/        shared TypeScript types
public/         PWA icons — tk-icon.svg, apple-touch-icon.png, pwa-*.png
supabase-setup.sql, multi-user-setup.sql, migration-*.sql   Schema (see Local setup)
```
