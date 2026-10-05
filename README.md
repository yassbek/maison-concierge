# Maison concierge

Maison gives concierge teams one workspace for journeys, services, clients, suppliers, requests, and handovers.
Operators review every request and record each booking confirmation explicitly.
The pilot contains fictional records. It does not send messages or make reservations.

[Public repository](https://github.com/yassbek/maison-concierge) · [Preview address](https://maison-concierge-orcin.vercel.app) · [Handover](docs/HANDOVER.md)

The hosted pilot is live behind a private access key. It contains fictional records.
Production login, role permissions, and private brief links pass hosted checks.

## What the pilot includes

- Journey cases with services, assigned concierges, tasks, and activity history.
- Client preferences and supplier contacts, availability, and terms.
- Manual request capture, text-file import, and browser dictation.
- EUR pricing with separate markup and margin calculations.
- Server-side financial permissions and explicit confirmation checks.
- Versioned briefs, downloads, printing, and expiring client links.
- Optional source-grounded intake extraction with human review.

Read [supported workflows and limits](docs/concierge-pilot.md) before using the preview.

## Local setup

Use Node.js 22 or later, Bun from `package.json`, Docker, and PostgreSQL 17.
Run these commands from the repository root:

```sh
git clone https://github.com/yassbek/maison-concierge.git
cd maison-concierge
cp .env.example .env
bun install --frozen-lockfile
docker compose up -d postgres
```

Generate an authentication secret with `openssl rand -base64 32` and save it as `BETTER_AUTH_SECRET` in `.env`.
Keep the Docker database URL from `.env.example`.
Set these additional values in that same file:

```dotenv
ALLOWED_SIGN_IN="maison.example"
APP_URL="http://127.0.0.1:3107"
API_URL="http://127.0.0.1:3108"
PORT="3108"
CONCIERGE_LOCAL_DEMO="true"
CRM_TELEMETRY_DISABLED="1"
```

```sh
bun run db:generate
bun run db:deploy
bun run concierge:seed
bun run concierge:dev
```

Open [the local workspace](http://127.0.0.1:3107/concierge) and choose a demonstration profile.
Passwordless demonstration access requires a loopback host, matching request origin, and non-production mode.

## Continue the work

| Document | Purpose |
| --- | --- |
| [Handover](docs/HANDOVER.md) | Architecture, deployment steps, checks, and remaining work |
| [Pilot guide](docs/concierge-pilot.md) | Operator workflows, permissions, and limits |
| [Intake worker](docs/concierge-agent.md) | Evidence validation and optional model execution |
| [Session record](docs/sessions/2026-10-05.md) | Implementation decisions and verification status |
| [Asset register](ASSETS.md) | Image sources and usage boundaries |
| [Contribution guide](CONTRIBUTING.md) | Local checks and pull requests |

Maison builds on [Comp AI CRM](https://github.com/trycompai/crm).
The upstream [MIT license](LICENSE) and copyright notice remain unchanged.
Third-party image terms remain separate from the software license.

Next action: use the private preview key to review the pilot, then follow the handover for further development.
