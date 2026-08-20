# CampusBuddy with Attendance Integration

This project keeps the original CampusBuddy student-management system intact and uses its existing faculty/student dashboards, notes, events, profile, assignment, and attendance flows.

## Active System

- Original CampusBuddy login and role-based dashboards are active again
- Faculty features remain available:
  - Students
  - Notes
  - Events
  - Daily attendance
  - Analytics
- Student features remain available:
  - Dashboard
  - Academic view
  - Daily attendance views
  - Regular attendance views
  - Notes and events
- Parent and admin flows remain wired through the original app shell

## Attendance Integration

Attendance is integrated through the original CampusBuddy modules:

- Faculty attendance flow: [FacultyDashboard.jsx](C:\Users\rites\Downloads\SMS-master\SMS-master\frontend\src\components\Faculty\FacultyDashboard.jsx)
- Student attendance views: [Dashboard.jsx](C:\Users\rites\Downloads\SMS-master\SMS-master\frontend\src\components\Dashboard\Dashboard.jsx)
- Backend attendance routes: [dailyAttendance.js](C:\Users\rites\Downloads\SMS-master\SMS-master\backend\src\routes\dailyAttendance.js)

## Login Fix

The active auth flow is now the original MongoDB-based CampusBuddy auth again:

- frontend auth client: [authService.js](C:\Users\rites\Downloads\SMS-master\SMS-master\frontend\src\services\authService.js)
- backend auth routes: [auth.js](C:\Users\rites\Downloads\SMS-master\SMS-master\backend\src\routes\auth.js)
- backend auth controller: [authController.js](C:\Users\rites\Downloads\SMS-master\SMS-master\backend\src\controllers\authController.js)

## Run

1. Ensure MongoDB is running for the `MONGODB_URI` in [backend/.env](C:\Users\rites\Downloads\SMS-master\SMS-master\backend\.env)
2. Start backend:
   `cd backend && npm run dev`
3. Start frontend:
   `cd frontend && npm run dev`

## Note

The newer PostgreSQL attendance prototype files are still present in the repo, but the active integrated app currently runs on the original CampusBuddy MongoDB stack so the previous features continue to work.
