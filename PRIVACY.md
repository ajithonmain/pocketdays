# Privacy

PocketDays is software you run yourself. The project does not operate a hosted service, does not receive your data and has no accounts, analytics, advertising or trackers. This page describes what the software does so that you, or anyone you host it for, can describe it accurately.

## Data the app handles

Expense entries (store, amount, note, who paid, people who were with you), your saved stores and people, and settings such as theme, currency and week start.

## Where it is stored

- On your device, in your browser's IndexedDB. This is the primary copy.
- Optionally, in a Cloudflare D1 database in the Cloudflare account of whoever hosts the deployment. Sync is only available when the deployment includes the API and database.
- In backup files you choose to download. They are plain, unencrypted JSON.

## Sync and the private link

A random 256-bit key is created on first open and kept in the browser. It is sent as a bearer header only to the same origin's `/api/diary` endpoint. The database stores a SHA-256 hash of the key, not the key. Anyone who holds the private link can read and change that diary. There is no account recovery.

## What the host can see

The person who hosts a deployment controls the Cloudflare account and database. They can read the stored diary data of every diary on it, and Cloudflare processes requests under its own terms and privacy policy. If you use someone else's deployment, assume its operator can see what you sync. To keep data fully private, host your own copy or use the app without sync.

## Third parties

The app loads no third-party scripts, fonts or analytics. Cloudflare, as the hosting provider of a deployment, handles network requests (for example IP addresses in its logs) according to its own policies.

## Deleting your data

Clear the site's data in your browser to remove the local copy. To remove the cloud copy, the deployment's owner deletes the row for your key hash, or deletes the D1 database. Back up first if you want to keep a copy.

## Hosting for other people

If you host PocketDays for others, you are responsible for any legal duties that apply to you, such as publishing a privacy notice and handling deletion requests. This document is a technical description, not legal advice.
