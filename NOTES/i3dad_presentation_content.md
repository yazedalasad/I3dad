# i3dad / إعداد Presentation Content Update

## Slide 1: Product Overview
i3dad / إعداد is a bilingual Arabic-Hebrew academic guidance platform for students, principals, and admins. It combines assessments, personality insights, learning signals, educational games, and institution data to guide students toward suitable study fields.

## Slide 2: Student Journey
Register -> complete profile -> comprehensive test -> personality test -> educational games -> final report -> recommendations -> institutions.

Key screens: signup, profile edit, total exam, adaptive test, personality test, games hub, final report, recommendations, university and college pages.

## Slide 3: Student Experience
Students build a profile with personal, school, and class details. The platform then collects academic ability data, personality indicators, interests, learning potential, and supporting game signals to generate a clear guidance report.

## Slide 4: Recommendation Logic
The recommendation engine combines:
- Comprehensive test results as the primary academic ability source.
- Personality profile.
- Interests and subject preferences.
- Learning potential and growth signals.
- Educational game signals as supporting evidence only.

Games help enrich the picture, but they do not determine the recommendation by themselves.

## Slide 5: Final Student Report
The final report includes:
- Abilities and subject strengths.
- Interests.
- Personality profile.
- Recommended fields.
- Matching percentage.
- Relevant institutions.
- Strengths.
- Areas to improve.
- PDF export.

## Slide 6: Educational Games
Current game flow includes Doctor at Soroka, Physics Lab, Word Treasures, and Bridge Engineer. Each game records skill, interest, engagement, and career signals that support the recommendation profile.

## Slide 7: Principal Dashboard
The principal dashboard covers:
- School students.
- Student details.
- Class analytics.
- Reports.
- Game analytics.
- Activities.
- Invitations.
- Permissions.

Principals can only access students connected to their own school.

## Slide 8: Admin Dashboard
The admin dashboard covers:
- Manage students.
- Manage principals.
- Manage schools.
- Manage subjects.
- Manage questions.
- Manage games.
- Manage test sessions.
- Reports.
- Institutions.
- Translations.
- Roles.
- Audit logs.
- Export reports.

## Slide 9: Architecture
Frontend: React Native, Expo, React Native Web.

Backend and data: Supabase Auth, PostgreSQL, Supabase Edge Functions.

Platform support: i18n for Arabic/Hebrew localization, Jest for tests, reusable service layer for assessments, recommendations, dashboards, and game signals.

## Slide 10: Security And Privacy
Security model:
- Role-based permissions for student, principal, and admin.
- Row Level Security policies.
- `school_id` isolation.
- Encrypted Supabase authentication.
- Principals cannot access students outside their assigned school.
- Admin-only operations are routed through protected services and Edge Functions.

## Slide 11: Testing Strategy
Testing coverage includes:
- Unit tests.
- Integration tests.
- RLS tests.
- Translation coverage tests.
- Israeli ID validation tests.
- Form validation tests.
- Navigation and role-routing tests.

## Slide 12: Progress
Already implemented:
- Student registration and profile.
- Comprehensive test flow.
- Personality test flow.
- Recommendation and report services.
- Educational games and game signal collection.
- Principal dashboards.
- Admin dashboards.
- Supabase Auth and database integration.
- Arabic/Hebrew i18n.
- Israeli ID checksum validation utility and tests.

Still in progress:
- Full PDF export polish.
- Broader RLS test automation.
- Translation coverage expansion.
- More institution/program data.
- More game levels and analytics refinements.

## Slide 13: Demo Flow
Demo order:
1. Home screen.
2. Student registration.
3. Profile completion.
4. Comprehensive test.
5. Personality test.
6. Games hub.
7. Final report.
8. Recommendations.
9. Institutions.
10. Principal dashboard.
11. Admin dashboard.
