# Test results — I3dad / איעדאד

**Document purpose:** Academic record of automated test outcomes, project-wide coverage, and how this aligns with the final project document’s **Testing Strategy (Section 6.2)**.

---

## Executive summary

The project currently includes automated Jest unit and integration testing, plus manual QA checklists for system, user, security, performance, and regression testing. The latest full test run passed successfully with 53/53 suites and 296/296 tests. Full-project coverage is 53.17% statements, 41.15% branches, 51.75% functions, and 56.11% lines.

**Scope of automation (plain language):**

- **Automated tests** focus mainly on **unit** behaviour (isolated components, screens, and services) and **integration-style** flows where external systems are **mocked** (e.g. Supabase client chains, auth, and service boundaries in Jest).
- **System, user, security, and performance** testing are **planned and documented** (see `TESTING_STRATEGY.md` and `QA_CHECKLIST.md`), including folder placeholders under `__tests__/system/`, `__tests__/security/`, and `__tests__/performance/`. They are **not fully automated** in this repository at submission time; they rely on structured **manual** procedures and future tooling where noted.
- This combination is a **practical student-project implementation** of Section 6.2: the seven testing levels are all **represented** in documentation and process, while **heavy automation** is concentrated where it is feasible without a dedicated QA lab or staging load environment.

**How to reproduce:** run `npm run test:coverage -- --runInBand` from the project root; re-run after substantive changes to refresh the figures below.

---

## Latest full test run

| Metric | Value |
|--------|------:|
| Test suites passed | 53 |
| Test suites failed | 0 |
| Tests passed | 296 |
| Tests failed | 0 |
| Snapshots | 0 |

---

## Full-project coverage (Jest aggregate)

The following row is the **“All files”** aggregate from Jest’s coverage report (all instrumented files in the default collection). Percentages are as reported by the tool.

| Metric | Coverage |
|--------|----------|
| **Statements** | 53.17% |
| **Branches** | 41.15% |
| **Functions** | 51.75% |
| **Lines** | 56.11% |

**Interpretation:** The aggregate reflects the entire included codebase, including modules with little or no direct test exercise (for example, parts of `services/`). For a file-level breakdown, see the terminal output after `npm run test:coverage` or open `coverage/lcov-report/index.html` in a browser.

---

## What is automated (Jest)

Executed via **`npm test`** or **`npm run test:coverage`**:

- **Unit-oriented tests:** colocated `*.test.js` files under `screens/`, `components/`, `features/`, and selected `src/` modules.
- **Additional unit tests** under `__tests__/unit/` (e.g. comprehensive exam entry, adaptive workflow, results metrics), using mocks for services, authentication, and Supabase where appropriate.
- **Integration-oriented tests** under `__tests__/integration/` (e.g. results screen with a **mocked** Supabase query chain — not a live database).
- **Supplementary automated checks** elsewhere (e.g. recommendation engine unit tests, configuration tests, translation coverage, targeted regression scripts under `qa/`).

**Limitation:** Automated suites validate **logic and wiring under controlled mocks**. They do not certify production **RLS**, **HTTPS** configuration, **real-device** UX, or **load** behaviour without further manual or specialist tooling.

---

## What is manual or checklist-driven

Documented in **`QA_CHECKLIST.md`** and **`TESTING_STRATEGY.md`**, with README guidance under `__tests__/system/`, `__tests__/security/`, `__tests__/performance/`, and `__tests__/regression/`:

| Area | Status at submission |
|------|----------------------|
| **System** (end-to-end journeys) | Checklist and narrative; **not** replaced by in-repo E2E automation. |
| **User** (clarity, RTL, usability) | **Manual checklist** with stakeholders. |
| **Security** (roles, RLS, leakage) | **Manual checklist** and policy review; only **partial** automated hints (e.g. `qa/securityRegression.test.js`). |
| **Performance** (latency, concurrency) | **Manual checklist**; no in-repo load-test suite. |
| **Regression** | **Process:** full Jest run plus checklist rows after changes. |

---

## Mapping to Section 6.2 (Testing Strategy)

| Level (§6.2) | Implementation status |
|--------------|-------------------------|
| **Unit** | **Automated (Jest)** — primary strength of the current codebase. |
| **Integration** | **Automated (Jest)** with mocked backends; complements but does not replace live integration. |
| **System** | **Documented + manual**; automation planned as future work. |
| **User** | **Documented + manual** checklists. |
| **Security** | **Documented + manual** (plus limited automated checks). |
| **Performance** | **Documented + manual**; tooling optional later. |
| **Regression** | **Automated suite re-run + manual checklist** as a defined process. |

Together, this satisfies Section 6.2 as a **transparent, student-appropriate** testing strategy: all levels are **named, scoped, and evidenced**, while automation is **honestly bounded** to what the project resources support.

---

## Recommended future work

1. Targeted tests and coverage for high-risk **`services/`** modules that remain thinly covered in the aggregate report.
2. End-to-end automation (e.g. Maestro, Detox, or web Playwright) for critical student journeys.
3. Staging-only load scripts (e.g. k6) once a stable non-production environment exists.
4. Formal security review passes (RLS matrix) against a disposable Supabase project.
5. Optional CI thresholds for coverage after team agreement on baselines.

---

## Related documentation

- [`TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) — Section 6.2 narrative  
- [`QA_CHECKLIST.md`](./QA_CHECKLIST.md) — manual test tables (Test ID, steps, expected result, status)  
- [`README.md`](./README.md) — index of testing documents  
