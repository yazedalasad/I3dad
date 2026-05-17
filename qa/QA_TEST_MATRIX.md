# QA Test Matrix

This matrix maps the requested QA categories to project evidence, automation status, and demo status.

## Testing Categories

| Category | Status | Evidence In Project |
| --- | --- | --- |
| Integration Testing | Partially automated, manually required | `qa/E2E_SCENARIOS.md`, service tests, recommendation tests |
| Environment Testing | Automated and documented | `.env.example`, `README.md`, `config/supabase.test.js` |
| System Testing | Manual checklist | `qa/DEMO_CHECKLIST.md` |
| End-to-End Testing | Manual scenarios documented | `qa/E2E_SCENARIOS.md` |
| Regression Testing | Automated | `npm test`, `services/adminComplianceService.test.js`, existing screen/service tests |
| Deployment Testing | Documented, not fully complete | `README.md`, `qa/DEMO_CHECKLIST.md` |
| Smoke Testing | Checklist | `qa/DEMO_CHECKLIST.md` |
| Sanity Testing | Checklist + targeted Jest | `qa/DEMO_CHECKLIST.md`, `qa/securityRegression.test.js` |
| Functional Testing | Partially automated | screen tests, service tests, `qa/E2E_SCENARIOS.md` |
| Authentication Testing | Partially automated | `screens/Auth/RoleRouterScreen.test.js`, `qa/securityRegression.test.js` |
| Authorization Testing | Partially automated + Supabase Advisor | `qa/securityRegression.test.js`, live Supabase checks |
| Supabase RLS Testing | Live checked, needs role simulation | Supabase Advisor + SQL checks |
| Database Testing | Live checked | question validity, institution/major/program coverage |
| UI/UX Testing | Mostly manual | `qa/DEMO_CHECKLIST.md` |
| Localization Testing | Partially automated | `i18n/translationCoverage.test.js` |
| Accessibility Testing | Manual needed | `qa/DEMO_CHECKLIST.md` |
| Security Testing | Partially automated | `qa/securityRegression.test.js`, Edge Function hardening |
| Performance Testing | Partially reviewed | indexes added in Supabase, Advisor checked |
| Error Handling Testing | Partially automated | screen/service tests and manual scenarios |
| Data Quality Testing | Live checked + documented | Supabase question/program coverage checks |
| Compatibility Testing | Manual required | Expo Go/web/browser checklist |
| Acceptance Testing | Checklist | `qa/DEMO_CHECKLIST.md` |
| Documentation Testing | Improved | `README.md`, `.env.example`, `qa/ADVANCED_QA_REPORT.md` |
| Code Quality Testing | Partially automated | Jest, lints, targeted code review |

## Automated Jest Coverage Highlights

- Israeli ID validation.
- Supabase client config.
- Role router admin hardening.
- Recommendation engine scoring, confidence, and game caps.
- Institution matching sorting and formatting.
- Diverse question selection.
- Game student ID safety.
- Principal invitation link code forwarding.
- QA artifact presence and category coverage.
- Security regression checks for admin role trust.

## Manual Demo Coverage Needed

- Real student signup and login.
- Real principal invitation email/link flow.
- Real admin data management flow.
- Real game completion and recommendation refresh.
- Web/Expo Go visual inspection.
- PDF/report export on supported platforms.
- Arabic/Hebrew RTL visual pass.
