# Maison concierge pilot

Maison adapts Comp AI CRM for a concierge operations team. It runs locally with PostgreSQL and fictional records.
The name and visual identity are provisional. The interface uses charcoal, warm paper, restrained olive accents, and serif headings.

## Start the workspace

Follow the [README local setup](../README.md#local-setup).
The documented setup uses PostgreSQL 17 through Docker.
The web app runs at `http://127.0.0.1:3107/concierge`; the API runs at `http://127.0.0.1:3108`.

From the repository root:

```sh
bun run concierge:dev
```

Choose Workspace owner, Operations manager, or Concierge.
The profile chooser creates an eight-hour session.
Passwordless local entry requires `CONCIERGE_LOCAL_DEMO=true`, a loopback host, a matching origin, and non-production mode.

Keep all local settings in the root `.env`.
The file stays outside source control. `.env.example` documents its variables.
The fixture seed preserves existing records and adds fictional demonstration records.
Remote seeding requires the explicit `--allow-remote-fixtures` option and the dedicated pilot database.

## Hosted preview

The assigned app address is [maison-concierge-orcin.vercel.app](https://maison-concierge-orcin.vercel.app).
The API address is [maison-concierge-api.vercel.app](https://maison-concierge-api.vercel.app).
Deployment and hosted workflow verification remain in progress.

Production preview entry requires `CONCIERGE_PREVIEW_SECRET` and one exact HTTPS `APP_URL`.
The private access key contains at least 32 characters and remains server-side.
The browser submits it in a POST body. It never appears in a link.
Requests with incorrect keys, absent origins, or other origins fail before session creation.

Production uses Better Auth's secure session cookie name, `__Secure-crm.session_token`.
The session cookie has Secure, HttpOnly, and SameSite=Lax attributes.
Switching demonstration profiles clears cached session data.
The local passwordless flag does not enable production access.

See [the handover](HANDOVER.md#deploy-two-vercel-projects) for deployment variables and hosted verification.

## Supported work

| Need from the discussion | Experience in the pilot |
| --- | --- |
| One case across a complex booking | Journey with flight, transfer, villa, hotel, dining, experience, yacht, and other services |
| Returning clients | Client directory, preferences, dietary requirements, notes, and individualized default markup |
| Team continuity | Assigned concierge, dated tasks, priorities, completion, notes, and activity history |
| Fast capture | Notes, pasted WhatsApp messages, phone transcripts, `.txt` and `.eml` import, and browser dictation |
| Human control | Original source preserved, proposed fields separated, explicit approval or dismissal |
| Supplier relationships | Partner contacts, service categories, operating notes, payment terms, and cancellation terms |
| Availability and negotiation | Each service stores availability, status, partner notes, and confirmation reference |
| Confirmation discipline | Confirmed services require a partner and reference; journeys require all active services confirmed or completed |
| Price control | EUR costs, client prices, markup calculation, margin, and owner/admin financial permissions |
| Cancellation mismatch | Side-by-side recorded client and supplier conditions, flagged when text differs |
| Contingency planning | Service notes and assigned follow-up tasks for missing information, changes, and alternatives |
| Client communication | Versioned client itinerary, printable document, Markdown download, and expiring private link |
| Supplier communication | Partner-specific execution brief containing only that partner's services and supplier notes |
| Internal coordination | Internal handover brief available to owners and administrators |

The supplier directory provides structured contacts and terms. Due-diligence observations belong in partner notes.
It does not verify suppliers against external registries or store uploaded due-diligence documents.
Terms comparison detects text differences. It does not interpret contracts or determine legal equivalence.

## Role and action boundaries

Owners and administrators manage supplier costs, client markup, and private client links.
Concierges work with requests, client prices, itineraries, partners, and tasks.
The API removes supplier costs, margins, default markup, and internal briefs from member responses.
UI visibility is an additional layer, not the authorization boundary.

A request approval attaches a reviewed note to a journey. It does not confirm a service or change prices.
The optional API service-draft path accepts only requested or sourcing states.
Booking confirmation requires an explicit service update and written-reference field.
Every command commits its record changes and audit entry in the same transaction.

Client briefs exclude supplier notes, supplier terms, and private financial fields.
Partner briefs include only services associated with the selected partner.
Internal briefs are not available through public links.

Private links expire after seven days in the UI. The API supports one to thirty days.
Creating a replacement revokes earlier links for that document. The owner can revoke all links immediately.
The database stores token hashes. Public reads return only the prepared title, content, and expiry.
Anyone holding a valid link can read that prepared itinerary. Link revocation cannot recall downloaded copies.
Local loopback links work only on the originating machine. Hosted link behavior still requires live verification.

## AI and external connections

The source-grounded extraction worker lives in `apps/agent`.
It checks proposed fields against exact source quotes and rejects unsupported output.
It cannot confirm bookings, set prices, match identities, or send messages.

Run a batch with:

```sh
bun run concierge:intake
```

Without `AI_GATEWAY_API_KEY`, the worker records extraction as unavailable and preserves manual review.
With a configured provider, the command processes at most five pending requests.
It has no automatic schedule. See [concierge-agent.md](concierge-agent.md) for execution limits and evidence checks.

The pilot does not connect an email account or WhatsApp Business account.
It prepares documents without sending them. Browser dictation depends on browser support and microphone permission.
No live extraction quality, voice recognition, supplier API, or messaging delivery claim is made.
All financial figures use EUR. The pilot does not process payments, taxes, or currency conversion.

## Source register

| Source | Use |
| --- | --- |
| Comp AI CRM, upstream `release`, base commit `6d4793dd6d7aeea91aa6a034e00b17d7408a2d08` | Existing Next.js, NestJS, Prisma, authentication, and agent architecture |
| User instruction | Internal concierge workspace, luxury software direction inspired by Blacklane, DaiL design override |
| `packages/db/prisma/concierge-seed.ts` | Fictional clients, partners, journeys, services, tasks, and messages |
| [Unsplash image](https://images.unsplash.com/photo-1516483638261-f4dbaf036963) | Illustrative coastal image; not a booked property's photograph |

A private stakeholder recording informed the requirements. The recording, identifiers, and participant details remain outside this repository.
The source also discussed a separate AI workspace, outside this pilot.
The courtyard artwork is AI-generated and depicts no real hotel. The coastal image follows the Unsplash License. See [the asset register](../ASSETS.md).

## Verification

The implementation has passed:

- Production Next.js build, including the dynamic concierge route and private brief route.
- Type checks across all ten workspace packages.
- Fifteen PostgreSQL tests covering permissions, financial redaction, confirmation guards, atomic approval, brief isolation, and share-link lifecycle.
- Sixteen agent tests covering source evidence, malformed output, queue claims, replay protection, and review races.
- Thirty-four preview authorization tests cover access keys, origins, production restrictions, cookie compatibility, and POST form submission.
- HTTP checks cover unauthenticated access, member redaction, and rejection of cross-origin demonstration login.
- Browser walkthrough for journey creation, service confirmation, markup, contextual capture, review, document generation, and link revocation.

Visual evidence is stored locally in `.local/evidence/`. The directory is ignored by Git.

Cloud status: the dedicated database contains fictional fixtures. The API rejects unauthenticated requests with HTTP 401.
Hosted sign-in and workflow verification remain pending.

Next action: complete the hosted checks in the handover and record their results.
