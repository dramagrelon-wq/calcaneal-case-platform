# Roadmap

## Milestone 1: Local PWA prototype

- Case entry for calcaneal fracture
- Doctor-local private patient fields for follow-up, excluded from normal export
- Combined injury and comorbidity/risk-factor capture
- Case visibility choices with explanations: private, administrator-visible, circle teaching, public teaching, and multi-center research
- Administrator application workflow for team-certified educators
- Privacy level and de-identification checklist
- Multi-center research eligibility fields for ethics approval and credentials
- Image upload with browser-side re-encoding
- Crop, centered square crop, four-point perspective correction, pure black-white contrast, brightness, contrast, and sharpening tools
- Batch image category assignment for preoperative, intraoperative, postoperative, and other imaging
- Four-point semi-automatic angle measurement
- Doctor-confirmed Essex-Lopresti, Sanders, and Zwipp classification suggestions
- Fracture-dislocation and rare/special classification notes
- Follow-up records
- Default follow-up intervals, reminder dates, follow-up completion, and final outcome fields
- Case discussion records
- JSON export/import

## Milestone 2: Data and collaboration

- Backend API with shared case data across web, Android, and iOS
- Account and role model: owner, team doctor, trainee, reviewer, admin
- Case visibility: private, team discussion, public teaching
- Audit log for sensitive data changes
- CSV and Excel import templates
- DICOM metadata stripping and server-side validation

## Milestone 3: Imaging intelligence

- Robust screen-photo enhancement pipeline
- Automatic crop for radiograph screen photos
- Bone-edge enhancement presets
- Bohler and Gissane guided point suggestions
- Classification assistant for Essex-Lopresti, Sanders, and Zwipp
- Review queue for model mistakes and correction data

## Milestone 4: Mobile apps

- Package the shared app as Android and iOS builds
- Camera capture workflow for clinic and operating room screens
- Offline-first case drafts
- Push notifications for follow-up reminders
- Secure cloud sync for approved deployments

## Milestone 5: Open-source maintenance

- Contribution guide and issue templates
- Privacy review checklist for PRs
- Test fixtures with synthetic or fully de-identified images
- Automated changelog and release workflow
- Maintainer automation for issue triage, docs refresh, and regression checks
