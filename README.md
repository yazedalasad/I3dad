# i3dad / إعداد
## Overview
i3dad is an academic orientation platform implemented with React Native, Expo, and Supabase. It supports student assessment, educational games, explainable major recommendations, institution/program matching, principal dashboards, and admin management.

## Main Features
- Student signup/login, profile, adaptive assessment, results, recommendations, and final insight report.
- Educational games that save supporting skill/career signals without dominating recommendations.
- Explainable recommendation engine with confidence levels and missing-step guidance.
- Institution, college, university, major, and program matching through Supabase tables.
- Principal dashboard for school-level students, analytics, reports, and activities.
- Admin dashboard for schools, principals, subjects, questions, games, reports, translations, and academic catalog data.
- Arabic and Hebrew RTL support, with English fallbacks in several areas.

## Typography and accessibility

Shared tokens live in `src/theme/typography.js` (body 18px, questions 26px, answers 22px, nav 17px, exam button 56px tall). Use `font('question')`, `textStyle('sectionTitle')`, and `touchTargets` for buttons/inputs.

Optional larger text on web: set `localStorage` key `app_font_scale` to `large` (12% scale-up; wired in `App.js` for future UI).

Re-run project-wide size bump after adding new screens:

```bash
node scripts/bumpTypographySizes.js
```

## Tech Stack
- Frontend: React Native and Expo.
- Backend/Auth/Database: Supabase and PostgreSQL.
- Testing: Jest and React Native Testing Library.
- Localization: i18next/react-i18next.

## Setup
1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env
```

3. Set at least:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Use `SUPABASE_SERVICE_ROLE_KEY` only for trusted local scripts or server utilities. Never expose the service role key in frontend code.

4. Start the app (QR code for phone + dev menu):

```bash
npm start
# or: npx expo start
```

If the phone cannot connect on the same Wi‑Fi, use tunnel mode:

```bash
npm run tunnel
# or: npx expo start --tunnel
```

Web browser:

```bash
npm run web
# or: npx expo start --web
```

Android / iOS simulators:

```bash
npm run android
npm run ios
```

## Testing

Automated tests use **Jest** with **jest-expo** and **React Native Testing Library**. The testing strategy (Section 6.2) and manual QA tables live under **`docs/testing/`** (`TESTING_STRATEGY.md`, `QA_CHECKLIST.md`). Jest specs are organized under **`__tests__/`** (unit, integration, and placeholders for system/security/performance/regression).

Run the full suite:

```bash
npm test
```

Watch mode while developing:

```bash
npm run test:watch
```

Coverage report (HTML under `coverage/`):

```bash
npm run test:coverage
```

For slower machines you can serialize tests:

```bash
npm test -- --runInBand
```

Useful smoke checks before a demo:
- Student signup/login/profile opens.
- Assessment starts, shows questions, saves answers, and opens results.
- Recommendations show confidence, reasons, and institution links.
- At least one game can start, complete, and save a game session.
- Principal dashboard loads only school-scoped students.
- Admin dashboard loads management screens for schools, questions, subjects, reports, and institutions.

## Database Notes
Core Supabase tables include `students`, `schools`, `principals`, `subjects`, `questions`, `test_sessions`, `student_responses`, `student_abilities`, `student_interests`, `game_sessions`, `student_career_signals`, `majors`, `institutions`, and `institution_programs`.

SQL files in `database/` and `supabase/migrations/` document schema and migration changes. Apply schema changes through reviewed Supabase migrations, not by editing frontend code.

## Production deployment

### Prerequisites

```bash
npm install
cp .env.example .env
```

Set in `.env` (required for production web/mobile):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EMAIL_API_URL` (production email server URL — not `localhost`)

Never commit `.env` or expose `SUPABASE_SERVICE_ROLE_KEY` in the client app.

### Local run (dev)

```bash
npm start
npx expo start --web
```

Phone cannot connect on LAN:

```bash
npm run tunnel
```

### Web — static export

`app.json` uses `"web": { "output": "static" }`. Production static files are written to **`dist/`**.

The app uses `ManualNavigator` for in-app routing; a minimal `app/` folder (`app/index.js` → `App.js`) satisfies Expo Router for static export and EAS Hosting. Entry point: `expo-router/entry`.

```bash
npm run export:web
# or: npx expo export --platform web
```

Preview the export locally (optional):

```bash
npx serve dist
```

### Web — EAS Hosting

One-time:

```bash
npm install -g eas-cli
eas login
eas init
eas deploy --configure
```

Publish:

```bash
npm run deploy:web
npm run deploy:web:prod
# or: eas deploy
# or: eas deploy --prod
```

Set production env in [Expo dashboard](https://expo.dev) → Project → Environment variables (`EXPO_PUBLIC_*`), or via CLI:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY"
```

After adding secrets, rebuild and redeploy:

```bash
npm run export:web
npm run deploy:web
```

If secrets are missing, the deployed site shows a **configuration screen** instead of a blank white page.

### Android — EAS Build

One-time:

```bash
npm install -g eas-cli
eas login
eas build:configure
```

`eas.json` includes profiles: **development**, **preview**, **production**.

| Profile | Command | Output |
|--------|---------|--------|
| Preview (APK) | `npm run build:android:preview` | `eas build -p android --profile preview` |
| Production (AAB) | `npm run build:android:prod` | `eas build -p android --profile production` |

Expo Go / dev client:

```bash
npm start
```

### Production checklist

- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set for EAS / hosting
- [ ] No `localhost` URLs in production env (`EXPO_PUBLIC_EMAIL_API_URL`, `INVITE_REDIRECT_URL`)
- [ ] Supabase Auth: leaked-password protection enabled
- [ ] Supabase Edge Function secrets: `PROJECT_URL`, `PROJECT_ANON_KEY`, `PROJECT_SERVICE_ROLE_KEY`, `INVITE_REDIRECT_URL`
- [ ] `npm run export:web` succeeds
- [ ] PDF on web: direct download (no print dialog); on Android: share/save via `expo-print` + `expo-sharing`

## Status
The project is demo-ready for an academic presentation, with remaining production work around full device/browser E2E testing, final deployment configuration, and hardening several Supabase warnings.