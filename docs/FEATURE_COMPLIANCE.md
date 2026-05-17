# AtomQuest Goal Portal Feature Compliance

## Must-Have Coverage

| Requirement | Implementation |
| --- | --- |
| Employee goal sheet creation | Employee dashboard supports thrust area, title, description, UoM, target, deadline, and weightage. |
| Weightage rules | Server enforces min 10%, max 8 goals, total <= 100 while drafting, and exactly 100% before submission. |
| Manager L1 approval | Manager/Admin review queue supports comments, inline target/weightage edits, approval, and return for rework. |
| Goal locking | Approved goals are locked; Admin can unlock for exception handling. |
| Shared goals | Manager/Admin can assign shared KPIs to multiple employees with individual weights and a primary owner. |
| Shared-goal restrictions | Recipients can edit weightage only; title/target stay read-only for employees. |
| Shared achievement sync | Primary owner achievement updates sync to linked shared goal sheets. |
| Quarterly achievements | Employees can log actual achievement, quarter, and status. |
| Quarterly check-ins | Employees can log planned vs actual, completion date, and comments; managers can add review comments. |
| Progress scoring | Check-ins compute Min, Max, Timeline, and Zero-based progress scores. |
| Cycle windows | Admin-configurable phase and quarterly windows control goal and achievement/check-in capture. |
| Roles | Employee, Manager, and Admin have distinct dashboards and API access scopes. |
| Reports | CSV exports, completion dashboard, status summaries, and achievement reports are available to Manager/Admin. |
| Audit trail | Goal creation, edits, approval/rework, and unlock actions are logged with before/after snapshots. |

## Bonus Coverage

| Bonus Area | Implementation |
| --- | --- |
| Escalation module | Reports include an escalation log for missing goal sheets, draft/rework goals, and stale submitted goals. |
| Analytics module | Reports include QoQ achievement trends, goal distribution, department summaries, and manager effectiveness. |

## External Integration Notes

Microsoft Entra ID SSO, email, and Teams bot notifications require tenant credentials and messaging infrastructure. The local implementation keeps auth, hierarchy, and notification-adjacent governance inside the app so the core demo remains runnable without paid or external services.
