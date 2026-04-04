# Implementation Plan

- [ ] 1. Write bug condition exploration tests (BEFORE any fixes)
  - **Property 1: Bug Condition** - All 24 Defects Across Frontend, Python, and PHP
  - **CRITICAL**: Write and run ALL exploration tests BEFORE implementing any fix
  - **GOAL**: Surface counterexamples that confirm each bug exists; document root cause
  - **EXPECTED OUTCOME**: Every test below FAILS on unfixed code (this is correct)
  - **DO NOT attempt to fix the code when tests fail**

  - [ ] 1.1 Frontend JS exploration tests (run on unfixed script.js)
    - Assert `submitQuiz()` with no argument throws `TypeError: Cannot read properties of undefined (reading 'preventDefault')` (confirms bug 1.3)
    - Spy on `loadData`; fire `DOMContentLoaded`; assert call count equals 2 (confirms bug 1.4)
    - Call `loadData()` with `{ courses: [...], quizzes: [...] }`; assert `mockCourses` still equals original hardcoded array (confirms bug 1.5)
    - Assert `document.querySelector('.chat-input-group button')` has class `voice-btn` (confirms bug 1.6)
    - Call `loadAnalytics()` twice on same canvas; assert second call throws or logs "Canvas is already in use" (confirms bug 1.7)
    - Call `showSection('dashboard')` with sidebar closed; assert sidebar has `active` class after call (confirms bug 1.8)
    - Document counterexamples found for each assertion
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [ ] 1.2 Python backend exploration tests (run on unfixed Python files)
    - Import `analytics.py` and invoke the analytics route; assert `NameError: name 'request' is not defined` is raised (confirms bug 1.12)
    - Import `db_config` from `config/db_config.py`; assert the `db_config` dict is empty or raises `ImportError` (confirms bug 1.13)
    - Call `chatbot.respond('what is Python')`; assert `isinstance(response, str)` is `False` (response is a method reference) (confirms bug 1.15)
    - Document counterexamples found
    - _Requirements: 1.12, 1.13, 1.15_

  - [ ] 1.3 PHP backend exploration tests (run on unfixed api.php)
    - POST valid credentials to unfixed `api.php`; assert response JSON has no `token` key (confirms bug 1.18)
    - Send 10 consecutive failed login requests from same IP; assert all return HTTP 200 with no 429 (confirms bug 1.21)
    - Assert `Access-Control-Allow-Origin` response header equals `*` (confirms bug 1.20)
    - Document counterexamples found
    - _Requirements: 1.18, 1.20, 1.21_


- [ ] 2. Write preservation property tests (BEFORE implementing any fix)
  - **Property 2: Preservation** - All Unchanged Behaviors (Requirements 3.1–3.20)
  - **IMPORTANT**: Follow observation-first methodology — run unfixed code with non-buggy inputs, observe outputs, then write tests
  - **EXPECTED OUTCOME**: All tests PASS on unfixed code (confirms baseline to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code

  - [ ] 2.1 Manual quiz submission score accuracy (JS)
    - Observe: `submitQuiz(mockEvent)` with k correct answers returns `score = k * 50`, `pointsEarned = Math.round(k * 50 / 10)` on unfixed code
    - Write property-based test: for any array of answers with k correct items, score formula is unchanged
    - Verify test PASSES on unfixed code
    - _Requirements: 3.5_

  - [ ] 2.2 Section navigation and GSAP animation (JS)
    - Observe: `showSection(id)` hides all sections, shows target, fires GSAP fade-in on unfixed code
    - Write property-based test: for any valid sectionId, target section gets `active` class and GSAP is called
    - Verify test PASSES on unfixed code
    - _Requirements: 3.2_

  - [ ] 2.3 Theme toggle persistence (JS)
    - Observe: clicking theme toggle updates `localStorage.getItem('theme')` and re-initialises particles on unfixed code
    - Write test asserting localStorage is updated and particles re-init fires
    - Verify test PASSES on unfixed code
    - _Requirements: 3.3_

  - [ ] 2.4 Sidebar toggle button (JS)
    - Observe: clicking the dedicated sidebar toggle button opens/closes sidebar with GSAP slide on unfixed code
    - Write test asserting `active` class toggles correctly when toggle button is clicked directly
    - Verify test PASSES on unfixed code
    - _Requirements: 3.4_

  - [ ] 2.5 Feedback form success toast (JS)
    - Observe: submitting feedback form with a message shows success toast and clears message field on unfixed code
    - Write test asserting toast appears and field is cleared
    - Verify test PASSES on unfixed code
    - _Requirements: 3.11_

  - [ ] 2.6 Flask blueprint registration (Python)
    - Observe: Flask app registers all five blueprints (courses, quizzes, chatbot, analytics, repository) under `/api` on unfixed code
    - Write test asserting each blueprint route returns a response (not 404)
    - Verify test PASSES on unfixed code
    - _Requirements: 3.18_

  - [ ] 2.7 PHP upload-content and feedback point awards (PHP)
    - Observe: `upload-content` action inserts record and awards +10 points; `feedback` action inserts record and awards +2 points on unfixed code
    - Write tests asserting DB record created and points incremented correctly
    - Verify tests PASS on unfixed code
    - _Requirements: 3.19_

  - [ ] 2.8 PHP Database::connect() charset (PHP)
    - Observe: `Database::connect()` returns valid `mysqli` with `utf8mb4` charset on unfixed code
    - Write test asserting connection is valid and charset is `utf8mb4`
    - Verify test PASSES on unfixed code
    - _Requirements: 3.20_


- [ ] 3. Python backend fixes (config and infrastructure first)

  - [ ] 3.1 Rename `init.py` → `__init__.py` in `backend/python/api/`
    - Rename `backend/python/api/init.py` to `backend/python/api/__init__.py`
    - Verify Flask blueprint discovery works after rename
    - _Bug_Condition: isBugCondition({ type: "init-py-name" }) — api/ not recognized as package_
    - _Expected_Behavior: Python import system recognizes api/ as a package_
    - _Requirements: 2.14_

  - [ ] 3.2 Populate `backend/python/config/db_config.py` with env-based config and connection pool
    - Add `python-dotenv` import and `load_dotenv()` call
    - Define `db_config` dict reading `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `os.environ`
    - Add `pool_name` and `pool_size` keys to `db_config`
    - Implement `get_pool()` function using `mysql.connector.pooling.MySQLConnectionPool`
    - _Bug_Condition: isBugCondition({ type: "empty-db-config" }) — db_config dict is empty_
    - _Expected_Behavior: expectedBehavior — db_config contains host, user, password, database, pool_name; get_pool() returns a pool_
    - _Preservation: All blueprint routes that previously called mysql.connector.connect() continue to connect successfully_
    - _Requirements: 2.13, 2.17, 2.22_

  - [ ] 3.3 Add `python-dotenv` to `backend/python/requirements.txt`
    - Add `python-dotenv==1.0.1` to requirements.txt
    - Verify full requirements list: flask, flask-cors, mysql-connector-python, nltk, python-jose, python-dotenv
    - _Requirements: 2.22_

  - [ ] 3.4 Fix `analytics.py` missing `request` import
    - Change `from flask import Blueprint, jsonify` to `from flask import Blueprint, request, jsonify`
    - Verify `/api/analytics` route no longer raises `NameError`
    - _Bug_Condition: isBugCondition({ type: "analytics-missing-request" }) — 'request' not in imports_
    - _Expected_Behavior: expectedBehavior — route reads Authorization header without NameError_
    - _Requirements: 2.12_

  - [ ] 3.5 Fix `SECRET_KEY` to read from environment in `quizzes.py` and `analytics.py`
    - Replace `SECRET_KEY = 'your-secret-key-12345'` with `os.environ['SECRET_KEY']` in both files
    - Add `import os` and `from dotenv import load_dotenv; load_dotenv()` to both files
    - _Bug_Condition: isBugCondition({ type: "hardcoded-secret" }) — SECRET_KEY equals placeholder string_
    - _Expected_Behavior: expectedBehavior — SECRET_KEY is read from environment, never hardcoded_
    - _Requirements: 2.16, 2.22_

  - [ ] 3.6 Update all Python blueprint routes to use connection pool
    - In `courses.py`, `quizzes.py`, `repository.py`, `analytics.py`, `chatbot.py`: replace `mysql.connector.connect(**db_config)` with `get_pool().get_connection()`
    - Wrap each connection usage in `try/finally` with `conn.close()` in the `finally` block
    - _Bug_Condition: isBugCondition({ type: "no-connection-pool" }) — new connection opened per request_
    - _Expected_Behavior: expectedBehavior — connections returned to pool after each request_
    - _Preservation: All route responses remain identical; DB queries unchanged_
    - _Requirements: 2.17_

  - [ ] 3.7 Fix chatbot `.format` not called bug in `chatbot.py`
    - Replace `"I'm not sure about {}, but I can help with general questions!".format` with `lambda matches: f"I'm not sure about {matches[0]}, but I can help with general questions!"`
    - Apply same lambda pattern to any other NLTK pairs entries that use `.format` without calling it
    - _Bug_Condition: isBugCondition({ type: "chatbot-format-not-called" }) — response is method reference not string_
    - _Expected_Behavior: expectedBehavior — typeof response === 'string' for all chat inputs_
    - _Requirements: 2.15_

  - [ ] 3.8 Fix `app.py` CORS to read `ALLOWED_ORIGIN` from environment
    - Replace hardcoded `"http://localhost"` with `os.environ.get('ALLOWED_ORIGIN', 'http://localhost')`
    - Add `load_dotenv()` call at app startup
    - _Requirements: 2.22_

  - [ ] 3.9 Create `backend/python/.env.example` documenting required environment variables
    - Include: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SECRET_KEY`, `ALLOWED_ORIGIN`
    - Add `backend/python/.env` to `.gitignore`
    - _Requirements: 2.22_


- [ ] 4. PHP backend fixes

  - [ ] 4.1 Update `backend/php/config/database.php` to read credentials from `.env`
    - Add `require_once __DIR__ . '/../vendor/autoload.php'`
    - Load `.env` via `Dotenv\Dotenv::createImmutable(__DIR__ . '/..')`
    - Update `Database` constructor to read `$_ENV['DB_HOST']`, `$_ENV['DB_USER']`, `$_ENV['DB_PASSWORD']`, `$_ENV['DB_NAME']`
    - Preserve `connect()` method: returns valid `mysqli` with `utf8mb4` charset, throws descriptive exception on failure
    - _Bug_Condition: isBugCondition({ type: "hardcoded-db-credentials" }) — credentials hardcoded in source_
    - _Expected_Behavior: expectedBehavior — credentials read from .env_
    - _Preservation: Database::connect() still returns valid mysqli with utf8mb4 charset (requirement 3.20)_
    - _Requirements: 2.22, 3.20_

  - [ ] 4.2 Populate `backend/php/api/auth.php` with JWT login handler
    - Implement `handleLogin(\mysqli $db): void` function
    - Use prepared statement to SELECT user by username
    - Verify password with `password_verify()`
    - On success: sign JWT with `$_ENV['JWT_SECRET']` using `firebase/php-jwt`, payload includes `id`, `username`, `user_type`, `iat`, `exp` (now+3600)
    - Return `{ success, token, user: { id, username, user_type, points, streak } }`
    - On failure: return HTTP 401 with `{ success: false, error: 'Invalid credentials' }`
    - _Bug_Condition: isBugCondition({ type: "login-no-jwt" }) — login response has no token field_
    - _Expected_Behavior: expectedBehavior — response.token is a non-empty JWT string_
    - _Preservation: Invalid credentials still return { success: false } with no token (requirement 3.1)_
    - _Requirements: 2.18, 2.19, 3.1_

  - [ ] 4.3 Populate `backend/php/api/content.php` with upload handler
    - Implement `handleUploadContent(\mysqli $db): void` function
    - Validate `title` and `body` are present; return HTTP 400 if missing
    - INSERT into `content` table using prepared statement
    - On success: UPDATE `users SET points = points + 10` for `uploaded_by`
    - Return `{ success: true }` on success, `{ success: false, error }` on DB error
    - _Bug_Condition: isBugCondition({ type: "empty-php-modules" }) — content.php is empty_
    - _Preservation: upload-content action still inserts record and awards +10 points (requirement 3.19)_
    - _Requirements: 2.19, 3.19_

  - [ ] 4.4 Populate `backend/php/api/feedback.php` with feedback handler
    - Implement `handleFeedback(\mysqli $db): void` function
    - Validate `message` is present; return HTTP 400 if missing
    - INSERT into `feedback` table using prepared statement
    - On success: UPDATE `users SET points = points + 2` for `user_id`
    - Return `{ success: true }` on success, `{ success: false, error }` on DB error
    - _Bug_Condition: isBugCondition({ type: "empty-php-modules" }) — feedback.php is empty_
    - _Preservation: feedback action still inserts record and awards +2 points (requirement 3.19)_
    - _Requirements: 2.19, 3.19_

  - [ ] 4.5 Fix CORS wildcard in `api.php` — restrict to allowlist
    - Replace `header('Access-Control-Allow-Origin: *')` with origin-matching logic
    - Read `$_ENV['ALLOWED_ORIGIN']`; compare to `$_SERVER['HTTP_ORIGIN']`; set header only on exact match
    - Add `Vary: Origin` header when origin matches
    - _Bug_Condition: isBugCondition({ type: "cors-wildcard" }) — Access-Control-Allow-Origin equals '*'_
    - _Expected_Behavior: expectedBehavior — header is set only for trusted origin_
    - _Requirements: 2.20_

  - [ ] 4.6 Add rate limiting to login action in `api.php`
    - Implement `checkRateLimit(string $ip): bool` using APCu (or file-based fallback)
    - Key: `"login_attempts_{$ip}"`; read `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW` from `$_ENV`
    - Return `false` (blocked) when attempt count ≥ max; increment and store with TTL otherwise
    - In login action: call `checkRateLimit($_SERVER['REMOTE_ADDR'])`; return HTTP 429 if blocked
    - _Bug_Condition: isBugCondition({ type: "no-rate-limit" }) — N failed logins all return 200_
    - _Expected_Behavior: expectedBehavior — (RATE_LIMIT_MAX+1)th attempt returns HTTP 429_
    - _Requirements: 2.21_

  - [ ] 4.7 Wire `api.php` to include `auth.php`, `content.php`, `feedback.php` and route actions
    - Add `require_once` for each module file
    - Route `action=login` → `handleLogin($db)`
    - Route `action=upload-content` → `handleUploadContent($db)`
    - Route `action=feedback` → `handleFeedback($db)`
    - _Requirements: 2.19_

  - [ ] 4.8 Update `Datasets/composer.json` with required PHP dependencies
    - Add `"vlucas/phpdotenv": "^5.6"` and `"firebase/php-jwt": "^6.10"` to `require`
    - _Requirements: 2.18, 2.22_

  - [ ] 4.9 Create `backend/php/.env.example` documenting required environment variables
    - Include: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`
    - Add `backend/php/.env` to `.gitignore`
    - _Requirements: 2.22_


- [ ] 5. Frontend HTML fixes (`index.html`)

  - [ ] 5.1 Fix duplicate `id="content-upload"` — rename section and form IDs
    - Change `<section id="content-upload">` to `<section id="content-upload-section">`
    - Change `<form id="content-upload">` to `<form id="content-upload-form">`
    - Verify `document.querySelectorAll('[id="content-upload"]').length === 0` after fix
    - _Bug_Condition: isBugCondition({ type: "duplicate-id" }) — querySelectorAll('#content-upload').length > 1_
    - _Expected_Behavior: expectedBehavior — each ID is unique; getElementById resolves to correct element_
    - _Preservation: Drag-and-drop and upload form continue to work (requirements 3.8, 3.9)_
    - _Requirements: 2.1, 3.8, 3.9_

  - [ ] 5.2 Add `id="send-btn"` to the chat Send button
    - Locate the Send button inside `.chat-input-group` and add `id="send-btn"`
    - Ensure the voice button (`🎤`) does NOT have `id="send-btn"`
    - _Bug_Condition: isBugCondition({ type: "wrong-chat-button" }) — querySelector returns voice button_
    - _Requirements: 2.6_

  - [ ] 5.3 Add `id="preview-btn"` and `id="upload-btn"` to upload form buttons
    - Add `id="preview-btn"` to the Preview button inside the upload form
    - Add `id="upload-btn"` to the Upload/Submit button inside the upload form
    - _Bug_Condition: isBugCondition({ type: "fragile-upload-selectors" }) — positional selectors break on reorder_
    - _Requirements: 2.11_

  - [ ] 5.4 Add `#content-repo` navigation links to `<nav>` and `.sidebar`
    - Add `<a href="#content-repo">Repository</a>` (or equivalent nav item) to the main `<nav>`
    - Add the same link to the `.sidebar` element
    - _Bug_Condition: isBugCondition({ type: "missing-nav-link" }) — querySelector('a[href="#content-repo"]') is null_
    - _Expected_Behavior: expectedBehavior — content-repo section is reachable via nav and sidebar_
    - _Requirements: 2.2_


- [ ] 6. Frontend JavaScript fixes (`script.js`)

  - [ ] 6.1 Add `APP_CONFIG` object to `script.js` (or inject before script.js)
    - Add `window.APP_CONFIG = { phpBase: '/php-api', pyBase: '/py-api', wsUrl: null }` at the top of script.js (or in a preceding `<script>` block in index.html)
    - Document that `phpBase`, `pyBase`, and `wsUrl` must be overridden per environment
    - _Bug_Condition: isBugCondition({ type: "no-app-config" }) — APP_CONFIG is undefined_
    - _Requirements: 2.10, 2.24_

  - [ ] 6.2 Fix `submitQuiz` event guard (timer-safe submission)
    - Change `event.preventDefault()` to `if (event) event.preventDefault()` at the top of `submitQuiz`
    - Verify timer-triggered call `submitQuiz()` (no argument) completes without TypeError
    - _Bug_Condition: isBugCondition({ type: "submit-quiz-no-event" }) — calledFromTimer=true AND event=undefined_
    - _Expected_Behavior: expectedBehavior — quiz auto-submits silently with correct score_
    - _Preservation: Manual submitQuiz(event) still calls event.preventDefault() (requirement 3.5)_
    - _Requirements: 2.3, 3.5_

  - [ ] 6.3 Remove duplicate `loadData` DOMContentLoaded registration
    - Remove the standalone `document.addEventListener('DOMContentLoaded', loadData)` at module scope
    - Ensure `loadData()` is called exactly once inside the main `DOMContentLoaded` handler
    - _Bug_Condition: isBugCondition({ type: "double-loaddata" }) — count(DOMContentLoaded listeners calling loadData) > 1_
    - _Expected_Behavior: expectedBehavior — loadData fires exactly once per page load_
    - _Preservation: DOMContentLoaded still initialises particles, restores theme, sets up all listeners (requirement 3.17)_
    - _Requirements: 2.4, 3.17_

  - [ ] 6.4 Change `const mockCourses` and `const mockQuizzes` to `let`
    - Replace `const mockCourses = [...]` with `let mockCourses = [...]`
    - Replace `const mockQuizzes = [...]` with `let mockQuizzes = [...]`
    - In `loadData()`, assign `mockCourses = data.courses` and `mockQuizzes = data.quizzes` (not `window.mockCourses`)
    - _Bug_Condition: isBugCondition({ type: "const-mock-data" }) — window.mockCourses !== mockCourses_
    - _Expected_Behavior: expectedBehavior — loadCourseSection and loadDashboard use loaded data_
    - _Requirements: 2.5_

  - [ ] 6.5 Fix chat button selector to use `id="send-btn"`
    - Replace `document.querySelector('.chat-input-group button')` with `document.getElementById('send-btn')`
    - Verify Send button fires `sendChat`; voice button fires voice input
    - _Bug_Condition: isBugCondition({ type: "wrong-chat-button" }) — querySelector returns voice button_
    - _Expected_Behavior: expectedBehavior — getElementById('send-btn') returns Send button_
    - _Preservation: Voice input button still starts SpeechRecognition (requirement 3.12)_
    - _Requirements: 2.6, 3.12_

  - [ ] 6.6 Fix Chart.js canvas reuse — destroy before recreate in `loadAnalytics()`
    - Before `new Chart(ctx, ...)`, call `const existing = Chart.getChart(canvas); if (existing) existing.destroy()`
    - Verify two sequential calls to `loadAnalytics()` render correctly without error
    - _Bug_Condition: isBugCondition({ type: "chart-reuse" }) — Chart.getChart(canvas) != null AND new Chart called without destroy_
    - _Expected_Behavior: expectedBehavior — chart re-renders correctly on every call_
    - _Preservation: Analytics bar chart still renders for tutors (requirement 3.14)_
    - _Requirements: 2.7, 3.14_

  - [ ] 6.7 Fix conditional sidebar toggle in `showSection()`
    - Replace unconditional `toggleSidebar()` call with: `const sidebar = document.querySelector('.sidebar'); if (sidebar && sidebar.classList.contains('active')) toggleSidebar()`
    - Verify desktop nav clicks do not open the sidebar
    - _Bug_Condition: isBugCondition({ type: "unconditional-sidebar-toggle" }) — sidebar toggled even when not active_
    - _Expected_Behavior: expectedBehavior — sidebar only closed if it was open_
    - _Preservation: Sidebar toggle button still opens/closes sidebar (requirement 3.4); GSAP animation still fires (requirement 3.2)_
    - _Requirements: 2.8, 3.2, 3.4_

  - [ ] 6.8 Fix WebSocket URL to use `APP_CONFIG.wsUrl` with graceful fallback
    - In `setupRealTimeCollaboration()`: read `const wsUrl = window.APP_CONFIG?.wsUrl`
    - If `wsUrl` is falsy, log warning and return early (disable collaboration silently)
    - Wrap `new WebSocket(wsUrl)` in try/catch; on error, log warning and set `ws = null`
    - Add `ws.onerror` handler that disables collaboration without throwing
    - _Bug_Condition: isBugCondition({ type: "hardcoded-ws-url" }) — WebSocket opened to ws://localhost:8080_
    - _Expected_Behavior: expectedBehavior — wsUrl read from APP_CONFIG; failure handled gracefully_
    - _Requirements: 2.10_

  - [ ] 6.9 Fix sound URLs — replace broken Pixabay CDN URLs with local asset paths
    - Replace all Pixabay CDN URLs in `initializeSounds()` with local paths: `assets/audio/toggle.mp3`, `assets/audio/click.mp3`, `assets/audio/success.mp3`, `assets/audio/error.mp3`, `assets/audio/badge.mp3`
    - Add `onloaderror` handler to each Howl instance: log warning and replace with silent fallback `{ play: () => {} }`
    - _Bug_Condition: isBugCondition({ type: "broken-sound-urls" }) — Pixabay URLs return 404_
    - _Expected_Behavior: expectedBehavior — sounds load from local assets; 404 handled gracefully_
    - _Preservation: Badge award still plays badge sound when audio is available (requirement 3.16)_
    - _Requirements: 2.9, 3.16_

  - [ ] 6.10 Fix upload button selectors to use stable IDs
    - Replace `document.querySelector('#content-upload button:last-child')` with `document.getElementById('upload-btn')`
    - Replace `document.querySelector('#content-upload button:first-child')` with `document.getElementById('preview-btn')`
    - _Bug_Condition: isBugCondition({ type: "fragile-upload-selectors" }) — positional selectors target wrong element_
    - _Expected_Behavior: expectedBehavior — upload and preview buttons wired by stable ID_
    - _Preservation: Preview renders content below form; upload validates title+body (requirements 3.8, 3.10)_
    - _Requirements: 2.11, 3.8, 3.10_


- [ ] 7. Integration wiring — real fetch calls replacing mock-only code paths

  - [ ] 7.1 Wire login to PHP backend
    - In `login()` (or equivalent auth handler): replace mock auth with `fetch(\`${APP_CONFIG.phpBase}?action=login\`, { method: 'POST', ... })`
    - On success: store `state.token = data.token`, `state.currentUser`, `state.userType`, `state.points`, `state.streak`
    - On failure: show error message
    - _Bug_Condition: isBugCondition({ type: "mock-only-frontend" }) — no fetch call to PHP login_
    - _Preservation: Successful login still sets state.currentUser and navigates to dashboard (requirement 3.1)_
    - _Requirements: 2.23, 2.24, 3.1_

  - [ ] 7.2 Wire course loading to Python backend
    - In `loadCourseSection()`: add `fetch(\`${APP_CONFIG.pyBase}/api/courses\`, { headers: { Authorization: \`Bearer ${state.token}\` } })`
    - Assign `mockCourses = data.courses || mockCourses` so UI falls back to mock data if fetch fails
    - _Requirements: 2.23, 2.24_

  - [ ] 7.3 Wire quiz loading to Python backend
    - In `loadQuizSection()` (or equivalent): add `fetch(\`${APP_CONFIG.pyBase}/api/quizzes\`, { headers: { Authorization: \`Bearer ${state.token}\` } })`
    - Assign `mockQuizzes = data.quizzes || mockQuizzes`
    - _Requirements: 2.23, 2.24_

  - [ ] 7.4 Wire chat to Python backend
    - In `sendChat()`: replace mock AI response with `fetch(\`${APP_CONFIG.pyBase}/api/chat\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${state.token}\` }, body: JSON.stringify({ message }) })`
    - Display `data.response` as the AI message
    - _Preservation: Chat still appends user message and AI response to #chat-container (requirement 3.7)_
    - _Requirements: 2.23, 2.24, 3.7_

  - [ ] 7.5 Wire analytics to Python backend
    - In `loadAnalytics()`: add `fetch(\`${APP_CONFIG.pyBase}/api/analytics\`, { headers: { Authorization: \`Bearer ${state.token}\` } })`
    - Use `data.students` and `data.progress` to populate Chart.js bar chart
    - _Preservation: Analytics bar chart still renders for tutors (requirement 3.14)_
    - _Requirements: 2.23, 2.24, 3.14_

  - [ ] 7.6 Wire content upload to PHP backend
    - In `uploadContent()` (or upload form submit handler): add `fetch(\`${APP_CONFIG.phpBase}?action=upload-content\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${state.token}\` }, body: JSON.stringify({ title, body, uploaded_by: state.userId }) })`
    - _Preservation: Upload still validates title+body before proceeding (requirement 3.8)_
    - _Requirements: 2.23, 2.24, 3.8_

  - [ ] 7.7 Wire feedback submission to PHP backend
    - In `submitFeedback()`: add `fetch(\`${APP_CONFIG.phpBase}?action=feedback\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${state.token}\` }, body: JSON.stringify({ user_id: state.userId, type, message }) })`
    - _Preservation: Feedback form still shows success toast and clears message field (requirement 3.11)_
    - _Requirements: 2.23, 2.24, 3.11_

  - [ ] 7.8 Wire repository to Python backend
    - In `loadRepositorySection()` (or equivalent): add `fetch(\`${APP_CONFIG.pyBase}/api/repository\`, { headers: { Authorization: \`Bearer ${state.token}\` } })`
    - _Requirements: 2.23, 2.24_


- [ ] 8. Fix verification — run exploration tests against fixed code

  - [ ] 8.1 Verify bug condition exploration test now passes (JS bugs)
    - **Property 1: Expected Behavior** - All Frontend JS Bug Conditions Resolved
    - **IMPORTANT**: Re-run the SAME tests from task 1.1 — do NOT write new tests
    - `submitQuiz()` with no argument → no TypeError, modal shown with score
    - `loadData()` call count after DOMContentLoaded → exactly 1
    - `mockCourses` binding updated after `loadData()` with new data
    - `document.getElementById('send-btn')` → non-null, not voice button
    - Two calls to `loadAnalytics()` → no error, chart renders on second call
    - `showSection('dashboard')` with sidebar closed → sidebar remains closed
    - **EXPECTED OUTCOME**: All tests PASS (confirms JS bugs are fixed)
    - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ] 8.2 Verify bug condition exploration test now passes (Python bugs)
    - **Property 1: Expected Behavior** - All Python Backend Bug Conditions Resolved
    - **IMPORTANT**: Re-run the SAME tests from task 1.2 — do NOT write new tests
    - `analytics.py` route with valid JWT → returns `{ success: true, students, progress }` without NameError
    - `db_config` import → dict with all required keys (`host`, `user`, `password`, `database`, `pool_name`), values from env
    - `chatbot.respond('what is Python')` → `isinstance(response, str)` is `True`
    - **EXPECTED OUTCOME**: All tests PASS (confirms Python bugs are fixed)
    - _Requirements: 2.12, 2.13, 2.15_

  - [ ] 8.3 Verify bug condition exploration test now passes (PHP bugs)
    - **Property 1: Expected Behavior** - All PHP Backend Bug Conditions Resolved
    - **IMPORTANT**: Re-run the SAME tests from task 1.3 — do NOT write new tests
    - POST valid credentials → response contains valid JWT `token` field
    - 6th failed login from same IP → HTTP 429
    - `Access-Control-Allow-Origin` header is NOT `*` for untrusted origins
    - **EXPECTED OUTCOME**: All tests PASS (confirms PHP bugs are fixed)
    - _Requirements: 2.18, 2.20, 2.21_

  - [ ] 8.4 Verify preservation tests still pass after all fixes
    - **Property 2: Preservation** - No Regressions Across All 20 Unchanged Behaviors
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation tests from tasks 2.1–2.8
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm requirements 3.1–3.20 are all satisfied


- [ ] 9. Property-based tests for all 10 correctness properties

  - [ ] 9.1 Property 1 — Timer-safe quiz submission (JS, fast-check)
    - For any call `submitQuiz(x)` where `x` is `undefined` or a valid Event object, assert no TypeError is thrown
    - Scope: generate `x` as `undefined | MockEvent`
    - Validates: Requirements 2.3
    - _Requirements: 2.3_

  - [ ] 9.2 Property 2 — Quiz score accuracy (JS, fast-check)
    - For any array of answers where `answers[i].answer === mockQuizzes[i].correctAnswer` for k items, assert `score === k * 50` and `pointsEarned === Math.round(k * 50 / 10)`
    - Generate: random answer arrays of length 1–10 with random correct/incorrect selections
    - Validates: Requirements 3.5
    - _Requirements: 3.5_

  - [ ] 9.3 Property 3 — Chart.js canvas reuse (JS, fast-check)
    - For any N ≥ 1 sequential calls to `loadAnalytics()`, assert no exception is thrown and `Chart.getChart(canvas)` is non-null after each call
    - Generate: N in range 1–10
    - Validates: Requirements 2.7
    - _Requirements: 2.7_

  - [ ] 9.4 Property 4 — Navigation state machine (JS, fast-check)
    - For any sequence of `showSection(id)` calls, assert sidebar is open after call iff it was open before AND the call closed it (i.e. sidebar state only changes via direct `toggleSidebar()`)
    - Generate: random sequences of sectionId strings and initial sidebar states
    - Validates: Requirements 2.8, 3.2, 3.4
    - _Requirements: 2.8, 3.2, 3.4_

  - [ ] 9.5 Property 5 — Chatbot response type (Python, Hypothesis)
    - For any message string, `chatbot.respond(msg)` returns either `None` or a `str` — never a function reference
    - Generate: arbitrary strings including `"what is ..."` patterns
    - Validates: Requirements 2.15
    - _Requirements: 2.15_

  - [ ] 9.6 Property 6 — JWT token validity on login (PHP, property-based)
    - For any valid `{ username, password }` pair, `JWT::decode(response.token, JWT_SECRET, ['HS256'])` succeeds and payload contains `id`, `username`, `user_type`
    - Generate: valid credential pairs from test fixtures
    - Validates: Requirements 2.18
    - _Requirements: 2.18_

  - [ ] 9.7 Property 7 — JWT token rejection for invalid credentials (PHP, property-based)
    - For any login request with invalid credentials, response is `{ success: false }` with no `token` field
    - Generate: random username/password pairs that do not match any user
    - Validates: Requirements 3.1
    - _Requirements: 3.1_

  - [ ] 9.8 Property 8 — Rate limiting (PHP, property-based)
    - For any IP address and any N > `RATE_LIMIT_MAX` failed attempts within the window, the (N+1)th attempt returns HTTP 429
    - For any N ≤ `RATE_LIMIT_MAX` failed attempts, endpoint returns HTTP 200 with `{ success: false }`
    - Generate: N in range 1–20, random IP strings
    - Validates: Requirements 2.21
    - _Requirements: 2.21_

  - [ ] 9.9 Property 9 — db_config completeness (Python, Hypothesis)
    - For any environment where all required env vars are set, `db_config` contains non-empty string values for `host`, `user`, `password`, `database`, `pool_name`
    - Generate: random valid env var values
    - Validates: Requirements 2.13, 2.17, 2.22
    - _Requirements: 2.13, 2.17, 2.22_

  - [ ] 9.10 Property 10 — API response shape stability (Python, Hypothesis)
    - For any valid JWT and any GET request to `/api/courses`, `/api/quizzes`, `/api/analytics`, or `/api/repository`, response JSON contains `{ "success": true }` at the top level
    - Generate: valid JWT tokens, random route selection
    - Validates: Requirements 3.18
    - _Requirements: 3.18_


- [ ] 10. Integration tests for full end-to-end flows

  - [ ] 10.1 Full login → dashboard flow
    - POST `/php-api?action=login` with valid credentials → receive JWT token
    - GET `/py-api/api/courses` with `Authorization: Bearer <token>` → courses rendered in UI
    - Assert `state.currentUser` is set and dashboard section is visible
    - _Requirements: 2.23, 2.24, 3.1_

  - [ ] 10.2 Analytics flow (tutor)
    - Login as tutor → navigate to Analytics section
    - GET `/py-api/api/analytics` with JWT → Chart.js bar chart rendered without error
    - Navigate away and back → chart re-renders correctly (no "Canvas already in use")
    - _Requirements: 2.7, 3.14_

  - [ ] 10.3 Chat flow
    - Login → type message in chat input → click Send button (not voice button)
    - POST `/py-api/api/chat` with message → AI response appended to `#chat-container`
    - Assert user message and AI response both visible in container
    - _Requirements: 2.6, 2.23, 3.7_

  - [ ] 10.4 Content upload flow (tutor)
    - Login as tutor → fill upload form with title and body → click Upload button
    - POST `/php-api?action=upload-content` → success toast shown
    - Assert record inserted in DB and user points incremented by 10
    - _Requirements: 2.23, 3.8, 3.19_

  - [ ] 10.5 Feedback submission flow
    - Login → fill feedback form with message → submit
    - POST `/php-api?action=feedback` → success toast shown, message field cleared
    - Assert record inserted in DB and user points incremented by 2
    - _Requirements: 2.23, 3.11, 3.19_

  - [ ] 10.6 Rate limit integration
    - Send `RATE_LIMIT_MAX + 1` failed login requests from same IP
    - Assert first `RATE_LIMIT_MAX` requests return HTTP 200 with `{ success: false }`
    - Assert (RATE_LIMIT_MAX + 1)th request returns HTTP 429
    - _Requirements: 2.21_

  - [ ] 10.7 WebSocket disabled gracefully
    - Set `APP_CONFIG.wsUrl = null` → call `setupRealTimeCollaboration()`
    - Assert no exception thrown and collaboration UI is hidden/disabled
    - _Requirements: 2.10_

  - [ ] 10.8 Offline → online sync
    - Go offline (simulate `navigator.onLine = false`) → submit feedback (action queued)
    - Go online → `syncOfflineData()` replays queued request
    - Assert `body` has `offline` class while offline; class removed when online
    - _Requirements: 3.13_

  - [ ] 10.9 Theme persistence across reload
    - Toggle theme → assert `localStorage.getItem('theme')` is updated
    - Simulate page reload (re-run DOMContentLoaded handler) → assert correct theme restored and particles re-initialised
    - _Requirements: 3.3, 3.17_

  - [ ] 10.10 Sidebar desktop navigation
    - On desktop viewport (sidebar closed, no `active` class) → click nav link
    - Assert sidebar does NOT gain `active` class after navigation
    - Assert target section is shown with GSAP fade-in
    - _Requirements: 2.8, 3.2_

- [ ] 11. Checkpoint — Ensure all tests pass
  - Run all property-based tests (tasks 9.1–9.10) and assert all pass
  - Run all integration tests (tasks 10.1–10.10) and assert all pass
  - Run all preservation tests (task 8.4) and assert all pass
  - Confirm no regressions against requirements 3.1–3.20
  - Ask the user if any questions arise before closing the spec
