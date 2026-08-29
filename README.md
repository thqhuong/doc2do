# Doc2Do

**Turn confusing documents into clear, source-backed actions.**

Doc2Do converts a PDF, image, or text notice into an ordered action plan: what the document is, whether it may apply to the user, what to do next, which deadlines matter, and which source excerpt supports each conclusion. It is an AI Riser Vietnam 2026 MVP built with Gemini and deployed as one public Cloud Run service.

**Live demo:** https://doc2do-173521763192.asia-southeast1.run.app

The public deployment currently uses clearly labeled deterministic demo mode. The same validated API path switches to Gemini when a server-side `GEMINI_API_KEY` is configured and `DOC2DO_DEMO_MODE=false`.

## MVP capabilities

- Analyze the bundled sample without signing in or configuring Gemini.
- Upload PDF, PNG, JPEG, WebP, or text and receive a validated `Doc2DoResult`.
- Show applicability, deadlines, action items, warnings, and source evidence.
- Label inferred or uncertain facts instead of presenting guesses as facts.
- Keep uploaded bytes transient; raw documents are not persisted by default.
- Serve the React SPA and Node API from the same Cloud Run container.

Firebase sign-in/history and reviewed Google Calendar export are intentionally staged after the core upload-to-action loop. See the [integration roadmap](docs/roadmap.md).

## Quick start

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```bash
npm install
npm run dev
```

The default `.env.example` enables deterministic demo mode, so the app works without a Gemini key. To use Gemini, copy `.env.example` to `.env`, set `GEMINI_API_KEY`, and change `DOC2DO_DEMO_MODE` to `false`. Keep the key server-side and never use a `VITE_` prefix for it.

Open the local URL printed by Vite. The API exposes a dependency-free health check at `/api/health`.

## Verify the repository

```bash
npm run typecheck
npm test
npm run build
```

The production API starts with:

```bash
npm start
```

It runs `apps/api/dist/server.js`, listens on `0.0.0.0:$PORT`, and serves the built SPA from `apps/web/dist`.

## Architecture at a glance

```text
Browser
  |  same-origin HTTPS
  v
Cloud Run: doc2do
  +-- React SPA (apps/web/dist)
  +-- Node API (apps/api/dist/server.js)
        |-- validates uploads and model output
        +-- Gemini API (or deterministic demo fixture)

Roadmap: Firebase Auth + Firestore, then reviewed Calendar export
```

The shared Zod contracts in `packages/contracts` are the trust boundary between model output, API responses, and UI rendering.

## Documentation

- [Polished MVP demo brief (Word)](docs/Doc2Do_MVP_Demo_Brief.docx)
- [Architecture and design decisions](docs/architecture.md)
- [API and structured-output reference](docs/api.md)
- [How to deploy safely to Cloud Run](docs/deployment.md)
- [Security and privacy](docs/security-and-privacy.md)
- [Firebase and Google Calendar roadmap](docs/roadmap.md)
- [Demo script and submission checklist](docs/demo-and-submission.md)

## Deployment defaults

The supplied container and Cloud Build configuration target `asia-southeast1` with request-based billing, minimum instances `0`, maximum instances `2`, 1 vCPU, 512 MiB memory, and a 60-second timeout. Follow [the deployment guide](docs/deployment.md) before running a build.

## License

MIT. See [LICENSE](LICENSE).
