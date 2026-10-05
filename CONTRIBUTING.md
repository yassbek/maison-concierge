# Contributing to Maison

Open a focused pull request against `main`.
Describe the operator problem, the resulting behavior, and the checks that support the change.
Keep unrelated changes separate.

Follow [AGENTS.md](AGENTS.md) and the documentation for the area you change.
The [README](README.md#local-setup) explains local setup.
The [handover](docs/HANDOVER.md) records deployment boundaries and remaining checks.

## Check a change

Use an isolated PostgreSQL database for tests.
The focused API test reads `DATABASE_URL` directly and creates fictional fixture records.
Never point test commands at a database containing real client records.

The [CI workflow](.github/workflows/ci.yml) creates PostgreSQL 17 and runs these checks:

```sh
bun install --frozen-lockfile
bun run db:generate
bun run db:deploy
bun run check-types
bun run --cwd apps/api test src/concierge/concierge.spec.ts
bun test apps/agent/test/concierge-intake.spec.ts apps/agent/test/concierge-queue.spec.ts
bun test apps/app/lib/concierge-preview-auth.test.ts
bun run --cwd apps/app build
```

Run Biome on the files you change.
Keep schema changes in migrations. Add environment variables to `.env.example` and the applicable validation and Turbo configuration.
Do not commit credentials, client records, private recordings, or local evidence directories.

## Pull requests and deployment

CI checks types, focused concierge tests, and the production web build.
It does not open pull requests, rewrite titles, promote branches, publish releases, or deploy Vercel projects.
The upstream release automation does not apply to this repository.

Maintainers review code changes and test evidence before deployment.
Hosted verification follows the sequence in [HANDOVER.md](docs/HANDOVER.md#verification-sequence).
Preserve the upstream [MIT license](LICENSE) and [asset provenance](ASSETS.md).

Next action: submit a focused pull request with its verification results.
