# Demo Guide and Seeded Accounts

This file contains temporary demo credentials and short user journeys for evaluation. Keep this file private.

## Seeded Credentials

- **Admin**
  - username: `demo_admin`
  - password: `AdminPass!23`

- **Manager**
  - username: `demo_manager`
  - password: `ManagerPass!23`

- **Employee**
  - username: `demo_employee`
  - password: `EmployeePass!23`

## Short Journeys

### Employee
1. Login as `demo_employee`.
2. Create a new Goal and add a check-in.
3. Submit goal for approval.

### Manager
1. Login as `demo_manager`.
2. Review pending approvals and approve the employee's goal.
3. Add feedback or adjust goal weight.

### Admin
1. Login as `demo_admin`.
2. View reports, audit logs, and manage cycle settings.
3. Export a sample report.

## How to run the seed (Server folder)

```bash
npm run seed
```

Make sure `Server/.env` contains a valid `MONGO_URI` and `JWT_SECRET` before running.

Remove these demo accounts before publishing the repository publicly.
