# AI Riser Vietnam 2026 judging evidence

Use this as the single source of truth for the completion form, AI Studio project, demo video, and social post. Do not claim roadmap features as live.

## Product proof

**Doc2Do turns a confusing document into a source-backed plan the user can execute.** A user uploads or pastes a notice and optionally describes their situation. Gemini identifies applicability, deadlines, requirements, warnings, and the best next action. Every critical action points to an exact source excerpt. The user can edit and complete the checklist, recover progress after a refresh, and open a reviewed deadline in Google Calendar.

Primary users are Vietnamese students, job seekers, families, and citizens who receive important instructions as PDFs, screenshots, notices, or long messages. The narrow MVP focuses on scholarships and administrative opportunities, while the schema supports jobs, education, bills, events, and other notices.

## Criteria map

| Criterion | Judge-visible proof | Why it matters |
|---|---|---|
| Creativity | Personalized applicability, a single best next action, evidence drawers, uncertainty labels, editable checklist, and Calendar handoff | The product moves beyond chat and summarization into an auditable action workflow |
| Feasibility | Public one-service deployment, bounded upload types/size, deterministic resilience fixture, strict shared schema, transient storage, capped retries, and test coverage | The complete path works now and fails safely when a model or input is invalid |
| Impact potential | A document becomes a prioritized plan with source coverage, requirements, deadlines, and completion progress | It reduces the comprehension and confidence gap that causes people to miss real opportunities |
| Google technology bonus | Gemini 3.6 Flash multimodal input and structured output; Google Calendar pre-filled event; Cloud Run; Cloud Build; Artifact Registry; Secret Manager | Each Google service owns a real product or delivery responsibility instead of being decorative |
| Public deployment bonus | [Live Cloud Run app](https://doc2do-173521763192.asia-southeast1.run.app) and `/api/health` | The judge can use the app without local setup or repository access |
| Early submission bonus | Submit the completion form as soon as the AI Studio link, public video, social post, and final live check are ready | This bonus depends on submission order, not more product scope |

## Google integration depth

### Gemini

- Receives text, PDF, or supported image data from the server, never a browser-exposed key.
- Uses a system instruction that treats documents and user context as untrusted data.
- Produces JSON against an explicit response schema with low temperature.
- Receives one repair attempt for invalid structured output and capped retry for transient capacity errors.
- Passes a second server-side Zod and cross-reference validation before rendering.

### Google Calendar

- Starts from a deadline that already passed schema and source-reference checks.
- Requires the user to review the event title, date, time, timezone warning, and reminder.
- Opens Google Calendar's event editor only after an explicit click; Doc2Do never creates an event automatically.
- Keeps an `.ics` fallback for accessibility and provider choice.

### Google Cloud

- Cloud Run serves the React app and Node API from one public, same-origin container.
- Secret Manager exposes the Gemini key only to the runtime service account.
- Cloud Build uses digest-pinned builders to build, push to Artifact Registry, and deploy.
- Both the service-wide and per-revision instance maximums are two; minimum instances are zero.

## Three-minute demo proof sequence

1. Open the public Cloud Run URL and point out **Built with Gemini** plus the Free Tier data notice.
2. Click **Try the scholarship sample** and wait for the **Gemini analysis** breadcrumb.
3. Show likely eligibility and explain that optional user context changes applicability without becoming an instruction.
4. Open **Why this?** and match an action to the exact Vietnamese source excerpt.
5. Show **Details to confirm** for the missing timezone instead of pretending it is known.
6. Complete an action, refresh, and show that the current browser session restores the plan and progress.
7. Review **Add deadline**, then open the pre-filled Google Calendar event.
8. Close on the public URL and the one-line impact story: “Doc2Do turns access to information into the ability to act on it.”

If the breadcrumb says **Sample analysis**, Gemini was unavailable and the resilience fallback ran. Retry before recording; never describe the fallback as a live model response.

## Release evidence

- Source: [github.com/thqhuong/doc2do](https://github.com/thqhuong/doc2do)
- CI: [GitHub Actions](https://github.com/thqhuong/doc2do/actions/workflows/ci.yml)
- Public app: [doc2do-173521763192.asia-southeast1.run.app](https://doc2do-173521763192.asia-southeast1.run.app)
- Health: [public health endpoint](https://doc2do-173521763192.asia-southeast1.run.app/api/health)
- Runtime: `gemini-3.6-flash`, `DOC2DO_DEMO_MODE=false`, Secret Manager binding, scoped runtime identity
- CI gates: lockfile install, dependency audit, type checking, API/web tests, production build, smoke test, and Docker build
- Repository protections: secret scanning, push protection, Dependabot security updates, CodeQL, immutable workflow actions, and protected `main`

## Submission truth checklist

- [ ] AI Studio link opens for a signed-out reviewer and uses the same synthetic notice and structured schema.
- [ ] YouTube demo is public, readable on mobile, and shows the **Gemini analysis** label.
- [ ] Social post links both the public video and Cloud Run app and names the real Google technologies.
- [ ] Completion form consistently uses `Doc2Do` and the tagline “From document to done.”
- [ ] Final private-window run completes once with Gemini immediately before submission.
- [ ] Submit early. Do not add Firebase, OAuth, or another product surface before these five checks pass.
