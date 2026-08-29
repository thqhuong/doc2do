# Persistence and Calendar API roadmap

The core MVP proves document-to-action conversion first. Add identity, persistence, and external writes only after three consecutive sample analyses pass locally and on Cloud Run.

## Phase 0: core competition loop — delivered

Exit conditions:

- Guest can analyze the bundled sample.
- Gemini output validates against the shared schema.
- Every critical sample fact opens a matching evidence excerpt.
- Invalid files, invalid model output, and upstream failures have recoverable UI states.
- Public Cloud Run URL passes `/api/health` and the complete sample path.
- Reviewed deadlines open as pre-filled Google Calendar events, with `.ics` fallback.
- The current tab restores the validated result and checklist progress after refresh.

## Phase 1: Firebase Auth and Firestore

Add Google sign-in as an optional save gate. Guest analysis remains available.

### Proposed data model

| Path | Core fields | Rule |
|---|---|---|
| `users/{uid}` | `displayName`, `email`, `photoURL`, `createdAt`, `lastLoginAt` | User reads/writes own profile |
| `analyses/{analysisId}` | `ownerId`, `title`, `summary`, `status`, `createdAt`, `updatedAt`, `model`, `schemaVersion`, `sourceMetadata` | Owner only; no raw bytes by default |
| `analyses/{analysisId}/actionItems/{actionId}` | `title`, `status`, `dueAt`, `editedByUser`, `completedAt` | User edits override generated defaults |
| `analyses/{analysisId}/calendarExports/{exportId}` | `actionId`, `calendarEventId`, `htmlLink`, `createdAt` | Never store OAuth tokens |
| `feedback/{feedbackId}` | `ownerId`, `analysisId`, `type`, `fieldPath`, `note`, `createdAt` | Sanitize optional note |

Use `firebase/firestore.rules` and `firebase/firestore.indexes.json` as the initial emulator-tested policy. Configure the Firebase CLI to reference them before deployment.

### Implementation order

1. Add Firebase web configuration to the browser. These identifiers are public configuration, not server secrets.
2. Add Google sign-in and send the Firebase ID token to protected API routes.
3. Verify tokens with Firebase Admin in the API.
4. Write `ownerId` from the verified token, never from request JSON.
5. Add save, history, reopen, edit, and delete flows.
6. Run Firestore rules tests for cross-user read/write attempts and child collections.
7. Add retention and account-deletion behavior before storing original documents.

## Phase 2: authenticated Google Calendar API write — optional future work

The MVP already opens a reviewed deadline in Google Calendar without requesting account access. Add direct Calendar API writes only if post-competition persistence justifies the OAuth and idempotency surface. It must never create events automatically from raw model output.

### Flow

```text
validated deadline
  -> user selects action
  -> review title/date/time/timezone/reminders
  -> explicit Create event confirmation
  -> API calls Calendar events.insert
  -> store event ID as idempotency record
  -> show Google Calendar link
```

### Safety rules

- Require a signed-in user and explicit consent.
- If time or timezone is missing, require the user to choose it.
- Use a stable idempotency key derived from analysis/action/export attempt.
- Repeated confirmation returns the prior event instead of creating a duplicate.
- Store event ID and link, not OAuth tokens.
- Provide a retry path that distinguishes an expired login from an API failure.

## Phase 3: quality improvements

Only after the two integrations above work:

- opt-in feedback on incorrect or missing fields;
- source preview improvements for PDFs and images;
- Vietnamese accessibility and copy review;
- stronger rate limits and abuse metrics;
- optional short-lived original storage with documented retention.

Do not add chat, email automation, team workspaces, or extra Google APIs before the core acceptance criteria pass.

## Official references

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore quickstart](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Create Google Calendar events](https://developers.google.com/workspace/calendar/api/guides/create-events)
