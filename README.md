# Calcaneal Case

Calcaneal Case is an open-source case entry, imaging, measurement, follow-up, and discussion system for calcaneal fractures.

The first milestone focuses on one disease area: calcaneal fracture. The app is designed for teaching, case review, structured follow-up, and research data collection. It is not a diagnostic device and does not replace clinician judgment.

## Why this exists

Calcaneal fracture cases are image-heavy, longitudinal, and discussion-heavy. A useful system needs to support:

- de-identified case collection
- doctor-local private patient information for follow-up
- combined injury and comorbidity tracking
- image upload, cropping, enhancement, and annotation
- mobile camera capture for screen-photo workflows
- batch image category assignment and four-point perspective correction
- semi-automatic angle measurement such as Bohler and Gissane angles
- classification suggestions that doctors confirm or correct
- structured case discussion
- follow-up reminders and outcome tracking

## Current web/PWA version

This repository currently contains a no-build Progressive Web App that can be used directly from desktop or mobile browsers:

- Works in a browser by opening `index.html`
- Can be added to the Android/iOS home screen as a PWA
- Starts with a formal mobile-friendly product entry; physician real-name and credential review appears when entering protected case content
- Stores data locally in the current browser, with IndexedDB used for image-heavy cases
- Supports JSON export/import for data portability
- Re-encodes uploaded images through canvas to strip ordinary browser-readable metadata
- Keeps patient name, phone number, ID number, exact age, and exact sex in a separate local-only storage area that is excluded from normal case export

## Open the app

Public web version:

```text
https://dramagrelon-wq.github.io/calcaneal-case-platform/
```

The web version is published with GitHub Pages from the `main` branch.

For local preview, open:

```text
index.html
```

No package install is required for the current static web version.

## Safety and privacy

This project is intended for medical professionals. The current web version includes privacy prompts and basic image sanitization, but it is not yet HIPAA/PIPL/GDPR compliant. Do not upload identifiable patient data into shared or public environments until a deployment has been legally and technically reviewed.

Clinical functions are intentionally described as:

- measurement assistance
- classification suggestion
- teaching checklist
- case discussion

They are not autonomous diagnosis, treatment, or surgical decision-making.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## Android and iOS

See [docs/MOBILE_APP.md](docs/MOBILE_APP.md).

## Data model

See [docs/DATA_MODEL.md](docs/DATA_MODEL.md).

## Legal notice draft

See [docs/LEGAL_NOTICES.md](docs/LEGAL_NOTICES.md). This draft must be reviewed before production use.

## Media attributions

See [docs/MEDIA_ATTRIBUTIONS.md](docs/MEDIA_ATTRIBUTIONS.md). Public landing media must be replaced with de-identified, authorized teaching materials before production use.

## Open-source maintenance

See [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), [SECURITY.md](SECURITY.md), and [docs/CODEX_OSS_APPLICATION.md](docs/CODEX_OSS_APPLICATION.md).

## GitHub collaboration

See [docs/GITHUB_OWNER_SETUP.md](docs/GITHUB_OWNER_SETUP.md), [docs/INSTRUCTOR_ONBOARDING_GUIDE.md](docs/INSTRUCTOR_ONBOARDING_GUIDE.md), and [docs/MAINTENANCE_SCHEDULE.md](docs/MAINTENANCE_SCHEDULE.md).

## Founder maintenance guide

See [docs/SELF_MAINTENANCE_GUIDE.md](docs/SELF_MAINTENANCE_GUIDE.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
