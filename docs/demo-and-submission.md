# Demo script and submission checklist

Use one fictional Vietnamese scholarship notice for development, judging, screenshots, and the video. Synthetic data keeps the story consistent and avoids exposing a real student's records.

## Primary scenario

Document: **AI Future Leaders Scholarship 2026**.

Source facts:

- third- or fourth-year technology students;
- minimum GPA 3.2/4.0;
- CV, transcript, student card, and 500-word essay required;
- application deadline 17:00 on 12 September 2026;
- interview window 20-22 September 2026;
- one explicit application URL.

User context:

> I am Lan, a third-year computer science student in Vietnam with GPA 3.4. I have not prepared the essay.

Expected plan:

- `likely_eligible`, citing study year and GPA evidence;
- next best action is drafting the 500-word essay;
- deadline and complete document checklist are visible;
- application URL matches the source exactly;
- missing source timezone is shown for confirmation, not silently guessed;
- interview dates appear as a later milestone, not the primary deadline.

## 2-3 minute presenter script

| Time | Action | Narration |
|---|---|---|
| 0:00 | Open the landing page | “Important opportunities are often available but still hard to act on.” |
| 0:15 | Select **Try sample** and show context | “Doc2Do reads the document together with the user's situation.” |
| 0:35 | Run analysis | “Gemini returns a structured result that the server validates before the UI sees it.” |
| 0:55 | Reveal the plan | “This is an ordered action plan, not only a summary.” |
| 1:20 | Open **Why?** evidence | “Each critical claim points back to the source, and uncertainty stays visible.” |
| 1:45 | If implemented, review Calendar event | “The user confirms the time and timezone before anything is written.” |
| 2:10 | If implemented, create event and show history | “Google integrations turn understanding into a persistent action.” |
| 2:30 | Close | “Doc2Do helps people move from confusing information to completed opportunities.” |

Do not pretend roadmap features are live. If Firebase or Calendar is not ready, spend the saved time showing evidence quality, uncertainty handling, and the public Cloud Run deployment.

## Demo resilience

- Keep the synthetic sample and expected JSON fixture in the repository.
- Run one successful live Gemini analysis shortly before recording or judging.
- Keep clearly labeled deterministic demo mode available for local development.
- Warm the service with a health request before presenting; do not keep a minimum instance running afterward.
- Prepare a second supported file and one unsupported file to demonstrate success and recoverable failure.
- Record at readable zoom and keep network-dependent steps under the 60-second Cloud Run timeout.

## Release acceptance

### Functional

- [ ] Guest can analyze the bundled sample.
- [ ] PDF, JPEG, PNG, WebP, and text inputs either produce a valid result or a specific error.
- [ ] Plan shows applicability, deadlines, actions, requirements, warnings, and evidence.
- [ ] Unknown date/time/timezone values remain unknown or require confirmation.
- [ ] No invented source link appears.

### Experience and reliability

- [ ] Main flow works at 360 px and 1440 px with keyboard-visible focus.
- [ ] Errors preserve context and offer a next step.
- [ ] Three consecutive end-to-end sample runs pass.
- [ ] `/api/health` returns `200` on the public URL.
- [ ] Root and client-side route refresh work in a signed-out browser.

### Privacy and operations

- [ ] No credentials or personal data exist in Git, browser assets, logs, fixtures, or screenshots.
- [ ] Cloud Run uses minimum `0`, maximum `2`, and request-based billing.
- [ ] Billing alerts and Gemini quotas are configured.
- [ ] Privacy notice is visible near upload.
- [ ] Logs contain no uploaded or extracted document text.

## Competition submission package

- [ ] **Google AI Studio link:** shared prompt/build demonstrates Gemini, structured output, and the sample input; test in a signed-out browser.
- [ ] **Public Cloud Run URL:** landing and demo path work without repository access.
- [ ] **Public YouTube video:** 2-3 minutes, readable, captioned, and follows problem -> product -> Google technology -> impact.
- [ ] **Social post:** explains the problem, the builder journey, Google technologies, and links the video/demo.
- [ ] **Completion form:** uses the same name `Doc2Do`, tagline, technology list, impact claim, and final links.
- [ ] **Final rules check:** re-open the organizer's current form and website before submission.

Suggested pitch:

> Doc2Do uses Gemini to turn confusing real-world documents into source-backed action plans, then helps users complete the next step through Firebase and Google Calendar.

Suggested close:

> Information should not become an opportunity only for people who have the time and confidence to decode it. Doc2Do turns understanding into action.
