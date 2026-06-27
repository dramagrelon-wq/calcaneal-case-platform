# Mobile Browser And PWA

The current mobile version is a Progressive Web App. Doctors can open it directly in a mobile browser, and then add it to the home screen for an app-like entry point.

## Current mobile behavior

- Open the app URL in a mobile browser.
- Enter through the formal platform landing page, then complete doctor access review before protected case content.
- Add it to the home screen.
- Use the camera capture button to photograph radiograph screens.
- Use local storage for offline drafts.
- Export/import JSON so data can move between devices before server sync is implemented.

## Mobile-first use cases

- Quick case intake at the bedside or clinic.
- Batch image capture from radiograph or CT screens.
- De-identification check before discussion.
- Reading teaching cases and discussion replies.
- Follow-up reminders and outcome notes.

Desktop remains better for heavy image sorting, longer writing, and release maintenance.

## Android

Android Chrome supports PWA installation from the browser menu. The manifest uses `display: standalone`, an app icon, and a theme color.

## iOS

iOS Safari supports "Add to Home Screen". Service worker behavior depends on iOS version and browser restrictions, but the app shell and local data workflow are designed to work without a build step.

## Native packaging path

When the web version is stable, the same interface can be wrapped with Capacitor or rebuilt with React Native/Expo. The shared contract should remain:

- same case JSON model
- same privacy states
- same image processing pipeline
- same measurement and classification records
- same discussion and follow-up records

Native-only features planned later:

- push notification follow-up reminders
- secure background sync
- device-level encrypted storage
- camera presets for screen-photo capture
- DICOM viewer integration
