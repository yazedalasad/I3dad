# Manual QA checklist — I3dad / איעדאד

Use this checklist before demos, releases, or regression passes. **Status** values: `Pending` | `Pass` | `Fail` | `N/A`.

Legend: **Test ID** is stable for traceability in bug reports and commits.

---

## Unit testing (Jest — automated + manual spot-checks)

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| U-01 | Jest suite green | Run `npm test` from repo root | All unit tests pass | Pending |
| U-02 | Coverage report | Run `npm run test:coverage` | Report generates; critical paths covered | Pending |
| U-03 | Total exam screen logic | Run tests under `__tests__/unit/` for TotalExam | Subjects load; start params include min/max questions | Pending |
| U-04 | Adaptive screen logic | Run adaptive unit tests | First question loads; finish path calls ability/interest updates | Pending |
| U-05 | Results screen logic | Run TestResults tests | Scores and RTL copy render; empty states handled | Pending |

---

## Integration testing (app ↔ services ↔ Supabase)

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| I-01 | Start comprehensive session | Log in as student → open full exam → start | Session row created; navigation to adaptive flow | Pending |
| I-02 | Load subjects | Open total exam screen | All active subjects appear; auto-included | Pending |
| I-03 | Next question | Start exam | Question loads without error | Pending |
| I-04 | Submit answer | Select option → confirm | Answer persisted; next question or completion | Pending |
| I-05 | Results hydration | Finish exam → open results | `test_sessions` + `test_session_subjects` drive UI totals | Pending |
| I-06 | Journey snapshot | Open results with network | Recommendations/institutions load or graceful warning | Pending |

---

## System testing (end-to-end flow)

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| S-01 | Student happy path | Login → full test → answer → finish → results → profile/recommendations | No deprecated old-only results route; modern `testResults` flow used | Pending |
| S-02 | Principal path | Login as principal → dashboards | Only `school_id` students visible | Pending |
| S-03 | Admin path | Login as admin → management screens | Full access per role design | Pending |
| S-04 | Language switch | Toggle Hebrew/Arabic mid-flow where supported | Correct RTL/LTR and strings | Pending |

---

## User testing (students & principals)

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| UX-01 | Language clarity | Student reads instructions | Wording understandable for age group | Pending |
| UX-02 | Arabic/Hebrew RTL | Student uses AR/HE UI | Layout mirrors correctly; no clipped text | Pending |
| UX-03 | Exam comprehension | Student walks through one subject | Understands timing, skip/pending behavior | Pending |
| UX-04 | Results plausibility | Student opens report | Scores match intuition; explanations helpful | Pending |
| UX-05 | Mobile usability | Use small phone | Tap targets OK; scroll natural | Pending |
| UX-06 | Principal clarity | Principal reviews class list | Filters and labels clear | Pending |

---

## Security testing

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SEC-01 | Unauthenticated access | Open deep link without session | Redirect/login; no data leak | Pending |
| SEC-02 | Student isolation | Student A tries student B session/results URL | Access denied or empty per RLS | Pending |
| SEC-03 | Principal scope | Principal opens another school’s student | No rows returned | Pending |
| SEC-04 | Admin scope | Admin queries cross-school | Allowed per policy | Pending |
| SEC-05 | RLS review | Supabase dashboard → policies | Policies match role matrix | Pending |
| SEC-06 | Client logs | DevTools / Metro logs during exam | No tokens, emails, or PII in logs | Pending |
| SEC-07 | Transport | Inspect network host | HTTPS to Supabase | Pending |
| SEC-08 | Session fixation | Reuse old `sessionId` with wrong `studentId` | Server rejects or RLS blocks | Pending |

---

## Performance testing

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| P-01 | Question load | Time first paint after start | Within acceptable budget on mid device | Pending |
| P-02 | Answer submit | Time submit → next question | No multi-second freeze | Pending |
| P-03 | Results screen | Open results after large session | Loads < few seconds on good network | Pending |
| P-04 | Classroom scale (staging) | N concurrent students (N≥20) | No systemic timeouts | Pending |
| P-05 | UI responsiveness | Rapid taps / navigation | No ANR / jank on results generation | Pending |

---

## Regression testing (after each change)

| Test ID | Test Name | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| R-01 | Exam start | Start full exam | Works | Pending |
| R-02 | Questions load | Advance several items | Works | Pending |
| R-03 | Answers save | Submit + refresh | Data persisted | Pending |
| R-04 | Scores | Finish session | Totals match DB | Pending |
| R-05 | Results UI | Open results | Renders without crash | Pending |
| R-06 | Recommendations | Open recommendations | Sensible ordering and text | Pending |
| R-07 | Language switch | Toggle languages | Still works | Pending |
| R-08 | Principal/admin dashboards | Smoke dashboards | Load without error | Pending |
| R-10 | Per-question timer | Start exam, let one question time out | Next question loads; no crash; outcome matches policy (pending / scoring) | Pending |
