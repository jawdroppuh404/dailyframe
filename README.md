# Daily Frame (MVP)

A minimal hobbyist photography web app:
- daily prompt
- one photo per day (replace allowed until midnight)
- caption + mood
- prompt archive
- progress: streak + last 28 days grid
- permanent photography ranks and increasingly rare camera unlocks based on the
  user's best streak (3, 7, 28, 90, 180, and 365 days, then yearly)
- "i'm stuck" micro-prompts
- email/password accounts with 30-day secure sessions
- confirmed email addresses, password recovery, and account deletion
- private, account-scoped photo storage
- shareable prompt-card images

The prompt library contains 365 challenges. A prompt is permanently assigned
to each calendar date on first request. The rotation uses every active prompt
before recycling the least-recently-used prompt.

Theme: **white Courier text on black background**.

## Local dev

1) Install deps

```bash
npm install
```

2) Set `DATABASE_URL`, `PRIVATE_BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, and
`EMAIL_FROM` in `.env` (see `.env.example`)

3) Migrate + seed

```bash
npx prisma migrate dev --name init
npm run seed
```

4) Run

```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel (recommended)

### 1) Push to GitHub
Create a repo, commit this folder, push.

### 2) Create Vercel project
Import the GitHub repo into Vercel.

### 3) Add Vercel Postgres
In your Vercel project:
- Storage -> Add -> Postgres
- Copy the **connection string** into an env var named `DATABASE_URL` (Production + Preview)

### 4) Add private Vercel Blob
Storage -> Create Database -> Blob:
- choose **Private** access
- set the custom environment variable prefix to `PRIVATE_BLOB`
- enable the read-write token environment variable

The resulting `PRIVATE_BLOB_READ_WRITE_TOKEN` is used only by authenticated
server routes to authorize direct private uploads and serve account-owned photos.

### 5) Configure build command
Project Settings -> Build & Development Settings:
- Build command: `npm run vercel-build`

This runs:
- `prisma generate`
- `prisma migrate deploy`
- `next build`

### 6) Configure transactional email
Create a Resend API key and verify a sending domain. Add these Production and
Preview environment variables:

- `RESEND_API_KEY`
- `EMAIL_FROM` (for example `Daily Frame <accounts@example.com>`)

### 7) Seed prompts in production
After the first deploy, seed prompts into the production DB. The seed is
idempotent, so it can be rerun whenever the library changes without creating
duplicates or replacing historical daily assignments.

Option A (simple): run the seed locally against production DB:
- Temporarily set your local `DATABASE_URL` to the production connection string
- Then run:

```bash
npm run seed
```

### 8) Done
Open your Vercel URL, upload a photo, and check Progress.

## Notes
- Accounts use normalized email addresses, scrypt password hashes, and hashed
  30-day session tokens in secure, HTTP-only cookies.
- Verification and password-reset links are single-use, expire automatically,
  and are stored in the database only as SHA-256 hashes.
- When an existing anonymous browser creates an account, its prior photos and
  streak are attached to that account once.
- New users currently default to the `America/New_York` timezone.
- A streak remains active until the current day ends, and unlocked ranks are
  based on the best historical streak so they are never taken away.
- New photos are stored in private Vercel Blob storage and streamed only after
  an ownership check. Existing public-store photos remain available through the
  same authenticated proxy but cannot retroactively be made private in place.
- Database data is stored in Postgres.
