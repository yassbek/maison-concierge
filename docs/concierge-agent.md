# Concierge intake review

Operators capture email text, WhatsApp text, phone transcripts, or manual notes in the concierge inbox.
The optional extractor proposes fields and service updates.
An operator reviews the source before applying any proposal.
The extractor cannot confirm bookings, change prices, match identities, or send messages.

## Source register

| Source | Scope | Verification |
| --- | --- | --- |
| `packages/validation/src/concierge.ts` | Stored proposal shape and evidence fields | Shared schema |
| `apps/agent/agent/lib/concierge-intake.ts` | Source validation and proposal validation | Deterministic tests |
| `apps/agent/agent/lib/concierge-model.ts` | Model selection, prompt, and provider boundary | Installed SDK documentation |
| `apps/agent/agent/lib/concierge-store.ts` | Database claims and conditional completion | Review required after integration |
| `apps/agent/test/concierge-queue.spec.ts` | Replays, concurrent claims, and review races | In-memory store tests |
| `apps/agent/agent/lib/concierge-config.ts` | Input, execution, and queue limits | Code constants |

These sources describe the local pilot implementation.
They contain no production performance measurements.

## Run one intake batch

Set `AI_GATEWAY_API_KEY` in the repository root environment to enable extraction.
The worker uses the existing model selection from Settings.
The compiled default remains the fallback.
The worker sends source text to that configured model through AI Gateway.
A configured provider call uses provider credits.

Run from the repository root:

```sh
bun run --filter=agent concierge:intake
```

The command processes at most five pending sources and exits.
It has no recurring schedule.
The command prints counts without customer text.

Without a key, the worker records `unavailable` and retains the source for manual review.
It does not substitute pattern matching or a demonstration response for model extraction.
Existing unavailable or failed rows do not receive automatic retries.
An operator uses manual review or captures a new source for a new attempt.

## Review boundary

Every populated proposed field requires an exact quote from the source.
The extractor computes quote offsets from the original text.
The offsets use JavaScript string positions.
Every proposed service update copies source text exactly.
Proposed dates require an exact ISO timestamp with a UTC offset in the source.
Other date formats remain for manual review.
The proposal does not contain record identifiers, prices, or executable actions.

A source quote proves text provenance.
It does not prove that a sender's statement is correct.
An operator checks identities, prices, terms, availability, and booking status before confirmation.
The model prompt treats embedded instructions as untrusted source text.
The model receives no tools and has no write authority.

## Execution and failure paths

The input limit is 12,000 characters.
Each model call has a 45-second timeout and a 4,000-token output limit.
The SDK performs no automatic retries.
Malformed output, absent quotes, missing evidence, and invented service updates produce `failed`.
Provider errors produce a fixed message without raw provider details.

A conditional database update claims each pending source.
Completion requires the same claim timestamp, unchanged source text, and pending human review.
A human approval or dismissal prevents the worker from replacing that review.
Claims older than two minutes become failed during the next worker invocation.
The worker does not retry those claims or their paid calls.

## Verification and limits

Run the deterministic tests:

```sh
bun test apps/agent/test/concierge-intake.spec.ts apps/agent/test/concierge-queue.spec.ts
```

These tests use synthetic inputs and no paid providers.
They verify parsing, source boundaries, output rejection, replay handling, and review preservation with an in-memory store.
They do not verify model quality or real provider behavior.
Live extraction requires a configured provider and a separate operator-run check.

Next action: review a captured source manually, or configure the provider and run one batch.
