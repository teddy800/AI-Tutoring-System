# AI-Powered Tutoring System Overhaul — Bugfix Design

## Overview

The AI-Powered Tutoring System suffers from 24 distinct defects spanning the frontend
(index.html / script.js), the Python/Flask backend, and the PHP backend. These defects
range from JavaScript TypeErrors that crash core features at runtime, to empty backend
files that make entire API routes non-functional, to hardcoded secrets that make the
system insecure by design.

This design document formalises the bug condition for each defect, specifies the exact
changes required to fix them, defines correctness properties for property-based testing,
and documents the data-flow and security architecture of the fully-repaired system.

The fix strategy is **minimal and targeted**: every change is scoped to the smallest
possible diff that eliminates the defect without altering unaffected behaviour.

---

## Glossary

- **Bug_Condition (C)**: A predicate over an input or system state that returns `true`
  when the defect is triggered.
- **Property (P)**: The desired post-condition that must hold for every input where C is
  true after the fix is applied.
- **Preservation**: The guarantee that for every input where C is false, the fixed code
  produces the same observable result as the original code.
- **F**: The original (unfixed) function or module.
- **F'**: The fixed function or module.
- **isBugCondition(x)**: Pseudocode predicate that identifies buggy inputs.
- **expectedBehavior(result)**: Pseudocode predicate that asserts the correct output.
- **PHP_BASE**: The configurable base URL for the PHP backend (auth / content / feedback).
- **PY_BASE**: The configurable base URL for the Python/Flask backend (AI / courses /
  quizzes / analytics / repository).
- **JWT**: JSON Web Token — a signed, compact credential returned by the PHP login
  endpoint and attached as `Authorization: Bearer <token>` on subsequent requests.
- **Connection Pool**: A pre-allocated set of reusable database connections managed by
  `mysql.connector.pooling.MySQLConnectionPool`.
- **Rate-Limit Window**: A fixed time interval (e.g. 60 seconds) during which failed
  login attempts from a single IP are counted.

---

## Architecture Overview

### Responsibility Split

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Frontend)                       │
│  index.html  ·  script.js  ·  style.css                        │
│                                                                 │
│  window.APP_CONFIG = {                                          │
│    phpBase:  '/php-api',   // proxied or direct PHP URL         │
│    pyBase:   '/py-api',    // proxied or direct Flask URL       │
│    wsUrl:    'wss://...'   // WebSocket URL (optional)          │
│  }                                                              │
└────────────────┬────────────────────────┬───────────────────────┘
                 │                        │
        PHP_BASE │                        │ PY_BASE
                 ▼                        ▼
┌────────────────────────┐   ┌────────────────────────────────────┐
│   PHP Backend          │   │   Python / Flask Backend           │
│   backend/php/         │   │   backend/python/                  │
│                        │   │                                    │
│  POST /login           │   │  GET  /api/courses                 │
│  POST /upload-content  │   │  GET  /api/quizzes                 │
│  POST /feedback        │   │  POST /api/submit-quiz             │
│                        │   │  POST /api/chat                    │
│  auth.php              │   │  GET  /api/analytics               │
│  content.php           │   │  GET  /api/repository              │
│  feedback.php          │   │                                    │
└────────────┬───────────┘   └──────────────┬─────────────────────┘
             │                              │
             └──────────┬───────────────────┘
                        ▼
              ┌──────────────────┐
              │   MySQL Database │
              │  tutoring_system │
              └──────────────────┘
```

**Rule**: The frontend MUST NOT call the PHP backend for AI/courses/quizzes/analytics,
and MUST NOT call the Python backend for auth/content/feedback. This split is enforced
by the two separate `APP_CONFIG` base URLs.

### Environment Configuration

All secrets and environment-specific values are read from `.env` files (never hardcoded).

**`backend/python/.env` (example)**
```
DB_HOST=localhost
DB_USER=tutoring_user
DB_PASSWORD=<strong-password>
DB_NAME=tutoring_system
SECRET_KEY=<cryptographically-random-256-bit-key>
ALLOWED_ORIGIN=https://yourdomain.com
```

**`backend/php/.env` (example)**
```
DB_HOST=localhost
DB_USER=tutoring_user
DB_PASSWORD=<strong-password>
DB_NAME=tutoring_system
JWT_SECRET=<cryptographically-random-256-bit-key>
ALLOWED_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW=60
```

Python reads `.env` via `python-dotenv`; PHP reads it via `vlucas/phpdotenv`.

---

## Data Flow Diagrams

### Authentication Flow (PHP)

```
Browser                     PHP api.php / auth.php
  │                                │
  │  POST /login                   │
  │  { username, password,         │
  │    user_type }                 │
  │ ─────────────────────────────► │
  │                                │  rate-limit check (IP)
  │                                │  SELECT user WHERE username=?
  │                                │  password_verify(password, hash)
  │                                │  jwt_encode({ id, username,
  │                                │    user_type, exp })
  │  { success, token, user }      │
  │ ◄───────────────────────────── │
  │                                │
  │  (store token in memory /      │
  │   sessionStorage)              │
```

### Authenticated API Flow (Python)

```
Browser                     Flask Blueprint
  │                                │
  │  GET /api/analytics            │
  │  Authorization: Bearer <jwt>   │
  │ ─────────────────────────────► │
  │                                │  verify_token(jwt)  ← SECRET_KEY from env
  │                                │  pool.get_connection()
  │                                │  SELECT username, points FROM users
  │                                │  pool.release_connection()
  │  { success, students,          │
  │    progress }                  │
  │ ◄───────────────────────────── │
```

### WebSocket Collaboration Flow

```
Browser A                   WebSocket Server (ws://APP_CONFIG.wsUrl)
  │                                │
  │  connect()                     │
  │ ─────────────────────────────► │
  │  send({ content, user })       │
  │ ─────────────────────────────► │
  │                                │  broadcast to all other clients
  │                    Browser B ◄─┤  { content, user }
  │                                │
  │  (on error / close)            │
  │  disable collaboration UI      │
  │  (no unhandled exception)      │
```

---

## Bug Details

### Bug Condition (unified pseudocode)

```
FUNCTION isBugCondition(context)
  INPUT: context — describes which defect is being evaluated
  OUTPUT: boolean

  // Frontend HTML
  IF context.type = "duplicate-id"
    RETURN document.querySelectorAll('#content-upload').length > 1

  IF context.type = "missing-nav-link"
    RETURN document.querySelector('a[href="#content-repo"]') = null

  // JavaScript runtime
  IF context.type = "submit-quiz-no-event"
    RETURN context.calledFromTimer = true AND event = undefined

  IF context.type = "double-loaddata"
    RETURN count(DOMContentLoaded listeners calling loadData) > 1

  IF context.type = "const-mock-data"
    RETURN typeof mockCourses = "const binding"
           AND window.mockCourses !== mockCourses

  IF context.type = "wrong-chat-button"
    RETURN chatButton = document.querySelector('.chat-input-group button')
           AND chatButton.classList.contains('voice-btn')

  IF context.type = "chart-reuse"
    RETURN Chart.getChart(canvas) != null
           AND new Chart(ctx, ...) called without destroy()

  IF context.type = "unconditional-sidebar-toggle"
    RETURN showSection called AND sidebar.classList.contains('active') = false
           AND toggleSidebar() still called

  // Python backend
  IF context.type = "analytics-missing-request"
    RETURN 'request' NOT IN imports(analytics.py)

  IF context.type = "empty-db-config"
    RETURN len(db_config) = 0

  IF context.type = "chatbot-format-not-called"
    RETURN response = "...".format  (method reference, not string)

  IF context.type = "hardcoded-secret"
    RETURN SECRET_KEY = 'your-secret-key-12345'

  // PHP backend
  IF context.type = "login-no-jwt"
    RETURN login response does NOT contain 'token' field

  IF context.type = "empty-php-modules"
    RETURN filesize(auth.php) = 0
           OR filesize(content.php) = 0
           OR filesize(feedback.php) = 0

  IF context.type = "cors-wildcard"
    RETURN Access-Control-Allow-Origin header = '*'

  IF context.type = "no-rate-limit"
    RETURN N failed logins from same IP succeed without 429

  RETURN false
END FUNCTION
```

### Concrete Examples of Bug Manifestation

| # | Trigger | Defective Outcome | Expected Outcome |
|---|---------|-------------------|------------------|
| 1.3 | Timer reaches 0 | `TypeError: Cannot read properties of undefined (reading 'preventDefault')` | Quiz auto-submits silently |
| 1.5 | `loadData()` runs | `mockCourses` still shows hardcoded data | Course section shows DB data |
| 1.6 | User clicks "Send" | Voice button fires `sendChat`; Send button does nothing | Send button fires `sendChat` |
| 1.7 | Navigate away then back to Analytics | "Canvas is already in use" error, broken chart | Chart re-renders correctly |
| 1.8 | Click nav link on desktop | Sidebar toggles open unexpectedly | Sidebar stays closed |
| 1.12 | Any GET /api/analytics | `NameError: name 'request' is not defined` | Returns student progress JSON |
| 1.13 | Any Python blueprint starts | `ImportError` or `KeyError` on db_config | DB connection established |
| 1.15 | Chat: "what is Python?" | Response is `<built-in method str.format>` | Response is `"I'm not sure about Python, but I can help..."` |
| 1.18 | POST /login with valid creds | `{ success: true, user: {...} }` — no token | `{ success: true, token: "eyJ...", user: {...} }` |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors (must not regress):**
- Mouse clicks on all buttons continue to work exactly as before
- GSAP section fade-in animation fires on every `showSection()` call
- Theme toggle persists to `localStorage` and re-initialises particles
- Sidebar toggle button opens/closes sidebar with GSAP slide animation
- Manual quiz submission (click Submit Quiz) calculates score and shows modal
- Quiz countdown timer counts from 60 and displays remaining time in `#timer`
- Chat appends user message and AI response to `#chat-container`
- Content upload validates title + body before proceeding
- Drag-and-drop reads `.txt` file into `#content-body`
- Preview button renders content below the form
- Feedback form shows success toast and clears message field
- Voice input populates chat input and triggers send
- Offline mode adds `.offline` class and queues actions
- Analytics bar chart renders via Chart.js for tutors
- Leaderboard displays ranked users with points
- Badge award appends badge element, animates with GSAP, plays sound
- `DOMContentLoaded` initialises particles, restores theme, sets up all listeners
- Flask app registers all five blueprints under `/api`
- PHP `upload-content` and `feedback` actions insert records and award points
- PHP `Database::connect()` returns valid `mysqli` with `utf8mb4` charset

**Scope:** All inputs that do NOT match any `isBugCondition` predicate above are
completely unaffected by this fix.

---

## Hypothesized Root Cause

1. **Duplicate ID (1.1)**: The `<section>` and the `<form>` inside it were both given
   `id="content-upload"` — likely a copy-paste error when the form was nested inside
   the section. `getElementById` returns the first match (the section), so all
   downstream selectors and drag-and-drop setup target the wrong element.

2. **Missing nav link (1.2)**: The `#content-repo` section was added to the HTML after
   the nav/sidebar was written and the link was never back-filled.

3. **submitQuiz timer crash (1.3)**: `submitQuiz` was written to handle a form `submit`
   event and unconditionally calls `event.preventDefault()`. The timer callback calls
   `submitQuiz()` with no argument, so `event` is `undefined`.

4. **Double loadData (1.4)**: `loadData` is called inside the main `DOMContentLoaded`
   block AND registered again as a standalone `document.addEventListener('DOMContentLoaded', loadData)`
   at module scope — two separate registrations on the same event.

5. **const mock data (1.5)**: `mockCourses` and `mockQuizzes` are declared with `const`
   at module scope. `loadData` assigns to `window.mockCourses`, which creates a property
   on the global object but does not update the `const` binding. Functions that close
   over the `const` binding always see the original hardcoded array.

6. **Wrong chat button (1.6)**: `document.querySelector('.chat-input-group button')`
   returns the first `<button>` in the group, which is the voice button (`🎤`). The
   Send button has no distinguishing attribute.

7. **Chart reuse (1.7)**: `loadAnalytics()` always calls `new Chart(ctx, ...)` without
   checking whether a Chart instance already exists on the canvas. Chart.js throws
   "Canvas is already in use" on the second call.

8. **Unconditional sidebar toggle (1.8)**: `showSection()` calls `toggleSidebar()` at
   the end of every invocation regardless of whether the sidebar is open. On desktop
   the sidebar is never open, so every nav click toggles it open.

9. **Broken sound URLs (1.9)**: The Pixabay CDN URLs used in `initializeSounds()` are
   fabricated (non-existent file hashes). They return 404 and Howler silently fails.

10. **Hardcoded WebSocket URL (1.10)**: `ws://localhost:8080` is hardcoded with no
    environment override and no error recovery beyond a console log.

11. **Fragile upload button selectors (1.11)**: `#content-upload button:last-child` and
    `#content-upload button:first-child` rely on DOM order and resolve to the section
    element (wrong target) because of the duplicate ID bug.

12. **analytics.py missing `request` import (1.12)**: The file imports `Blueprint,
    jsonify` but omits `request`. The `analytics()` route calls
    `request.headers.get(...)` which raises `NameError` immediately.

13. **Empty db_config.py (1.13)**: The file is empty. Every blueprint that does
    `from config.db_config import db_config` gets an `ImportError` (name not defined).

14. **init.py vs __init__.py (1.14)**: Python's import system requires the package
    initialiser to be named `__init__.py`. A file named `init.py` is just a regular
    module; the `api/` directory is not recognised as a package in all import contexts.

15. **Chatbot .format not called (1.15)**: The NLTK pairs list contains
    `"...".format` (a reference to the bound method) instead of a lambda or a
    pre-formatted string. `Chat.respond()` returns the method object as the response.

16. **Hardcoded SECRET_KEY (1.16)**: Both `quizzes.py` and `analytics.py` set
    `SECRET_KEY = 'your-secret-key-12345'` — a publicly known placeholder that makes
    all JWT tokens trivially forgeable.

17. **No connection pooling (1.17)**: Every route opens a new `mysql.connector.connect()`
    and closes it after the request. Under concurrent load this exhausts the MySQL
    `max_connections` limit.

18. **PHP login returns no JWT (1.18)**: `api.php` returns the user object on successful
    login but never generates or returns a token. The frontend has no credential to
    attach to subsequent authenticated requests.

19. **Empty PHP module files (1.19)**: `auth.php`, `content.php`, and `feedback.php`
    are empty. They provide no route logic and no modular separation.

20. **CORS wildcard (1.20)**: `Access-Control-Allow-Origin: *` allows any origin to
    make credentialed cross-site requests — a security vulnerability for authenticated
    endpoints.

21. **No rate limiting (1.21)**: The login endpoint in `api.php` has no attempt counter
    or lockout logic, leaving it open to brute-force attacks.

22. **No .env config (1.22)**: Database credentials and API URLs are hardcoded in source
    files across both backends.

23. **Mock-only frontend (1.23)**: The frontend never calls either backend. All data
    comes from hardcoded mock arrays.

24. **No documented API split (1.24)**: There is no `APP_CONFIG` object and no
    documented rule about which backend handles which feature.

---

## Correctness Properties

Property 1: Bug Condition — Timer-Safe Quiz Submission

_For any_ invocation of `submitQuiz` where `event` is `undefined` (timer-triggered
call), the fixed function SHALL complete quiz scoring and display the result modal
without throwing a TypeError.

**Validates: Requirements 2.3**

---

Property 2: Preservation — Manual Quiz Submission Score Accuracy

_For any_ set of selected answers where `answers[i].answer === mockQuizzes[i].correctAnswer`,
the fixed `submitQuiz` SHALL compute `score = correctCount * 50` and
`pointsEarned = Math.round(score / 10)`, matching the original scoring formula exactly.

**Validates: Requirements 3.5**

---

Property 3: Bug Condition — Chart.js Canvas Reuse

_For any_ N ≥ 2 sequential calls to `loadAnalytics()` on the same canvas element, the
fixed function SHALL destroy the existing Chart instance before creating a new one, so
no "Canvas is already in use" error is thrown and the chart renders correctly on every
call.

**Validates: Requirements 2.7**

---

Property 4: Preservation — Navigation State Machine

_For any_ nav link click when the sidebar does NOT have the `active` class, the fixed
`showSection()` SHALL leave the sidebar in its current (closed) state — i.e.
`sidebar.classList.contains('active')` remains `false` after the call.

_For any_ nav link click when the sidebar DOES have the `active` class, the fixed
`showSection()` SHALL close the sidebar (remove `active` class).

**Validates: Requirements 2.8, 3.2, 3.4**

---

Property 5: Bug Condition — Chatbot Response Type

_For any_ message matching the pattern `what is (.*)`, the fixed chatbot SHALL return a
`string` value (not a function reference). Formally: `typeof response === 'string'`.

**Validates: Requirements 2.15**

---

Property 6: Bug Condition — JWT Token Validity on Login

_For any_ login request with valid credentials, the fixed PHP login endpoint SHALL
return a response where `response.token` is a non-empty string that decodes as a valid
JWT with the correct `SECRET_KEY` and contains `id`, `username`, and `user_type` claims.

**Validates: Requirements 2.18**

---

Property 7: Preservation — JWT Token Rejection for Invalid Credentials

_For any_ login request with invalid credentials, the fixed PHP login endpoint SHALL
return `{ success: false }` with no `token` field — identical to the original behaviour.

**Validates: Requirements 3.1**

---

Property 8: Bug Condition — Rate Limiting

_For any_ sequence of more than `RATE_LIMIT_MAX` failed login attempts from the same IP
within `RATE_LIMIT_WINDOW` seconds, the fixed login endpoint SHALL respond with HTTP 429
on the (N+1)th attempt.

_For any_ sequence of ≤ `RATE_LIMIT_MAX` failed attempts, the endpoint SHALL respond
normally (HTTP 200 with `{ success: false }`).

**Validates: Requirements 2.21**

---

Property 9: Bug Condition — db_config Completeness

_For any_ import of `db_config` from `config/db_config.py`, the fixed module SHALL
export a dictionary containing at minimum the keys `host`, `user`, `password`,
`database`, and `pool_name`, with values read from environment variables (not empty
strings).

**Validates: Requirements 2.13, 2.17, 2.22**

---

Property 10: Preservation — API Response Shape Stability

_For any_ GET request to `/api/courses`, `/api/quizzes`, `/api/analytics`, or
`/api/repository` with a valid JWT, the fixed Python backend SHALL return a JSON object
with `{ "success": true, ... }` — the same top-level shape as the original routes
(where they were functional).

**Validates: Requirements 3.18**

---

## Fix Implementation

### Frontend — index.html

**Fix 1.1 — Duplicate ID**
```html
<!-- BEFORE -->
<section id="content-upload" class="content">
  <form id="content-upload">

<!-- AFTER -->
<section id="content-upload-section" class="content">
  <form id="content-upload-form">
```

**Fix 1.2 — Missing nav/sidebar link to #content-repo**
```html
<!-- Add to both <nav class="nav"> and <div class="sidebar"> -->
<a href="#content-repo">Repository</a>
```

**Fix 2.6 / 2.11 — Stable button IDs**
```html
<!-- Chat send button -->
<button id="send-btn">Send</button>

<!-- Upload form buttons -->
<button type="button" id="preview-btn">Preview</button>
<button type="submit"  id="upload-btn">Upload</button>
```

---

### Frontend — script.js

**Fix 1.3 — submitQuiz timer guard**
```javascript
// BEFORE
async function submitQuiz(event) {
    event.preventDefault();

// AFTER
async function submitQuiz(event) {
    if (event) event.preventDefault();
```

**Fix 1.4 — Remove duplicate loadData registration**
```javascript
// REMOVE this line at module scope:
document.addEventListener('DOMContentLoaded', loadData);
// loadData() is already called inside the main DOMContentLoaded handler.
```

**Fix 1.5 — let instead of const for mock data**
```javascript
// BEFORE
const mockCourses = [...];
const mockQuizzes = [...];

// AFTER
let mockCourses = [...];
let mockQuizzes = [...];

// In loadData():
mockCourses = data.courses;   // updates the module-level binding
mockQuizzes = data.quizzes;
```

**Fix 1.6 — Send button by stable ID**
```javascript
// BEFORE
const chatButton = document.querySelector('.chat-input-group button');

// AFTER
const chatButton = document.getElementById('send-btn');
```

**Fix 1.7 — Destroy existing Chart before re-creating**
```javascript
async function loadAnalytics() {
    // ...
    const canvas = document.getElementById('progress-chart');
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();
    new Chart(canvas.getContext('2d'), { ... });
}
```

**Fix 1.8 — Conditional sidebar toggle**
```javascript
function showSection(sectionId) {
    // ... (existing section switching logic) ...

    // BEFORE (unconditional):
    toggleSidebar();

    // AFTER (only close if open):
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        toggleSidebar();
    }
}
```

**Fix 1.9 — Valid audio assets**

Replace Pixabay CDN URLs with locally bundled audio files or a reliable CDN.
Recommended: use the Web Audio API to generate simple tones as a zero-dependency
fallback, and load real files only when available.

```javascript
function initializeSounds() {
    const audioFiles = {
        toggle:  'assets/audio/toggle.mp3',
        click:   'assets/audio/click.mp3',
        success: 'assets/audio/success.mp3',
        error:   'assets/audio/error.mp3',
        badge:   'assets/audio/badge.mp3'
    };
    Object.entries(audioFiles).forEach(([key, src]) => {
        sounds[key] = new Howl({ src: [src], onloaderror: () => {
            console.warn(`Audio ${key} unavailable — using silent fallback`);
            sounds[key] = { play: () => {} };
        }});
    });
}
```

**Fix 1.10 — WebSocket URL from config with graceful fallback**
```javascript
function setupRealTimeCollaboration() {
    const contentBody = document.getElementById('content-body');
    if (!contentBody) return;

    const wsUrl = window.APP_CONFIG?.wsUrl;
    if (!wsUrl) {
        console.warn('WebSocket URL not configured — collaboration disabled');
        return;
    }

    let ws;
    try {
        ws = new WebSocket(wsUrl);
    } catch (err) {
        console.warn('WebSocket unavailable — collaboration disabled', err);
        return;
    }

    ws.onerror = () => {
        console.warn('WebSocket error — collaboration disabled');
        ws = null;
    };
    // ... rest of handler unchanged ...
}
```

**Fix 1.11 — Upload buttons by stable ID**
```javascript
// BEFORE
const uploadButton  = document.querySelector('#content-upload button:last-child');
const previewButton = document.querySelector('#content-upload button:first-child');

// AFTER
const uploadButton  = document.getElementById('upload-btn');
const previewButton = document.getElementById('preview-btn');
```

**Fix 1.23 / 1.24 — Real fetch calls and APP_CONFIG**

Add to the top of script.js (or inject via a `<script>` tag before script.js):
```javascript
window.APP_CONFIG = {
    phpBase: '/php-api',   // override per environment
    pyBase:  '/py-api',
    wsUrl:   null          // set to wss://... in production
};
```

Replace mock-only code paths with real fetch calls:
```javascript
// Login → PHP
async function login(event) {
    event.preventDefault();
    // ...
    const res = await fetch(`${APP_CONFIG.phpBase}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, user_type: state.userType })
    });
    const data = await res.json();
    if (data.success) {
        state.token = data.token;          // store JWT
        state.currentUser = data.user.username;
        state.userType    = data.user.user_type;
        state.points      = data.user.points;
        state.streak      = data.user.streak;
        showSection('dashboard');
    }
}

// Courses → Python
async function loadCourseSection() {
    const res = await fetch(`${APP_CONFIG.pyBase}/api/courses`, {
        headers: { Authorization: `Bearer ${state.token}` }
    });
    const data = await res.json();
    mockCourses = data.courses || mockCourses;
    // ... render ...
}

// Analytics → Python
async function loadAnalytics() {
    const res = await fetch(`${APP_CONFIG.pyBase}/api/analytics`, {
        headers: { Authorization: `Bearer ${state.token}` }
    });
    const data = await res.json();
    // ... render chart with data.students / data.progress ...
}

// Chat → Python
async function sendChat() {
    // ...
    const res = await fetch(`${APP_CONFIG.pyBase}/api/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ message })
    });
    const data = await res.json();
    aiMessage.textContent = `AI: ${data.response}`;
}

// Upload → PHP
async function uploadContent(event) {
    event.preventDefault();
    // ...
    await fetch(`${APP_CONFIG.phpBase}?action=upload-content`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ title, body, uploaded_by: state.userId })
    });
}

// Feedback → PHP
async function submitFeedback(event) {
    event.preventDefault();
    // ...
    await fetch(`${APP_CONFIG.phpBase}?action=feedback`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
        },
        body: JSON.stringify({ user_id: state.userId, type, message })
    });
}
```

---

### Python Backend

**Fix 1.12 — analytics.py: add `request` import**
```python
# BEFORE
from flask import Blueprint, jsonify

# AFTER
from flask import Blueprint, request, jsonify
```

**Fix 1.13 — db_config.py: populate from environment**
```python
# backend/python/config/db_config.py
import os
from dotenv import load_dotenv

load_dotenv()

db_config = {
    'host':      os.environ['DB_HOST'],
    'user':      os.environ['DB_USER'],
    'password':  os.environ['DB_PASSWORD'],
    'database':  os.environ['DB_NAME'],
    'pool_name': 'tutoring_pool',
    'pool_size': 10,
}
```

**Fix 1.14 — Rename init.py → __init__.py**

The file `backend/python/api/init.py` must be renamed to `backend/python/api/__init__.py`.
Its content (a single comment) is unchanged.

**Fix 1.15 — Chatbot: call .format() with captured group**
```python
# BEFORE
[r"what is (.*)", ["I'm not sure about {}, but I can help with general questions!".format]],

# AFTER
[r"what is (.*)", [lambda matches: f"I'm not sure about {matches[0]}, but I can help with general questions!"]],
```

Note: NLTK's `Chat` class passes the match groups to callable responses. Using a lambda
is the idiomatic fix; it avoids the method-reference bug entirely.

**Fix 1.16 — SECRET_KEY from environment**
```python
# In quizzes.py and analytics.py — BEFORE
SECRET_KEY = 'your-secret-key-12345'

# AFTER
import os
from dotenv import load_dotenv
load_dotenv()
SECRET_KEY = os.environ['SECRET_KEY']
```

**Fix 1.17 — Connection pooling**

Replace per-request `mysql.connector.connect()` with a shared pool initialised at
app startup:

```python
# backend/python/config/db_config.py  (addition)
import mysql.connector.pooling

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        _pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name=db_config['pool_name'],
            pool_size=db_config['pool_size'],
            host=db_config['host'],
            user=db_config['user'],
            password=db_config['password'],
            database=db_config['database'],
        )
    return _pool
```

Each blueprint route uses the pool:
```python
# BEFORE (in every route)
conn = mysql.connector.connect(**db_config)
# ...
conn.close()

# AFTER
from config.db_config import get_pool

conn = get_pool().get_connection()
try:
    cursor = conn.cursor(dictionary=True)
    # ... query ...
finally:
    conn.close()   # returns connection to pool, does not destroy it
```

**Fix 1.22 — app.py: CORS from environment**
```python
# BEFORE
CORS(app, resources={r"/api/*": {"origins": "http://localhost"}})

# AFTER
import os
from dotenv import load_dotenv
load_dotenv()
ALLOWED_ORIGIN = os.environ.get('ALLOWED_ORIGIN', 'http://localhost')
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGIN}})
```

**Updated requirements.txt**
```
flask==3.0.3
flask-cors==5.0.0
mysql-connector-python==9.0.0
nltk==3.9.1
python-jose==3.3.0
python-dotenv==1.0.1
```

---

### PHP Backend

**Fix 1.18 / 1.19 — auth.php: JWT on login**

```php
<?php
// backend/php/api/auth.php
require_once __DIR__ . '/../vendor/autoload.php';
use \Firebase\JWT\JWT;
use \Firebase\JWT\Key;

function handleLogin(\mysqli $db): void {
    $data     = json_decode(file_get_contents('php://input'), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    $stmt = $db->prepare(
        'SELECT id, username, password, user_type, points, streak FROM users WHERE username = ?'
    );
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        return;
    }

    $secret = $_ENV['JWT_SECRET'];
    $payload = [
        'iat'       => time(),
        'exp'       => time() + 3600,
        'id'        => $user['id'],
        'username'  => $user['username'],
        'user_type' => $user['user_type'],
    ];
    $token = JWT::encode($payload, $secret, 'HS256');

    echo json_encode([
        'success' => true,
        'token'   => $token,
        'user'    => [
            'id'        => $user['id'],
            'username'  => $user['username'],
            'user_type' => $user['user_type'],
            'points'    => $user['points'],
            'streak'    => $user['streak'],
        ]
    ]);
}
```

**Fix 1.19 — content.php**

```php
<?php
// backend/php/api/content.php
function handleUploadContent(\mysqli $db): void {
    $data        = json_decode(file_get_contents('php://input'), true);
    $title       = $data['title']       ?? '';
    $body        = $data['body']        ?? '';
    $uploaded_by = (int)($data['uploaded_by'] ?? 0);

    if (!$title || !$body) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Title and body required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO content (title, body, uploaded_by) VALUES (?, ?, ?)');
    $stmt->bind_param('ssi', $title, $body, $uploaded_by);
    if ($stmt->execute()) {
        $stmt2 = $db->prepare('UPDATE users SET points = points + 10 WHERE id = ?');
        $stmt2->bind_param('i', $uploaded_by);
        $stmt2->execute();
        $stmt2->close();
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Upload failed']);
    }
    $stmt->close();
}
```

**Fix 1.19 — feedback.php**

```php
<?php
// backend/php/api/feedback.php
function handleFeedback(\mysqli $db): void {
    $data    = json_decode(file_get_contents('php://input'), true);
    $user_id = (int)($data['user_id'] ?? 0);
    $type    = $data['type']    ?? '';
    $message = $data['message'] ?? '';

    if (!$message) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Message required']);
        return;
    }

    $stmt = $db->prepare('INSERT INTO feedback (user_id, type, message) VALUES (?, ?, ?)');
    $stmt->bind_param('iss', $user_id, $type, $message);
    if ($stmt->execute()) {
        $stmt2 = $db->prepare('UPDATE users SET points = points + 2 WHERE id = ?');
        $stmt2->bind_param('i', $user_id);
        $stmt2->execute();
        $stmt2->close();
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Feedback submission failed']);
    }
    $stmt->close();
}
```

**Fix 1.20 — CORS allowlist in api.php**
```php
// BEFORE
header('Access-Control-Allow-Origin: *');

// AFTER
$allowedOrigin = $_ENV['ALLOWED_ORIGIN'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Vary: Origin');
}
```

**Fix 1.21 — Rate limiting in api.php**

Use a file-based or APCu-based counter keyed by IP. Example with APCu:
```php
function checkRateLimit(string $ip): bool {
    $key     = "login_attempts_{$ip}";
    $max     = (int)($_ENV['RATE_LIMIT_MAX']    ?? 5);
    $window  = (int)($_ENV['RATE_LIMIT_WINDOW'] ?? 60);
    $current = apcu_fetch($key) ?: 0;
    if ($current >= $max) return false;          // blocked
    apcu_store($key, $current + 1, $window);
    return true;
}

// In the login action:
if (!checkRateLimit($_SERVER['REMOTE_ADDR'])) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many attempts']);
    exit;
}
```

**Fix 1.22 — database.php: credentials from .env**
```php
// backend/php/config/database.php
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

class Database {
    private string $host;
    private string $user;
    private string $pass;
    private string $dbname;

    public function __construct() {
        $this->host   = $_ENV['DB_HOST'];
        $this->user   = $_ENV['DB_USER'];
        $this->pass   = $_ENV['DB_PASSWORD'];
        $this->dbname = $_ENV['DB_NAME'];
    }

    public function connect(): \mysqli {
        $conn = new \mysqli($this->host, $this->user, $this->pass, $this->dbname);
        if ($conn->connect_error) {
            throw new \Exception('Database connection failed: ' . $conn->connect_error);
        }
        $conn->set_charset('utf8mb4');
        return $conn;
    }
}
```

**composer.json additions**
```json
{
    "require": {
        "vlucas/phpdotenv": "^5.6",
        "firebase/php-jwt": "^6.10"
    }
}
```

---

## Security Design

### JWT Flow

```
1. Client sends POST /login with { username, password, user_type }
2. PHP verifies password_verify(password, stored_hash)
3. PHP signs JWT:
     header:  { alg: "HS256", typ: "JWT" }
     payload: { iat, exp: now+3600, id, username, user_type }
     secret:  $_ENV['JWT_SECRET']  (256-bit random, never in source)
4. Client stores token in memory (state.token) — NOT localStorage
   (avoids XSS token theft; acceptable for SPA with no page reload)
5. Every subsequent request to Python backend includes:
     Authorization: Bearer <token>
6. Python verify_token() decodes with os.environ['SECRET_KEY']
   (same secret, shared via environment — not hardcoded)
7. Token expiry (exp claim) is validated by python-jose automatically
```

### Environment Variables

| Variable | Backend | Purpose |
|----------|---------|---------|
| `DB_HOST` | PHP + Python | Database hostname |
| `DB_USER` | PHP + Python | Database username |
| `DB_PASSWORD` | PHP + Python | Database password |
| `DB_NAME` | PHP + Python | Database name |
| `JWT_SECRET` / `SECRET_KEY` | PHP / Python | JWT signing key (same value) |
| `ALLOWED_ORIGIN` | PHP + Python | CORS allowlist (single origin) |
| `RATE_LIMIT_MAX` | PHP | Max failed login attempts |
| `RATE_LIMIT_WINDOW` | PHP | Rate limit window in seconds |

All `.env` files are listed in `.gitignore` and never committed to source control.

### CORS Policy

- PHP: `Access-Control-Allow-Origin` is set only when `$_SERVER['HTTP_ORIGIN']`
  exactly matches `$_ENV['ALLOWED_ORIGIN']`. The `Vary: Origin` header is added to
  prevent caching issues.
- Python: `flask-cors` is configured with `origins=os.environ['ALLOWED_ORIGIN']`.
- Neither backend uses `*` in production.

### Input Validation

- All PHP database inputs use prepared statements with `bind_param` (already present,
  preserved by this fix).
- Python routes validate required fields and return 400 on missing input.
- JWT claims are validated on every authenticated Python route before any DB access.

---

## Testing Strategy

### Validation Approach

Testing follows a two-phase approach:
1. **Exploratory / Bug Condition Checking** — run tests against the UNFIXED code to
   surface counterexamples and confirm root cause analysis.
2. **Fix Checking + Preservation Checking** — run the same tests against the FIXED code
   to verify correctness and confirm no regressions.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE the fix is applied.
Confirm or refute the root cause hypotheses.

**Test Cases (run on unfixed code)**:

1. **Timer submitQuiz crash** — call `submitQuiz()` with no argument; assert TypeError
   is thrown. (Confirms bug 1.3.)

2. **Double loadData** — spy on `loadData`; fire `DOMContentLoaded`; assert call count
   is 2. (Confirms bug 1.4.)

3. **const mock data not updated** — call `loadData()` with mock JSON; assert
   `mockCourses` still equals the original hardcoded array. (Confirms bug 1.5.)

4. **Wrong chat button** — assert `document.querySelector('.chat-input-group button')`
   has class `voice-btn`. (Confirms bug 1.6.)

5. **Chart reuse error** — call `loadAnalytics()` twice; assert second call throws or
   logs "Canvas is already in use". (Confirms bug 1.7.)

6. **Unconditional sidebar toggle** — call `showSection('dashboard')` with sidebar
   closed; assert sidebar has `active` class after call. (Confirms bug 1.8.)

7. **analytics.py NameError** — import `analytics.py` and call the route; assert
   `NameError` is raised. (Confirms bug 1.12.)

8. **Empty db_config** — import `db_config`; assert `db_config` dict is empty or
   raises `ImportError`. (Confirms bug 1.13.)

9. **Chatbot format not called** — call `chatbot.respond('what is Python')`; assert
   `isinstance(response, str)` is False. (Confirms bug 1.15.)

10. **PHP login no JWT** — POST valid credentials to unfixed `api.php`; assert response
    has no `token` key. (Confirms bug 1.18.)

11. **No rate limiting** — send 10 failed login requests; assert all return HTTP 200.
    (Confirms bug 1.21.)

**Expected Counterexamples**:
- `submitQuiz(undefined)` → `TypeError`
- `loadData()` call count → 2
- `chatbot.respond('what is Python')` → method reference, not string
- `POST /login` response → no `token` field

---

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed code
produces the expected behaviour.

**Pseudocode (applies to all properties)**:
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedFunction(input)
  ASSERT expectedBehavior(result)
END FOR
```

**Key fix checks**:

- `submitQuiz(undefined)` → no exception, modal shown with score
- `loadData()` call count after DOMContentLoaded → exactly 1
- `loadData()` with new data → `mockCourses` binding updated
- `document.getElementById('send-btn')` → non-null, not voice button
- Two calls to `loadAnalytics()` → no error, chart renders on second call
- `showSection('dashboard')` with sidebar closed → sidebar remains closed
- `analytics.py` route with valid JWT → returns `{ success: true, students, progress }`
- `db_config` import → dict with all required keys, values from env
- `chatbot.respond('what is Python')` → `isinstance(response, str)` is True
- `POST /login` with valid creds → response contains valid JWT `token`
- 6th failed login from same IP → HTTP 429

---

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed
code produces the same result as the original code.

**Pseudocode**:
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Property-based testing is recommended** for preservation because it generates many
inputs automatically and catches edge cases that manual tests miss.

**Preservation test cases**:

1. **Manual quiz submission** — generate random sets of answers; assert score formula
   `correctCount * 50` and `pointsEarned = Math.round(score / 10)` are unchanged.

2. **Section navigation** — generate random `sectionId` values; assert GSAP animation
   fires and target section gets `active` class.

3. **Theme toggle** — assert `localStorage.getItem('theme')` is updated and particles
   re-initialise.

4. **Sidebar toggle button** — assert sidebar `active` class toggles correctly when
   the dedicated toggle button is clicked (not via nav).

5. **Feedback form** — assert success toast shown and message field cleared.

6. **PHP upload-content** — assert record inserted and points awarded (+10).

7. **PHP feedback** — assert record inserted and points awarded (+2).

8. **Flask blueprint registration** — assert all five blueprints respond to their
   respective routes.

9. **Database::connect()** — assert returns valid `mysqli` with `utf8mb4` charset.

10. **JWT rejection** — assert invalid/expired tokens return 401 from Python routes.

---

### Unit Tests

- `submitQuiz(undefined)` does not throw (timer path)
- `submitQuiz(mockEvent)` calls `event.preventDefault()` (form path)
- `loadData()` registered exactly once after DOMContentLoaded
- `mockCourses` binding updated after `loadData()` with new data
- `getElementById('send-btn')` returns Send button, not voice button
- `loadAnalytics()` called twice — no "Canvas already in use" error
- `showSection(id)` with closed sidebar — sidebar stays closed
- `showSection(id)` with open sidebar — sidebar closes
- `chatbot.respond('what is Python')` returns a string
- `db_config` contains all required keys
- `analytics.py` route does not raise NameError
- PHP login returns `token` field on valid credentials
- PHP login returns no `token` on invalid credentials
- Rate limiter blocks after `RATE_LIMIT_MAX` failures
- CORS header is not `*` in production config

---

### Property-Based Tests

*(Recommended libraries: fast-check for JS, Hypothesis for Python, QuickCheck-style for PHP)*

- **Property 1 (timer-safe submitQuiz)**: For any call `submitQuiz(x)` where `x` is
  `undefined` or a valid Event, no TypeError is thrown.

- **Property 2 (quiz score accuracy)**: For any array of answers where
  `answers[i].answer === mockQuizzes[i].correctAnswer` for `k` items, score equals
  `k * 50` and pointsEarned equals `Math.round(k * 50 / 10)`.

- **Property 3 (chart reuse)**: For any N ≥ 1 calls to `loadAnalytics()`, no exception
  is thrown and `Chart.getChart(canvas)` is non-null after each call.

- **Property 4 (navigation state machine)**: For any sequence of `showSection(id)`
  calls, the sidebar is open after the call iff it was open before AND the call did not
  close it (i.e. sidebar state is only changed by `toggleSidebar()` directly).

- **Property 5 (chatbot response type)**: For any message string, `chatbot.respond(msg)`
  returns either `null` or a `string` — never a function reference.

- **Property 6 (JWT validity)**: For any valid `{ username, password }` pair,
  `JWT::decode(response.token, JWT_SECRET, ['HS256'])` succeeds and payload contains
  `id`, `username`, `user_type`.

- **Property 7 (JWT rejection)**: For any token string that is not signed with
  `SECRET_KEY`, `verify_token(token)` returns `None`.

- **Property 8 (rate limiting)**: For any IP address and any N > `RATE_LIMIT_MAX`
  failed attempts within the window, the (N+1)th attempt returns HTTP 429.

- **Property 9 (db_config completeness)**: For any environment where all required env
  vars are set, `db_config` contains non-empty string values for all required keys.

- **Property 10 (API response shape)**: For any valid JWT and any GET request to a
  Python API route, the response JSON contains `{ "success": true }` at the top level.

---

### Integration Tests

- Full login → dashboard flow: POST /login → receive JWT → GET /api/courses with JWT →
  courses rendered in UI
- Analytics flow: login as tutor → navigate to Analytics → GET /api/analytics →
  Chart.js bar chart rendered
- Chat flow: login → send message → POST /api/chat → AI response appended to container
- Upload flow: login as tutor → fill form → POST /php-api?action=upload-content →
  success toast → record in DB
- Feedback flow: login → submit feedback → POST /php-api?action=feedback → success
  toast → record in DB
- Rate limit integration: 6 failed logins from same IP → 6th returns 429
- WebSocket disabled gracefully: set `APP_CONFIG.wsUrl = null` → no error thrown,
  collaboration UI hidden
- Offline → online sync: go offline → submit feedback (cached) → go online →
  `syncOfflineData()` replays request
- Theme persistence: toggle theme → reload page → correct theme restored from
  localStorage
- Sidebar desktop: click nav link on desktop (sidebar closed) → sidebar remains closed
  after navigation
