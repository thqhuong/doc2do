# Security and privacy

Doc2Do processes documents that may contain grades, identity details, applications, bills, or administrative information. The MVP minimizes collected data and treats the model, uploaded content, and model output as untrusted.

## MVP data lifecycle

```text
upload -> memory -> Gemini/demo adapter -> validated result -> browser session
             \-> request ends -> raw bytes released       \-> tab closes -> plan cleared
```

The core MVP does not persist raw files or extracted text. It keeps the validated plan and checklist edits in the current tab's `sessionStorage` so a refresh is recoverable. Use synthetic documents for tests, screenshots, and demonstrations.

The public demo currently uses Gemini Free Tier. Under Google's unpaid-service terms, submitted content and generated responses may be used to improve Google products and may be reviewed after being disconnected from account/project identifiers. The product therefore warns users not to upload sensitive, confidential, or personal information before submission.

## Implemented public-demo controls

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
- Retry transient `429` and `500`-`504` transport failures at most twice after the first attempt.
- Do not render model-produced HTML or Markdown as trusted markup.
- Accept links only with `http` or `https`, and prefer links observed in the source.
- Mark unsupported critical claims as inferred or needing confirmation.

### Credential boundary

- Keep the Gemini key in Secret Manager and expose it only to the Cloud Run runtime identity.
- Never put server secrets in `VITE_*`, source maps, logs, fixtures, commits, or screenshots.
- Use Google account or workload identity authentication for deployment; do not create long-lived service-account JSON keys.
- Rotate a credential immediately if it appears in Git history or client assets.

### Public endpoint boundary

- Reject browser submissions whose `Origin` or `Sec-Fetch-Site` is cross-site unless an origin is explicitly configured for development.
- Rate-limit all requests to 120 per minute and analysis requests to 20 per 15 minutes per client address.
- Reject oversized bodies before buffering them or calling Gemini.
- Set both Cloud Run service and per-revision maximums to two instances.
- Return generic upstream errors. Keep prompt text, file content, stack traces, and secrets out of responses.

The analysis endpoint remains intentionally public for a no-sign-in competition demo. Direct non-browser clients can still consume the Free Tier quota; the rate limit and instance caps reduce this availability risk but do not provide user-level quotas.

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

## Calendar handoff

- Show title, time, timezone status, reminder choice, and description before handoff.
- Open Google Calendar's pre-filled event editor only after the user clicks the explicit action.
- Keep an `.ics` download as a provider-neutral fallback.
- Do not request or store Google Calendar OAuth tokens in the MVP.

## Privacy copy for the MVP

Use this plain-language notice near upload:

> Doc2Do does not store your document. Gemini Free Tier processes it, so do not upload sensitive, confidential, or personal information.

## Repository and release controls

- GitHub Actions run with read-only repository permissions and immutable action SHAs.
- CI runs lockfile installation, dependency audit, type checking, tests, production build, smoke test, and a Docker image build.
- GitHub secret scanning, push protection, Dependabot security updates, and CodeQL default scanning are enabled.
- Cloud Build builder images are pinned by digest and deploy through a scoped service identity.
- The runtime service account can read only the named Gemini secret and receives no project-wide role.

## Incident response

If a secret, personal document, or token is exposed: disable or rotate the credential, remove public access to the affected artifact, inspect logs without copying sensitive data, notify the repository owner privately, and document the remediation. Do not ask reporters to attach real personal documents to a public issue.

See [SECURITY.md](../SECURITY.md) for vulnerability reporting and [the roadmap](roadmap.md) for persistence boundaries.
