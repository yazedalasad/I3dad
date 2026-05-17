# Demo And Submission Checklist

## Before Running The Demo

- [ ] Pull latest code.
- [ ] Run `npm install`.
- [ ] Copy `.env.example` to `.env`.
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL`.
- [ ] Set `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npx expo start`.
- [ ] Prepare one student account.
- [ ] Prepare one admin account.
- [ ] Prepare one principal invitation or principal account.

## Student Smoke Test

- [ ] App opens.
- [ ] Signup opens.
- [ ] Login opens.
- [ ] Profile opens.
- [ ] Assessment starts.
- [ ] Question appears.
- [ ] Answer saves.
- [ ] Results/report opens.
- [ ] Recommendations open.
- [ ] Institution cards appear.
- [ ] PDF/report export works where supported.

## Principal Smoke Test

- [ ] Principal invitation link opens.
- [ ] First-time registration works.
- [ ] Principal login works.
- [ ] Principal dashboard opens.
- [ ] School students list opens.
- [ ] Analytics screen opens.
- [ ] Principal cannot see other schools' students.

## Admin Smoke Test

- [ ] Admin login works.
- [ ] Admin dashboard opens.
- [ ] Schools management opens.
- [ ] Principal invitation screen opens.
- [ ] Questions management opens.
- [ ] Subjects management opens.
- [ ] Reports open.
- [ ] Institutions/programs manager opens.
- [ ] Non-admin user cannot access admin dashboard.

## Game Smoke Test

- [ ] Games hub opens.
- [ ] Doctor Soroka starts.
- [ ] Physics Lab starts.
- [ ] Arabic Poet Puzzle starts.
- [ ] Bridge Engineer starts.
- [ ] At least one level finishes.
- [ ] Game session saves.
- [ ] Recommendations still open after game completion.

## Localization And UI

- [ ] Arabic layout is RTL.
- [ ] Hebrew layout is RTL.
- [ ] English layout, if selected, is LTR.
- [ ] Main buttons are visible and tappable.
- [ ] Cards do not overflow on mobile width.
- [ ] Important errors are readable.
- [ ] Empty states are clear.

## Security Before Submission

- [ ] No `.env` file is committed.
- [ ] No service-role key appears in frontend files.
- [ ] Admin role is checked from `app_metadata` or server-controlled data only.
- [ ] Supabase RLS is enabled for public tables.
- [ ] Principal sees only same-school students.
- [ ] Student sees only own data.

## Deployment Readiness

- [ ] Supabase Edge Function secrets are set.
- [ ] `INVITE_REDIRECT_URL` points to the correct app URL.
- [ ] Supabase Auth leaked-password protection is enabled.
- [ ] Public storage policies are reviewed.
- [ ] `eas.json` is added if native production build is required.
- [ ] Final screenshots/video are prepared for the presentation.
