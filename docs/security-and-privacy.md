# Security and privacy

Doc2Do processes documents that may contain grades, identity details, applications, bills, or administrative information. The MVP minimizes collected data and treats the model, uploaded content, and model output as untrusted.

## MVP data lifecycle

```text
upload -> memory -> Gemini/demo adapter -> validated result -> browser
             \-> request ends -> raw bytes released from request memory
```

The core MVP does not persist raw files or extracted text. Use synthetic documents for tests, screenshots, and demonstrations.

## Controls required before public deployment

### Upload boundary

- Accept only PDF, PNG, JPEG, WebP, and UTF-8 text.
- Enforce the current 10 MB byte limit before model calls. Add an explicit PDF page-count limit before claiming one in the UI.
- Check declared MIME type, detected type where available, and filename independently.
- Reject executable, archive, SVG, HTML, and disguised content.
- Parse in memory with bounded work; never execute embedded content.

### Model boundary

- Treat instructions inside a document as document content, not system instructions.
- Ask Gemini for JSON matching the shared schema, then validate it server-side.
- Retry invalid output at most once; return a recoverable error afterward.
- Do not render model-produced HTML or Markdown as trusted markup.
- Accept links only with `http` or `https`, and prefer links observed in the source.
- Mark unsupported critical claims as inferred or needing confirmation.

### Credential boundary

- Keep the Gemini key in Secret Manager and expose it only to the Cloud Run runtime identity.
- Never put server secrets in `VITE_*`, source maps, logs, fixtures, commits, or screenshots.
- Use Google account or workload identity authentication for deployment; do not create long-lived service-account JSON keys.
- Rotate a credential immediately if it appears in Git history or client assets.

### Public endpoint boundary

- Rate-limit by a privacy-preserving client signal and apply a small concurrent-analysis limit.
- Reject oversized bodies before buffering them or calling Gemini.
- Set Cloud Run maximum instances to limit both abuse and surprise cost.
- Return generic upstream errors. Keep prompt text, file content, stack traces, and secrets out of responses.

## Logging

Logs may include request ID, route, status, duration, mode, MIME class, byte-count bucket, schema-validation outcome, and upstream error category. They must not include:

- uploaded bytes or extracted text;
- user context or evidence snippets;
- prompts or raw model responses;
- authorization headers, OAuth tokens, API keys, or cookies;
- names, email addresses, student IDs, or document URLs containing tokens.

## Firebase phase

Before enabling saved history:

- Verify Firebase ID tokens on every protected API route.
- Enforce `ownerId` in the API and Firestore rules.
- Never trust an owner ID supplied by the client.
- Provide delete controls for analyses and child records.
- Keep raw source storage disabled until retention, access rules, and deletion are tested.
- Test rules with the Firebase Emulator Suite before production.

The proposed rules and indexes are in `firebase/`; they are a starting point and are not active until deployed.

## Calendar phase

- Request the narrowest event-creation scope needed by the chosen OAuth flow.
- Show title, time, timezone, reminders, and description before the write.
- Require an explicit confirmation for each export.
- Use an idempotency record so repeated clicks do not create duplicate events.
- Do not store OAuth access or refresh tokens in Firestore.

## Privacy copy for the MVP

Use this plain-language notice near upload:

> Doc2Do processes your document to create an action plan. The MVP does not intentionally save the original file. Avoid uploading government IDs, financial records, or other sensitive personal documents. Confirm important dates and requirements with the original source.

## Incident response

If a secret, personal document, or token is exposed: disable or rotate the credential, remove public access to the affected artifact, inspect logs without copying sensitive data, notify the repository owner privately, and document the remediation. Do not ask reporters to attach real personal documents to a public issue.

See [SECURITY.md](../SECURITY.md) for vulnerability reporting and [the roadmap](roadmap.md) for persistence boundaries.
