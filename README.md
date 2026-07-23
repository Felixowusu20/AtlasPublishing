# Atlas Academic Publishing

Next.js journal platform with Prisma (Neon PostgreSQL), Cloudinary uploads, Google SMTP email, author auth, and an admin panel for CMS + peer review.

## Setup

1. Copy env placeholders and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AUTH_SECRET` | JWT signing secret |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Image & manuscript uploads |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `FROM` | Google SMTP (App Password) |
| `NEXT_PUBLIC_APP_URL` | App URL used in emails |

2. Install and push the schema:

```bash
npm install
npm run db:push
# or: npm run db:migrate
```

3. Run the app:

```bash
npm run dev
```

## Roles & URLs

- **Authors**: `/register`, `/login`, `/dashboard`, `/submissions/new`
- **Super admin bootstrap**: `/admin/register` (only when no super admin exists)
- **Admin / reviewers**: `/admin/login` → `/admin`
  - Super admin: Hero CMS, Latest articles, Announcements, Journals, Reviewers, Submission inbox
  - Reviewers: Submission inbox + send feedback (email + author dashboard progress)

## Review flow

1. Author submits a manuscript (file → Cloudinary).
2. It appears in `/admin/submissions`.
3. Reviewer/admin sends feedback with a new status.
4. Author receives email + in-app notification; progress bar updates immediately.
