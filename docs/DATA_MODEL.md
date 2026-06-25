# Data Model

The prototype stores the same JSON-shaped case document locally in the browser. Small records are mirrored in `localStorage`; image-heavy case data is also written to IndexedDB so uploaded radiographs and CT images can survive refreshes and static site version updates. Future backend storage should preserve the same core shape so web, Android, and iOS clients can share data.

## Case

```json
{
  "id": "uuid",
  "code": "CF-2026-001",
  "privacyLevel": "private | admin | team | public | research",
  "ageBand": "46-60",
  "sex": "not-public",
  "side": "left | right | bilateral",
  "mechanism": "fall from height",
  "combinedInjury": "associated injuries",
  "comorbidities": {
    "cardio": false,
    "diabetes": false,
    "smoking": false,
    "footHistory": false
  },
  "threeStepNotes": "structured surgical thinking notes",
  "privacyChecks": {
    "hideName": true,
    "hideDates": true,
    "hideHospital": true,
    "hideMetadata": true
  },
  "research": {
    "ethicsApprovalId": "IRB-2026-001",
    "ethicsApprovalFileName": "ethics-approval.pdf",
    "credentialFileName": "site-credential.pdf"
  },
  "adminApplication": {
    "reason": "why the doctor wants administrator teaching access",
    "teachingProfile": "teaching background and case discussion experience"
  },
  "classification": {
    "sanders": "I | II | III | IV",
    "essex": "Tongue type | Joint depression type | Comminuted/atypical",
    "fractureDislocation": "yes | no",
    "specialClassification": "rare case or special classification notes",
    "zwippPosteriorFacet": "yes | no",
    "zwippMiddleFacet": "yes | no",
    "zwippCalcaneocuboid": "yes | no",
    "zwippTuberosity": true,
    "zwippDepressed": true,
    "zwippSustentaculum": true,
    "zwippAnterolateral": true,
    "zwippAnteromedial": false
  },
  "images": [],
  "measurements": [],
  "followups": [],
  "followupPlan": {
    "defaultInterval": "2w-6w-3m-6m-12m",
    "status": "ongoing | completed",
    "finalOutcome": "fusion | healed | subtalar-arthritis | revision | lost"
  },
  "comments": []
}
```

## Doctor-local private patient data

Patient name, phone number, ID number, exact age, and exact sex are stored in a separate browser-local key and are intentionally excluded from normal JSON export/import. This supports follow-up by the treating doctor without exposing the data to public, team, or research case views.

```json
{
  "patientName": "local only",
  "patientPhone": "local only",
  "patientIdNumber": "local only",
  "patientSex": "local only",
  "patientAge": "local only"
}
```

## Image

```json
{
  "id": "uuid",
  "name": "preoperative lateral x-ray",
  "category": "preop-xray | preop-ct | intraop | postop-xray | postop-ct | other",
  "type": "image/png",
  "dataUrl": "data:image/png;base64,...",
  "createdAt": "iso-date",
  "updatedAt": "iso-date"
}
```

Future versions should replace inline `dataUrl` values with encrypted object storage references.

## Measurement

```json
{
  "id": "uuid",
  "type": "bohler | gissane | hindfoot-varus | custom",
  "angle": 28.4,
  "points": [
    { "x": 100, "y": 200 },
    { "x": 300, "y": 210 },
    { "x": 180, "y": 260 },
    { "x": 380, "y": 320 }
  ],
  "imageId": "uuid",
  "imageName": "preoperative lateral x-ray",
  "createdAt": "iso-date"
}
```

## Follow-up

```json
{
  "id": "uuid",
  "stage": "术后 6 周",
  "dueDate": "2026-08-03",
  "vas": "2",
  "functionScore": "76",
  "weightBearing": "部分负重",
  "status": "ongoing | completed",
  "finalOutcome": "fusion | healed | subtalar-arthritis | revision | lost",
  "notes": "wound, fixation, subtalar arthritis, revision surgery, or other special notes",
  "createdAt": "iso-date"
}
```

## Discussion comment

```json
{
  "id": "uuid",
  "role": "主刀/带教",
  "visibility": "病例成员",
  "body": "case discussion text",
  "createdAt": "iso-date"
}
```
