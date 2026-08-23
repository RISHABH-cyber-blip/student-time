# Orbit — React + TypeScript + Vite edition

Same app as before, rebuilt on Vite instead of Next.js:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Framer Motion + react-router-dom
- **Backend**: Supabase (auth, Postgres, Edge Functions)
- **AI**: Anthropic API, called from two Supabase Edge Functions (so your API key never
  reaches the browser)

---

## 0. What you need
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) or [Netlify](https://netlify.com) account
- An [Anthropic API key](https://console.anthropic.com)
- [Node.js](https://nodejs.org) v18+ installed
- The [Supabase CLI](https://supabase.com/docs/guides/cli) — installed via:
  ```bash
  npm install -g supabase
  ```

---

## 1. Set up the Supabase project
1. supabase.com → **New project**. Save your DB password somewhere.
2. **SQL Editor → New query** → paste the entire contents of `supabase/schema.sql` → **Run**.
   This creates `profiles`, `timetable_events`, `tasks`, `daily_stats` with row-level security
   so each user only ever sees their own rows.
3. **Project Settings → API** → copy your **Project URL** and **anon public** key.
4. (Optional while testing) **Authentication → Settings** → turn off "Confirm email" so you can
   sign up and log in immediately.

---

## 2. Deploy the two Edge Functions (this is what replaces Next.js's API routes)
From inside this project folder:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # find this in your Supabase project URL
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase functions deploy parse-timetable
supabase functions deploy assistant
```

That's it — `parse-timetable` and `assistant` are now live serverless functions on Supabase's
infrastructure, and the frontend calls them with `supabase.functions.invoke(...)`, which
automatically attaches the logged-in user's auth token.

---

## 3. Local development
```bash
npm install
cp .env.example .env      # then fill in your real Supabase URL + anon key
npm run dev
```
Open http://localhost:5173

---

## 4. Push to GitHub
```bash
git init
git add .
git commit -m "Orbit — Vite + TS"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

---

## 5. Deploy the frontend to Vercel
1. vercel.com → **Add New → Project** → import your repo.
2. Vercel should auto-detect Vite. If it asks:
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Add environment variables before deploying:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon public key |
4. Deploy. `vercel.json` in this project already handles the SPA routing fallback so
   `/dashboard`, `/tasks` etc. work on refresh and direct links.

**If you'd rather use Netlify instead:** same env vars, build command `npm run build`,
publish directory `dist`, and add a `public/_redirects` file containing `/* /index.html 200`
for the same SPA routing fix.

---

## 6. Put it on your phone
1. Open your deployed URL in your phone's browser.
2. Sign up with email + password.
3. Menu → **Add to Home Screen** — gives you a real tappable icon.
4. Allow notifications when prompted — powers in-app alarms while the app is open.

---

## 7. Using it
- **Timetable**: upload a photo → AI fills in every class automatically, or add manually.
- **Tasks**: Today / Pending / Later tabs. Mark done, **Shift** (new slot today), **Skip**
  (auto-slotted into tomorrow), or **Later** (parked, restorable anytime). Anything left
  unfinished at day's end auto-reschedules into today's free time next time you open the app.
- **Dashboard**: live day-dial of today's classes, 14-day completion chart, tasks-per-day chart.
- **Assistant**: chat that sees your goals, today's classes/tasks, and overdue items.

---

## 8. Known limitations
- Notifications only fire while the tab/PWA is open (browser Notification API, not true OS push).
  Real push needs a service worker + a scheduled job — see Phase 2 below.
- The assistant advises; it doesn't yet auto-rewrite your whole timetable.
- No 3D avatar yet — text chat only for now.

## 9. Phase 2 ideas
- **True push notifications**: add a service worker, subscribe via the Web Push API, store the
  subscription in a new Supabase table, and add a `pg_cron` job or a scheduled Edge Function that
  checks upcoming events and pushes.
- **3D robot assistant**: add `three.js` + `@react-three/fiber` to the Assistant page.
- **Monthly goal planner**: add a `goals` table with milestones; a new Edge Function asks the AI
  to break a goal into weekly tasks inserted into `tasks`.
- **Full auto-reschedule engine**: extend `src/lib/scheduling.ts` to rebalance a whole overloaded
  day at once, instead of one task at a time.
"# student-time" 
