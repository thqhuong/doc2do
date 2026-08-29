# Security policy

Doc2Do handles uploaded documents that may contain sensitive information. Do not report vulnerabilities through public issues.

For this competition MVP, contact the repository owner privately through the email address associated with the GitHub profile. Include reproduction steps, affected endpoint or component, and potential impact. Do not attach real personal documents or active credentials.

## MVP security boundaries

- Uploaded file bytes are processed in memory and are not persisted by default.
- Gemini credentials remain server-side and must be supplied through environment-backed secrets.
- Model output is treated as untrusted data and validated before rendering.
- The public analysis endpoint is size-limited and rate-limited.
- Synthetic fixtures are used for tests and demonstrations.
