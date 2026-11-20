# ClientFlow Backend backup

Reconstructed backup of the NestJS CRM backend based on the code and project progress captured in chat. It is not a copy of the original local disk.

## Stack
- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- JWT login, bcrypt password hashing, role guard
- Modules: users, departments, employees, services, clients, requests, auth

## Setup
1. Install Node.js (22 recommended).
2. Copy `.env.example` to `.env` and fill in your PostgreSQL `DATABASE_URL` and a unique `JWT_SECRET`.
3. `npm install`
4. `npx prisma generate`
5. If database schema needs to be applied, run `npx prisma migrate dev --name init` (only if you intend to create/apply a migration; do not run against a database without reviewing it).
6. `npm run start:dev`

API base: http://localhost:3000

Routes implemented in this reconstruction:
- POST /auth/login
- GET/POST /users
- GET/POST /departments
- GET/POST /employees
- GET/POST /services
- GET/POST /clients
- GET/POST /requests (GET requires ADMIN or EMPLOYEE; POST requires ADMIN)
- PATCH /requests/:id/status (ADMIN or EMPLOYEE)
- POST /requests/:id/assign (ADMIN)

Important: This reconstructed backup may need compatibility fixes after `npm install` and Prisma generation, and it does not include local `.env`, secrets, generated Prisma client, uploaded documents, frontend, or any local database data.
