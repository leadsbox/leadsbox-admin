# LeadsBox Admin

Internal admin application for LeadsBox operations. This app is separate from customer-facing `leadsbox-webapp` and currently includes the subscribers directory.

## Features

- Admin login using dedicated admin auth (`/admin/auth/login`)
- Admin Google login (`/admin/auth/google`) with backend email allowlist enforcement
- Overview dashboard (`/admin/overview`)
- User management (`/admin/users`) with suspend/restore controls
- Organization management (`/admin/organizations`) with activate/deactivate controls
- Protected subscribers directory (`/metrics/subscribers`)
- Search + status filters + latest/all toggle
- CSV export for subscriber records

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

Default dev URL is `http://localhost:5174`.

## Environment

`VITE_API_BASE` should point to the backend API:

- local backend: `http://localhost:3010/api`
- production backend: `https://<your-backend-domain>/api`

## Backend requirements

To access admin endpoints successfully:

1. Add your admin email to `METRICS_ADMIN_EMAILS` in backend env.
2. Add admin app origin to backend CORS config:
- set `ADMIN_APP_URL`
- or include origin in `CORS_ORIGINS`
3. Configure backend Google OAuth values:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ADMIN_GOOGLE_REDIRECT_URI` (must match `/api/admin/auth/google/callback` on your backend)

Only emails in `METRICS_ADMIN_EMAILS` can log in to this admin app.

Example:

```env
ADMIN_APP_URL=http://localhost:5174
METRICS_ADMIN_EMAILS=founder@leadsboxapp.com
```
