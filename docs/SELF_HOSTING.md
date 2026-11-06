# Host your own PocketDays

PocketDays is a static Angular app plus one Cloudflare Pages Function (`functions/api/diary.ts`) backed by one D1 table (`schema.sql`). You can host everything on Cloudflare's free tier or host the static files anywhere and skip cloud sync.

Using an AI assistant? [LLM_HOSTING_GUIDE.md](./LLM_HOSTING_GUIDE.md) is the same process written for assistants, with rules and troubleshooting.

These steps follow Cloudflare's documented Pages and D1 workflows. Dashboard labels change over time, so check Cloudflare's current documentation if something looks different, and report anything outdated here.

## Choose a setup

| Setup | What you get | What you need |
| --- | --- | --- |
| Local only | Full app, data stays in each browser, backup and restore by file | Any static host with HTTPS |
| With private sync | Same diary on your phone and laptop through a private link | Cloudflare Pages + D1 |

Local only needs no Cloudflare account: build the app (`npm run build`) and serve `dist/pocketdays/browser` over HTTPS. Settings will say cloud sync is unavailable, which is expected.

## Deploy with Cloudflare Pages and D1

Requirements: a Cloudflare account, Node 22.18 or newer, and your fork of this repository.

1. Sign in to Wrangler.

   ```sh
   npx wrangler login
   ```

2. Create the database and note the database ID it prints.

   ```sh
   npx wrangler d1 create pocketdays
   ```

3. Put that ID in `wrangler.toml` in your fork (replace `REPLACE_WITH_D1_DATABASE_ID`). A D1 database ID identifies your database but is not a password; still, keep it in your own fork and do not reuse someone else's.

4. Create the table.

   ```sh
   npx wrangler d1 execute pocketdays --remote --file=schema.sql
   ```

5. Create the Pages project and deploy, either way:

   - Git integration (updates on every push): in the Cloudflare dashboard create a Pages project from your fork. Build command `npm run build`, build output directory `dist/pocketdays/browser`, and an environment variable `NODE_VERSION` set to `22`. Because `wrangler.toml` declares `pages_build_output_dir`, the D1 binding named `DB` comes from that file; confirm it appears under the project's settings after the first build.
   - Direct upload from your machine:

     ```sh
     npm run build
     npx wrangler pages deploy dist/pocketdays/browser --project-name pocketdays
     ```

   The root `functions/` folder is deployed with the project. A drag-and-drop upload of only the static files does not include the API.

6. Open the deployed URL over HTTPS. HTTPS is required for installing the app, the copy-link button and the service worker.

## Check that it works

1. Open your site, add an expense, and open Settings. The Sync row should settle without an error, and the Settings tab should not show a dot.
2. In Settings choose Copy on Private link and open the link in another browser or device. You should see the same expense.
3. Back up from Settings and keep the file somewhere safe.

If Sync stays unavailable, check that the D1 binding is named exactly `DB`, that the table exists in the remote database (step 4), and that the request to `/api/diary` is not blocked by a firewall or Access rule.

## Local preview with the API

```sh
npx wrangler d1 execute pocketdays --local --file=schema.sql
npm run build
npx wrangler pages dev dist/pocketdays/browser
```

## Who can use your deployment

There are no accounts. Anyone who can reach your URL can create a diary on your D1 database by opening the app, and the API accepts any well-formed random key. Each diary is limited to about 1 MB of JSON, but nothing limits how many diaries are created.

That is fine for a private instance only you know about. If you publish the address widely or want to be safe, do at least one of:

- Put the site behind Cloudflare Access so only you can open it.
- Add rate limiting or a WAF rule on `/api/*`.
- Host the static files only and use backup and restore, with no D1 at all.

Also remember that the private link grants full access to that diary. Do not paste it into chats, issues or screenshots.

## Customise

- App name and icons: `src/index.html`, `public/manifest.webmanifest`, `public/icons/`.
- Currency and week start: stored per diary in settings (INR and Monday by default in `src/app/core/models.ts`).
- Look and feel: design tokens at the top of `src/styles.css`.

## Updating your fork

```sh
git remote add upstream <this repository>
git fetch upstream
git merge upstream/main
npm install
npm run check && npm test && npm run build
```

Review `wrangler.toml` after merging so your database ID is not overwritten. Back up before updating a diary you care about.

## Backups and moving devices

Settings has Back up (downloads a JSON file) and Restore (replaces the diary on the current device after a confirmation). Restoring a file validates it first and never contains your private link. With sync on, a restore syncs like any other change; if two devices changed the same day you will be asked to choose a copy.

## Known limits

Live sync on a real deployment, installation on physical devices and Lighthouse scores have not been verified by the maintainers. There is no multi-user sharing, no key rotation and no account recovery; losing the private link and the browser storage on every device means losing access to the cloud copy.
