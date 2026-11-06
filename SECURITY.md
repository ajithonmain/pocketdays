# Security

## Reporting a vulnerability

Please do not report security problems in a public issue. Use GitHub's private vulnerability reporting on the repository (Security tab, Report a vulnerability), or contact the maintainer privately through the contact details on their GitHub profile. Include what you found, how to reproduce it and the impact. You will get an acknowledgement as soon as the maintainer can respond; this is a small personal project, so please allow time.

## How the app protects data

- Entries are stored in the browser first (IndexedDB). Cloud sync is optional.
- The diary is identified by a random 256-bit key created on the device. It is sent only as a bearer header to the same origin's `/api/diary` endpoint. The database stores a SHA-256 hash of the key, never the key.
- The private link carries the key in the URL fragment, which browsers do not send to servers. The app removes it from the address bar after import.
- API responses are sent with `Cache-Control: no-store`, and the service worker does not cache API routes.
- Writes use a revision compare-and-swap so stale devices cannot silently overwrite newer data.
- Linking a device with a short code: the code (40 bits) never leaves the browser. A lookup id and an AES-GCM key are derived from it with PBKDF2, the diary key is encrypted in the browser, and the server stores only the id and ciphertext for 10 minutes, one per diary, deleted on first claim. Guessing a live code online is impractical at this size and lifetime; the host could in theory try codes offline against a stored blob, which costs 200,000 PBKDF2 rounds per guess, and the host can already read the diary data.
- Backups are plain JSON files and never include the key. Restoring a file validates and rebuilds the data instead of trusting it.

## Known limits

- The private link is a capability: anyone who has it can read and change that diary. There is no account recovery and no key rotation.
- There is no user authentication. Anyone who can reach a deployment can create their own diary on its database. Self-hosters who expose a deployment publicly should restrict access (for example with Cloudflare Access) or add rate limiting; see [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md#who-can-use-your-deployment).
- Backup files are not encrypted. Store them like any other private document.
- Live behavior on a real deployment, device installation and offline use on physical devices have not been fully verified.

## Supported versions

Only the latest commit on the default branch receives fixes.
