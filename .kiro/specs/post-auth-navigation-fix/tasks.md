# Implementation Plan

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Login Section Stays Visible After Navigation
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the CSS specificity bug
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — call `showSection('dashboard')` and assert `#login-form` computed display is `none`
  - Set up a DOM environment with `index.html` structure and load `style.css`
  - Call `showSection('dashboard')` (simulating post-login navigation)
  - Assert that `getComputedStyle(document.getElementById('login-form')).display === 'none'`
  - Also test: `showSection('quiz-section')`, `showSection('course-section')`, `showSection('analytics')` — all should hide `#login-form`
  - Run test on UNFIXED code (`.page--login { display:flex!important }` still present)
  - **EXPECTED OUTCOME**: Test FAILS — `#login-form` computed display remains `flex` even after `active` is removed, confirming the `!important` override bug
  - Document counterexample: `showSection('dashboard')` → `#login-form` display is `flex` instead of `none`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.4_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Login Section Flex Layout When Active
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on UNFIXED code: `showSection('login-form')` → `#login-form` computed display is `flex` ✓
  - Observe on UNFIXED code: on initial page load with `active` on `#login-form` → display is `flex` ✓
  - Observe on UNFIXED code: `showSection('dashboard')` then `showSection('quiz-section')` → only `#quiz-section` has `display:block` ✓
  - Write property-based test: for all states where `#login-form` has the `active` class, computed display MUST be `flex`
  - Write property-based test: for any sequence of `showSection(id)` calls where `id !== 'login-form'`, only the target section is visible
  - Verify all preservation tests PASS on UNFIXED code (baseline confirmed)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Fix post-auth navigation — scope login flex rule to active state

  - [ ] 3.1 Implement the CSS selector fix in style.css
    - In `style.css`, locate the `/* ── Login ── */` block (around line 354)
    - Change `.page--login {` to `.page--login.active {`
    - This scopes `display:flex!important` to only fire when `#login-form` has the `active` class
    - When `showSection()` removes `active` from `#login-form`, `.page { display:none }` now takes effect correctly
    - No changes to `script.js` or `index.html` are needed
    - _Bug_Condition: isBugCondition(input) where input.sectionId !== 'login-form' AND stylesheetContains('.page--login { display:flex!important }')_
    - _Expected_Behavior: after showSection(id) where id !== 'login-form', getComputedStyle(loginSection).display === 'none'_
    - _Preservation: .page--login.active must still apply display:flex so login card layout is unchanged when active_
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Login Section Hides After Navigation
    - **IMPORTANT**: Re-run the SAME test from task 1 — do NOT write a new test
    - The test from task 1 encodes the expected behavior (login hidden after `showSection('dashboard')` etc.)
    - Run bug condition exploration test from step 1 against the FIXED code
    - **EXPECTED OUTCOME**: Test PASSES — `#login-form` computed display is now `none` after `active` is removed, confirming the fix works
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Login Section Flex Layout When Active
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run preservation property tests from step 2 against the FIXED code
    - **EXPECTED OUTCOME**: Tests PASS — `#login-form` still renders with `display:flex` when it has the `active` class, and non-login navigation is unaffected
    - Confirm no regressions: initial page load, `showSection('login-form')`, and inter-section navigation all behave as before

- [ ] 4. Checkpoint — Ensure all tests pass
  - Re-run the full test suite (exploration test + preservation tests)
  - Confirm Property 1 (bug condition) now passes on fixed code
  - Confirm Property 2 (preservation) still passes on fixed code
  - Manually verify in browser: log in → click Dashboard nav link → login page is hidden, dashboard is shown
  - Manually verify: click Login nav link or trigger auth guard → login page displays correctly with centered flex layout
  - Ensure all tests pass; ask the user if any questions arise
