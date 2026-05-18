PRIVATE DEMO INSTRUCTIONS
========================

This file is intended for private sharing with evaluators and must NOT be committed to a public repository. It documents how to run the demo, seeded accounts, and safety guidance.

Seeded demo accounts (for evaluation)
- Admin: demo_admin / AdminPass!23
- Manager: demo_manager / ManagerPass!23
- Employee: demo_employee / EmployeePass!23

Quick run steps (Server + Client)
1. In `Server` folder, ensure you have a valid `Server/.env` with `MONGO_URI` and `JWT_SECRET`.
2. Install and seed demo users:

```bash
cd Server
npm install
npm run seed
```

3. Start the backend:

```bash
npm run dev
```

4. Start the frontend (new terminal):

```bash
cd ../Client/goalSetter
npm install
npm run dev
```

Demo user journeys (short)
- Employee: login -> create goal -> add check-in -> submit for approval
- Manager: login -> approve pending goal -> provide feedback
- Admin: login -> view audit logs/reporting -> adjust cycle

Security & cleanup notes
- Keep this repository private while evaluators have access.
- Remove demo accounts before making the repo public. To delete demo users from the database manually, run the following in a safe environment (example using Node REPL):

```bash
cd Server
node -e "(async()=>{const mongoose=require('mongoose');const User=require('./models/User').default;require('dotenv').config();await mongoose.connect(process.env.MONGO_URI);await User.deleteMany({username:/^demo_/});console.log('Deleted demo users');process.exit()})()"
```

- Alternatively, I can add a `scripts/resetDemoUsers.js` script to automate cleanup — tell me if you want that.

Reminder: rotate credentials and remove any `ALLOW_OPEN_ROLES` or demo flags before publishing.
