# Testing strategy (Section 6.2) — I3dad / איעדאד

This document mirrors the final project document’s testing strategy. Automated checks run in CI and locally with **Jest**; manual verification uses **`docs/testing/QA_CHECKLIST.md`**.

## 1. Unit testing — בדיקות יחידה

- **Goal:** Verify each important function or module in isolation.
- **Frontend:** Jest + React Native Testing Library (`npm test`, `npm run test:coverage`).
- **Backend:** If Python services are added later, use **PyTest** in parallel under a dedicated `python/tests/` tree (not present in this repo today).
- **Examples in this codebase:** recommendation normalization, adaptive answer submission payloads, ability/interest refresh hooks after sessions, language helpers on results screens. **Per-question timer expiry** uses the same “pending then next question” path as skip (`handleAutoTimeout` / `handleSkipQuestion`); verify under load in **Performance** and **Regression** QA rows (automated timer specs are optional because heartbeat `setInterval` interacts with Jest fake timers).

## 2. Integration testing — בדיקות אינטגרציה

- **Goal:** Verify flows across **React Native app → services → Supabase** (mocked in Jest where network is unavailable).
- **Examples:** start comprehensive exam, load subjects, load next question, submit answer, persist session rows, load `test_session_subjects` and journey snapshot on results.

## 3. System testing — בדיקות מערכת כוללת

- **Goal:** End-to-end user journeys on real devices or web builds (manual or future Detox/Playwright).
- **Examples:** login → full assessment → answers → finish → **modern** results (`testResults`) → recommendations/profile. Confirm deprecated “old results” routes are not used.

## 4. User testing — בדיקות משתמשים

- **Goal:** Real students and principals validate clarity, RTL (Arabic/Hebrew), exam comprehension, result plausibility, and mobile usability. Use the checklist tables in `QA_CHECKLIST.md`.

## 5. Security testing — בדיקות אבטחה

- **Goal:** Least privilege, RLS enforcement, no sensitive logs on the client, HTTPS-only traffic to Supabase, no cross-student session access.
- **Automation:** Limited in Jest; most checks are manual or Supabase policy review — see `QA_CHECKLIST.md`.

## 6. Performance testing — בדיקות ביצועים

- **Goal:** Acceptable latency for question load, answer submit, and results generation; UI stays responsive under typical classroom load.
- **Tooling:** Manual timing, browser/React Native profiler, and future load tests against staging.

## 7. Regression testing — בדיקות רגרסיה

- **Goal:** After each fix or feature, re-run automated tests and a short manual smoke path (exam start → question → save → results).

## Repository layout

| Path | Purpose |
|------|---------|
| `__tests__/unit/` | Jest unit tests for screens and pure logic |
| `__tests__/integration/` | Service + DB boundary tests (mocked Supabase) |
| `__tests__/system/` | Placeholder for future E2E or manual runbooks |
| `__tests__/security/` | Placeholder for security-focused suites |
| `__tests__/performance/` | Placeholder for perf budgets / load scripts |
| `__tests__/regression/` | Smoke lists referencing QA checklist |
| `**/*.test.js` (colocated) | Additional screen/component tests next to source |

## Commands

```bash
npm test
npm run test:watch
npm run test:coverage
```

Coverage HTML is emitted under `coverage/` when using `test:coverage`.
