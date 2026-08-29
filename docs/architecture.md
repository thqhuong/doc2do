# Architecture and design decisions

Doc2Do optimizes for one memorable proof: Gemini can turn a real document into a useful plan without hiding uncertainty or inventing links.

## System boundary

```text
┌──────────────────────── browser ────────────────────────┐
│ upload/context -> plan -> evidence -> checklist/calendar │
└──────────────────────────┬──────────────────────────────┘
                           │ same-origin HTTPS
┌──────────────────────────▼──────────────────────────────┐
│ Cloud Run service: doc2do                              │
│                                                       │
│ React static build         Node API                    │
│ apps/web/dist       <----> apps/api/dist/server.js     │
│                              │                         │
│     origin/rate/MIME checks + strict Zod validation    │
└──────────────────────────────┼──────────────────────────┘
                               │ server-held credential
                         ┌─────▼─────┐
                         │ Gemini API│
                         └───────────┘

Browser review -> pre-filled Google Calendar event (no automatic write)

GitHub CI -> Cloud Build -> Artifact Registry -> Cloud Run
Secret Manager -------------------------------> runtime identity
```

The API owns every secret and every external write. The browser receives only validated JSON and never calls Gemini directly.

## Request flow

1. The browser sends one supported document and optional user context as multipart form data.
2. The API rejects cross-site browser submissions, unsupported MIME types, and oversized requests before calling a model.
3. In demo mode, the API returns a deterministic synthetic fixture. In Gemini mode, it sends the document, context, and JSON schema to Gemini.
4. Transient `429` and `5xx` model failures receive a capped exponential retry; invalid structured output receives one repair attempt.
5. The API parses and validates the response with the shared Zod contract.
6. Cross-reference validation rejects unknown source, deadline, or action IDs.
7. The UI renders the plan as data. It does not render model-produced HTML.
8. The browser keeps the validated result and checklist state in `sessionStorage` for the current tab only.

## Workspace layout

| Path | Responsibility |
|---|---|
| `apps/web` | React upload, progress, result, evidence, and responsive UI |
| `apps/api` | HTTP endpoints, upload controls, Gemini adapter, validation, and static SPA serving |
| `packages/contracts` | Zod schemas and shared TypeScript types |
| `firebase` | Inactive future Firestore rules, indexes, and integration notes |
| `docs` | Build, API, security, roadmap, and competition guidance |

## Runtime configuration

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `PORT` | Cloud Run supplies it | `8080` | HTTP listener port |
| `NODE_ENV` | No | `development` locally | Enables production behavior when set to `production` |
| `DOC2DO_DEMO_MODE` | No | `true` in `.env.example` | Uses the deterministic fixture instead of Gemini |
| `GEMINI_API_KEY` | Gemini mode only | none | Server-only Gemini credential |
| `GEMINI_MODEL` | No | `gemini-3.6-flash` | Stable multimodal model selected by the API adapter |
| `CORS_ORIGIN` | No | `http://localhost:5173` in development; disabled in production | Comma-separated development origins; production uses the same origin |

## Design decisions and trade-offs

### One service, one origin

The MVP packages the SPA and API together. This removes cross-origin configuration, reduces deployment steps, and gives judges one public URL. The trade-off is that the frontend and API scale together. Splitting them is unnecessary at competition traffic levels.

### Validate after generation

Gemini structured output improves shape consistency, but it is not an authorization or correctness boundary. The server validates again with Zod and checks internal references. The extra validation can reject a partially useful response, but it prevents malformed model data from reaching the UI.

### Evidence before confidence

Critical actions and deadlines link to short source excerpts. Missing evidence becomes `needs_confirmation`. This is more conservative than a fluent summary and may ask the user to verify more often, but it makes the result defensible.

### Transient uploads

The core MVP processes bytes in memory and does not retain originals. The validated action plan is stored only in the current tab's `sessionStorage` so a refresh does not erase progress. Closing the tab clears that browser-session copy.

### User-controlled Calendar handoff

Doc2Do turns a reviewed deadline into a URL for Google Calendar's event editor. The title and time remain editable, and Doc2Do does not receive Calendar credentials or create an event automatically. An `.ics` download remains available for other calendar products.

### Deterministic demo mode

The bundled scenario remains usable during API outages and local development. The interface must label demo mode. A live Gemini run remains the primary competition proof; the fixture is a resilience path, not a hidden replacement.

## Reliability boundaries

- Upload limit: one 10 MB document and up to 2,000 context characters.
- Maximum model actions: 8.
- Maximum user clarification questions: 3.
- Unknown dates, times, and timezones stay unknown or partial.
- URLs not present in the source must not become trusted application links.
- Invalid output returns a recoverable API error rather than unvalidated content.
- Gemini transport retries are capped at three attempts and only cover `429` and `500`-`504` responses.
- Browser-origin analysis is same-origin by default; configured development origins are explicit exceptions.

## Recommended development connectors

Connectors help the build workflow; they are not runtime dependencies:

| Connector | Use | Permission boundary |
|---|---|---|
| GitHub MCP/connector | Read issues, inspect CI, and prepare pull requests | Repository-scoped access; keep merge and release approval human-controlled |
| Firebase MCP server | Inspect Firebase configuration, rules, and emulator tasks during the persistence phase | Use only the Doc2Do project; review rules changes before deployment |
| Figma Dev Mode MCP | Optional design-token and component handoff | Read-only design access is enough for the MVP |
| Google Cloud CLI | Enable APIs, manage secrets, deploy Cloud Run, and inspect logs | Prefer user login or workload identity; never share service-account JSON keys |

Do not install a broad cloud connector merely to deploy this app. The checked-in Cloud Build file and `gcloud` commands are easier to audit.

See the [API reference](api.md) for the contract and [security guide](security-and-privacy.md) for the threat model.
