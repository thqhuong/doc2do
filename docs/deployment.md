# How to deploy Doc2Do safely to Cloud Run

This guide builds the workspace into one container and deploys it publicly in Singapore (`asia-southeast1`) with low-cost competition defaults.

## Prerequisites

- A Google Cloud project with billing linked. The examples use `doc2do-ai-riser-2026`.
- Google Cloud CLI authenticated with a deployer account.
- Gemini API key created in Google AI Studio.
- A committed `package-lock.json`; the Docker build uses `npm ci`.
- Permission to enable APIs, create service accounts, manage secrets, build images, and deploy Cloud Run.

Set the active project:

```bash
gcloud config set project doc2do-ai-riser-2026
```

## 1. Enable only the required services

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

Firebase and Calendar APIs are not required for the first transient MVP. Enable them when implementing the [integration roadmap](roadmap.md).

## 2. Create the image repository

```bash
gcloud artifacts repositories create doc2do \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Doc2Do Cloud Run images"
```

If the repository already exists, keep it and continue.

## 3. Create a least-privilege runtime identity

```bash
gcloud iam service-accounts create doc2do-runtime \
  --display-name="Doc2Do Cloud Run runtime"
```

Create a Secret Manager secret named `GEMINI_API_KEY` in the Google Cloud console, add the Gemini key as its latest version, then grant only this runtime identity access:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:doc2do-runtime@doc2do-ai-riser-2026.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Do not put the key in `cloudbuild.yaml`, `.env`, GitHub Actions variables exposed to the browser, or any `VITE_*` variable.

## 4. Allow Cloud Build to deploy

Find the build identity:

```bash
gcloud builds get-default-service-account
```

Grant that identity the minimum roles needed for this pipeline: Cloud Run Admin, Artifact Registry Writer, and Service Account User on `doc2do-runtime`. Prefer resource-level grants where your organization supports them. A project owner can configure these grants in **IAM & Admin** without copying credentials locally.

## 5. Build and deploy

From the repository root:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

`cloudbuild.yaml` builds with Docker, pushes to Artifact Registry, and deploys `doc2do` using:

- region `asia-southeast1`;
- request-based billing (`--cpu-throttling`);
- minimum instances `0` and maximum instances `2`;
- 1 vCPU and 512 MiB memory;
- concurrency `20` and timeout `60s`;
- public unauthenticated access to the web app;
- Gemini key mounted from Secret Manager.

To deploy deterministic demo mode without Gemini, override the build substitution only after removing the secret binding from the deploy step or deploying manually with `DOC2DO_DEMO_MODE=true`.

## Verification

Get the deployed URL:

```bash
gcloud run services describe doc2do \
  --region=asia-southeast1 \
  --format="value(status.url)"
```

Then verify:

1. Open the URL in a private browser window.
2. Confirm `GET <URL>/api/health` returns `200`.
3. Run the bundled sample and open at least one source-evidence item.
4. Refresh a client-side route and confirm the SPA still loads.
5. Inspect Cloud Run logs and confirm no document text or credentials appear.

## Cost controls

Use all of these controls; no single one replaces the others:

- Keep request-based billing, minimum instances `0`, and maximum instances `2`.
- Keep the service at 1 vCPU and 512 MiB until measurement proves it needs more.
- Set Gemini request and token quotas appropriate for a public demo.
- Rate-limit the public analysis endpoint and cap upload size before model calls.
- Configure billing budget alerts at 50%, 80%, and 100%. Budget alerts notify; they are not a guaranteed hard stop.
- Use any available project/service spend cap as a backstop, then test that the app fails safely when quota is exhausted.
- Delete old Artifact Registry images after the competition if they are no longer needed.

Check the live Google Cloud and Gemini pricing pages before changing regions, instance settings, or model selection.

## Rollback

List revisions:

```bash
gcloud run revisions list --service=doc2do --region=asia-southeast1
```

Route all traffic to a known-good revision:

```bash
gcloud run services update-traffic doc2do \
  --region=asia-southeast1 \
  --to-revisions=KNOWN_GOOD_REVISION=100
```

## Troubleshooting

| Symptom | Check |
|---|---|
| Build fails at `npm ci` | Commit the lockfile and ensure workspace packages match it |
| Container never becomes ready | API must listen on `0.0.0.0` and `process.env.PORT` |
| Root works but refresh gives 404 | API static handler must fall back to `apps/web/dist/index.html` for non-API routes |
| Secret access denied | Confirm the Cloud Run runtime identity, secret name, version, and accessor binding |
| Deploy step denied | Confirm the Cloud Build identity has Run Admin and may act as `doc2do-runtime` |
| Gemini returns quota errors | Lower traffic, check project/model quotas, or temporarily use clearly labeled demo mode |

## Official references

- [Deploy containers to Cloud Run](https://cloud.google.com/run/docs/deploying)
- [Cloud Run container runtime contract](https://cloud.google.com/run/docs/container-contract)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Cloud Billing budgets and alerts](https://cloud.google.com/billing/docs/how-to/budgets)
- [Secret Manager access control](https://cloud.google.com/secret-manager/docs/access-control)
