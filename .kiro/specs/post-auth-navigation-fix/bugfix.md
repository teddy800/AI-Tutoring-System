# Bugfix Requirements Document

## Introduction

After a user successfully signs up or logs in, clicking any navigation link (Dashboard, Quizzes, Courses, Analytics, etc.) does not navigate to the requested section. The user either stays on the login page or is immediately redirected back to it. This blocks all post-authentication navigation and renders the application unusable after auth.

The root cause is a CSS specificity conflict: `.page--login` has `display:flex!important` which overrides the `.page { display:none }` rule. When `showSection()` removes the `active` class from the login section and adds it to another section, the login page never actually hides because the `!important` declaration wins regardless of the `active` class state.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user successfully logs in and `showSection('dashboard')` is called THEN the system displays the login page and the dashboard section simultaneously, making the login page appear to remain visible

1.2 WHEN a user successfully signs up and `showSection('dashboard')` is called THEN the system keeps the login page visible due to `display:flex!important` overriding the hide rule

1.3 WHEN an authenticated user clicks a nav link (Dashboard, Quizzes, Courses, Analytics, Repository, Feedback, Help) THEN the system shows the target section but the login page remains visible on top of or alongside it

1.4 WHEN `showSection(id)` removes the `active` class from `#login-form` THEN the system does not hide the login section because `.page--login { display:flex!important }` overrides `.page { display:none }`

### Expected Behavior (Correct)

2.1 WHEN a user successfully logs in and `showSection('dashboard')` is called THEN the system SHALL hide the login section and display only the dashboard section

2.2 WHEN a user successfully signs up and `showSection('dashboard')` is called THEN the system SHALL hide the login section and display only the dashboard section

2.3 WHEN an authenticated user clicks a nav link THEN the system SHALL hide the login section and display only the requested section

2.4 WHEN the `active` class is removed from `#login-form` THEN the system SHALL hide the login section so that `display:none` takes effect correctly

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an unauthenticated user loads the application THEN the system SHALL CONTINUE TO display the login section centered and styled with flex layout

3.2 WHEN the login section has the `active` class THEN the system SHALL CONTINUE TO render it with `display:flex` and its centered card layout

3.3 WHEN `showSection('login-form')` is called (e.g. after a failed auth guard check) THEN the system SHALL CONTINUE TO display the login section correctly

3.4 WHEN a user navigates between any two non-login sections THEN the system SHALL CONTINUE TO show only the target section and hide all others

3.5 WHEN the application first loads THEN the system SHALL CONTINUE TO show the login section as the default active page
