# Clinic Rx

A prescription management app for the clinic: printable prescriptions, a medication
database, and monthly issuance statistics. Built as an installable web app (PWA) so
it can be used from any device — desktop or phone — with data synced through a shared
online database.

## 1. Create your database (Supabase, free)

1. Go to https://supabase.com and create a free account and a new project.
2. In the project dashboard, open **SQL Editor** > **New query**.
3. Paste the entire contents of `supabase-schema.sql` (in this folder) and click **Run**.
   This creates the `settings`, `meds`, and `prescriptions` tables and seeds a starter
   medication list.
4. Go to **Project Settings > API**. Copy the **Project URL** and the **anon public** key.

## 2. Configure the app

1. Copy `.env.example` to a new file named `.env`.
2. Paste in your Project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxxxxx
   ```

## 3. Run it locally to test

You'll need Node.js installed (https://nodejs.org, LTS version).

```
npm install
npm run dev
```

Open the URL it prints (usually http://localhost:5173) and confirm everything works —
add a medication, issue a prescription, check statistics.

## 4. Deploy it so it has a real, permanent web address

The easiest free option is **Vercel**:

1. Push this folder to a GitHub repository (create one at https://github.com/new,
   then follow GitHub's instructions to push this code to it).
2. Go to https://vercel.com, sign in with GitHub, and click **Add New Project**.
3. Select your repository. Vercel will auto-detect it's a Vite app.
4. Before deploying, add the two environment variables from your `.env` file under
   **Environment Variables** (same names: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
5. Click **Deploy**. In about a minute you'll get a permanent URL like
   `https://clinic-rx.vercel.app`.

Netlify or Cloudflare Pages work the same way if you prefer them.

## 5. Install it like an app

Once it's deployed to a real HTTPS URL:

- **On a phone (iOS or Android):** open the URL in the browser, then use
  "Add to Home Screen" (Safari) or the "Install app" prompt (Chrome).
- **On desktop (Chrome/Edge):** open the URL, click the install icon in the address
  bar, or the browser menu > "Install Clinic Rx".

It will then open in its own window with its own icon, just like installed software,
and works offline for the interface itself (an internet connection is still needed to
save or load prescriptions, since data lives in the shared database).

## Notes

- The medication database, prescriptions, and clinic letterhead settings are shared
  across every device that opens the app — perfect for you and your mum's clinic
  using it from different computers.
- Security: the current setup allows anyone with the URL and anon key to read/write
  data (see the note in `supabase-schema.sql`). That's reasonable for a small internal
  tool with a private URL, but if you want real staff logins and access control later,
  that's a straightforward addition — just ask.
- To replace the placeholder app icon, swap out `public/icon-192.png` and
  `public/icon-512.png` with your own square logo images at those sizes.
