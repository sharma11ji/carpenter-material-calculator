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
