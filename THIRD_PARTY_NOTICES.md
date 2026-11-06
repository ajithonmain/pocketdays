# Third-party notices

PocketDays is released under the MIT License (see [LICENSE](./LICENSE)). It depends on open source packages that keep their own licenses. This file lists the direct dependencies. Each package's full license text ships inside its folder in `node_modules` and is bundled by the build tooling where the license requires it.

## Runtime dependencies

| Package | License |
| --- | --- |
| Angular (`@angular/animations`, `common`, `compiler`, `core`, `forms`, `platform-browser`, `router`, `service-worker`) | MIT |
| PrimeNG (`primeng`) | MIT (community edition; see `node_modules/primeng/LICENSE.md`) |
| PrimeUI themes (`@primeuix/themes`) | MIT |
| RxJS (`rxjs`) | Apache-2.0 |
| tslib | 0BSD |

## Development dependencies

| Package | License |
| --- | --- |
| Angular build tooling (`@angular/build`, `@angular/cli`, `@angular/compiler-cli`) | MIT |
| TypeScript (`typescript`) | Apache-2.0 |

Transitive dependencies are mostly MIT, ISC, BSD, Apache-2.0, BlueOak-1.0.0 and similar permissive licenses, as recorded in `package-lock.json`. Run `npx license-checker --production` (or a similar tool) in your fork if you need a full report for compliance.

## Assets

- No fonts are loaded from third parties; the app uses the system font stack.
- Icons are inline SVG written for this project.
- The design reference images used during development are third-party material, are not part of this repository and are not covered by the MIT License.

## Trademarks

Angular, PrimeNG, Cloudflare, Cloudflare Pages and D1 are names of their respective owners. PocketDays is not affiliated with or endorsed by them.
