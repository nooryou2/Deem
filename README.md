# Sanad (سَنَد) — MVP

A React Native (Expo) app that helps homeowners track recurring maintenance tasks,
get reminders before things become overdue, and build a history of completed work.

This is the **Version 1 MVP** scope from the project spec:
- Email/password authentication (register, login, forgot password)
- Maintenance item management (add / edit / delete) with default templates
  (AC, Water Filter, Water Tank, Smoke Detector, Fire Extinguisher, Water Heater)
- Service frequency (monthly, every 3 months, every 6 months, yearly, custom)
- Status tracking (Upcoming / Due Soon / Overdue / Completed) computed live from dates
- Local reminder notifications before and on the due date
- Dashboard with totals and a "needs attention" list
- Maintenance history (completion log per item)

Service provider directory, warranty tracking, cost tracking, and renewal
tracking are intentionally **not** included — they're Version 2 / future work
per the spec.

---

## 1. Prerequisites

- Node.js 18+ and npm
- The Expo Go app on your phone (easiest way to test), or an iOS/Android simulator
- A free [Firebase](https://console.firebase.google.com) project

## 2. Install dependencies

```bash
cd sanad
npm install
```

## 3. Set up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. In your project, go to **Build → Authentication → Get started**, and enable the
   **Email/Password** sign-in provider.
3. Go to **Build → Firestore Database → Create database** (start in production mode).
4. Once created, open the **Rules** tab and paste the contents of `firestore.rules`
   from this repo, then click **Publish**.
5. Go to **Project settings → General → Your apps**, click the **Web** icon (`</>`)
   to register a web app (Expo uses the Firebase JS SDK even for native builds),
   and copy the resulting config object.
6. Paste those values into `src/config/firebase.ts`, replacing the placeholders:

```ts
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

> For a production build you'd move these into environment variables instead of
> committing them directly — fine to leave as-is for local development and TestFlight.

### Firestore indexes
The app queries `maintenanceItems` filtered by `userId` and ordered by
`nextServiceDate`, and `maintenanceHistory` filtered by `maintenanceItemId` and
ordered by `completedDate`. The first time you run the app, Firestore will throw
an error in the console with a direct link to auto-create the needed composite
index — just click it. (This only happens once per query shape.)

## 4. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `i` / `a`
to launch a simulator.

## 5. Project structure

```
src/
  config/firebase.ts        Firebase init (auth + Firestore)
  types/                    Shared TypeScript types
  theme/                    Colors, spacing, typography tokens
  context/AuthContext.tsx   Auth state available app-wide
  hooks/useMaintenanceItems.ts  Live items + computed dashboard summary
  services/
    authService.ts          Login / register / logout / reset password
    maintenanceService.ts   Firestore CRUD + completion + history
    notificationService.ts  Local reminder scheduling (expo-notifications)
  utils/
    dateCalculations.ts     Next-due-date math, status derivation
    maintenanceTemplates.ts Default templates from the spec
  components/                Reusable UI (Button, InputField, cards, badges...)
  screens/                   All app screens
  navigation/                Auth stack, main tab+stack, root switcher
```

## 6. How status & reminders work

- **Status** (`Upcoming` / `Due Soon` / `Overdue`) is never stored — it's computed
  live from `nextServiceDate` every time it's displayed (`getMaintenanceStatus` in
  `dateCalculations.ts`), so it's always correct even if the item hasn't been
  touched in months. "Due Soon" is anything due within 7 days; tweak
  `DUE_SOON_THRESHOLD_DAYS` to change that.
- **Reminders** are scheduled as local device notifications (via
  `expo-notifications`) at creation/edit/completion time: one 3 days before the
  due date, one on the due date. This works without a backend, which keeps the
  MVP simple. The tradeoff: reminders only fire on the device that created them.
  If you later want server-driven push (e.g. via Firebase Cloud Functions +
  Expo Push API) so reminders work across devices and survive reinstalls, that's
  a natural Version 2 addition — the `notificationService.ts` file is the place
  to swap in remote scheduling.

## 7. Deployment (per the spec's Week 3 plan)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios   # creates a build you can upload to TestFlight
```

## 8. What's next (Version 2, not in this build)

Service provider directory & requests, ratings & reviews, cost tracking,
file attachments (invoices/warranty docs), warranty expiry reminders, and
issue-based maintenance reporting — see the original spec for details.
