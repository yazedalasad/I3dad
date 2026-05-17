# End-To-End QA Scenarios

These scenarios are written for demo/manual E2E testing. They can later be automated with Detox, Playwright, or Maestro.

## Scenario 1: Student Full Assessment Flow

1. Open the app.
2. Sign up as a new student with a valid Israeli ID.
3. Log in.
4. Complete or update the student profile.
5. Start the comprehensive assessment.
6. Answer questions across multiple subjects.
7. Complete the assessment.
8. Complete personality test if prompted.
9. Open results/report.
10. Open recommendations.
11. Verify top 3 majors show match percentage, confidence, explanation, missing steps, and linked institutions.

Expected result:
- Student data is saved.
- Test session is completed.
- Recommendations appear without crashing.
- Institutions appear for recommended majors.

## Scenario 2: Student Skips Or Times Out

1. Start assessment as a logged-in student.
2. Skip a question or allow timeout behavior if available.
3. Continue answering remaining questions.
4. Finish the test.
5. Open results and recommendations.

Expected result:
- Skips/timeouts are counted as weak/incorrect signals.
- Results still save.
- Recommendation confidence reflects incomplete/weak evidence.

## Scenario 3: Student Only Plays Games

1. Log in as a student.
2. Open games.
3. Complete one educational game level.
4. Open recommendations.

Expected result:
- Recommendation is preliminary/low confidence.
- Game signals support but do not dominate.
- CTA asks student to complete comprehensive/personality tests.

## Scenario 4: Student Partial Data

1. Log in as student.
2. Complete only personality test or only profile interests.
3. Open recommendations.

Expected result:
- App does not crash.
- Recommendations are low/medium confidence.
- Missing steps are shown clearly.

## Scenario 5: Principal Invitation And Dashboard

1. Log in as admin.
2. Open admin management.
3. Invite a principal linked to a school.
4. Open/copy the invitation link.
5. Complete principal first-time registration.
6. Log in as principal.
7. Open principal dashboard.
8. Open students and analytics.

Expected result:
- Principal is linked to the correct school.
- Principal sees only students from that school.
- Analytics load without exposing other schools.

## Scenario 6: Admin Full Platform Management

1. Log in as admin.
2. Open admin dashboard.
3. Manage schools.
4. Manage subjects.
5. Manage questions.
6. Manage games.
7. Manage institutions/programs.
8. View reports and export data.

Expected result:
- Admin can manage platform-wide data.
- Non-admin users cannot access admin screens.
- Exports are only available to admin users.

## Scenario 7: Game Save And Recommendation Update

1. Log in as student.
2. Start Doctor Soroka, Physics Lab, Arabic Poet Puzzle, or Bridge Engineer.
3. Finish a level.
4. Confirm game session is saved in Supabase.
5. Open recommendation page.

Expected result:
- `game_sessions` row exists.
- Related `student_game_skills`, `student_game_interests`, or `student_career_signals` are updated where supported.
- Recommendation explanation can reference game support signals.

## Scenario 8: Language And Direction

1. Switch app language to Arabic.
2. Navigate through home, profile, assessment, recommendations, principal dashboard, admin dashboard.
3. Switch to Hebrew.
4. Repeat core screens.
5. If English is selectable, verify LTR layout.

Expected result:
- Arabic/Hebrew render RTL.
- Buttons, cards, and top bars remain readable.
- No critical untranslated text in core demo screens.
