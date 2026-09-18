# Carpenter Material Calculator

Mobile-first carpenter calculator with Firebase cloud history, multiple material items, cut wood, round wood, plywood/flush door, running feet, billing and PDF-ready printing.

## Features

- Cut Wood / Size Wood CFT calculator.
- Round Wood / Log calculator using diameter or girth/circumference.
- Plywood / Flush Door / Sheet square-feet calculator.
- Running Feet calculator.
- Imperial + metric unit conversion.
- Multiple items in one job.
- Item-wise quantity, measurement, rate and amount.
- Customer name, job name and notes.
- Firebase Google Login.
- Cloud History with search, view, edit and delete.
- Bill / Invoice preview.
- Print / Save PDF using the phone/browser print dialog.
- Share Bill using the device share sheet when supported.
- PWA/offline app shell.
- Firestore rules included.
- No paid API.

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication -> Google.
3. Create Firestore Database.
4. Add a Web App in Firebase Project Settings.
5. Copy the Firebase web config into `app.js`.
6. Publish `firestore.rules` in Firebase Console -> Firestore Database -> Rules.
7. Add your GitHub Pages domain under Authentication -> Settings -> Authorized domains.

## Data

Saved jobs are stored under:

`users/{uid}/calculations/{calculationId}`

Each job contains customer, job name, notes, item list, CFT, square feet and total amount.

## PDF

Open Bill, then tap **Print / Save PDF**. On Android Chrome, choose **Save as PDF** in the print dialog.

## Version

2.0.0


## Gemini AI Scan

Version 2.1 adds an AI Scan interface for reading carpenter measurements from photos.

Flow:
1. User signs in with Google.
2. User opens AI Scan and takes/selects a clear measurement photo.
3. The frontend compresses the image and sends it to `/api/analyzeMeasurement` with the Firebase ID token.
4. Firebase Cloud Functions verifies the signed-in user.
5. Gemini receives the image and returns structured JSON for material, calculation type, dimensions, unit, quantity, rate, confidence and missing fields.
6. The frontend lets the user review/edit the extracted values.
7. The existing deterministic calculator calculates CFT, Sq Ft, RFT and cost.
8. The user adds the verified result to the current list and can save it to Firebase History.

### Secure Gemini setup

Do NOT put a Gemini API key in `app.js`, GitHub Pages, or any public frontend file. Firebase documents that Gemini Developer API keys must be protected from public exposure. citeturn0search9

From the project root after installing the Firebase CLI:

```bash
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase functions:secrets:set GOOGLE_GENAI_API_KEY
firebase deploy --only functions,hosting
```

When prompted for the secret, paste the Gemini API key created for the Gemini Developer API. The key is consumed only by the server-side Cloud Function.

The frontend currently expects the Firebase Web App config in `app.js` as before. GitHub Pages alone cannot execute the `/api/analyzeMeasurement` backend; deploy the project to Firebase Hosting for the included rewrite to work.

Gemini supports image input and structured JSON output, which is why the AI layer is used for extraction while the app's own calculator remains responsible for exact arithmetic. citeturn1search1turn0search0

Important limitation: an ordinary photo does not provide a reliable real-world scale. The AI should read visible tape/ruler values or written measurements; it must not invent dimensions from the apparent size of the wood. The UI therefore requires review before adding an AI result to a calculation.
