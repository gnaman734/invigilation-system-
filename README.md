# Intelligent Invigilation Management System

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![PyPI](https://img.shields.io/pypi/v/sniff?label=Sniff%20(PyPI))
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://invigilation-system.vercel.app)

## Screenshots

- Login (placeholder)
- Admin Dashboard (placeholder)
- Instructor Dashboard (placeholder)

## Features

### Admin
- Instructor CRUD management
- Duty assignment with smart suggest
- Workload and punctuality monitoring
- Realtime analytics charts
- CSV report export

### Instructor
- Upcoming and past duty views
- Arrival marking with optimistic updates
- Realtime assignment updates
- Profile statistics and punctuality metrics

### Platform
- Role-based auth and protected routes
- Realtime sync with centralized connection manager
- Offline detection with in-memory queue replay
- Error boundaries and responsive UI

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| State | Zustand |
| Backend | Supabase (Auth, Postgres, Realtime) |
| Charts | Recharts |
| Date Handling | date-fns |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase project

### Installation
1. Clone the repository.
2. Install dependencies:
   - `npm install`
3. Start development server:
   - `npm run dev`

### Environment Setup
Create `.env.development` and `.env.production`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Database Setup Order
1. Run [supabase/schema.sql](supabase/schema.sql)
2. Run [supabase/SETUP_ONCE.sql](supabase/SETUP_ONCE.sql)
3. Run [supabase/seed.sql](supabase/seed.sql) (optional)

## Demo Credentials

- Admin: `admin@univ.edu` / `password` (example)
- Instructor: `instructor@univ.edu` / `password` (example)

> Replace with your actual seeded credentials.

## Project Structure

- [src](src)
  - [components](src/components)
  - [pages](src/pages)
  - [lib](src/lib)
  - [store](src/store)
- [supabase](supabase)

## Key Algorithms (Simple)

- Workload balancing: compares instructor duty count against team average using overload/underutilized factors.
- Punctuality scoring: computes $\frac{on\text{-}time}{total} \times 100$.
- Smart suggest: picks least-loaded instructor, optionally filtered by department.
- Realtime reconciliation: applies insert/update/delete payloads into local state without full reload.

## Deployment (Vercel)

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add production env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.
5. Verify SPA rewrites and security headers from [vercel.json](vercel.json).

## Contributing

1. Create feature branch.
2. Keep commits focused and descriptive.
3. Run `npm run build` before PR.
4. Include screenshots and test evidence for UI/features.
