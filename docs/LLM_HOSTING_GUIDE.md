# LLM guide: hosting PocketDays on Cloudflare for free

This file is written for AI assistants (and the people reading along). Use it to walk a user through hosting their own copy of PocketDays on Cloudflare's free plan. It complements [SELF_HOSTING.md](./SELF_HOSTING.md), which is the human-facing version; if the two disagree, trust the repository files (`wrangler.toml`, `schema.sql`, `functions/api/diary.ts`, `package.json`) and current Cloudflare documentation.

## Rules for the assistant

1. Never ask the user to paste a Cloudflare API token, password or private diary link into chat. Wrangler logs in through the browser (`npx wrangler login`); the user does that themselves.
2. Never commit or print the private diary link, backups or personal data.
3. Do not claim the deployment works until the user has confirmed the checks in "Verify" below. Say what was and was not checked.
4. Cloudflare's dashboard labels and free-tier limits change. Quote limits only after checking https://developers.cloudflare.com/pages/platform/limits/, https://developers.cloudflare.com/d1/platform/limits/ and https://developers.cloudflare.com/workers/platform/limits/. Do not state numbers from memory as fact.
5. Run commands one step at a time and wait for each result. Stop and explain on any error instead of guessing.
6. Confirm before anything destructive or irreversible: deleting a D1 database, deleting a Pages project, restoring a backup over existing data.
7. Do not modify the app's source to make hosting work. Hosting only needs `wrangler.toml` (database ID) and dashboard settings.

## What PocketDays needs

| Piece | Cloudflare product | Free plan | Notes |
| --- | --- | --- | --- |
| Static app (Angular build) | Pages | Yes | Output folder `dist/pocketdays/browser` |
| Sync API `functions/api/diary.ts` | Pages Functions (runs as a Worker) | Yes, counts toward the Workers free request quota | Only needed for sync |
| Storage | D1 (SQLite) | Yes, within free storage and daily read and write quotas | One table, `diaries`, from `schema.sql` |

A personal diary is far below free quotas. Offer the user two modes and let them pick:

- Local only: static files only, no D1. Data stays in each browser; backup and restore by file. Simplest.
- With private sync: Pages + Functions + D1. Same diary on phone and laptop through a private link.

Requirements: a free Cloudflare account (no card needed for Pages, Functions or D1 free usage at the time of writing, verify), Node 22.18 or newer, npm, and a fork or clone of the repository. A custom domain is optional; the free `*.pages.dev` address works.

## Path A: local only (no database)

```sh
npm install
npm run build
npx wrangler login
npx wrangler pages deploy dist/pocketdays/browser --project-name pocketdays
```

Expected: Wrangler prints a `https://<project>.pages.dev` URL. In the app, Settings will say sync is unavailable; that is correct for this mode. Skip to "Verify" step 1 and 3.

Do not use dashboard drag-and-drop for the sync setup: it uploads static files only and omits the `functions/` folder.

## Path B: with private sync

Work from the repository root, one command at a time.

### 1. Install and sign in

```sh
npm install
npx wrangler login
```

The browser opens for Cloudflare authorization. The user approves it themselves.

### 2. Create the D1 database

```sh
npx wrangler d1 create pocketdays
```

Wrangler prints a `database_id` (a UUID). It identifies the database; it is not a password, but it belongs in the user's own fork only.

### 3. Put the ID in `wrangler.toml`

Replace `REPLACE_WITH_D1_DATABASE_ID`. Keep the binding name exactly `DB`; the function reads `env.DB`.

```toml
name = "pocketdays"
compatibility_date = "2026-11-07"
pages_build_output_dir = "dist/pocketdays/browser"

[[d1_databases]]
binding = "DB"
database_name = "pocketdays"
database_id = "<the id printed in step 2>"
```

Warn the user: if this fork is public, the ID is visible. That is acceptable. If the upstream repository is ever the target of a pull request from this fork, do not include this change.

### 4. Create the table in the remote database

```sh
npx wrangler d1 execute pocketdays --remote --file=schema.sql
```

`--remote` matters. Without it the table is created only in a local test database.

### 5. Build and deploy

Pick one:

Direct upload (fastest, recommended for a first run):

```sh
npm run build
npx wrangler pages deploy dist/pocketdays/browser --project-name pocketdays
```

Git integration (auto-deploy on every push): in the Cloudflare dashboard, go to Workers & Pages, create a Pages project, connect the user's fork, then set:

- Build command: `npm run build`
- Build output directory: `dist/pocketdays/browser`
- Environment variable `NODE_VERSION` = `22` (production and preview)

After the first build, open the project's Settings, Bindings and confirm a D1 binding named `DB` pointing at the `pocketdays` database. The `wrangler.toml` file normally supplies it; if it is missing, add it by hand (variable name `DB`) and redeploy.

### 6. Open the site over HTTPS

Use the `https://<project>.pages.dev` URL. HTTPS is required for install-to-home-screen, the service worker and the copy-link button.

## Verify

Ask the user to confirm each item and report what they actually saw:

1. The app loads and an expense can be added to a date.
2. Settings: the Sync row settles with no error and the Settings tab shows no dot.
3. Settings, Back up downloads a JSON file.
4. Sync only: choose Copy on Private link, open the link in a second browser or device; the same expense appears.
5. Optional: on a phone, use the browser's Add to Home Screen.

Optional API probe (the 401 proves the Function is deployed; it does not prove D1):

```sh
curl -i https://<project>.pages.dev/api/diary
```

Expected: `401` with `{"error":"Private diary link required"}` and `Cache-Control: no-store`. A `404` or an HTML page means the Functions folder was not deployed.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Sync says unavailable on the deployed site | Deployed with drag-and-drop, so no Function | Redeploy with `wrangler pages deploy` or Git integration |
| `/api/diary` returns 404 or HTML | `functions/` not included | Deploy from the repository root with Wrangler, or use Git integration |
| `/api/diary` returns 500 | D1 binding missing or not named `DB`, or table not created | Check Bindings; rerun step 4 with `--remote`; redeploy |
| `no such table: diaries` | Schema applied only locally | Run step 4 with `--remote` |
| Build fails on Node version | Cloudflare used an older Node | Set `NODE_VERSION=22` and redeploy |
| `database_id` errors during deploy | Placeholder still in `wrangler.toml` | Complete step 3 |
| Deep links such as `/stores` 404 on refresh | A custom `404.html` or redirect rule is interfering | Remove it; Pages serves `index.html` for unknown paths when there is no `404.html`. Do not add a `/* /index.html 200` rule, which Cloudflare flags as a loop |
| Old version after a deploy | Service worker cache | Close all tabs of the app and reopen; a hard refresh may be needed once |

## Free plan and cost guardrails

- Static asset requests on Pages are free and unlimited at the time of writing (verify).
- Function calls and D1 reads and writes have daily free quotas. Sync makes one read on open and one write per saved change, so one person uses a tiny fraction (verify the current numbers before quoting any).
- Free plans stop serving the exceeded feature rather than charging, unless the user upgrades to a paid plan. Tell the user to avoid enabling paid add-ons they do not need.
- Builds on Git integration have a monthly free build count; direct upload does not use it.

## Protect the deployment

There are no accounts. Anyone who finds the URL can create their own diary on the user's database, and nothing limits how many. For a personal instance, recommend at least one of:

1. Cloudflare Access (Zero Trust, free for small teams) in front of the site, allowing only the user's email. Note that a restrictive Access policy also applies to `/api/*`, which is what is wanted, but test sync on each device after enabling it.
2. A WAF rate-limiting rule on `/api/*` (check what the free plan includes).
3. Local-only mode with no D1.

Also explain: the private link is a full-access capability. Do not share it, paste it into chat or put it in screenshots. There is no key rotation or recovery.

## Updating and backing up

```sh
git remote add upstream <upstream repository URL>
git fetch upstream
git merge upstream/main
npm install
npm run check && npm test && npm run build
```

After merging, make sure `wrangler.toml` still has the user's database ID (a merge can restore the placeholder). Then redeploy. Ask the user to back up from Settings before updating a diary they care about.

To export the cloud database directly: `npx wrangler d1 export pocketdays --remote --output=pocketdays-backup.sql`. That file contains key hashes and diary data; keep it private and out of git (the `.gitignore` covers `pocketdays-backup-*.json` only, so use a name outside the repository).

## Tearing down (destructive, confirm first)

Only on explicit request: delete the Pages project in the dashboard, then `npx wrangler d1 delete pocketdays`. This permanently deletes the cloud copy. Devices keep their local data unless cleared.

## Quick reference

| Item | Value |
| --- | --- |
| Node | 22.18 or newer |
| Build | `npm run build` |
| Output directory | `dist/pocketdays/browser` |
| D1 binding name | `DB` |
| Database name | `pocketdays` |
| Schema file | `schema.sql` |
| API route | `/api/diary` (GET, PUT; bearer key header) |
| Placeholder to replace | `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` |

## Honest status to relay

The maintainers have not yet verified live sync on a real Cloudflare deployment, installation on physical devices or Lighthouse scores (see the status note in the README). If the user reports a failure, ask for the exact error text and the failing step, and suggest they open an issue without including private links or diary data.
