/* eslint-disable no-undef, no-console */

// State Management
const state = {
    currentUser: null,
    userType: null,
    quizTimer: null,
    isDragging: false,
    points: 0,
    courses: [],
    streak: 0,
    offline: !navigator.onLine
};

// Mock API Data (for testing without backend)
const mockCourses = [
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

const mockQuizzes = [
    {
        question: "What is the output of `print(2 + 2)` in Python?",
        options: ["22", "4", "Error", "None"],
        correctAnswer: 1
    },
    {
        question: "What is the derivative of x²?",
        options: ["2x", "x", "x²", "2"],
        correctAnswer: 0
    }
];

// Sound Effects
const sounds = {};
function initializeSounds() {
    try {
        sounds.toggle = new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_d6c3b7c8b9.mp3'] });
        sounds.click = new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_5b8c7e8f7e.mp3'] });
        sounds.success = new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_7f8a7e8f7e.mp3'] });
        sounds.error = new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_3c8b7e8f7e.mp3'] });
        sounds.badge = new Howl({ src: ['https://cdn.pixabay.com/audio/2022/03/10/audio_a7b8c7e8f7e.mp3'] });
    } catch (error) {
        console.error('Sound initialization failed:', error);
    }
}

function playSound(type) {
    if (sounds[type]) {
        try {
            sounds[type].play();
        } catch (error) {
            console.error(`Failed to play sound ${type}:`, error);
        }
    }
}

// Toast Notification
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
            y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', onComplete: () => {
                setTimeout(() => {
                    gsap.to(toast, { opacity: 0, duration: 0.5, onComplete: () => toast.remove() });
                }, 3000);
            }
        }
    );
}

// Theme Toggle
function toggleTheme() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    gsap.to(root, {
        duration: 0.5,
        opacity: 0,
        onComplete: () => {
            root.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            gsap.to(root, { duration: 0.5, opacity: 1 });
            initParticles();
            updateCourseCards();
            playSound('toggle');
        }
    });
}

// Particle.js Background
function initParticles() {
    try {
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
    } catch (error) {
        console.error('Particle.js initialization failed:', error);
    }
}

// Offline Support
function setupOfflineSupport() {
    window.addEventListener('online', () => {
        state.offline = false;
        document.body.classList.remove('offline');
        showToast('Back online!', 'success');
        syncOfflineData();
    });
    window.addEventListener('offline', () => {
        state.offline = true;
        document.body.classList.add('offline');
        showToast('Offline mode activated', 'error');
    });
    if (state.offline) {
        document.body.classList.add('offline');
    }
}

async function syncOfflineData() {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('tutoring-system');
        const requests = await cache.keys();
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const data = await response.json();
                await fetch(request.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                await cache.delete(request);
            }
        }
        showToast('Offline data synced', 'success');
    } catch (error) {
        console.error('Offline sync failed:', error);
    }
}

async function cacheRequest(url, data) {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('tutoring-system');
        await cache.put(url, new Response(JSON.stringify(data)));
    } catch (error) {
        console.error('Cache request failed:', error);
    }
}

// Voice Input
function setupVoiceInput() {
    const chatInput = document.getElementById('chat-input');
    const voiceBtn = document.querySelector('.voice-btn');
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
            } catch (error) {
                showToast('Voice recognition failed', 'error');
                console.error('Voice recognition start failed:', error);
            }
        });

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            voiceBtn.classList.remove('recording');
            sendChat();
        };

        recognition.onerror = (error) => {
            voiceBtn.classList.remove('recording');
            showToast('Voice recognition failed', 'error');
            console.error('Voice recognition error:', error);
        };
    } else {
        voiceBtn.style.display = 'none';
        console.warn('SpeechRecognition not supported');
    }
}

// Modal Handling
function showModal(message) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    const modalMessage = document.getElementById('modal-message');
    modalMessage.textContent = message;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    gsap.fromTo('.modal-content',
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
    modal.querySelector('button').focus();
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (!modal) return;
    gsap.to('.modal-content', {
        scale: 0.8,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    });
}

// Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('active');
    gsap.to(sidebar, {
        left: sidebar.classList.contains('active') ? 0 : -280,
        duration: 0.3,
        ease: 'power2.out'
    });
}

// Swipe Navigation
function setupSwipeNavigation() {
    let touchStartX = 0;
    let touchEndX = 0;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });
    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchEndX - touchStartX > 50) {
            toggleSidebar();
        } else if (touchStartX - touchEndX > 50) {
            toggleSidebar();
        }
    });
}

// Section Navigation
function showSection(sectionId) {
    console.log('Navigating to section:', sectionId);
    const sections = document.querySelectorAll('.content');
    if (!sections.length) {
        console.error('No content sections found');
        showToast('Navigation error: No sections available', 'error');
        return;
    }

    sections.forEach(section => section.classList.remove('active'));

    const targetSection = document.getElementById(sectionId);
    if (!targetSection) {
        console.error(`Section with ID ${sectionId} not found`);
        showToast(`Section "${sectionId}" not found`, 'error');
        const fallbackSection = document.getElementById('login-form');
        if (fallbackSection) {
            fallbackSection.classList.add('active');
            console.log('Falling back to login-form');
        }
        return;
    }

    targetSection.classList.add('active');
    gsap.fromTo(targetSection,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }
    );
    toggleSidebar();

    try {
        switch (sectionId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'quiz-section':
                loadQuizzes();
                break;
            case 'course-section':
                loadCourseSection();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'feedback':
                loadFeedback();
                break;
            case 'help':
                loadHelp();
                break;
            case 'repository':
                loadRepository();
                break;
            case 'chatbot':
            case 'content-upload':
                // No specific load function needed
                break;
            default:
                console.warn(`No specific load function for section: ${sectionId}`);
        }
    } catch (error) {
        console.error(`Error loading section ${sectionId}:`, error);
        showToast(`Failed to load ${sectionId}`, 'error');
    }

    playSound('click');
}

// Login
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
        // Mock login response
        const data = { success: true, points: 0, streak: 1 };
        state.currentUser = username;
        state.points = data.points || 0;
        state.streak = data.streak || 0;
        showToast('Login successful!', 'success');
        playSound('success');
        showSection('dashboard');
        updateUserStatus();
        checkStreak();
    } catch (error) {
        showModal('Network error. Please try again.');
        console.error('Login error:', error);
        if (state.offline) {
            cacheRequest('/api/login', { username, password, userType: state.userType });
        }
    }
}

// User Status
function updateUserStatus() {
    const status = document.querySelector('.user-status');
    if (status) {
        status.textContent = state.offline ? 'Offline' : 'Online';
        status.setAttribute('aria-label', `User Status: ${state.offline ? 'Offline' : 'Online'}`);
    }
}

// Streak Management
function checkStreak() {
    const lastLogin = localStorage.getItem('lastLogin');
    const today = new Date().toISOString().split('T')[0];
    if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastLogin === yesterday) {
            state.streak++;
            localStorage.setItem('streak', state.streak);
            showToast(`Streak: ${state.streak} days!`, 'success');
            if (state.streak % 5 === 0) awardBadge('Streak Master');
        } else {
            state.streak = 1;
            localStorage.setItem('streak', state.streak);
        }
        localStorage.setItem('lastLogin', today);
        updateStreakDisplay();
    }
}

function updateStreakDisplay() {
    const streakDiv = document.querySelector('.streak p');
    if (streakDiv) {
        streakDiv.textContent = `Current Streak: ${state.streak} days`;
        gsap.from(streakDiv, { opacity: 0, scale: 0.8, duration: 0.5 });
    }
}

// Badge System
function awardBadge(badgeName) {
    const badgesDiv = document.querySelector('.badges');
    if (!badgesDiv) return;
    const badgeType = badgeName.toLowerCase().replace(' ', '-');
    const badge = document.createElement('div');
    badge.className = `badge badge-${badgeType}`;
    badge.textContent = badgeName;
    badge.setAttribute('data-type', badgeType);
    badgesDiv.appendChild(badge);
    gsap.from(badge, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' });
    showToast(`Badge earned: ${badgeName}!`, 'success');
    playSound('badge');
}

// Dashboard
async function loadDashboard() {
    if (!state.currentUser) {
        showSection('login-form');
        return;
    }
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${state.currentUser}! (Points: ${state.points})`;
        welcomeMessage.setAttribute('aria-live', 'polite');
        gsap.from(welcomeMessage, { opacity: 0, x: -20, duration: 0.5 });
    }
    try {
        const data = {
            progress: 50,
            courses: mockCourses.map(course => ({ ...course, progress: Math.floor(Math.random() * 100) })),
            recommendations: ["Advanced Python", "Linear Algebra"]
        };
        updateProgressTracker(data.progress || 0);
        updateCourseCards(data.courses || []);
        const recommendationsDiv = document.getElementById('recommendations');
        if (recommendationsDiv) {
            recommendationsDiv.textContent = `Recommendations: ${data.recommendations?.join(', ') || 'None'}`;
            gsap.from(recommendationsDiv, { opacity: 0, y: 20, duration: 0.5, delay: 0.2 });
        }
        loadLeaderboard();
    } catch (error) {
        showToast('Failed to load dashboard', 'error');
        console.error('Dashboard error:', error);
    }
}

function updateProgressTracker(progress) {
    const milestones = document.querySelectorAll('.milestone');
    milestones.forEach(milestone => {
        const value = parseInt(milestone.dataset.milestone);
        milestone.classList.toggle('active', progress >= value);
    });
}

async function loadLeaderboard() {
    const leaderboardDiv = document.querySelector('.leaderboard');
    if (!leaderboardDiv) return;
    try {
        const data = [
            { username: "User1", points: 100 },
            { username: "User2", points: 80 },
            { username: "User3", points: 60 }
        ];
        leaderboardDiv.innerHTML = '<h3>Leaderboard</h3><ul>' +
            data.map(user => `<li>${user.username}: ${user.points} points</li>`).join('') +
            '</ul>';
        gsap.from(leaderboardDiv, { opacity: 0, y: 20, duration: 0.5 });
    } catch (error) {
        console.error('Leaderboard error:', error);
        leaderboardDiv.innerHTML = '<h3>Leaderboard</h3><p>Unable to load leaderboard</p>';
    }
}

function updateCourseCards(courses = []) {
    const courseGrid = document.querySelector('.course-grid');
    if (!courseGrid) return;
    state.courses = courses;
    courseGrid.innerHTML = courses.map(course => `
        <div class="course-card" data-course-id="${course.id}" role="gridcell">
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div>Progress</div>
            <div class="progress-bar"><div class="progress-fill" role="progressbar" aria-valuenow="${course.progress}" aria-valuemin="0" aria-valuemax="100" style="width: ${course.progress}%"></div></div>
        </div>
    `).join('');
    gsap.from('.course-card', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
}
async function loadData() {
    try {
        const response = await fetch('tutoring_system_data.json');
        const data = await response.json();
        // Replace mock data
        window.mockUsers = data.users;
        window.mockCourses = data.courses;
        window.mockQuizzes = data.quizzes;
        // Add to state for other features
        state.interactions = data.interactions;
        state.feedback = data.feedback;
        state.analytics = data.analytics;
    } catch (error) {
        console.error('Failed to load dataset:', error);
        showToast('Error loading data', 'error');
    }
}
document.addEventListener('DOMContentLoaded', loadData);

// Course Section
async function loadCourseSection() {
    const courseDetails = document.getElementById('course-details');
    if (!courseDetails) return;
    try {
        const courses = mockCourses;
        state.courses = courses;
        courseDetails.innerHTML = courses.map(course => `
            <div class="course-detail" data-course-id="${course.id}">
                <h3>${course.title}</h3>
                <p>${course.description}</p>
                <div class="course-syllabus">
                    <h4>Syllabus</h4>
                    <ul>${course.syllabus?.map(item => `<li>${item}</li>`).join('') || '<li>No syllabus available</li>'}</ul>
                </div>
                <div class="course-assignments">
                    <h4>Assignments</h4>
                    <ul>${course.assignments?.map(assignment => `<li>${assignment.title} (Due: ${assignment.dueDate})</li>`).join('') || '<li>No assignments</li>'}</ul>
                </div>
                <div class="course-forum">
                    <h4>Discussion Forum</h4>
                    ${course.forumPosts?.map(post => `
                        <div class="forum-post" data-post-id="${post.id}">
                            <p><strong>${post.user}:</strong> ${post.message}</p>
                            ${post.replies?.map(reply => `<p class="reply"><strong>${reply.user}:</strong> ${reply.message}</p>`).join('') || ''}
                            <form class="forum-reply-form" data-post-id="${post.id}">
                                <textarea placeholder="Reply..." aria-label="Reply to post" required></textarea>
                                <button type="submit">Post Reply</button>
                            </form>
                        </div>
                    `).join('') || '<p>No posts yet</p>'}
                    <form class="forum-post-form" data-course-id="${course.id}">
                        <textarea placeholder="Start a discussion..." aria-label="New forum post" required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>
            </div>
        `).join('');
        setupForumInteractions();
        gsap.from('.course-detail', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
    } catch (error) {
        showToast('Failed to load courses', 'error');
        console.error('Course error:', error);
        courseDetails.innerHTML = '<p>Unable to load courses</p>';
    }
}

function setupForumInteractions() {
    document.querySelectorAll('.forum-post-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const courseId = form.dataset.courseId;
            const message = form.querySelector('textarea').value.trim();
            if (!message) {
                showToast('Please enter a message', 'error');
                return;
            }
            showToast('Post submitted!', 'success');
            form.querySelector('textarea').value = '';
            state.points += 5;
            if (state.points >= 50) awardBadge('Forum Contributor');
        });
    });

    document.querySelectorAll('.forum-reply-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const postId = form.dataset.postId;
            const message = form.querySelector('textarea').value.trim();
            if (!message) {
                showToast('Please enter a reply', 'error');
                return;
            }
            showToast('Reply submitted!', 'success');
            form.querySelector('textarea').value = '';
        });
    });
}

// Chatbot
async function sendChat() {
    const chatInput = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    if (!chatInput || !chatContainer) return;
    const message = chatInput.value.trim();
    if (!message) return;
    const userMessage = document.createElement('p');
    userMessage.className = 'user';
    userMessage.textContent = `${state.currentUser}: ${message}`;
    chatContainer.appendChild(userMessage);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    gsap.from(userMessage, { opacity: 0, y: 10, duration: 0.3 });
    chatInput.value = '';
    try {
        const aiMessage = document.createElement('p');
        aiMessage.className = 'ai';
        aiMessage.textContent = `AI: Thanks for your message! (Mock response)`;
        chatContainer.appendChild(aiMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        gsap.from(aiMessage, { opacity: 0, y: 10, duration: 0.3 });
    } catch (error) {
        showToast('Failed to get AI response', 'error');
        console.error('Chat error:', error);
        if (state.offline) {
            cacheRequest('/api/chat', { user: state.currentUser, message });
        }
    }
}

// Quizzes
async function loadQuizzes() {
    const quizDiv = document.getElementById('quiz-content');
    if (!quizDiv) return;
    try {
        const data = mockQuizzes;
        quizDiv.innerHTML = '<div class="quiz-timer">Time: <span id="timer">60</span>s</div>';
        data.forEach((quiz, index) => {
            quizDiv.innerHTML += `
                <div class="quiz-card" role="group" aria-label="Question ${index + 1}">
                    <p>${quiz.question}</p>
                    ${quiz.options.map((option, i) => `
                        <label class="quiz-option">
                            <input type="radio" name="quiz${index}" value="${i}" aria-label="${option}">
                            <span>${option}</span>
                        </label>
                    `).join('')}
                </div>`;
        });
        gsap.from('.quiz-card', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
        clearInterval(state.quizTimer);
        let timeLeft = 60;
        const timer = document.getElementById('timer');
        timer.textContent = timeLeft;
        state.quizTimer = setInterval(() => {
            timeLeft--;
            timer.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(state.quizTimer);
                submitQuiz();
            }
        }, 1000);
    } catch (error) {
        showToast('Failed to load quizzes', 'error');
        console.error('Quiz error:', error);
        quizDiv.innerHTML = '<p>Unable to load quizzes</p>';
    }
}

async function submitQuiz(event) {
    event.preventDefault();
    clearInterval(state.quizTimer);
    const answers = [];
    document.querySelectorAll('#quiz-content input[type="radio"]:checked').forEach(input => {
        answers.push({
            questionIndex: parseInt(input.name.replace('quiz', '')),
            answer: parseInt(input.value)
        });
    });
    if (answers.length === 0) {
        showModal('Please select at least one answer');
        return;
    }
    try {
        let score = 0;
        answers.forEach(answer => {
            if (mockQuizzes[answer.questionIndex].correctAnswer === answer.answer) score += 50;
        });
        const pointsEarned = Math.round(score / 10);
        state.points += pointsEarned;
        showModal(`Quiz submitted! Score: ${score}% (+${pointsEarned} points)`);
        playSound('success');
        if (score >= 80) awardBadge('Quiz Champion');
        loadDashboard();
    } catch (error) {
        showModal('Failed to submit quiz');
        console.error('Quiz submit error:', error);
        if (state.offline) {
            cacheRequest('/api/submit-quiz', { user: state.currentUser, answers });
        }
    }
}

// Content Upload
function setupDragAndDrop() {
    const dropZone = document.getElementById('content-upload');
    if (!dropZone) return;
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-active');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-active');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-active');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'text/plain') {
            const reader = new FileReader();
            reader.onload = (event) => {
                document.getElementById('content-body').value = event.target.result;
                showToast('File loaded successfully', 'success');
            };
            reader.onerror = () => {
                showToast('Failed to read file', 'error');
            };
            reader.readAsText(file);
        } else {
            showToast('Please drop a .txt file', 'error');
        }
    });
}

async function uploadContent(event) {
    event.preventDefault();
    if (state.userType !== 'tutor') {
        showToast('Only tutors can upload content', 'error');
        playSound('error');
        return;
    }
    const title = document.getElementById('content-title').value.trim();
    const body = document.getElementById('content-body').value.trim();
    if (!title || !body) {
        showToast('Please fill in all fields', 'error');
        playSound('error');
        return;
    }
    try {
        state.points += 10;
        showToast('Content uploaded successfully! (+10 points)', 'success');
        playSound('success');
        document.getElementById('content-title').value = '';
        document.getElementById('content-body').value = '';
        awardBadge('Content Creator');
    } catch (error) {
        showToast('Failed to upload content', 'error');
        console.error('Upload error:', error);
        if (state.offline) {
            cacheRequest('/api/upload-content', { title, body, uploadedBy: state.currentUser });
        }
    }
}

function previewContent() {
    const title = document.getElementById('content-title').value.trim();
    const body = document.getElementById('content-body').value.trim();
    const previewDiv = document.getElementById('content-preview');
    if (!title || !body || !previewDiv) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    previewDiv.innerHTML = `<h4>${title}</h4><p>${body}</p>`;
    previewDiv.classList.add('active');
    gsap.from(previewDiv, { opacity: 0, y: 20, duration: 0.5 });
}

// Real-Time Collaboration
function setupRealTimeCollaboration() {
    const contentBody = document.getElementById('content-body');
    if (!contentBody) return;
    let ws;
    try {
        ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => console.log('WebSocket connected');
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.content && data.user !== state.currentUser) {
                    contentBody.value = data.content;
                    showToast(`${data.user} updated the content`, 'success');
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };
        ws.onerror = (error) => console.error('WebSocket error:', error);
        ws.onclose = () => console.log('WebSocket disconnected');
    } catch (error) {
        console.error('WebSocket initialization failed:', error);
    }

    let debounceTimeout;
    contentBody.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const content = contentBody.value;
            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify({ content, user: state.currentUser }));
                } catch (error) {
                    console.error('WebSocket send error:', error);
                }
            }
        }, 300);
    });
}

// Analytics
async function loadAnalytics() {
    if (state.userType !== 'tutor') {
        showToast('Only tutors can view analytics', 'error');
        playSound('error');
        return;
    }
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    try {
        const data = {
            students: ["User1", "User2", "User3"],
            progress: [70, 85, 60]
        };
        const ctx = canvas.getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.students,
                datasets: [{
                    label: 'Progress (%)',
                    data: data.progress,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 } },
                plugins: {
                    tooltip: { callbacks: { label: (context) => `${context.label}: ${context.raw}%` } }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    onComplete: () => {
                        gsap.from('#progress-chart', { opacity: 0, scale: 0.9, duration: 0.5 });
                    }
                }
            }
        });
    } catch (error) {
        showToast('Failed to load analytics', 'error');
        console.error('Analytics error:', error);
        canvas.parentElement.innerHTML = '<p>Unable to load analytics</p>';
    }
}

// Feedback
async function submitFeedback(event) {
    event.preventDefault();
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value.trim();
    if (!message) {
        showToast('Please enter a message', 'error');
        return;
    }
    try {
        showToast('Feedback submitted!', 'success');
        document.getElementById('feedback-message').value = '';
        state.points += 2;
        if (state.points >= 20) awardBadge('Feedback Star');
    } catch (error) {
        showToast('Failed to submit feedback', 'error');
        console.error('Feedback error:', error);
        if (state.offline) {
            cacheRequest('/api/feedback', { user: state.currentUser || 'Anonymous', type, message });
        }
    }
}

function loadFeedback() {
    const form = document.querySelector('.feedback form');
    if (form) {
        form.addEventListener('submit', submitFeedback);
        gsap.from(form, { opacity: 0, y: 20, duration: 0.5 });
    }
}

// Help
function loadHelp() {
    const details = document.querySelectorAll('.help-content details');
    details.forEach((detail, index) => {
        gsap.from(detail, { opacity: 0, y: 20, duration: 0.5, delay: index * 0.1 });
    });
}

// Repository
async function loadRepository() {
    const repoDiv = document.getElementById('content-repo');
    if (!repoDiv) return;
    try {
        const data = [
            { title: "Python Variables", description: "Learn about variables in Python." },
            { title: "Integration Basics", description: "Understand integration techniques." },
            { title: "HTML Basics", description: "Introduction to web structure." },
            { title: "Linked Lists", description: "Concepts and implementation." },
            { title: "Linear Regression", description: "ML model fundamentals." }
        ];
        repoDiv.innerHTML = data.map(item => `
            <div class="content-item" role="listitem">${item.title}: ${item.description}</div>
        `).join('');
        gsap.from('.content-item', { opacity: 0, y: 20, stagger: 0.1, duration: 0.5 });
    } catch (error) {
        showToast('Failed to load repository', 'error');
        console.error('Repository error:', error);
        repoDiv.innerHTML = '<p>Unable to load repository</p>';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    initializeSounds();
    setupDragAndDrop();
    initParticles();
    setupVoiceInput();
    setupOfflineSupport();
    setupRealTimeCollaboration();
    setupSwipeNavigation();
    loadRepository();

    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);

    const modalClose = document.querySelector('#modal button');
    if (modalClose) modalClose.addEventListener('click', closeModal);

    const loginForm = document.querySelector('.login-form form');
    if (loginForm) loginForm.addEventListener('submit', login);

    const chatButton = document.querySelector('.chat-input-group button');
    if (chatButton) chatButton.addEventListener('click', sendChat);

    const quizForm = document.getElementById('quiz-content');
    if (quizForm) quizForm.addEventListener('submit', submitQuiz);

    const uploadButton = document.querySelector('#content-upload button:last-child');
    if (uploadButton) uploadButton.addEventListener('click', uploadContent);

    const previewButton = document.querySelector('#content-upload button:first-child');
    if (previewButton) previewButton.addEventListener('click', previewContent);

    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('.nav a, .sidebar a');
        if (link) {
            e.preventDefault();
            const sectionId = link.getAttribute('href')?.replace('#', '') || 'login-form';
            console.log('Navigation link clicked:', sectionId);
            showSection(sectionId);
        }
    });
});