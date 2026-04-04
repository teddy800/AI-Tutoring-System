# Post-Auth Navigation Fix — Bugfix Design

## Overview

After a successful login or signup, clicking any navigation link (Dashboard, Quizzes, Courses, etc.) fails to navigate away from the login page. The login section remains visible because `.page--login { display:flex!important }` in `style.css` always wins over the `.page { display:none }` rule, regardless of whether the `active` class is present or not.

The fix is a single-character CSS change: scope the flex rule to `.page--login.active` so the flex layout only applies when the section is active. When `showSection()` removes the `active` class from `#login-form`, the section will correctly collapse to `display:none`.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — `showSection(id)` is called with a non-login `id` while `.page--login { display:flex!important }` exists in the stylesheet, causing the login section to remain visible
- **Property (P)**: The desired behavior — after `showSection(id)` completes, only the target section is visible and the login section is hidden
- **Preservation**: The login section's centered flex layout when it IS active, and all non-login navigation behavior, must remain unchanged by the fix
- **showSection(id)**: The function in `script.js` that removes `active` from all `.page` elements and adds it to the target element
- **page--login**: The CSS modifier class on `#login-form` that provides the centered flex layout for the login card
- **active**: The class toggled by `showSection()` to show/hide `.page` elements

## Bug Details

### Bug Condition

The bug manifests when `showSection()` is called with any section id other than `'login-form'`. The function correctly removes `active` from `#login-form`, but `.page--login { display:flex!important }` overrides the `.page { display:none }` rule unconditionally, so the login section never hides.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { sectionId: string }
  OUTPUT: boolean

  RETURN input.sectionId !== 'login-form'
         AND stylesheetContains('.page--login { display:flex!important }')
         AND loginSectionIsVisible()
END FUNCTION
```

### Examples

- User logs in → `showSection('dashboard')` called → login page stays visible alongside dashboard (expected: login hidden, dashboard shown)
- User signs up → `showSection('dashboard')` called → login page stays visible (expected: login hidden, dashboard shown)
- Authenticated user clicks "Quizzes" nav link → `showSection('quiz-section')` called → login page remains on screen (expected: login hidden, quiz section shown)
- Edge case: `showSection('login-form')` called → login page shows correctly (this path is unaffected by the bug)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When `#login-form` has the `active` class, it MUST continue to render with `display:flex` and its centered card layout
- On initial page load, the login section (which has `active` by default in `index.html`) MUST continue to display correctly
- When `showSection('login-form')` is called (e.g. after a failed auth guard), the login section MUST continue to display correctly
- Navigation between any two non-login sections (e.g. Dashboard → Quizzes) MUST continue to work exactly as before

**Scope:**
All inputs that do NOT involve navigating away from the login section are completely unaffected by this fix. This includes:
- Mouse clicks on non-login nav links when already on a non-login section
- The initial page load rendering the login section
- Any call to `showSection('login-form')`

## Hypothesized Root Cause

Based on the bug description, the root cause is confirmed and singular:

1. **CSS Specificity + `!important` Override**: `.page--login { display:flex!important }` is not scoped to the `.active` state. Because `!important` overrides all other declarations regardless of specificity, `.page { display:none }` can never win — even when `active` is absent. The fix is to change the selector to `.page--login.active` so the `!important` flex rule only fires when the section is active.

2. **No Secondary Causes**: `showSection()` in `script.js` correctly removes `active` from all `.page` elements. The JavaScript logic is sound. The bug is purely in the CSS rule.

## Correctness Properties

Property 1: Bug Condition — Login Section Hides After Navigation

_For any_ call to `showSection(id)` where `id !== 'login-form'`, the fixed stylesheet SHALL result in `#login-form` having a computed `display` of `none` after the `active` class is removed, so that only the target section is visible.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation — Login Section Flex Layout When Active

_For any_ state where `#login-form` has the `active` class (initial load, `showSection('login-form')` call), the fixed stylesheet SHALL continue to apply `display:flex` to `#login-form`, preserving the centered card layout exactly as before the fix.

**Validates: Requirements 3.1, 3.2, 3.3, 3.5**

## Fix Implementation

### Changes Required

**File**: `style.css`

**Selector**: Line ~354, inside the `/* ── Login ── */` block

**Specific Change**:

Before:
```css
.page--login {
  min-height: calc(100vh - 80px);
  display: flex!important; align-items: center; justify-content: center;
}
```

After:
```css
.page--login.active {
  min-height: calc(100vh - 80px);
  display: flex!important; align-items: center; justify-content: center;
}
```

This is the only change required. No changes to `script.js` or `index.html` are needed.

**Why this works**: With `.page--login.active`, the `display:flex!important` rule only applies when the `active` class is present. When `showSection()` removes `active` from `#login-form`, the rule no longer matches, and `.page { display:none }` takes effect correctly.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on the unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm the root cause analysis.

**Test Plan**: Write tests that call `showSection('dashboard')` (simulating post-login navigation) and assert that `#login-form` is hidden. Run these tests on the UNFIXED code to observe failures and confirm the CSS specificity root cause.

**Test Cases**:
1. **Post-Login Navigation Test**: Call `showSection('dashboard')`, assert `#login-form` computed display is `none` (will fail on unfixed code)
2. **Post-Signup Navigation Test**: Call `showSection('dashboard')` after signup flow, assert login section is hidden (will fail on unfixed code)
3. **Nav Link Navigation Test**: Simulate clicking each nav link, assert login section is hidden for each (will fail on unfixed code)
4. **Edge Case — No Active Class**: Remove `active` from `#login-form` directly, assert computed display is `none` (will fail on unfixed code due to `!important`)

**Expected Counterexamples**:
- `#login-form` computed display remains `flex` even after `active` class is removed
- Confirms root cause: `.page--login { display:flex!important }` overrides `.page { display:none }`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed stylesheet produces the expected behavior.

**Pseudocode:**
```
FOR ALL sectionId WHERE isBugCondition({ sectionId }) DO
  showSection(sectionId)
  result := getComputedStyle(loginSection).display
  ASSERT result === 'none'
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) === fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code for the login-active path, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Active Login Preservation**: Verify `showSection('login-form')` results in `display:flex` on `#login-form` — must work on both unfixed and fixed code
2. **Initial Load Preservation**: Verify that on page load with `active` on `#login-form`, the login section renders with flex layout
3. **Non-Login Navigation Preservation**: Verify that navigating between two non-login sections (e.g. dashboard → quiz-section) continues to work correctly after the fix

### Unit Tests

- Assert `#login-form` computed display is `none` after `showSection('dashboard')` on fixed code
- Assert `#login-form` computed display is `flex` after `showSection('login-form')` on fixed code
- Assert only the target section has `display:block` (via `.page.active`) after any `showSection()` call
- Assert removing `active` from `#login-form` results in `display:none` (the core regression test)

### Property-Based Tests

- Generate all valid section ids and verify that after `showSection(id)`, exactly one section is visible and it is the target section
- Generate random sequences of `showSection()` calls and verify the login section is only visible when `id === 'login-form'`
- Verify that for any state where `#login-form.active` exists, computed display is `flex`

### Integration Tests

- Full login flow: fill credentials → submit → assert dashboard visible, login hidden
- Full signup flow: fill form → submit → assert dashboard visible, login hidden
- Nav link traversal: login → click each nav link in sequence → assert login never reappears
- Auth guard redirect: access protected section without login → `showSection('login-form')` → assert login displays correctly with flex layout
