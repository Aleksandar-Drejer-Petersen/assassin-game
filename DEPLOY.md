# Deploy the Assassins site for free (no command line)

You'll put the site online with a free `something.vercel.app` address.
Total cost: **$0**. Time: **~15 minutes**. You do NOT need v0 for any of this.

There are three free accounts involved, all free forever for this:
- **GitHub** – stores the code
- **Vercel** – runs the website (the free "Hobby" plan)
- **Neon** – the free database (added from inside Vercel in one click)

---

## Step 1 — Put the code on GitHub (browser only)

1. Make a free account at https://github.com (skip if you have one).
2. Go to https://github.com/new to create a new repository.
   - **Repository name:** `assassin-game` (or anything)
   - Set it to **Private** if you like. Leave everything else default.
   - Click **Create repository**.
3. On the next page, click the link **"uploading an existing file"**
   (it's in the line: *"…or push an existing repository…"* — the upload link
   is under the *"Get started by …"* area; if you don't see it, go to
   `Add file ▸ Upload files`).
4. Open the project folder on your computer, select **all files and folders
   inside it** (not the outer folder — the actual files like `app`,
   `components`, `package.json`, etc.), and drag them into the browser.
5. Wait for the upload to finish, then click **Commit changes**.

> Note: there is intentionally no `node_modules` folder — Vercel builds that
> itself. If you don't see it, that's correct.

---

## Step 2 — Connect it to Vercel

1. Make a free account at https://vercel.com — click **Continue with GitHub**
   so the two are linked.
2. On your Vercel dashboard click **Add New… ▸ Project**.
3. Find your `assassin-game` repository in the list and click **Import**.
4. **Don't click Deploy yet** — first do Step 3 (the database) below.
   Leave this tab open.

---

## Step 3 — Add the free database (Neon)

You can do this before or right after the first deploy. Easiest is right after,
so:

1. Click **Deploy** on the import screen and let it finish. The site will go
   live but show an error when it loads — that's expected, it has no database
   yet.
2. In your project, open the **Storage** tab (top menu).
3. Click **Create Database ▸ Neon (Postgres)** and accept the defaults
   (free plan). Vercel automatically adds a `DATABASE_URL` for you — you don't
   copy anything by hand.

---

## Step 4 — Set your admin password

1. In your Vercel project, open **Settings ▸ Environment Variables**.
2. Add a new one:
   - **Key:** `ADMIN_PASSWORD`
   - **Value:** whatever password you want for the admin page (e.g. `letmein-2026`)
   - Apply it to all environments (Production, Preview, Development).
3. Click **Save**.

---

## Step 5 — Redeploy so the changes take effect

1. Open the **Deployments** tab.
2. On the most recent deployment click the **…** menu ▸ **Redeploy** ▸ confirm.
3. When it finishes, click **Visit**. The scoreboard should load with
   "No players yet." 🎉

The database tables are created **automatically** the first time the site
loads — there is nothing to run or set up.

---

## Step 6 — Pick your web address & get the QR code

1. Your address is shown at the top of the project (like
   `assassin-game.vercel.app`). To change the front part, go to
   **Settings ▸ Domains**, or **Settings ▸ (project name)** to rename the
   project — the URL follows the project name.
2. Go to that address, log in at **/admin** with your password, and **add your
   players** (name, their target, location, item).
3. On the public home page there's a **QR code** and a **Print poster** button
   (`/poster`). Print it and hang it up — the QR points at your live site
   automatically, whatever the final address is.

---

## Day-to-day use

- **Record a kill:** go to `/admin`, log in, use the *Record kill* form
  (killer, victim, item, location, activity, witness). The killer inherits the
  victim's mission automatically.
- **Made a mistake?** The admin has a **History** panel — every change is
  snapshotted and you can **roll back** to any earlier state (and even undo a
  rollback).
- **Students** just scan the QR / open the address to see the live kill log and
  scoreboard. No login needed for them.

---

## If something looks broken

- **Site loads but errors / "No players" never changes** → the database wasn't
  added or the redeploy in Step 5 was skipped. Re-check Steps 3 and 5.
- **Admin password won't work** → the `ADMIN_PASSWORD` variable is missing or
  you didn't redeploy after adding it (Step 5).
- Every code change you upload to GitHub re-deploys automatically within a
  minute — no need to touch Vercel again.
