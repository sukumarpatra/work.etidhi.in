# Etidhi Work OS

A Monday.com-style work management platform built for Etidhi. Full-stack app with a Next.js frontend, API-route backend, and SQLite database.

## Features

- **Login restricted to Etidhi accounts** — only `@etidhi.in` emails can sign in (JWT session cookie, bcrypt-hashed passwords, route protection via middleware).
- **Passwords** — users can change their own password from the profile menu. "Forgot password?" on the login page lets a locked-out user pick a preferred new password; it activates once an admin approves the request on the Team page (no email server needed).
- **Boards** — create/delete boards with colored groups (like Monday's Main Table).
- **Items** — inline-editable name, person (avatar picker), status pills, priority pills, due dates; per-group status distribution bars.
- **Kanban view** — drag & drop cards between status columns.
- **Activity log** — every change is recorded and shown per board and on the home dashboard.
- **Home dashboard** — task stats, per-board progress, status donut chart, recent activity.
- **My Work** — everything assigned to you across all boards.
- **Team** — member directory; admins can add/remove members with Member or Admin access (Etidhi emails only).
- **Bills & Reimbursements** — anyone uploads a bill photo with amount/category; an admin assigns an approver; on approval the bill is **auto-reimbursed** with a payment reference (ETD-RB-…). Rejections carry a reason. Reimbursed bills are immutable financial records. Photos are stored in `data/uploads/` and served only to logged-in users.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Accounts (seeded, password `etidhi123` for all)

| Email | Role |
|---|---|
| admin@etidhi.in | Admin (Subash Choudhary) |
| priya@etidhi.in | Member |
| rahul@etidhi.in | Member |
| ananya@etidhi.in | Member |

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Backend:** Next.js API routes (`app/api/*`)
- **Database:** SQLite via better-sqlite3, auto-created and seeded at `data/etidhi.db` on first run
- **Auth:** jose (JWT) + bcryptjs, HTTP-only session cookie, `middleware.ts` guards all pages & APIs

## Notes

- Set `AUTH_SECRET` in the environment for production; a dev fallback is used otherwise.
- To reset the database, delete the `data/` folder and restart the server (it re-seeds automatically).
