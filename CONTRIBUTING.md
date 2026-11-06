# Contributing to PocketDays

Thanks for helping. PocketDays is a small, focused app, so changes that keep it calm, fast and private are the easiest to accept.

## Before you start

- Read the README, including how data is handled, and the rules below.
- For anything larger than a small fix, open an issue first so we can agree on the approach.

## Set up

You need Node 22.18 or newer.

```sh
npm install
npm start       # http://localhost:4200
```

Before opening a pull request, run all three and make sure they pass:

```sh
npm run check
npm test
npm run build
```

For changes you can see, also check the app in a browser at phone width (360 to 430px) in Light and Dark, and say what you checked in the pull request.

## What fits the project

- No accounts, tracking, analytics, third-party fonts or icon packages. Icons are inline SVG.
- Phone first, calm and minimal: fewer elements beat more.
- Standalone Angular components, signals and strict TypeScript. Keep components small.
- Privacy first: never log or transmit the private diary key anywhere but the same-origin API header.
- Add tests for data logic (calculations, merging, validation, sync boundaries). Skip trivial tests.
- Keep copy short and plain. No emojis in code, comments or the UI.

## Documentation

Keep README.md and the files in `docs/` accurate when behavior changes. State limits honestly. Do not claim deployment, device testing or scores you did not measure.

## Pull requests

- One focused change per pull request, with a short description of what and why.
- Include screenshots for UI changes.
- Do not include secrets, personal data, diary exports or private links.
- Do not add third-party images, logos or design assets unless you have the right to share them.

## Reporting security problems

Do not open a public issue. See [SECURITY.md](./SECURITY.md).

## License

By submitting a contribution you agree that it is licensed under the project's [MIT License](./LICENSE). Please also follow the [code of conduct](./CODE_OF_CONDUCT.md).
