# Contributing

Calcaneal Case welcomes contributions from clinicians, educators, researchers, designers, and engineers.

## Contribution Areas

- Case data model and follow-up schema
- De-identification and privacy checks
- Imaging upload, enhancement, perspective correction, and measurement tools
- Classification workflow for Essex-Lopresti, Sanders, Zwipp, fracture-dislocation, and supplemental classification notes
- Teaching discussion and administrator review workflow
- Documentation, translations, testing, and accessibility

## Medical and Privacy Rules

- Do not upload identifiable patient data to issues, pull requests, examples, screenshots, fixtures, or documentation.
- Use synthetic, public-domain, or fully de-identified test images.
- Do not present measurement, classification, or checklist logic as autonomous diagnosis or treatment.
- Any feature that changes visibility, research export, identity review, or patient data handling requires extra review.

## Pull Request Expectations

- Keep changes focused.
- Explain the clinical or product reason for the change.
- Include screenshots or short screen recordings for UI changes when possible.
- Run:

```bash
npm test
```

## Maintainer Review

At least one technical maintainer and one clinical maintainer should review changes that affect:

- medical terminology
- classification logic
- follow-up outcomes
- privacy/de-identification
- research workflow
- administrator permissions
- commercial or sponsor-facing content
