# Maison handover

This document helps the next maintainer operate the pilot and verify its hosted deployment.
The delivery uses fictional records. Real client data and live booking operations remain outside the pilot boundary.

## Delivery status

| Area | Status on 2026-10-05 | Evidence |
| --- | --- | --- |
| Local concierge workflow | Implemented and exercised locally | [Pilot verification](concierge-pilot.md#verification) |
| Database permissions and booking guards | Fifteen focused PostgreSQL tests pass locally | [Backend tests](../apps/api/src/concierge/concierge.spec.ts) |
| Intake validation and queue handling | Sixteen deterministic tests pass locally | [Agent tests](concierge-agent.md#verification-and-limits) |
| Hosted preview authorization | Thirty-four focused tests pass locally | [Authorization tests](../apps/app/lib/concierge-preview-auth.test.ts) |
| Application and workspace types | Full typecheck run completes thirteen Turbo tasks | [Session record](sessions/2026-10-05.md) |
| Dedicated cloud database | Fictional fixtures initialized; browser database grants revoked | Deployment operator confirmation |
| API deployment | Responds with HTTP 401 without authentication | Deployment operator HTTP check |
| Web deployment | Production build and canonical-domain login pass | [Hosted verification](sessions/2026-10-05.md#hosted-verification) |
| Hosted browser walkthrough | Owner overview and role switching verified | [Hosted verification](sessions/2026-10-05.md#hosted-verification) |

The public repository is [maison-concierge](https://github.com/yassbek/maison-concierge).
The assigned app address is [maison-concierge-orcin.vercel.app](https://maison-concierge-orcin.vercel.app).
The API address is [maison-concierge-api.vercel.app](https://maison-concierge-api.vercel.app).
GitHub CI passes: workspace types, all 65 focused tests, and the production web build.

## Operator workflow

A concierge creates a journey for a client and adds each service to that journey.
Services retain their supplier, timing, availability, terms, notes, prices, and confirmation reference.
Tasks and activity history support handovers between concierges.

An operator captures source text in the request inbox.
The optional worker proposes fields with exact source quotations.
The operator checks those quotations and approves a reviewed note.
Approval does not confirm bookings or change prices.

A service confirmation requires a supplier and confirmation reference.
A journey confirmation requires all active services to be confirmed or completed.
Client and supplier briefs include only the information intended for their audience.

## Records and control boundaries

| Boundary | Responsibility | Main paths |
| --- | --- | --- |
| Browser workspace | Navigation, forms, review, and visible save errors | `apps/app/components/concierge/` |
| Web application | Session entry, application proxy, and public brief surface | `apps/app/app/api/concierge-demo-session/`, `apps/app/proxy.ts`, `apps/app/app/brief/` |
| API | Authorization, record transactions, confirmations, pricing, and document sharing | `apps/api/src/concierge/` |
| Intake worker | Model calls, source evidence, queue claims, and completion checks | `apps/agent/agent/lib/concierge-*.ts` |
| Shared contract | Parsed commands, records, and evidence fields | `packages/validation/src/concierge.ts` |
| Persistent records | Prisma models and migrations | `packages/db/prisma/` |
| Demonstration fixtures | Fictional records and demonstration identities | `packages/db/prisma/concierge-seed.ts` |
| Interface system | Shared Maison components and stylesheet | `packages/ui/src/components/concierge.tsx`, `packages/ui/src/styles/concierge.css` |

The API checks permissions independently of browser visibility.
Member responses exclude supplier costs, margins, default markup, and internal briefs.
Unknown supplier costs remain unrecorded. They do not become zero-cost services.

The API commits each record change and its activity entry in one transaction.
The worker cannot confirm services, set prices, match identities, or send messages.
A completed human review prevents a late worker result from replacing that review.

## Local operation

Follow the [README setup](../README.md#local-setup).
The startup command runs the web app on port 3107 and the API on the configured `PORT`.
The documented API port is 3108. Docker provides PostgreSQL on port 5432.

The root `.env` is the only local environment file.
It remains outside Git. `.env.example` documents its variables.

The local profile chooser requires `CONCIERGE_LOCAL_DEMO=true`, non-production mode, a loopback host, and a matching origin.
It creates an eight-hour session for a fictional demonstration identity.

## Deploy two Vercel projects

Use a dedicated Supabase database in `eu-central-1` for this fictional pilot.
Keep it separate from databases containing real client records.
The API build places its function in Vercel region `fra1`.

| Project | Repository root setting | Build | Responsibility |
| --- | --- | --- | --- |
| Web app | `apps/app` | Next.js preset and `bun run build` | Workspace, preview sign-in, and brief pages |
| API | Repository root | `bun scripts/build-concierge-api.mjs` | NestJS API through Vercel Build Output |

Install dependencies with `bun install --frozen-lockfile`.
The web project requires access to the monorepo packages outside `apps/app`.
The API wrapper removes unrelated upstream cron jobs from its generated deployment output.
It does not schedule the intake worker.

Set environment values separately on both projects:

| Variable | Web app | API | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Required | Required | Same database through the Supabase transaction pool on port 6543 |
| `DIRECT_DATABASE_URL` | Not required | Required for migrations | Direct connection or session pool on port 5432 |
| `DATABASE_SSL_CA` | Required for this Supabase connection | Required for this Supabase connection | PEM certificate authority for verified database TLS |
| `BETTER_AUTH_SECRET` | Required | Required | Same generated authentication secret on both projects |
| `APP_URL` | Required | Required | One exact public HTTPS app origin |
| `API_URL` | Required | Required | Public HTTPS API origin |
| `ALLOWED_SIGN_IN` | Required | Required | Fictional pilot sign-in domain, such as `maison.example` |
| `CONCIERGE_PREVIEW_SECRET` | Required for preview entry | Not read | Separate private access key, at least 32 characters |
| `CONCIERGE_LOCAL_DEMO` | `false` | `false` | Passwordless local entry stays disabled |
| `CRM_TELEMETRY_DISABLED` | `1` | `1` | Disable upstream telemetry for the pilot |

Generate independent random values for both secrets.
Store them in Vercel environment settings. Share the preview key through a private channel.
Never place an access key in a URL, repository file, screenshot, or deployment log.

Set `APP_URL` to `https://maison-concierge-orcin.vercel.app`.
Set `API_URL` to `https://maison-concierge-api.vercel.app`.
The preview authorization rejects requests from other aliases, missing origins, or incorrect keys.
Production uses `__Secure-crm.session_token`, with Secure, HttpOnly, and SameSite=Lax attributes.
Persona changes clear cached session data.
Normal workspace authentication remains separate from the preview-entry checks.

### Database certificates and browser access

Use the project's connection details and certificate from the [official Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
Copy the connection host from the project dashboard. Do not construct it from a region name.
Store the CA certificate as PEM text in `DATABASE_SSL_CA` on both Vercel projects.
The Prisma client verifies the certificate chain and database hostname.
Do not disable certificate verification to resolve connection errors.

The pilot accesses PostgreSQL through its server-side database connection.
Its browser does not use the Supabase Data API.
Run these statements as the schema owner only in the dedicated pilot database:

```sql
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;
```

The first statements revoke direct access to existing tables and sequences.
The default-privilege statements cover new objects created by `postgres`.
Keep database credentials on the servers. Application roles continue through Better Auth and API authorization.
Verify these privileges after migrations and before publishing the preview.

### Migrations and fixtures

The API production build applies migrations through `DIRECT_DATABASE_URL` when configured.
Preview deployments do not apply migrations automatically.
Review migration output and verify the schema before adding fixtures.

Use the explicit fixture command only against the dedicated pilot database:

```sh
bun run concierge:seed --allow-remote-fixtures
```

This opt-in permits fixture creation against a remote database.
The seed preserves existing records, but it still adds fictional users and operational records.
Verify the target database before invoking it.

Both Vercel projects connect to this GitHub repository with `main` as the production branch.
Deploy the API, configure its origin on the web project, and deploy the web app.
Keep the API and web authentication secret synchronized.
Use transaction pooling for both application runtimes. Session pooling reserves connections per serverless instance and exhausts the pilot limit.
The Prisma client shares one pool per process, limits Vercel pools to two connections, and closes idle connections after five seconds.
Connection acquisition has a ten-second timeout. Migration builds use the separate session or direct connection.

## Verification sequence

1. Open the public app origin without a session. Confirm that preview sign-in appears.
2. Submit no key and an incorrect key. Confirm that each request fails without creating a session.
3. Submit a valid key from another origin. Confirm that authorization fails.
4. Enter the preview as Workspace owner. Verify the secure session cookie and workspace response.
5. Switch to Concierge. Confirm that supplier costs, margins, and internal briefs disappear from API responses.
6. Create a journey and service. Check timezones, unknown costs, markup, margin, and confirmation guards.
7. Capture a contextual request. Approve its reviewed note and inspect the journey activity.
8. Prepare client and supplier briefs. Check audience isolation before creating a client link.
9. Open the client link without a session. Revoke it and confirm that the link stops working.
10. Record screenshots, tested deployment URLs, commit revision, and remaining failures in a new session record.

The public GitHub workflow runs the focused checks against an isolated PostgreSQL service.
It does not deploy projects, create releases, rewrite pull requests, or call paid AI providers.

## Limits and remaining decisions

Email and WhatsApp capture use pasted text or file import. Live account connections are absent.
Browser dictation depends on microphone permission and browser support.
No live voice-recognition or model-quality result supports this handover.

Terms comparison detects text differences. It does not determine contractual equivalence.
All pricing uses EUR. Payments, tax calculations, and exchange-rate workflows are outside the pilot.
Supplier notes retain due-diligence observations, but the pilot does not verify suppliers or store diligence uploads.

Private brief links expire and support revocation.
Revocation does not recall copies that a recipient already downloads.
The worker has no recurring schedule and no automatic retries for failed or unavailable extraction.

The hosted verification record identifies the completed checks.
Repeat the full verification sequence before replacing fictional fixtures with an operational workspace.

## Public source register

| Source | Type | Public use |
| --- | --- | --- |
| Operator-provided concierge requirements | Direct requirements, summarized | Workflow scope and human approval boundaries |
| [Comp AI CRM](https://github.com/trycompai/crm), base `6d4793dd6d7aeea91aa6a034e00b17d7408a2d08` | Upstream software | Existing CRM architecture and MIT attribution |
| Repository code and focused tests | Direct implementation evidence | Paths, guards, supported behavior, and local checks |
| [Pilot guide](concierge-pilot.md) | Derived implementation record | Local browser walkthrough and operational limits |
| [Asset register](../ASSETS.md) | Generated and external artwork | Image provenance and usage terms |

Private source recordings, identifiers, participant details, credentials, and machine-specific paths remain outside this public handover.
The public repository starts with a sanitized initial snapshot. Original development history remains local.
The snapshot retains the upstream MIT license and the source attribution above.

Next action: review the hosted pilot and select the first live integration before operational rollout.
