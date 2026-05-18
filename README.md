# GoalTracker - Goal Setting & Tracking Portal

Web-based portal for end-to-end goal lifecycle management across Employee, Manager, and Admin/HR roles.

## Submission Summary

- Problem statement: AtomQuest Goal Setting & Tracking Portal.
- Core scope: Phase 1 + Phase 2 must-have requirements.
- Bonus scope included: analytics, escalation log, in-app notifications.

## Project Structure

- `Client/goalSetter`: React + Vite frontend.
- `Server`: Express + MongoDB backend API.
- `docs/ARCHITECTURE.md`: architecture and role journeys.
- `docs/FEATURE_COMPLIANCE.md`: BRD requirement mapping.

## Tech Stack

- Frontend: React, Vite, Tailwind-style utility classes, lucide-react.
- Backend: Node.js, Express, JWT, Mongoose.
- Database: MongoDB Atlas.
- Reports: CSV export + JSON dashboard/report endpoints.

## Environment Setup

Create a real env file from the sample:

```bash
cd Server
cp .env.sample .env
```

Fill values in `Server/.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `REGISTRATION_KEY`
- `EMAIL_USER`
- `EMAIL_PASS`
- optional: `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`

Note: if using MongoDB Atlas, whitelist your current IP in Atlas Network Access.

## Run Locally

Backend:

```bash
cd Server
npm install
npm start
```

Frontend:

```bash
cd Client/goalSetter
npm install
npm run dev
```

Production build check:

```bash
cd Client/goalSetter
npm run build
```

## Demo URLs

- Frontend (local): `http://localhost:5173` (or Vite-assigned port).
- Backend (local): `http://localhost:5000`.

## Core Feature Coverage

Phase 1 must-have:

- Goal creation with thrust area, title, description, UoM, target, weightage.
- Validation rules: total 100 percent, min 10 percent per goal, max 8 goals.
- Manager review workflow: inline edit, approve, return for rework.
- Goal lock on approval, Admin unlock capability.
- Shared goals with primary owner sync and recipient restrictions.

Phase 2 must-have:

- Quarterly achievement capture with goal status updates.
- Manager check-in comments and planned vs actual visibility.
- System-computed progress score for Min, Max, Timeline, Zero-based UoM.
- Check-in schedule enforcement via cycle settings.

Reporting and governance:

- Achievement report export (CSV).
- Completion dashboard.
- Audit trail for goal changes after lock-related actions.

## Bonus Features Implemented

- Analytics module (QoQ trends, distribution, manager effectiveness).
- Escalation log in analytics report output.
- Lightweight in-app notification center for key workflow events.

## Role-Based Demo Script (Evaluator Friendly)

Employee journey:

1. Register/login as Employee.
2. Create goals with valid weightage split.
3. Submit goal sheet only when total equals 100 percent.
4. Add achievement and quarterly check-in updates.

Manager journey:

1. Login as Manager.
2. Review submitted team goals.
3. Edit target/weightage inline.
4. Approve or return for rework.
5. Add check-in review comment.

Admin journey:

1. Login as Admin.
2. Configure cycle windows.
3. Manage hierarchy mapping.
4. Unlock approved goal for correction.
5. Verify reports, escalation log, and audit history.

## Constraints and Ground Rules Compliance (Section 7)

- Web browser accessible application.
- Distinct role journeys available.
- Version-controlled source code.
- Architecture document included in `docs/ARCHITECTURE.md`.

## Submission Deliverables Checklist (Section 8)

1. Live/hosted URL: add deployment link here.
2. Source repository URL: add GitHub/GitLab link here.
3. Architecture diagram: provided in `docs/ARCHITECTURE.md` (Mermaid).
4. Demo credentials for Employee/Manager/Admin: provide test users or role-switch instructions.

## Security Notes

- Do not commit real `.env` files.
- Keep only `Server/.env.sample` in the repository.
- Rotate any previously exposed secrets before final submission.
