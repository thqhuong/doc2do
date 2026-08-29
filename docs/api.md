# API and structured-output reference

The API uses JSON for responses and multipart form data for document analysis. All routes are same-origin under `/api`.

## Health check

### `GET /api/health`

Dependency-free liveness check used by Cloud Run and release verification.

Expected status: `200 OK`.

```json
{
  "status": "ok",
  "service": "doc2do-api",
  "time": "2026-08-29T03:00:00.000Z"
}
```

The response may include build or mode metadata. Clients should depend only on `status: "ok"`.

## Analyze a document

### `POST /api/v1/analyses`

Accepts one PDF, JPEG, PNG, WebP, or UTF-8 text document plus optional user context. The server limit is one 10 MB file and one context field of at most 2,000 characters. The current API does not count PDF pages.

Multipart fields:

| Field | Type | Required | Description |
|---|---|---:|---|
| `document` | binary | yes | The source document |
| `context` | string, max 2,000 characters | no | User facts relevant to applicability, such as study year or GPA |

Example:

```bash
curl -X POST http://localhost:8080/api/v1/analyses \
  -F "document=@README.md;type=text/plain" \
  -F "context=Third-year computer science student; GPA 3.4"
```

Success: `201 Created` with `AnalysisResponse`.

```json
{
  "id": "analysis_123",
  "status": "complete",
  "mode": "gemini",
  "result": {},
  "created_at": "2026-08-29T10:00:00+07:00"
}
```

`mode` is `gemini` or `demo`. `result` follows `Doc2DoResult` below.

## Error envelope

Application-generated non-success responses use this shape:

```json
{
  "error": {
    "code": "DOCUMENT_REQUIRED",
    "message": "Attach one document using the 'document' field.",
    "details": {}
  }
}
```

Expected error classes include invalid multipart input, unsupported type, file too large, invalid model output, and upstream model failure. Rate-limit middleware may return a plain `429` response, so clients must handle a non-JSON error body. Error text must not expose prompts, document contents, credentials, or stack traces.

## `Doc2DoResult`

The executable schema is `packages/contracts/src/index.ts`. This summary is for API consumers.

| Field | Type / allowed values | Notes |
|---|---|---|
| `schema_version` | literal `"1.0"` | Reject unknown versions |
| `document` | object | Title, category, language, issuer, source date, summary, audience |
| `applicability.status` | `likely_eligible`, `likely_ineligible`, `unclear`, `not_applicable` | Never a legal or official determination |
| `applicability.questions_for_user` | string array, max 3 | Only facts that change the plan |
| `deadlines` | `Deadline[]` | Unknown values use `null`; precision is explicit |
| `actions` | `Action[]`, max 8 | Ordered, concise next steps |
| `source_refs` | `SourceRef[]` | Evidence snippets, each max 240 characters |
| `warnings` | warning array | Missing, conflict, ambiguity, quality, or safety |
| `next_best_action_id` | action ID or `null` | Must reference an existing action |
| `disclaimer` | non-empty string | Reminds users to confirm critical details |

### Deadline

| Field | Type |
|---|---|
| `id`, `label` | non-empty string |
| `date_time_iso` | ISO-8601 with offset or `null` |
| `timezone` | IANA timezone or `null` |
| `precision` | `exact`, `date_only`, `partial`, `unknown` |
| `is_inferred`, `needs_confirmation` | boolean |
| `source_refs` | source ID array |

### Action

| Field | Type |
|---|---|
| `id`, `title` | non-empty string |
| `description` | string |
| `priority` | `urgent`, `high`, `normal`, `optional` |
| `deadline_id` | deadline ID or `null` |
| `requirements` | string array |
| `links` | `{ label, url }[]`; URL must parse as a URL |
| `source_refs` | source ID array |
| `evidence_state` | `source_backed`, `inferred`, `needs_confirmation` |
| `confidence` | `high`, `medium`, `low` |

### Cross-reference invariants

- Every deadline and action source ID must exist in `source_refs`.
- Every non-null action deadline ID must exist in `deadlines`.
- `next_best_action_id` must exist in `actions`.
- Critical unsupported claims should be removed or labeled `needs_confirmation`.
- Links must use `http` or `https` in the UI and should be accepted only when present in the source.

## Planned authenticated endpoints

These routes are part of the Firebase/Calendar phase and must not be advertised as live until implemented:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/v1/analyses/:id` | Return an owner-visible saved analysis |
| `PATCH` | `/api/v1/analyses/:id/actions/:actionId` | Edit or complete an action |
| `POST` | `/api/v1/analyses/:id/calendar-events` | Create reviewed Calendar events idempotently |
| `GET` | `/api/v1/history` | List the current user's saved analyses |
| `POST` | `/api/v1/feedback` | Record helpful, incorrect, or missing feedback |
| `DELETE` | `/api/v1/analyses/:id` | Delete an owned analysis and child records |

See the [integration roadmap](roadmap.md) before implementing these routes.

Official model reference: [Gemini API structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).
