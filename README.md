# CMS Platform — Web Dashboard

Next.js dashboard for the Construction Management System.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS 4, Radix UI primitives
- **Charts:** Chart.js, Recharts
- **State:** Zustand (client state), TanStack React Query (server state)
- **Forms:** React Hook Form + Zod

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The app runs on `http://localhost:3000` and expects the API at `http://localhost:8000`.

## Environment Variables

Create `.env.local`:

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Login page
│   ├── (dashboard)/           # Authenticated pages
│   │   ├── overview/          # KPI dashboard
│   │   ├── projects/          # Project management
│   │   ├── boq/               # Bill of Quantities
│   │   ├── procurement/       # Procurement pipeline
│   │   ├── inventory/         # Inventory & MRs
│   │   ├── site-ops/          # Daily Progress Reports
│   │   ├── finance/           # Financial management
│   │   ├── quality/           # Quality & safety
│   │   ├── documents/         # Document management
│   │   ├── approvals/         # Approval inbox
│   │   ├── users/             # User management
│   │   └── company-settings/  # Branding & settings
│   └── layout.tsx             # Root layout
├── components/
│   ├── layouts/               # Sidebar, providers, theme
│   └── ui/                    # Reusable components
├── hooks/                     # React Query hooks
├── lib/                       # API client, utilities
├── store/                     # Zustand stores
└── types/                     # TypeScript interfaces
```
