# Security Policy

## Supported Status

This repository currently contains an early prototype. It is not ready for production use with identifiable patient data.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately to the maintainers instead of opening a public issue when the report involves:

- patient privacy
- identity or credential review bypass
- unauthorized case access
- exposed images or follow-up data
- export/import data leakage
- administrator permission bypass

## Patient Data

Do not include identifiable patient information in public reports, issues, PRs, screenshots, sample files, or test fixtures.

## Current Prototype Limitations

- Data is browser-local.
- Physician credential review is simulated in the frontend.
- Uploaded credential files are not actually verified.
- The app is not HIPAA/PIPL/GDPR compliant.
- Production deployments require backend access control, server-side audit logs, encryption, credential review, incident response, and legal review.
