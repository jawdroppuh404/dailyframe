# Daily Frame (MVP)

A minimal hobbyist photography web app:
- daily prompt
- one photo per day (replace allowed until midnight)
- caption + mood
- prompt archive
- progress: streak + last 28 days grid
- "i'm stuck" micro-prompts

Theme: **white Courier text on black background**.

## Local dev

1) Install deps

```bash
npm install
```

2) Set `DATABASE_URL` in `.env` (see `.env.example`)

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

### 4) Add Vercel Blob
Storage -> Add -> Blob

(Blob env vars are added automatically. This app uploads images using the server-side `put()` API.)

### 5) Configure build command
Project Settings -> Build & Development Settings:
- Build command: `npm run vercel-build`

This runs:
- `prisma generate`
- `prisma migrate deploy`
- `next build`

### 6) Seed prompts in production (one-time)
After the first deploy, seed prompts into the production DB.

Option A (simple): run the seed locally against production DB:
- Temporarily set your local `DATABASE_URL` to the production connection string
- Then run:

```bash
npm run seed
```

### 7) Done
Open your Vercel URL, upload a photo, and check Progress.

## Notes
- MVP uses a fixed demo user id: `demo-user` (no authentication yet)
- Photos are stored on Vercel Blob; DB data is on Postgres
