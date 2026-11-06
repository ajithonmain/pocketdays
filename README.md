# PocketDays

A quiet, mobile-first expense diary. The calendar is the home screen: tap a date, log what you spent in a few seconds, and see each day at a glance. Your data stays on your device first; optional private sync uses a Cloudflare D1 database that you host yourself.

No accounts, no ads, no analytics, no third-party fonts, no trackers.

> Status: early and actively developed. The app builds and its 43 tests pass, but live cloud sync on a real deployment, installation on physical devices and Lighthouse scores have not been verified yet.

## Features

- Calendar home screen with a month navigator, a year picker, and a ring or solid color on each date that has spend.
- Fast logging in a bottom sheet: store, amount, optional note, who paid, and people who were with you (token field with suggestions).
- Several stores per day, each in its own card, with a day total.
- Stores page: totals and visits per store for a month, year or all time, with search, sorting, paid-by and person filters, and a per-store order list.
- Automatic, unique store colors generated from the store name.
- Light, Dark and System themes.
- Works offline; saves locally first. Optional sync between your devices with a short one-time code or a private link.
- Settings shows the installed version and release time, offers install, and a strip above the bottom bar appears when a new version is ready.
- Backup and restore to a JSON file from Settings.
- Installable web app (PWA) when served over HTTPS.

## Quick start

You need Node 22.18 or newer and npm.

```sh
git clone <your fork or this repository>
cd pocketdays
npm install
npm start          # dev server on http://localhost:4200, UI only
```

Other commands:

```sh
npm run check      # strict TypeScript
npm test           # unit tests
npm run build      # production build in dist/pocketdays/browser
```

The dev server has no API, so Settings reports cloud sync as unavailable. Everything else works and saves in your browser.

## Host your own copy

Fork the repository, then follow [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md). In short: PocketDays is a static Angular app plus one Cloudflare Pages Function and one D1 table. You can also host only the static files and use PocketDays without cloud sync.

Hosting on Cloudflare's free plan with an AI assistant? Point it at [docs/LLM_HOSTING_GUIDE.md](./docs/LLM_HOSTING_GUIDE.md) (also indexed in [llms.txt](./llms.txt)); it holds the step-by-step instructions and rules the assistant should follow.

Before you put it on a public URL, read the notes on abuse and access in [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md#who-can-use-your-deployment) and [SECURITY.md](./SECURITY.md).

## How your data is handled

- Entries are saved in your browser (IndexedDB) first.
- Sync is optional. First open creates a random 256-bit key on the device. To use the same diary on another device, Settings > Link a device shows a code like `K7M2-9QXA`; type it in Settings > Have a code on the other device. The code works once and expires after 10 minutes. The device encrypts its key with the code in the browser, so the server only ever stores an encrypted blob under a hash of the code. Settings can also copy a link that carries the key in the URL fragment; opening it on another device connects it to the same diary and the fragment is removed from the address bar.
- The key is sent only as a bearer header to your own deployment's API. The database stores a SHA-256 hash of the key, never the key. Anyone who has the link can read and change the diary, and there is no account recovery.
- Backups are plain JSON files of your diary. They do not contain the private link.

## Project layout

- `src/app/calendar`, `src/app/day`: calendar and the entry sheet.
- `src/app/pages`: Calendar, Stores and Settings pages.
- `src/app/core`: diary service (storage and sync), data models, merging, backup, store colors and statistics.
- `src/app/shared`: icons, dialogs and reusable fields.
- `functions/api/diary.ts`, `schema.sql`: the private diary API and D1 table.
- `tests`: unit tests for the data layer and API.
- `docs`: the self-hosting guide and the LLM hosting guide.

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

PocketDays is released under the [MIT License](./LICENSE). Dependency licenses are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md), and data handling is described in [PRIVACY.md](./PRIVACY.md). Community rules are in [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).


App branding includes PNG/ICO favicons, Apple touch icons, maskable Android icons and iOS startup images derived from the approved PocketDays logo. Physical-device launch appearance remains unverified.
