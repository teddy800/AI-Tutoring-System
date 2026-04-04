/* eslint-disable no-undef, no-console */

// ── App Configuration (override per environment) ─────────────────────────────
window.APP_CONFIG = {
    phpBase: '/php-api',   // PHP backend base URL
    pyBase:  '/py-api',    // Python/Flask backend base URL
    wsUrl:   null          // WebSocket URL — set to wss://... in production
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    currentUser: null,
    userId:      null,
    userType:    null,
    token:       null,
    quizTimer:   null,
    points:      0,
    courses:     [],
    streak:      0,
    offline:     !navigator.onLine
};

// ── Mock Data (fallback when backend unavailable) ─────────────────────────────
let mockCourses = [
    {
        id: 1,
        title: "Introduction to Python",
        description: "Master Python programming fundamentals.",
        syllabus: ["Week 1: Variables", "Week 2: Functions", "Week 3: OOP"],
        assignments: [{ title: "Calculator", dueDate: "2025-06-01" }],
        forumPosts: [{ id: 1, user: "User1", message: "Debugging loops?", replies: [] }]
    },
    {
        id: 2,
        title: "Calculus Fundamentals",
        description: "Learn derivatives and integrals.",
        syllabus: ["Week 1: Limits", "Week 2: Derivatives", "Week 3: Integrals"],
        assignments: [{ title: "Derivatives", dueDate: "2025-06-15" }],
        forumPosts: []
    }
];

let mockQuizzes = [
    {
        id: 1,
        question: "What is the output of `print(2 + 2)` in Python?",
        options: ["22", "4", "Error", "None"],
        correctAnswer: 1
    },
    {
        id: 2,
        question: "What is the derivative of x²?",
        options: ["2x", "x", "x²", "2"],
        correctAnswer: 0
    }
];

// ── Sound Effects ─────────────────────────────────────────────────────────────
const sounds = {};
function initializeSounds() {
    const audioFiles = {
        toggle:  'assets/audio/toggle.mp3',
        click:   'assets/audio/click.mp3',
        success: 'assets/audio/success.mp3',
        error:   'assets/audio/error.mp3',
        badge:   'assets/audio/badge.mp3'
    };
    Object.entries(audioFiles).forEach(([key, src]) => {
        try {
            sounds[key] = new Howl({
                src: [src],
                onloaderror: () => {
                    console.warn(`Audio '${key}' unavailable — using silent fallback`);
                    sounds[key] = { play: () => {} };
                }
            });
        } catch {
            sounds[key] = { play: () => {} };
        }
    });
}

function playSound(type) {
    try { sounds[type]?.play(); } catch { /* silent */ }
}

// ── Toast Notification ────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
    gsap.fromTo(toast,
        { y: 50, opacity: 0 },
        {
            y: 0, opacity: 1, duration: 0.5, ease: 'power2.out',
            onComplete: () => {
                setTimeout(() => {
                    gsap.to(toast, { opacity: 0, duration: 0.5, onComplete: () => toast.remove() });
                }, 3000);
            }
        }
    );
}

// ── Theme Toggle ──────────────────────────────────────────────────────────────
function toggleTheme() {
    const root = document.documentElement;
    const newTheme = (root.getAttribute('data-theme') || 'dark') === 'dark' ? 'light' : 'dark';
    gsap.to(root, {
        duration: 0.4, opacity: 0,
        onComplete: () => {
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            gsap.to(root, { duration: 0.4, opacity: 1 });
            initParticles();
            updateCourseCards(state.courses);
            playSound('toggle');
        }
    });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
    try {
        if (window.pJSDom && window.pJSDom.length > 0) {
            window.pJSDom[0].pJS.fn.vendors.destroypJS();
            window.pJSDom = [];
        }
        particlesJS('particles-js', {
            particles: {
                number: { value: 80, density: { enable: true, value_area: 800 } },
                color: { value: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333' },
                shape: { type: 'circle' },
                opacity: { value: 0.5, random: true },
                size: { value: 3, random: true },
                move: { enable: true, speed: 2, direction: 'none', random: false }
            },
            interactivity: {
                detect_on: 'canvas',
                events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' } },
                modes: { repulse: { distance: 100 }, push: { particles_nb: 4 } }
            },
            retina_detect: true
        });
    } catch (e) { console.warn('Particles init failed:', e); }
}

// ── Offline Support ───────────────────────────────────────────────────────────
function setupOfflineSupport() {
    window.addEventListener('online', () => {
        state.offline = false;
        document.body.classList.remove('offline');
        showToast('Back online!', 'success');
        updateUserStatus();
        syncOfflineData();
    });
    window.addEventListener('offline', () => {
        state.offline = true;
        document.body.classList.add('offline');
        showToast('Offline mode activated', 'error');
        updateUserStatus();
    });
    if (state.offline) document.body.classList.add('offline');
}

async function syncOfflineData() {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('tutoring-system');
        const requests = await cache.keys();
        for (const req of requests) {
            const res = await cache.match(req);
            if (res) {
                const data = await res.json();
                await fetch(req.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                await cache.delete(req);
            }
        }
        if (requests.length) showToast('Offline data synced', 'success');
    } catch (e) { console.error('Offline sync failed:', e); }
}

async function cacheRequest(url, data) {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('tutoring-system');
        await cache.put(url, new Response(JSON.stringify(data)));
    } catch (e) { console.error('Cache request failed:', e); }
}

// ── Voice Input ───────────────────────────────────────────────────────────────
function setupVoiceInput() {
    const chatInput = document.getElementById('chat-input');
    const voiceBtn  = document.querySelector('.voice-btn');
    if (!voiceBtn || !chatInput) return;

    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        voiceBtn.addEventListener('click', () => {
            try {
                recognition.start();
                voiceBtn.classList.add('recording');
                showToast('Listening...', 'success');
            } catch (e) {
                showToast('Voice recognition failed', 'error');
            }
        });

        recognition.onresult = (e) => {
            chatInput.value = e.results[0][0].transcript;
            voiceBtn.classList.remove('recording');
            sendChat();
        };

        recognition.onerror = () => {
            voiceBtn.classList.remove('recording');
            showToast('Voice recognition failed', 'error');
        };
    } else {
        voiceBtn.style.display = 'none';
    }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(message) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    document.getElementById('modal-message').textContent = message;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    gsap.fromTo('.modal-content', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' });
    modal.querySelector('button').focus();
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    gsap.to('.modal-content', {
        scale: 0.8, opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: () => { modal.classList.remove('active'); modal.setAttribute('aria-hidden', 'true'); }
    });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
    gsap.to(sidebar, { left: sidebar.classList.contains('active') ? 0 : -300, duration: 0.3, ease: 'power2.out' });
}

function setupSwipeNavigation() {
    let startX = 0;
    document.addEventListener('touchstart', (e) => { startX = e.changedTouches[0].screenX; });
    document.addEventListener('touchend', (e) => {
        const diff = e.changedTouches[0].screenX - startX;
        if (Math.abs(diff) > 50) toggleSidebar();
    });
}

// ── Section Navigation ────────────────────────────────────────────────────────
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content');
    sections.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(sectionId);
    if (!target) {
        console.warn(`Section "${sectionId}" not found`);
        document.getElementById('login-form')?.classList.add('active');
        return;
    }

    target.classList.add('active');
    gsap.fromTo(target, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' });

    // Only close sidebar if it's currently open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('active')) toggleSidebar();

    try {
        switch (sectionId) {
            case 'dashboard':          loadDashboard();      break;
            case 'quiz-section':       loadQuizzes();        break;
            case 'course-section':     loadCourseSection();  break;
            case 'analytics':          loadAnalytics();      break;
            case 'feedback':           loadFeedback();       break;
            case 'help':               loadHelp();           break;
            case 'content-repo':       loadRepository();     break;
        }
    } catch (e) {
        console.error(`Error loading section ${sectionId}:`, e);
        showToast(`Failed to load ${sectionId}`, 'error');
    }

    playSound('click');
}

// ── User Status ───────────────────────────────────────────────────────────────
function updateUserStatus() {
    const status = document.querySelector('.user-status');
    if (status) {
        status.textContent = state.offline ? 'Offline' : 'Online';
        status.setAttribute('aria-label', `User Status: ${state.offline ? 'Offline' : 'Online'}`);
    }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    state.userType = document.getElementById('user-type').value;

    if (!username || !password) {
        showModal('Please fill in all fields');
        playSound('error');
        return;
    }

    try {
        let data;
        if (state.offline) {
            // Offline fallback — accept any credentials
            data = { success: true, token: null, user: { id: 1, username, user_type: state.userType, points: 0, streak: 0 } };
            cacheRequest(`${APP_CONFIG.phpBase}?action=login`, { username, password, user_type: state.userType });
        } else {
            const res = await fetch(`${APP_CONFIG.phpBase}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, user_type: state.userType })
            });
            data = await res.json();
        }

        if (!data.success) {
            showModal(data.error || 'Invalid credentials');
            playSound('error');
            return;
        }

        state.token       = data.token;
        state.currentUser = data.user.username;
        state.userId      = data.user.id;
        state.userType    = data.user.user_type;
        state.points      = data.user.points || 0;
        state.streak      = data.user.streak || 0;

        showToast('Login successful!', 'success');
        playSound('success');
        showSection('dashboard');
        updateUserStatus();
        checkStreak();
    } catch (e) {
        showModal('Network error. Please try again.');
        console.error('Login error:', e);
    }
}

// ── Streak ────────────────────────────────────────────────────────────────────
function checkStreak() {
    const lastLogin = localStorage.getItem('lastLogin');
    const today     = new Date().toISOString().split('T')[0];
    if (lastLogin === today) return;

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastLogin === yesterday) {
        state.streak++;
        showToast(`🔥 Streak: ${state.streak} days!`, 'success');
        if (state.streak % 5 === 0) awardBadge('Streak Master');
    } else {
        state.streak = 1;
    }
    localStorage.setItem('streak', state.streak);
    localStorage.setItem('lastLogin', today);
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const el = document.querySelector('.streak p');
    if (el) {
        el.textContent = `🔥 Current Streak: ${state.streak} days`;
        gsap.from(el, { opacity: 0, scale: 0.8, duration: 0.5 });
    }
}

// ── Badge System ──────────────────────────────────────────────────────────────
function awardBadge(badgeName) {
    const badgesDiv = document.querySelector('.badges');
    if (!badgesDiv) return;
    const badgeType = badgeName.toLowerCase().replace(/\s+/g, '-');
    // Avoid duplicate badges
    if (badgesDiv.querySelector(`[data-type="${badgeType}"]`)) return;
    const badge = document.createElement('div');
    badge.className = `badge badge-${badgeType}`;
    badge.textContent = badgeName;
    badge.setAttribute('data-type', badgeType);
    badgesDiv.appendChild(badge);
    gsap.from(badge, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
    showToast(`🏅 Badge earned: ${badgeName}!`, 'success');
    playSound('badge');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!state.currentUser) { showSection('login-form'); return; }

    const welcome = document.getElementById('welcome-message');
    if (welcome) {
        welcome.textContent = `Welcome back, ${state.currentUser}! 🎓 Points: ${state.points}`;
        welcome.setAttribute('aria-live', 'polite');
        gsap.from(welcome, { opacity: 0, x: -20, duration: 0.5 });
    }

    try {
        let courses = mockCourses;
        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/courses`, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.success && data.courses?.length) {
                mockCourses = data.courses;
                courses = data.courses;
            }
        }
        const withProgress = courses.map(c => ({ ...c, progress: Math.floor(Math.random() * 100) }));
        updateProgressTracker(50);
        updateCourseCards(withProgress);

        const recDiv = document.getElementById('recommendations');
        if (recDiv) {
            recDiv.textContent = `📚 Recommended: Advanced Python, Linear Algebra`;
            gsap.from(recDiv, { opacity: 0, y: 20, duration: 0.5, delay: 0.2 });
        }
        loadLeaderboard();
    } catch (e) {
        showToast('Failed to load dashboard', 'error');
        console.error('Dashboard error:', e);
    }
}

function updateProgressTracker(progress) {
    document.querySelectorAll('.milestone').forEach(m => {
        m.classList.toggle('active', progress >= parseInt(m.dataset.milestone));
    });
}

async function loadLeaderboard() {
    const div = document.querySelector('.leaderboard');
    if (!div) return;
    const data = [
        { username: state.currentUser || 'You', points: state.points },
        { username: 'Alice', points: 120 },
        { username: 'Bob',   points: 95 },
    ].sort((a, b) => b.points - a.points);

    div.innerHTML = '<h3>🏆 Leaderboard</h3><ul>' +
        data.map((u, i) => `<li>${['🥇','🥈','🥉'][i] || '  '} ${u.username}: ${u.points} pts</li>`).join('') +
        '</ul>';
    gsap.from(div, { opacity: 0, y: 20, duration: 0.5 });
}

function updateCourseCards(courses = []) {
    const grid = document.querySelector('#dashboard .course-grid');
    if (!grid) return;
    state.courses = courses;
    grid.innerHTML = courses.map(c => `
        <div class="course-card" data-course-id="${c.id}" role="gridcell" tabindex="0">
            <h3>${c.title}</h3>
            <p>${c.description}</p>
            <div class="progress-label">Progress: ${c.progress ?? 0}%</div>
            <div class="progress-bar">
                <div class="progress-fill" role="progressbar"
                     aria-valuenow="${c.progress ?? 0}" aria-valuemin="0" aria-valuemax="100"
                     style="width:${c.progress ?? 0}%"></div>
            </div>
        </div>`).join('');
    gsap.from('.course-card', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
}

// ── Course Section ────────────────────────────────────────────────────────────
async function loadCourseSection() {
    const details = document.getElementById('course-details');
    if (!details) return;
    try {
        let courses = mockCourses;
        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/courses`, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.success && data.courses?.length) { mockCourses = data.courses; courses = data.courses; }
        }
        state.courses = courses;
        details.innerHTML = courses.map(c => `
            <div class="course-detail" data-course-id="${c.id}">
                <h3>${c.title}</h3>
                <p>${c.description}</p>
                <div class="course-syllabus">
                    <h4>Syllabus</h4>
                    <ul>${(c.syllabus || []).map(i => `<li>${i}</li>`).join('') || '<li>No syllabus</li>'}</ul>
                </div>
                <div class="course-assignments">
                    <h4>Assignments</h4>
                    <ul>${(c.assignments || []).map(a => `<li>${a.title} (Due: ${a.dueDate})</li>`).join('') || '<li>No assignments</li>'}</ul>
                </div>
                <div class="course-forum">
                    <h4>Discussion Forum</h4>
                    ${(c.forumPosts || []).map(p => `
                        <div class="forum-post" data-post-id="${p.id}">
                            <p><strong>${p.user}:</strong> ${p.message}</p>
                            ${(p.replies || []).map(r => `<p class="reply"><strong>${r.user}:</strong> ${r.message}</p>`).join('')}
                            <form class="forum-reply-form" data-post-id="${p.id}">
                                <textarea placeholder="Reply..." aria-label="Reply to post" required></textarea>
                                <button type="submit">Post Reply</button>
                            </form>
                        </div>`).join('') || '<p>No posts yet</p>'}
                    <form class="forum-post-form" data-course-id="${c.id}">
                        <textarea placeholder="Start a discussion..." aria-label="New forum post" required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </div>`).join('');
        setupForumInteractions();
        gsap.from('.course-detail', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
    } catch (e) {
        showToast('Failed to load courses', 'error');
        details.innerHTML = '<p>Unable to load courses</p>';
    }
}

function setupForumInteractions() {
    document.querySelectorAll('.forum-post-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = form.querySelector('textarea').value.trim();
            if (!msg) { showToast('Please enter a message', 'error'); return; }
            showToast('Post submitted!', 'success');
            form.querySelector('textarea').value = '';
            state.points += 5;
            if (state.points >= 50) awardBadge('Forum Contributor');
        });
    });
    document.querySelectorAll('.forum-reply-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const msg = form.querySelector('textarea').value.trim();
            if (!msg) { showToast('Please enter a reply', 'error'); return; }
            showToast('Reply submitted!', 'success');
            form.querySelector('textarea').value = '';
        });
    });
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
async function sendChat() {
    const chatInput     = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    if (!chatInput || !chatContainer) return;
    const message = chatInput.value.trim();
    if (!message) return;

    const userMsg = document.createElement('p');
    userMsg.className = 'user';
    userMsg.textContent = `${state.currentUser || 'You'}: ${message}`;
    chatContainer.appendChild(userMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    gsap.from(userMsg, { opacity: 0, y: 10, duration: 0.3 });
    chatInput.value = '';

    const aiMsg = document.createElement('p');
    aiMsg.className = 'ai';
    aiMsg.textContent = 'AI: Thinking...';
    chatContainer.appendChild(aiMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        if (state.offline) {
            aiMsg.textContent = 'AI: You are offline. Your message will be sent when you reconnect.';
            cacheRequest(`${APP_CONFIG.pyBase}/api/chat`, { message, user: state.currentUser });
        } else {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                },
                body: JSON.stringify({ message })
            });
            const data = await res.json();
            aiMsg.textContent = `AI: ${data.response || "I'm not sure how to answer that."}`;
        }
    } catch (e) {
        aiMsg.textContent = 'AI: Sorry, I could not connect to the server.';
        console.error('Chat error:', e);
    }
    gsap.from(aiMsg, { opacity: 0, y: 10, duration: 0.3 });
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
async function loadQuizzes() {
    const quizDiv = document.getElementById('quiz-content');
    if (!quizDiv) return;
    try {
        let quizzes = mockQuizzes;
        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/quizzes`, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.success && data.quizzes?.length) { mockQuizzes = data.quizzes; quizzes = data.quizzes; }
        }

        quizDiv.innerHTML = '<div class="quiz-timer">Time: <span id="timer">60</span>s</div>';
        quizzes.forEach((quiz, i) => {
            quizDiv.innerHTML += `
                <div class="quiz-card" role="group" aria-label="Question ${i + 1}">
                    <p><strong>Q${i + 1}:</strong> ${quiz.question}</p>
                    ${quiz.options.map((opt, j) => `
                        <label class="quiz-option">
                            <input type="radio" name="quiz${i}" value="${j}" aria-label="${opt}">
                            <span>${opt}</span>
                        </label>`).join('')}
                </div>`;
        });
        gsap.from('.quiz-card', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });

        clearInterval(state.quizTimer);
        let timeLeft = 60;
        const timerEl = document.getElementById('timer');
        timerEl.textContent = timeLeft;
        state.quizTimer = setInterval(() => {
            timeLeft--;
            timerEl.textContent = timeLeft;
            if (timeLeft <= 10) timerEl.style.color = 'hsl(0,80%,50%)';
            if (timeLeft <= 0) { clearInterval(state.quizTimer); submitQuiz(); }
        }, 1000);
    } catch (e) {
        showToast('Failed to load quizzes', 'error');
        quizDiv.innerHTML = '<p>Unable to load quizzes</p>';
    }
}

async function submitQuiz(event) {
    // Guard: timer calls this with no argument
    if (event) event.preventDefault();
    clearInterval(state.quizTimer);

    const answers = [];
    document.querySelectorAll('#quiz-content input[type="radio"]:checked').forEach(input => {
        answers.push({
            questionIndex:  parseInt(input.name.replace('quiz', '')),
            question_id:    mockQuizzes[parseInt(input.name.replace('quiz', ''))]?.id,
            answer:         parseInt(input.value)
        });
    });

    if (answers.length === 0) { showModal('Please select at least one answer'); return; }

    try {
        let score = 0;
        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/submit-quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${state.token}`
                },
                body: JSON.stringify({ answers })
            });
            const data = await res.json();
            if (data.success) {
                score = data.score;
                state.points += data.points_earned || 0;
            }
        } else {
            answers.forEach(a => {
                if (mockQuizzes[a.questionIndex]?.correctAnswer === a.answer) score += 50;
            });
            const pts = Math.round(score / 10);
            state.points += pts;
            if (state.offline) cacheRequest(`${APP_CONFIG.pyBase}/api/submit-quiz`, { answers });
        }

        showModal(`Quiz submitted! Score: ${score}% 🎉`);
        playSound('success');
        if (score >= 80) awardBadge('Quiz Champion');
        loadDashboard();
    } catch (e) {
        showModal('Failed to submit quiz');
        console.error('Quiz submit error:', e);
    }
}

// ── Content Upload ────────────────────────────────────────────────────────────
function setupDragAndDrop() {
    const dropZone = document.getElementById('content-upload-form');
    if (!dropZone) return;
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('content-body').value = ev.target.result;
                showToast('File loaded successfully', 'success');
            };
            reader.onerror = () => showToast('Failed to read file', 'error');
            reader.readAsText(file);
        } else {
            showToast('Please drop a .txt file', 'error');
        }
    });
}

async function uploadContent(event) {
    if (event) event.preventDefault();
    if (state.userType !== 'tutor') {
        showToast('Only tutors can upload content', 'error');
        playSound('error');
        return;
    }
    const title = document.getElementById('content-title').value.trim();
    const body  = document.getElementById('content-body').value.trim();
    if (!title || !body) { showToast('Please fill in all fields', 'error'); return; }

    try {
        if (!state.offline) {
            const res = await fetch(`${APP_CONFIG.phpBase}?action=upload-content`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                },
                body: JSON.stringify({ title, body, uploaded_by: state.userId })
            });
            const data = await res.json();
            if (!data.success) { showToast(data.error || 'Upload failed', 'error'); return; }
        } else {
            cacheRequest(`${APP_CONFIG.phpBase}?action=upload-content`, { title, body, uploaded_by: state.userId });
        }
        state.points += 10;
        showToast('Content uploaded! (+10 points)', 'success');
        playSound('success');
        document.getElementById('content-title').value = '';
        document.getElementById('content-body').value  = '';
        awardBadge('Content Creator');
    } catch (e) {
        showToast('Failed to upload content', 'error');
        console.error('Upload error:', e);
    }
}

function previewContent() {
    const title   = document.getElementById('content-title').value.trim();
    const body    = document.getElementById('content-body').value.trim();
    const preview = document.getElementById('content-preview');
    if (!title || !body || !preview) { showToast('Please fill in all fields', 'error'); return; }
    preview.innerHTML = `<h4>${title}</h4><p>${body}</p>`;
    preview.classList.add('active');
    gsap.from(preview, { opacity: 0, y: 20, duration: 0.5 });
}

// ── Real-Time Collaboration ───────────────────────────────────────────────────
function setupRealTimeCollaboration() {
    const contentBody = document.getElementById('content-body');
    if (!contentBody) return;

    const wsUrl = window.APP_CONFIG?.wsUrl;
    if (!wsUrl) {
        console.info('WebSocket URL not configured — real-time collaboration disabled');
        return;
    }

    let ws;
    try {
        ws = new WebSocket(wsUrl);
        ws.onopen  = () => console.info('WebSocket connected');
        ws.onclose = () => console.info('WebSocket disconnected');
        ws.onerror = () => { console.warn('WebSocket error — collaboration disabled'); ws = null; };
        ws.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.content && data.user !== state.currentUser) {
                    contentBody.value = data.content;
                    showToast(`${data.user} updated the content`, 'success');
                }
            } catch { /* ignore malformed messages */ }
        };
    } catch (e) {
        console.warn('WebSocket unavailable — collaboration disabled', e);
        return;
    }

    let debounce;
    contentBody.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            if (ws?.readyState === WebSocket.OPEN) {
                try { ws.send(JSON.stringify({ content: contentBody.value, user: state.currentUser })); }
                catch { /* ignore send errors */ }
            }
        }, 300);
    });
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
    if (state.userType !== 'tutor') {
        showToast('Only tutors can view analytics', 'error');
        return;
    }
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;

    // Destroy existing chart to prevent "Canvas already in use" error
    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    try {
        let students = ['User1', 'User2', 'User3'];
        let progress = [70, 85, 60];

        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/analytics`, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.success) { students = data.students; progress = data.progress; }
        }

        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: students,
                datasets: [{
                    label: 'Progress (%)',
                    data: progress,
                    backgroundColor: students.map((_, i) =>
                        `hsla(${(i * 60 + 200) % 360}, 70%, 55%, 0.8)`),
                    borderColor: students.map((_, i) =>
                        `hsl(${(i * 60 + 200) % 360}, 70%, 45%)`),
                    borderWidth: 2,
                    borderRadius: 8,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-color') } },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}%` } }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: 'var(--text-muted)' } },
                    x: { ticks: { color: 'var(--text-muted)' } }
                },
                animation: { duration: 800, easing: 'easeOutQuart' }
            }
        });
        gsap.from(canvas, { opacity: 0, scale: 0.95, duration: 0.5 });
    } catch (e) {
        showToast('Failed to load analytics', 'error');
        canvas.parentElement.innerHTML = '<p>Unable to load analytics</p>';
    }
}

// ── Feedback ──────────────────────────────────────────────────────────────────
async function submitFeedback(event) {
    event.preventDefault();
    const type    = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value.trim();
    if (!message) { showToast('Please enter a message', 'error'); return; }

    try {
        if (!state.offline) {
            const res = await fetch(`${APP_CONFIG.phpBase}?action=feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
                },
                body: JSON.stringify({ user_id: state.userId || 0, type, message })
            });
            const data = await res.json();
            if (!data.success) { showToast(data.error || 'Feedback failed', 'error'); return; }
        } else {
            cacheRequest(`${APP_CONFIG.phpBase}?action=feedback`, { user_id: state.userId || 0, type, message });
        }
        showToast('Feedback submitted! Thank you 🙏', 'success');
        document.getElementById('feedback-message').value = '';
        state.points += 2;
        if (state.points >= 20) awardBadge('Feedback Star');
    } catch (e) {
        showToast('Failed to submit feedback', 'error');
        console.error('Feedback error:', e);
    }
}

function loadFeedback() {
    const form = document.querySelector('.feedback form');
    if (form && !form.dataset.bound) {
        form.addEventListener('submit', submitFeedback);
        form.dataset.bound = '1';
        gsap.from(form, { opacity: 0, y: 20, duration: 0.5 });
    }
}

// ── Help ──────────────────────────────────────────────────────────────────────
function loadHelp() {
    document.querySelectorAll('.help-content details').forEach((d, i) => {
        gsap.from(d, { opacity: 0, y: 20, duration: 0.5, delay: i * 0.1 });
    });
}

// ── Repository ────────────────────────────────────────────────────────────────
async function loadRepository() {
    const repoDiv = document.getElementById('content-repo');
    if (!repoDiv) return;
    try {
        let items = [
            { title: 'Python Variables',    description: 'Learn about variables in Python.' },
            { title: 'Integration Basics',  description: 'Understand integration techniques.' },
            { title: 'HTML Basics',         description: 'Introduction to web structure.' },
            { title: 'Linked Lists',        description: 'Concepts and implementation.' },
            { title: 'Linear Regression',   description: 'ML model fundamentals.' },
        ];

        if (!state.offline && state.token) {
            const res = await fetch(`${APP_CONFIG.pyBase}/api/repository`, {
                headers: { Authorization: `Bearer ${state.token}` }
            });
            const data = await res.json();
            if (data.success && data.items?.length) items = data.items;
        }

        repoDiv.innerHTML = '<h2>Educational Content Repository</h2>' +
            items.map(item => `
                <div class="content-item" role="listitem">
                    <strong>${item.title}</strong>: ${item.description}
                </div>`).join('');
        gsap.from('.content-item', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
    } catch (e) {
        showToast('Failed to load repository', 'error');
        repoDiv.innerHTML = '<h2>Educational Content Repository</h2><p>Unable to load content</p>';
    }
}

// ── Data Loader ───────────────────────────────────────────────────────────────
async function loadData() {
    try {
        const res = await fetch('Datasets/tutoring_system_data.json');
        if (!res.ok) return;
        const data = await res.json();
        if (data.courses?.length)  mockCourses = data.courses;
        if (data.quizzes?.length)  mockQuizzes = data.quizzes;
        if (data.interactions)     state.interactions = data.interactions;
        if (data.feedback)         state.feedbackData = data.feedback;
        if (data.analytics)        state.analyticsData = data.analytics;
    } catch { /* dataset optional — silently ignore */ }
}

// ── Initialisation ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Restore theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Init subsystems
    initializeSounds();
    setupDragAndDrop();
    initParticles();
    setupVoiceInput();
    setupOfflineSupport();
    setupRealTimeCollaboration();
    setupSwipeNavigation();
    loadData();
    loadRepository();

    // Theme toggle
    document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);

    // Sidebar toggle
    document.querySelector('.sidebar-toggle')?.addEventListener('click', toggleSidebar);

    // Modal close
    document.querySelector('#modal button')?.addEventListener('click', closeModal);

    // Login form
    document.querySelector('.login-form form')?.addEventListener('submit', login);

    // Chat send button — by stable ID
    document.getElementById('send-btn')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    // Quiz form
    document.getElementById('quiz-content')?.addEventListener('submit', submitQuiz);

    // Upload buttons — by stable ID
    document.getElementById('upload-btn')?.addEventListener('click', uploadContent);
    document.getElementById('preview-btn')?.addEventListener('click', previewContent);

    // Navigation delegation
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('.nav a, .sidebar a');
        if (link) {
            e.preventDefault();
            const sectionId = link.getAttribute('href')?.replace('#', '') || 'login-form';
            showSection(sectionId);
        }
    });
});
