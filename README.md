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

4. Start the app:

```bash
npx expo start
```

For web:

```bash
npm run web
```

## Testing
Run the Jest suite:

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

## Deployment Notes
- Configure Supabase Edge Function secrets: `PROJECT_URL`, `PROJECT_ANON_KEY`, `PROJECT_SERVICE_ROLE_KEY`, and `INVITE_REDIRECT_URL`.
- Enable Supabase Auth leaked-password protection before production.
- Review public storage bucket listing policies before production.
- Add an `eas.json` profile before building native production artifacts with EAS.

## Status
The project is demo-ready for an academic presentation, with remaining production work around full device/browser E2E testing, final deployment configuration, and hardening several Supabase warnings.