# Carpenter Material Calculator

A mobile-first, free carpenter calculator with CFT, Square Feet, Running Feet, Estimates, Firebase Google Login, cloud History, PWA support, and a simple English interface.

## Features

- Wood CFT calculator: Length × Width × Thickness × Quantity ÷ 1728 when dimensions are inches.
- Feet, inches, centimeters and millimeters conversion for CFT.
- Square Feet and Running Feet calculators.
- Rate and total-cost calculation.
- Firebase Authentication with Google.
- Cloud History per user: save, view, edit and delete.
- Estimates with customer, job, notes, CFT, rate and total.
- Searchable history.
- PWA/offline app shell.
- Firestore security rules included.
- No paid API.

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication -> Google.
3. Create Firestore Database.
4. Add a Web App in Firebase Project Settings.
5. Copy the Firebase web config into `app.js` where `firebaseConfig` is defined.
6. Publish the included `firestore.rules` in Firebase Console -> Firestore Database -> Rules.
7. Add your deployed GitHub/Firebase Hosting domain under Authentication -> Settings -> Authorized domains.

## Important

The calculator works without Firebase configuration, but cloud History and Estimates require Firebase configuration and Google sign-in.

## Suggested Firebase data structure

`users/{uid}/calculations/{calculationId}`

`users/{uid}/estimates/{estimateId}`

Each user can access only their own documents because of the included Firestore rules.

## Deploy

This project is plain HTML/CSS/JavaScript and can be hosted as static files. Firebase Hosting, GitHub Pages, Netlify or another static host can serve it.

## Version

1.0.0
