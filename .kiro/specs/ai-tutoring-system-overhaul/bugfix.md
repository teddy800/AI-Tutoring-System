# Bugfix Requirements Document

## Introduction

The AI-Powered Tutoring System has accumulated a set of critical bugs and structural deficiencies across its frontend (index.html / script.js / style.css), Python/Flask backend, and PHP backend that prevent it from functioning correctly in any environment beyond a narrow local development setup. These issues range from JavaScript TypeErrors that crash core features at runtime, to empty backend files that make entire API routes non-functional, to hardcoded secrets and credentials that make the system insecure by design. This document captures every defect that must be corrected to produce a production-ready, reliable, and secure system, along with the existing correct behaviors that must be preserved throughout the fix.

---

## Bug Analysis

### Current Behavior (Defect)

**Frontend — HTML Structure**

1.1 WHEN the page loads THEN the system has two elements sharing `id="content-upload"` (the `<section>` and the `<form>` inside it), causing `document.getElementById('content-upload')` and drag-and-drop setup to target the section element instead of the form, breaking upload and drag-and-drop behavior.

1.2 WHEN the content-repository section exists in the HTML THEN the system omits a navigation link to `#content-repo` in both the `<nav>` and the `.sidebar`, making the section permanently unreachable through the UI.

**Frontend — JavaScript Runtime Crashes**

1.3 WHEN the quiz timer reaches zero THEN the system calls `submitQuiz()` with no argument, causing `event.preventDefault()` inside `submitQuiz` to throw `TypeError: Cannot read properties of undefined (reading 'preventDefault')`, crashing quiz submission.

1.4 WHEN `DOMContentLoaded` fires THEN the system registers `loadData()` twice — once inside the main `DOMContentLoaded` block and once as a standalone `document.addEventListener('DOMContentLoaded', loadData)` at module scope — causing `loadData` to execute twice on every page load.

1.5 WHEN `loadData()` executes and attempts `window.mockCourses = data.courses` THEN the system does not update the `const mockCourses` binding used by `loadCourseSection` and `loadDashboard`, so those functions always use the original hardcoded mock data regardless of what the dataset contains.

1.6 WHEN the chat send button is wired up via `document.querySelector('.chat-input-group button')` THEN the system selects the first button in the group (the voice button `🎤`), not the Send button, so clicking Send has no effect and clicking the voice button sends the chat message instead.

1.7 WHEN `loadAnalytics()` is called more than once (e.g., navigating away and back to Analytics) THEN the system calls `new Chart(ctx, ...)` on a canvas that already has a Chart.js instance attached, producing a "Canvas is already in use" error and rendering a broken chart.

**Frontend — Navigation and Layout**

1.8 WHEN a user clicks any navigation link on desktop THEN the system calls `toggleSidebar()` unconditionally inside `showSection()`, toggling the sidebar open/closed on every nav click even when the sidebar is not visible, causing unexpected layout shifts on desktop.

**Frontend — External Resources**

1.9 WHEN the page initializes sounds via Howler.js THEN the system attempts to load audio from Pixabay CDN URLs that do not exist (e.g., `audio_d6c3b7c8b9.mp3`), causing all sound effects to silently fail with network 404 errors.

1.10 WHEN `setupRealTimeCollaboration()` runs THEN the system opens a WebSocket to the hardcoded address `ws://localhost:8080`, which fails in any non-local environment and has no graceful fallback, leaving the collaboration feature permanently broken in staging or production.

**Frontend — Button Selectors**

1.11 WHEN the upload form buttons are wired via `#content-upload button:last-child` and `#content-upload button:first-child` THEN the system uses fragile positional selectors that break if button order changes, and currently target the wrong element because `#content-upload` resolves to the section, not the form.

**Python Backend — Missing Imports and Empty Config**

1.12 WHEN any request reaches the `/api/analytics` endpoint THEN the system throws `NameError: name 'request' is not defined` because `analytics.py` imports `Blueprint, jsonify` but omits `request` from its Flask imports.

1.13 WHEN any Python blueprint attempts to import `db_config` from `config/db_config.py` THEN the system raises an `ImportError` or `KeyError` because `db_config.py` is an empty file containing no `db_config` dictionary.

1.14 WHEN the Python `api/` directory is treated as a package THEN the system may fail to discover blueprints because the package init file is named `init.py` instead of `__init__.py`, depending on how Flask resolves the import path.

**Python Backend — Logic Bugs**

1.15 WHEN the chatbot processes a message matching the pattern `what is (.*)` THEN the system returns the bound method object `"I'm not sure about {}, but I can help...".format` as the response string instead of calling it, because `.format` is referenced without being invoked with the captured group.

1.16 WHEN `SECRET_KEY = 'your-secret-key-12345'` is used in `quizzes.py` and `analytics.py` THEN the system uses a publicly known placeholder secret for JWT signing, making all tokens trivially forgeable.

1.17 WHEN any route in `courses.py`, `quizzes.py`, `repository.py`, or `analytics.py` handles a request THEN the system opens a new `mysql.connector` connection per request and closes it after, with no connection pooling, making the backend unable to sustain concurrent load.

**PHP Backend — Empty Files and Missing Auth**

1.18 WHEN the PHP router at `api.php` handles a login request THEN the system returns the user object directly with no JWT or session token, so the frontend has no credential to attach to subsequent authenticated requests.

1.19 WHEN `backend/php/api/auth.php`, `backend/php/api/content.php`, and `backend/php/api/feedback.php` are included or required THEN the system finds empty files, providing no route separation or modular structure.

1.20 WHEN `api.php` sets `Access-Control-Allow-Origin: *` THEN the system allows any origin to make cross-site requests, which is a security vulnerability in a production environment with authenticated endpoints.

1.21 WHEN the login endpoint in `api.php` receives repeated requests THEN the system applies no rate limiting, leaving the endpoint open to brute-force credential attacks.

**Architecture**

1.22 WHEN the frontend needs to make an API call THEN the system provides no environment configuration (.env or equivalent), so database credentials and API base URLs are hardcoded directly in source files across both backends.

1.23 WHEN the frontend calls any backend endpoint THEN the system uses only mock data — no actual `fetch` calls to either the PHP or Python backend are wired up — so no real data is ever read from or written to the database.

1.24 WHEN the system has both a PHP backend and a Python/Flask backend THEN there is no documented or enforced separation of responsibility between them, and the frontend has no configuration to know which backend to call for which feature.

---

### Expected Behavior (Correct)

**Frontend — HTML Structure**

2.1 WHEN the page loads THEN the system SHALL use a unique ID for the upload section (e.g., `id="content-upload-section"`) and a separate unique ID for the form (e.g., `id="content-upload-form"`), so all selectors resolve to the correct element.

2.2 WHEN the content-repository section exists in the HTML THEN the system SHALL include a navigation link to `#content-repo` in both the `<nav>` and the `.sidebar` so the section is reachable.

**Frontend — JavaScript Runtime Crashes**

2.3 WHEN the quiz timer reaches zero THEN the system SHALL call `submitQuiz` without an event argument by guarding the function: `if (event) event.preventDefault()` (or by splitting timer-triggered and form-triggered submission paths), so auto-submission completes without a TypeError.

2.4 WHEN `DOMContentLoaded` fires THEN the system SHALL register `loadData()` exactly once, either inside the main listener or as a standalone listener, not both.

2.5 WHEN `loadData()` executes and receives dataset data THEN the system SHALL update the variables used by all dependent functions (e.g., by using `let` instead of `const` for `mockCourses` and `mockQuizzes`, or by storing data on `state`), so subsequent calls to `loadCourseSection` and `loadDashboard` use the loaded data.

2.6 WHEN the chat send button is wired up THEN the system SHALL select the button by a stable identifier (e.g., `id="send-btn"` on the Send button) so the correct button is bound to `sendChat`.

2.7 WHEN `loadAnalytics()` is called THEN the system SHALL check for an existing Chart.js instance on the canvas (e.g., via `Chart.getChart(canvas)`) and destroy it before creating a new one, so repeated navigation to Analytics renders correctly.

**Frontend — Navigation and Layout**

2.8 WHEN a user clicks a navigation link THEN the system SHALL only call `toggleSidebar()` when the sidebar is currently open (i.e., has the `active` class), so desktop navigation does not cause unwanted sidebar toggling.

**Frontend — External Resources**

2.9 WHEN the page initializes sounds THEN the system SHALL use valid, resolvable audio file URLs (or bundle audio assets locally), so sound effects load and play without 404 errors.

2.10 WHEN `setupRealTimeCollaboration()` runs THEN the system SHALL read the WebSocket URL from a configurable source (e.g., a `window.APP_CONFIG.wsUrl` variable or environment-injected value) and SHALL handle connection failure gracefully by disabling the collaboration feature rather than throwing an unhandled error.

**Frontend — Button Selectors**

2.11 WHEN the upload form buttons are wired THEN the system SHALL use stable `id` attributes (e.g., `id="preview-btn"` and `id="upload-btn"`) on each button and select them by ID, so button wiring is not affected by DOM order.

**Python Backend — Missing Imports and Empty Config**

2.12 WHEN any request reaches the `/api/analytics` endpoint THEN the system SHALL successfully import `request` from Flask in `analytics.py` so `request.headers.get(...)` resolves without a NameError.

2.13 WHEN any Python blueprint imports `db_config` THEN the system SHALL find a populated `db_config.py` containing a valid `db_config` dictionary (reading credentials from environment variables), so database connections can be established.

2.14 WHEN the Python `api/` directory is treated as a package THEN the system SHALL have the init file named `__init__.py` so Python's import system correctly recognizes it as a package.

**Python Backend — Logic Bugs**

2.15 WHEN the chatbot processes a message matching `what is (.*)` THEN the system SHALL call `.format(group1)` with the captured group so the response is a properly interpolated string, not a method reference.

2.16 WHEN JWT tokens are signed and verified THEN the system SHALL read `SECRET_KEY` from an environment variable (e.g., `os.environ.get('SECRET_KEY')`) rather than using a hardcoded placeholder, so tokens cannot be forged using a publicly known key.

2.17 WHEN routes in the Python backend handle requests THEN the system SHALL use a connection pool (e.g., via `mysql.connector.pooling.MySQLConnectionPool` or SQLAlchemy's connection pool) so the backend can handle concurrent requests without exhausting database connections.

**PHP Backend — Empty Files and Missing Auth**

2.18 WHEN the PHP login endpoint handles a successful authentication THEN the system SHALL return a signed JWT (or a secure session token) alongside the user object, so the frontend can attach it to subsequent authenticated requests.

2.19 WHEN `backend/php/api/auth.php`, `backend/php/api/content.php`, and `backend/php/api/feedback.php` are loaded THEN the system SHALL contain the route logic for their respective domains, providing proper modular separation from the monolithic `api.php`.

2.20 WHEN `api.php` sets CORS headers THEN the system SHALL restrict `Access-Control-Allow-Origin` to a configurable allowlist of trusted origins rather than `*`, so cross-origin requests are limited to known clients.

2.21 WHEN the login endpoint receives repeated failed requests from the same IP THEN the system SHALL enforce rate limiting (e.g., lock out after N failures within a time window) to prevent brute-force attacks.

**Architecture**

2.22 WHEN the system is deployed THEN the system SHALL read all database credentials, API base URLs, secret keys, and environment-specific configuration from `.env` files (or equivalent environment variables) rather than hardcoded values in source files.

2.23 WHEN the frontend needs to call a backend endpoint THEN the system SHALL make real `fetch` calls to the appropriate backend URL for each feature (login → PHP, courses/quizzes/chatbot/analytics → Python Flask), replacing all mock-only code paths.

2.24 WHEN the system has both a PHP backend and a Python/Flask backend THEN the system SHALL have a documented and enforced API responsibility split (e.g., PHP handles auth/content/feedback; Python handles AI/courses/quizzes/analytics) and the frontend SHALL use a single configurable `API_BASE` per service.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user submits the login form with valid credentials THEN the system SHALL CONTINUE TO authenticate the user, set `state.currentUser`, and navigate to the dashboard section.

3.2 WHEN a user navigates between sections using nav or sidebar links THEN the system SHALL CONTINUE TO hide all other sections and show only the target section with the GSAP fade-in animation.

3.3 WHEN the theme toggle button is clicked THEN the system SHALL CONTINUE TO switch between dark and light themes, persist the choice to `localStorage`, and re-initialize particles.

3.4 WHEN the sidebar toggle button is clicked THEN the system SHALL CONTINUE TO open and close the sidebar with the GSAP slide animation.

3.5 WHEN a user submits the quiz form manually (by clicking Submit Quiz) THEN the system SHALL CONTINUE TO collect selected answers, calculate the score, award points, and display the result in the modal.

3.6 WHEN the quiz timer is running THEN the system SHALL CONTINUE TO count down from 60 seconds and display the remaining time in the `#timer` span.

3.7 WHEN a user types a message in the chat input and triggers send THEN the system SHALL CONTINUE TO append the user message to the chat container and display an AI response.

3.8 WHEN a tutor fills in the content upload form and submits THEN the system SHALL CONTINUE TO validate that both title and body are present before proceeding.

3.9 WHEN a user drags and drops a `.txt` file onto the upload area THEN the system SHALL CONTINUE TO read the file contents and populate the content body textarea.

3.10 WHEN the preview button is clicked with title and body filled in THEN the system SHALL CONTINUE TO render a preview of the content below the form.

3.11 WHEN the feedback form is submitted with a message THEN the system SHALL CONTINUE TO show a success toast and clear the message field.

3.12 WHEN the voice input button is clicked in a browser that supports SpeechRecognition THEN the system SHALL CONTINUE TO start recognition, populate the chat input with the transcript, and trigger send.

3.13 WHEN the browser goes offline THEN the system SHALL CONTINUE TO add the `offline` CSS class to `body`, update the user status indicator, and queue actions for later sync.

3.14 WHEN the analytics section is loaded by a tutor THEN the system SHALL CONTINUE TO render a bar chart of student progress using Chart.js.

3.15 WHEN the leaderboard is loaded THEN the system SHALL CONTINUE TO display a ranked list of users with their points.

3.16 WHEN a badge is awarded THEN the system SHALL CONTINUE TO append the badge element to `.badges`, animate it with GSAP, and play the badge sound.

3.17 WHEN the page loads THEN the system SHALL CONTINUE TO initialize particles.js, restore the saved theme from `localStorage`, and set up all event listeners within the `DOMContentLoaded` handler.

3.18 WHEN the Python Flask app starts THEN the system SHALL CONTINUE TO register all five blueprints (courses, quizzes, chatbot, analytics, repository) under the `/api` prefix.

3.19 WHEN the PHP `api.php` receives a valid `upload-content` or `feedback` action THEN the system SHALL CONTINUE TO insert the record into the database and award the corresponding points to the user.

3.20 WHEN the PHP `Database` class `connect()` method is called THEN the system SHALL CONTINUE TO return a valid `mysqli` connection using `utf8mb4` charset and throw a descriptive exception on failure.
