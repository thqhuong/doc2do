# Firebase integration assets

These files define the proposed persistence boundary for the post-core MVP. They are not deployed automatically by `cloudbuild.yaml`.

## Contents

- `firestore.rules`: owner-scoped rules for profiles, analyses, action items, calendar exports, and feedback.
- `firestore.indexes.json`: history index for analyses ordered by creation time.

## Before deployment

1. Add Firebase to the same Google Cloud project used by Cloud Run.
2. Enable Google sign-in and create Firestore in a region appropriate for the project.
3. Configure `firebase.json` locally or in a dedicated Firebase deployment workflow to reference these files.
4. Test authenticated owner, cross-user denial, malformed create, and delete behavior with the Firebase Emulator Suite.
5. Deploy only after the API verifies Firebase ID tokens and writes `ownerId` from the verified identity.

Raw uploaded files are intentionally outside this model. Do not add Cloud Storage until retention, deletion, and owner-scoped storage rules are designed and tested.
