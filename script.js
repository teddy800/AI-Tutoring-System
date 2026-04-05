/* eslint-disable no-undef, no-console */
'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
window.APP_CONFIG = { phpBase:'http://localhost:8080', pyBase:'http://localhost:5000', wsUrl:null };

// ── State ─────────────────────────────────────────────────────────────────────
const S = {
    user:null, userId:null, role:null, token:null,
    points:0, streak:0, level:1, xp:0,
    courses:[], quizTimer:null, chartType:'bar', starRating:0,
    offline:!navigator.onLine, enrolled:[], scoreHistory:[], notifications:[]
};

// ── Session persistence ───────────────────────────────────────────────────────
function saveSession() {
    if (!S.user) return;
    localStorage.setItem('nl_session', JSON.stringify({
        user:S.user, userId:S.userId, role:S.role, token:S.token,
        points:S.points, streak:S.streak, level:S.level, xp:S.xp,
        enrolled:S.enrolled, scoreHistory:S.scoreHistory
    }));
}
function loadSession() {
    try {
        const d = JSON.parse(localStorage.getItem('nl_session') || 'null');
        if (!d?.user) return false;
        Object.assign(S, d);
        return true;
    } catch { return false; }
}
function clearSession() {
    localStorage.removeItem('nl_session');
    S.user=null; S.userId=null; S.role=null; S.token=null;
    S.points=0; S.streak=0; S.level=1; S.xp=0;
    S.enrolled=[]; S.scoreHistory=[]; S.notifications=[];
}

// ── XP / Level system ─────────────────────────────────────────────────────────
const XP_PER_LEVEL = 100;
function addXP(amount) {
    S.xp += amount;
    const newLevel = Math.floor(S.xp / XP_PER_LEVEL) + 1;
    if (newLevel > S.level) { S.level = newLevel; showLevelUp(newLevel); }
    updateXPBar(); saveSession();
}
function updateXPBar() {
    const xpInLevel = S.xp % XP_PER_LEVEL;
    const pct = (xpInLevel / XP_PER_LEVEL) * 100;
    const fill = document.getElementById('sidebar-xp-fill');
    const txt  = document.getElementById('sidebar-xp-text');
    const lvl  = document.getElementById('sidebar-level');
    const statLvl = document.getElementById('stat-level');
    if (fill) fill.style.width = pct + '%';
    if (txt)  txt.textContent  = `${xpInLevel} / ${XP_PER_LEVEL} XP`;
    if (lvl)  lvl.textContent  = S.level;
    if (statLvl) statLvl.textContent = S.level;
}
function showLevelUp(level) {
    const overlay = document.getElementById('levelup-overlay');
    const sub     = document.getElementById('levelup-sub');
    if (!overlay) return;
    if (sub) sub.textContent = `You reached Level ${level}!`;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    playSound('success');
    addNotification(`🎉 Level Up! You reached Level ${level}!`);
    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden','true');
    }, 2800);
}

// ── Notifications ─────────────────────────────────────────────────────────────
function addNotification(msg) {
    S.notifications.unshift({ msg, time: new Date().toLocaleTimeString() });
    if (S.notifications.length > 10) S.notifications.pop();
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('visible');
}

// ── Mock data ─────────────────────────────────────────────────────────────────
let mockCourses = [
    { id:1, emoji:'🐍', title:'Introduction to Python', description:'Master Python fundamentals — variables, functions, OOP and more.',
      difficulty:'Beginner', duration:'4 weeks', rating:4.8,
      syllabus:['Week 1: Variables & Types','Week 2: Functions & Scope','Week 3: OOP & Classes','Week 4: File I/O'],
      assignments:[{title:'Build a Calculator',dueDate:'2025-06-01'},{title:'OOP Bank Account',dueDate:'2025-06-15'}],
      forumPosts:[{id:1,user:'Alice',message:'How do I debug infinite loops?',replies:[{user:'Bob',message:'Use print statements or a debugger!'}]}] },
    { id:2, emoji:'📐', title:'Calculus Fundamentals', description:'Derivatives, integrals, and limits — the language of change.',
      difficulty:'Intermediate', duration:'4 weeks', rating:4.6,
      syllabus:['Week 1: Limits','Week 2: Derivatives','Week 3: Integration','Week 4: Applications'],
      assignments:[{title:'Derivatives Problem Set',dueDate:'2025-06-15'}],
      forumPosts:[] },
    { id:3, emoji:'🌐', title:'Web Development', description:'Build stunning modern web apps with HTML, CSS, and JavaScript.',
      difficulty:'Beginner', duration:'4 weeks', rating:4.9,
      syllabus:['Week 1: HTML5 Semantics','Week 2: CSS Grid & Flexbox','Week 3: JavaScript ES6+','Week 4: APIs & Fetch'],
      assignments:[{title:'Portfolio Website',dueDate:'2025-07-01'}],
      forumPosts:[] },
    { id:4, emoji:'🤖', title:'Machine Learning Basics', description:'Understand ML algorithms, data preprocessing, and model evaluation.',
      difficulty:'Advanced', duration:'4 weeks', rating:4.7,
      syllabus:['Week 1: Data Preprocessing','Week 2: Linear Regression','Week 3: Classification','Week 4: Neural Networks'],
      assignments:[{title:'Iris Classification',dueDate:'2025-07-15'}],
      forumPosts:[] },
    { id:5, emoji:'🔐', title:'Cybersecurity Essentials', description:'Learn ethical hacking, network security, and cryptography basics.',
      difficulty:'Intermediate', duration:'3 weeks', rating:4.5,
      syllabus:['Week 1: Network Security','Week 2: Cryptography','Week 3: Ethical Hacking'],
      assignments:[{title:'Security Audit Report',dueDate:'2025-07-20'}],
      forumPosts:[] },
    { id:6, emoji:'📊', title:'Data Science with Python', description:'Pandas, NumPy, Matplotlib — turn raw data into insights.',
      difficulty:'Intermediate', duration:'5 weeks', rating:4.8,
      syllabus:['Week 1: NumPy','Week 2: Pandas','Week 3: Visualization','Week 4: Statistics','Week 5: Projects'],
      assignments:[{title:'EDA Project',dueDate:'2025-08-01'}],
      forumPosts:[] }
];

let mockQuizzes = [
    { id:1, question:'What is the output of `print(2 ** 3)` in Python?', options:['6','8','9','Error'], correctAnswer:1, difficulty:'Easy', topic:'Python' },
    { id:2, question:'What is the derivative of sin(x)?', options:['cos(x)','-cos(x)','sin(x)','-sin(x)'], correctAnswer:0, difficulty:'Medium', topic:'Calculus' },
    { id:3, question:'Which HTML tag creates a hyperlink?', options:['<link>','<a>','<href>','<url>'], correctAnswer:1, difficulty:'Easy', topic:'Web Dev' },
    { id:4, question:'What does CSS stand for?', options:['Computer Style Sheets','Creative Style Syntax','Cascading Style Sheets','Colorful Style Sheets'], correctAnswer:2, difficulty:'Easy', topic:'Web Dev' },
    { id:5, question:'What is the time complexity of binary search?', options:['O(n)','O(n²)','O(log n)','O(1)'], correctAnswer:2, difficulty:'Medium', topic:'Algorithms' },
    { id:6, question:'Which keyword declares a constant in JavaScript?', options:['var','let','const','def'], correctAnswer:2, difficulty:'Easy', topic:'JavaScript' },
    { id:7, question:'What does SQL stand for?', options:['Structured Query Language','Simple Query Logic','Standard Query List','Sequential Query Language'], correctAnswer:0, difficulty:'Easy', topic:'Databases' },
    { id:8, question:'What is the output of `len([1,2,3])` in Python?', options:['2','3','4','Error'], correctAnswer:1, difficulty:'Easy', topic:'Python' }
];
