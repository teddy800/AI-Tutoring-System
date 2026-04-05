/* eslint-disable no-undef, no-console */
'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
window.APP_CONFIG = { phpBase:'http://localhost:8080', pyBase:'http://localhost:5000', wsUrl:null };

// ── State ─────────────────────────────────────────────────────────────────────
const S = {
    user:null, userId:null, role:null, token:null,
    points:0, streak:0, level:1, xp:0,
    courses:[], quizTimer:null, chartType:'bar', starRating:0,
    offline:!navigator.onLine, enrolled:[], scoreHistory:[], notifications:[],
    chatHistory:[], lastSection:null, timeSpent:{}, sessionStart:Date.now()
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
function throttle(fn, ms) {
    let last = 0; return (...a) => { const now = Date.now(); if (now - last >= ms) { last = now; fn(...a); } };
}

// ── localStorage quota management ────────────────────────────────────────────
function safeSetItem(key, value) {
    try { localStorage.setItem(key, value); return true; }
    catch (e) {
        if (e.name === 'QuotaExceededError') {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('nl_'));
            if (keys.length) { localStorage.removeItem(keys[0]); try { localStorage.setItem(key, value); return true; } catch {} }
            console.warn('localStorage full, cannot save:', key);
        }
        return false;
    }
}

// ── Session persistence ───────────────────────────────────────────────────────
function saveSession() {
    if (!S.user) return;
    safeSetItem('nl_session', JSON.stringify({
        user:S.user, userId:S.userId, role:S.role, token:S.token,
        points:S.points, streak:S.streak, level:S.level, xp:S.xp,
        enrolled:S.enrolled, scoreHistory:S.scoreHistory, chatHistory:S.chatHistory
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
    S.enrolled=[]; S.scoreHistory=[]; S.notifications=[]; S.chatHistory=[];
}

// ── Auto-save every 30 seconds ────────────────────────────────────────────────
setInterval(() => { if (S.user) saveSession(); }, 30000);

// ── XP / Level system ─────────────────────────────────────────────────────────
const XP_PER_LEVEL = 100;
function addXP(amount) {
    S.xp += amount;
    const newLevel = Math.floor(S.xp / XP_PER_LEVEL) + 1;
    if (newLevel > S.level) { S.level = newLevel; showLevelUp(newLevel); confettiBurst(); }
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
    if (txt)  txt.textContent  = xpInLevel + ' / ' + XP_PER_LEVEL + ' XP';
    if (lvl)  lvl.textContent  = S.level;
    if (statLvl) statLvl.textContent = S.level;
}
function showLevelUp(level) {
    const overlay = document.getElementById('levelup-overlay');
    const sub     = document.getElementById('levelup-sub');
    if (!overlay) return;
    if (sub) sub.textContent = 'You reached Level ' + level + '!';
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    playSound('success');
    addNotification('🎉 Level Up! You reached Level ' + level + '!');
    setTimeout(() => { overlay.classList.remove('active'); overlay.setAttribute('aria-hidden','true'); }, 2800);
}

// ── Confetti system ───────────────────────────────────────────────────────────
function confettiBurst() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = [];
    const colors = ['#6699ff','#aa66ff','#44ddaa','#ff66aa','#ffcc44'];
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4 + 2,
            rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 8, alpha: 1
        });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.alpha -= 0.012;
            if (p.alpha <= 0) return;
            ctx.save(); ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        frame++;
        if (frame < 120) requestAnimationFrame(draw);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    draw();
}

// ── Notifications ─────────────────────────────────────────────────────────────
function addNotification(msg) {
    S.notifications.unshift({ msg, time: new Date().toLocaleTimeString() });
    if (S.notifications.length > 20) S.notifications.pop();
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.add('visible');
    renderNotifPanel();
}
function renderNotifPanel() {
    const list = document.getElementById('notif-panel-list');
    if (!list) return;
    if (!S.notifications.length) {
        list.innerHTML = '<p style="color:var(--txt3);font-size:var(--text-sm);text-align:center;padding:var(--s6)">No notifications yet</p>';
        return;
    }
    list.innerHTML = S.notifications.slice(0,15).map(n =>
        '<div class="notif-item"><div>' + n.msg + '</div><div class="notif-item__time">' + n.time + '</div></div>'
    ).join('');
}
function openNotifPanel() {
    document.getElementById('notif-panel')?.classList.add('open');
    document.getElementById('notif-overlay')?.classList.add('open');
    document.getElementById('notif-badge')?.classList.remove('visible');
    renderNotifPanel();
}
function closeNotifPanel() {
    document.getElementById('notif-panel')?.classList.remove('open');
    document.getElementById('notif-overlay')?.classList.remove('open');
}

// ── Mock data ─────────────────────────────────────────────────────────────────
let mockCourses = [
    { id:1, emoji:'🐍', title:'Introduction to Python', description:'Master Python fundamentals — variables, functions, OOP and more.',
      difficulty:'Beginner', duration:'4 weeks', rating:4.8,
      syllabus:['Week 1: Variables & Types','Week 2: Functions & Scope','Week 3: OOP & Classes','Week 4: File I/O'],
      assignments:[{title:'Build a Calculator',dueDate:'2025-06-01'},{title:'OOP Bank Account',dueDate:'2025-06-15'}],
      forumPosts:[] },
    { id:2, emoji:'📐', title:'Calculus Fundamentals', description:'Derivatives, integrals, and limits — the language of change.',
      difficulty:'Intermediate', duration:'4 weeks', rating:4.6,
      syllabus:['Week 1: Limits','Week 2: Derivatives','Week 3: Integration','Week 4: Applications'],
      assignments:[{title:'Derivatives Problem Set',dueDate:'2025-06-15'}], forumPosts:[] },
    { id:3, emoji:'🌐', title:'Web Development', description:'Build stunning modern web apps with HTML, CSS, and JavaScript.',
      difficulty:'Beginner', duration:'4 weeks', rating:4.9,
      syllabus:['Week 1: HTML5 Semantics','Week 2: CSS Grid & Flexbox','Week 3: JavaScript ES6+','Week 4: APIs & Fetch'],
      assignments:[{title:'Portfolio Website',dueDate:'2025-07-01'}], forumPosts:[] },
    { id:4, emoji:'🤖', title:'Machine Learning Basics', description:'Understand ML algorithms, data preprocessing, and model evaluation.',
      difficulty:'Advanced', duration:'4 weeks', rating:4.7,
      syllabus:['Week 1: Data Preprocessing','Week 2: Linear Regression','Week 3: Classification','Week 4: Neural Networks'],
      assignments:[{title:'Iris Classification',dueDate:'2025-07-15'}], forumPosts:[] },
    { id:5, emoji:'🔐', title:'Cybersecurity Essentials', description:'Learn ethical hacking, network security, and cryptography basics.',
      difficulty:'Intermediate', duration:'3 weeks', rating:4.5,
      syllabus:['Week 1: Network Security','Week 2: Cryptography','Week 3: Ethical Hacking'],
      assignments:[{title:'Security Audit Report',dueDate:'2025-07-20'}], forumPosts:[] },
    { id:6, emoji:'📊', title:'Data Science with Python', description:'Pandas, NumPy, Matplotlib — turn raw data into insights.',
      difficulty:'Intermediate', duration:'5 weeks', rating:4.8,
      syllabus:['Week 1: NumPy','Week 2: Pandas','Week 3: Visualization','Week 4: Statistics','Week 5: Projects'],
      assignments:[{title:'EDA Project',dueDate:'2025-08-01'}], forumPosts:[] }
];

let mockQuizzes = [
    { id:1, question:'What is the output of `print(2 ** 3)` in Python?', options:['6','8','9','Error'], correctAnswer:1, difficulty:'Easy', topic:'Python' },
    { id:2, question:'What is the derivative of sin(x)?', options:['cos(x)','-cos(x)','sin(x)','-sin(x)'], correctAnswer:0, difficulty:'Medium', topic:'Calculus' },
    { id:3, question:'Which HTML tag creates a hyperlink?', options:['<link>','<a>','<href>','<url>'], correctAnswer:1, difficulty:'Easy', topic:'Web Dev' },
    { id:4, question:'What does CSS stand for?', options:['Computer Style Sheets','Creative Style Syntax','Cascading Style Sheets','Colorful Style Sheets'], correctAnswer:2, difficulty:'Easy', topic:'Web Dev' },
    { id:5, question:'What is the time complexity of binary search?', options:['O(n)','O(n²)','O(log n)','O(1)'], correctAnswer:2, difficulty:'Medium', topic:'Algorithms' },
    { id:6, question:'Which keyword declares a constant in JavaScript?', options:['var','let','const','def'], correctAnswer:2, difficulty:'Easy', topic:'JavaScript' },
    { id:7, question:'What does SQL stand for?', options:['Structured Query Language','Simple Query Logic','Standard Query List','Sequential Query Language'], correctAnswer:0, difficulty:'Easy', topic:'Databases' },
    { id:8, question:'What is the output of `len([1,2,3])` in Python?', options:['2','3','4','Error'], correctAnswer:1, difficulty:'Easy', topic:'Python' },
    { id:9, question:'Which command initializes a new Git repository?', options:['git start','git init','git new','git create'], correctAnswer:1, difficulty:'Easy', topic:'Git' },
    { id:10, question:'What does REST stand for?', options:['Remote Execution State Transfer','Representational State Transfer','Remote State Transfer','Representational Service Transfer'], correctAnswer:1, difficulty:'Medium', topic:'Web Dev' }
];

// ── Sounds ────────────────────────────────────────────────────────────────────
const sounds = {};
function initSounds() {
    ['toggle','click','success','error','badge'].forEach(k => {
        try { sounds[k] = new Howl({ src:['assets/audio/' + k + '.mp3'], onloaderror:() => { sounds[k] = {play:()=>{}}; } }); }
        catch { sounds[k] = {play:()=>{}}; }
    });
}
function playSound(t) { try { sounds[t]?.play(); } catch {} }

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type='success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    el.setAttribute('role','alert');
    c.appendChild(el);
    if (window.gsap) {
        gsap.fromTo(el, {x:60,opacity:0}, {x:0,opacity:1,duration:.38,ease:'power2.out',
            onComplete:() => setTimeout(() => gsap.to(el,{opacity:0,x:60,duration:.28,onComplete:() => el.remove()}), 3200)});
    } else {
        setTimeout(() => el.remove(), 3600);
    }
}

// ── Ripple effect ─────────────────────────────────────────────────────────────
function addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size/2;
    const y = e.clientY - rect.top - size/2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}
function setupRipples() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.btn');
        if (btn) addRipple({currentTarget:btn, clientX:e.clientX, clientY:e.clientY});
    });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(msg, icon='ℹ️') {
    const m = document.getElementById('modal'); if (!m) return;
    const i = document.getElementById('modal-icon'), t = document.getElementById('modal-msg');
    if (i) i.textContent = icon; if (t) t.textContent = msg;
    m.classList.add('active'); m.setAttribute('aria-hidden','false');
    document.getElementById('modal-close')?.focus();
}
function closeModal() {
    const m = document.getElementById('modal'); if (!m) return;
    m.classList.remove('active'); m.setAttribute('aria-hidden','true');
}

// ── Theme Manager ─────────────────────────────────────────────────────────────
const ThemeManager = {
    current: 'dark',
    set(theme) {
        const root = document.documentElement;
        if (window.gsap) {
            gsap.to(root, {duration:.2, opacity:0, onComplete:() => {
                root.setAttribute('data-theme', theme);
                safeSetItem('theme', theme);
                ThemeManager.current = theme;
                document.querySelectorAll('.theme-btn').forEach(b => {
                    b.classList.toggle('active', b.dataset.themeVal === theme);
                    b.setAttribute('aria-pressed', b.dataset.themeVal === theme ? 'true' : 'false');
                });
                initParticles();
                gsap.to(root, {duration:.2, opacity:1});
                playSound('toggle');
            }});
        } else {
            root.setAttribute('data-theme', theme);
            safeSetItem('theme', theme);
            ThemeManager.current = theme;
        }
    },
    init() {
        const saved = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        ThemeManager.current = saved;
        document.querySelectorAll('.theme-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.themeVal === saved);
            b.setAttribute('aria-pressed', b.dataset.themeVal === saved ? 'true' : 'false');
            b.addEventListener('click', () => ThemeManager.set(b.dataset.themeVal));
        });
        document.querySelector('.theme-toggle')?.addEventListener('click', () => {
            const themes = ['dark','light','cyberpunk'];
            const next = themes[(themes.indexOf(ThemeManager.current) + 1) % themes.length];
            ThemeManager.set(next);
        });
    }
};

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
    try {
        if (window.pJSDom?.length) { window.pJSDom[0].pJS.fn.vendors.destroypJS(); window.pJSDom = []; }
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const color = theme === 'cyberpunk' ? '#44ff88' : theme === 'light' ? '#3355cc' : '#6699ff';
        particlesJS('particles-js', {
            particles:{number:{value:50,density:{enable:true,value_area:900}},
                color:{value:color}, shape:{type:'circle'},
                opacity:{value:.3,random:true}, size:{value:2,random:true},
                move:{enable:true,speed:1.1,direction:'none',random:true,out_mode:'out'}},
            interactivity:{detect_on:'canvas',
                events:{onhover:{enable:true,mode:'repulse'},onclick:{enable:true,mode:'push'}},
                modes:{repulse:{distance:70},push:{particles_nb:3}}},
            retina_detect:true});
    } catch(e) { console.warn('Particles:', e); }
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function openSidebar()  { document.querySelector('.sidebar')?.classList.add('active'); document.querySelector('.sidebar-overlay')?.classList.add('active'); }
function closeSidebar() { document.querySelector('.sidebar')?.classList.remove('active'); document.querySelector('.sidebar-overlay')?.classList.remove('active'); }
function toggleSidebar(){ document.querySelector('.sidebar')?.classList.contains('active') ? closeSidebar() : openSidebar(); }

// ── Profile dropdown ──────────────────────────────────────────────────────────
function setupProfileDropdown() {
    const trigger = document.getElementById('profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');
    if (!trigger || !dropdown) return;
    trigger.addEventListener('click', () => {
        const open = dropdown.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove('open');
            trigger.setAttribute('aria-expanded','false');
        }
    });
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('sidebar-logout')?.addEventListener('click', logout);
    document.getElementById('notif-btn')?.addEventListener('click', openNotifPanel);
    document.getElementById('notif-panel-close')?.addEventListener('click', closeNotifPanel);
    document.getElementById('notif-overlay')?.addEventListener('click', closeNotifPanel);
}

function syncHeaderUser() {
    const dropdown = document.getElementById('profile-dropdown');
    const sidebarLogout = document.getElementById('sidebar-logout');
    const quickStats = document.getElementById('quick-stats-bar');
    if (!S.user) {
        dropdown?.classList.remove('visible');
        if (sidebarLogout) sidebarLogout.style.display = 'none';
        if (quickStats) quickStats.classList.remove('visible');
        return;
    }
    dropdown?.classList.add('visible');
    if (sidebarLogout) sidebarLogout.style.display = 'flex';
    if (quickStats) quickStats.classList.add('visible');
    const av = document.getElementById('header-avatar');
    const un = document.getElementById('header-username');
    const mu = document.getElementById('menu-username');
    const mr = document.getElementById('menu-role');
    const mp = document.getElementById('menu-pts');
    const initial = S.user[0].toUpperCase();
    if (av) av.textContent = initial;
    if (un) un.textContent = S.user;
    if (mu) mu.textContent = S.user;
    if (mr) mr.textContent = S.role || 'student';
    if (mp) mp.textContent = S.points + ' pts';
    // Quick stats bar
    const qp = document.getElementById('qs-points');
    const qs = document.getElementById('qs-streak');
    const qc = document.getElementById('qs-courses');
    const qb = document.getElementById('qs-badges');
    if (qp) qp.textContent = S.points;
    if (qs) qs.textContent = S.streak;
    if (qc) qc.textContent = S.enrolled?.length || 0;
    if (qb) qb.textContent = document.querySelectorAll('#badges-container .badge').length;
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
    clearSession();
    syncHeaderUser();
    syncSidebarUser();
    document.getElementById('profile-dropdown')?.classList.remove('open','visible');
    StudyTimer.stop();
    toast('Signed out. See you soon! 👋','info');
    setTimeout(() => showSection('login-form'), 300);
}

// ── Offline ───────────────────────────────────────────────────────────────────
function setupOffline() {
    const sync = () => {
        S.offline = !navigator.onLine;
        document.body.classList.toggle('offline', S.offline);
        const lbl = document.querySelector('.status-label');
        if (lbl) lbl.textContent = S.offline ? 'Offline' : 'Online';
        const badge = document.getElementById('user-status');
        if (badge) badge.textContent = S.offline ? '● Offline' : '● Online';
        if (!S.offline) { toast('Back online! Syncing…','success'); syncOffline(); }
        else toast('Offline mode active','error');
    };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    if (S.offline) document.body.classList.add('offline');
}
async function syncOffline() {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('nl-v1');
        const keys = await cache.keys();
        for (const req of keys) {
            const res = await cache.match(req);
            if (res) {
                const data = await res.json();
                await fetch(req.url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
                await cache.delete(req);
            }
        }
        if (keys.length) toast('Offline data synced ✓','success');
    } catch(e) { console.error('Sync:', e); }
}
async function cacheReq(url, data) {
    if (!('caches' in window)) return;
    try { const c = await caches.open('nl-v1'); await c.put(url, new Response(JSON.stringify(data))); }
    catch(e) { console.error('Cache:', e); }
}

// ── Network monitor ───────────────────────────────────────────────────────────
const NetworkMonitor = {
    check() {
        const start = Date.now();
        fetch(APP_CONFIG.pyBase + '/api/health', {signal:AbortSignal.timeout(3000)})
            .then(() => {
                const ms = Date.now() - start;
                if (ms > 2000) {
                    const w = document.getElementById('network-warning');
                    if (w) { w.classList.add('visible'); setTimeout(() => w.classList.remove('visible'), 5000); }
                }
            }).catch(() => {});
    },
    init() { setTimeout(() => NetworkMonitor.check(), 3000); setInterval(() => NetworkMonitor.check(), 60000); }
};

// ── Voice ─────────────────────────────────────────────────────────────────────
function setupVoice() {
    const inp = document.getElementById('chat-input');
    const btn = document.querySelector('.voice-btn');
    if (!btn || !inp) return;
    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) { btn.style.display = 'none'; return; }
    const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    rec.lang = 'en-US'; rec.interimResults = false;
    btn.addEventListener('click', () => { try { rec.start(); btn.classList.add('recording'); toast('Listening…','info'); } catch {} });
    rec.onresult = e => { inp.value = e.results[0][0].transcript; btn.classList.remove('recording'); sendChat(); };
    rec.onerror = () => { btn.classList.remove('recording'); toast('Voice failed','error'); };
}

// ── Text-to-speech ────────────────────────────────────────────────────────────
function speakText(text) {
    if (!window.speechSynthesis) { toast('TTS not supported','error'); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g,''));
    utt.rate = 0.95; utt.pitch = 1;
    window.speechSynthesis.speak(utt);
    toast('Speaking…','info');
}

// ── Swipe + Keyboard ──────────────────────────────────────────────────────────
function setupSwipe() {
    let sx = 0;
    document.addEventListener('touchstart', e => { sx = e.changedTouches[0].screenX; }, {passive:true});
    document.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].screenX - sx;
        if (dx > 65) openSidebar(); else if (dx < -65) closeSidebar();
    }, {passive:true});
}

let gKeyBuffer = '';
function setupKeys() {
    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        // Cmd+K / Ctrl+K
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openGlobalSearch(); return; }
        if (e.key === 'Escape') { closeModal(); closeSidebar(); closeCourseModal(); closeGlobalSearch(); document.getElementById('shortcut-overlay')?.classList.remove('active'); return; }
        if (e.key === '?') { document.getElementById('shortcut-overlay')?.classList.toggle('active'); return; }
        if (e.key === 't' || e.key === 'T') { ThemeManager.set(ThemeManager.current === 'dark' ? 'light' : ThemeManager.current === 'light' ? 'cyberpunk' : 'dark'); return; }
        if (e.key === 'm' || e.key === 'M') { toggleSidebar(); return; }
        if (e.key === 'f' || e.key === 'F') { toggleFocusMode(); return; }
        // G-key sequences
        gKeyBuffer += e.key.toLowerCase();
        if (gKeyBuffer.length > 2) gKeyBuffer = gKeyBuffer.slice(-2);
        if (gKeyBuffer === 'gd') { showSection('dashboard'); gKeyBuffer = ''; }
        else if (gKeyBuffer === 'gq') { showSection('quiz-section'); gKeyBuffer = ''; }
        else if (gKeyBuffer === 'gc') { showSection('chatbot'); gKeyBuffer = ''; }
    });
}

// ── Auth guard ────────────────────────────────────────────────────────────────
const PROTECTED = ['dashboard','chatbot','quiz-section','course-section',
    'content-upload-section','analytics','content-repo','feedback','help'];

function requireAuth(id) {
    if (PROTECTED.includes(id) && !S.user) {
        showSection('login-form');
        toast('Please sign in to access this section','error');
        return false;
    }
    return true;
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showSection(id) {
    if (!requireAuth(id)) return;
    // Track time spent
    if (S.lastSection) {
        const elapsed = (Date.now() - (S._sectionStart || Date.now())) / 1000;
        S.timeSpent[S.lastSection] = (S.timeSpent[S.lastSection] || 0) + elapsed;
    }
    S.lastSection = id; S._sectionStart = Date.now();

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(id);
    if (!target) { document.getElementById('login-form')?.classList.add('active'); return; }
    target.classList.add('active');
    document.querySelectorAll('.tnav-link,.snav-item').forEach(a => {
        a.classList.toggle('active', a.dataset.section === id || a.getAttribute('href') === '#' + id);
    });
    if (document.querySelector('.sidebar')?.classList.contains('active')) closeSidebar();
    const map = {
        dashboard: loadDashboard,
        'quiz-section': loadQuizzes,
        'course-section': loadCourseSection,
        analytics: loadAnalytics,
        feedback: loadFeedback,
        help: loadHelp,
        'content-repo': loadRepository
    };
    map[id]?.();
    playSound('click');
    // Update page progress bar
    const bar = document.getElementById('page-progress-bar');
    if (bar) { bar.style.width = '100%'; setTimeout(() => { bar.style.width = '0%'; }, 600); }
}

// ── Sidebar user ──────────────────────────────────────────────────────────────
function syncSidebarUser() {
    const prof = document.getElementById('sidebar-profile');
    if (prof) prof.hidden = !S.user;
    const av = document.getElementById('sidebar-avatar');
    if (av) av.textContent = (S.user || '?')[0].toUpperCase();
    const un = document.getElementById('sidebar-username');
    if (un) un.textContent = S.user || '';
    const ro = document.getElementById('sidebar-role');
    if (ro) ro.textContent = S.role || '';
    const pts = document.getElementById('sidebar-points-val');
    if (pts) pts.textContent = S.points;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function syncStats() {
    animateCounter('stat-points', S.points);
    animateCounter('stat-streak', S.streak);
    animateCounter('stat-courses', S.enrolled?.length || S.courses?.length || 0);
    animateCounter('stat-badges', document.querySelectorAll('#badges-container .badge').length);
    syncSidebarUser();
    syncHeaderUser();
    updateXPBar();
}

function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    if (window.gsap) {
        gsap.to({val:start}, {val:target, duration:.6, ease:'power2.out',
            onUpdate: function() { el.textContent = Math.round(this.targets()[0].val); }});
    } else {
        el.textContent = target;
    }
}

// ── Local user store ──────────────────────────────────────────────────────────
const LOCAL_USERS_KEY = 'nl_users';
function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]'); } catch { return []; }
}
function saveLocalUsers(u) { safeSetItem(LOCAL_USERS_KEY, JSON.stringify(u)); }

// ── Auth tabs ─────────────────────────────────────────────────────────────────
function setupAuthTabs() {
    const tL = document.getElementById('tab-login'), tS = document.getElementById('tab-signup');
    const pL = document.getElementById('panel-login'), pS = document.getElementById('panel-signup');
    if (!tL || !tS) return;
    tL.addEventListener('click', () => {
        tL.classList.add('active'); tL.setAttribute('aria-selected','true');
        tS.classList.remove('active'); tS.setAttribute('aria-selected','false');
        pL.hidden = false; pS.hidden = true;
    });
    tS.addEventListener('click', () => {
        tS.classList.add('active'); tS.setAttribute('aria-selected','true');
        tL.classList.remove('active'); tL.setAttribute('aria-selected','false');
        pS.hidden = false; pL.hidden = true;
    });
    document.querySelectorAll('#panel-signup .role-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#panel-signup .role-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const sel = document.getElementById('signup-user-type');
            if (sel) sel.value = btn.dataset.role;
        });
    });
    document.querySelector('[data-target="signup-password"]')?.addEventListener('click', () => {
        const pw = document.getElementById('signup-password');
        if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('signup-form-el')?.addEventListener('submit', signup);
}

// ── Signup ────────────────────────────────────────────────────────────────────
async function signup(e) {
    e.preventDefault();
    const fullname = document.getElementById('signup-fullname').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;
    const role     = document.getElementById('signup-user-type').value;
    if (!fullname || !username || !email || !password) { showModal('Please fill in all fields','⚠️'); return; }
    if (password.length < 6) { showModal('Password must be at least 6 characters','⚠️'); return; }
    if (password !== confirm) { showModal('Passwords do not match','❌'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showModal('Please enter a valid email','⚠️'); return; }

    const btn = e.target.querySelector('[type=submit]');
    const txt = btn?.querySelector('.btn__text'), spin = btn?.querySelector('.btn__spin');
    if (txt) txt.hidden = true; if (spin) spin.hidden = false; if (btn) btn.disabled = true;

    try {
        let saved = false;
        if (!S.offline) {
            try {
                const res = await fetch(APP_CONFIG.phpBase + '?action=signup', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({fullname,username,email,password,user_type:role})});
                const d = await res.json();
                if (d.success) saved = true;
                else if (d.error) { showModal(d.error,'❌'); return; }
            } catch { /* backend unavailable */ }
        }
        if (!saved) {
            const users = getLocalUsers();
            if (users.find(u => u.username === username)) { showModal('Username already taken','❌'); return; }
            if (users.find(u => u.email === email)) { showModal('Email already registered','❌'); return; }
            users.push({id:Date.now(),fullname,username,email,password,user_type:role,points:0,streak:0});
            saveLocalUsers(users);
        }
        toast('Account created! Welcome, ' + username + '! 🎉','success'); playSound('success');
        S.user = username; S.userId = Date.now(); S.role = role; S.points = 0; S.streak = 0; S.token = null;
        S.enrolled = []; S.scoreHistory = []; S.chatHistory = [];
        checkStreak(); syncStats(); addXP(10); saveSession();
        addNotification('🎉 Welcome to NeuralLearn, ' + username + '!');
        setTimeout(() => showSection('dashboard'), 50);
    } catch(err) { showModal('Signup failed. Please try again.','❌'); console.error(err); }
    finally { if (txt) txt.hidden = false; if (spin) spin.hidden = true; if (btn) btn.disabled = false; }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    S.role = document.getElementById('user-type').value;
    if (!username || !password) { showModal('Please fill in all fields','⚠️'); playSound('error'); return; }

    const btn = e.target.querySelector('[type=submit]');
    const txt = btn?.querySelector('.btn__text'), spin = btn?.querySelector('.btn__spin');
    if (txt) txt.hidden = true; if (spin) spin.hidden = false; if (btn) btn.disabled = true;

    try {
        let data = null;
        if (!S.offline) {
            try {
                const res = await fetch(APP_CONFIG.phpBase + '?action=login', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({username,password,user_type:S.role})});
                data = await res.json();
            } catch { /* backend down */ }
        }
        // Local store — supports username OR email login
        if (!data?.success) {
            const found = getLocalUsers().find(u =>
                (u.username === username || u.email === username) && u.password === password
            );
            if (found) data = {success:true, token:null, user:found};
        }
        // Demo fallback
        if (!data?.success) {
            data = {success:true, token:null, user:{id:1,username,user_type:S.role,points:0,streak:0}};
        }
        S.token   = data.token;
        S.user    = data.user.username || username;
        S.userId  = data.user.id;
        S.role    = data.user.user_type || S.role;
        S.points  = data.user.points || 0;
        S.streak  = data.user.streak || 0;
        if (!S.enrolled) S.enrolled = [];
        if (!S.scoreHistory) S.scoreHistory = [];
        if (!S.chatHistory) S.chatHistory = [];

        toast('Welcome back, ' + S.user + '! 🎓','success'); playSound('success');
        checkStreak(); syncStats(); addXP(10); saveSession();
        addNotification('👋 Welcome back, ' + S.user + '!');
        setTimeout(() => showSection('dashboard'), 50);
    } catch(err) { showModal('Login failed. Please try again.','❌'); console.error(err); }
    finally { if (txt) txt.hidden = false; if (spin) spin.hidden = true; if (btn) btn.disabled = false; }
}

// ── Streak ────────────────────────────────────────────────────────────────────
function checkStreak() {
    const last = localStorage.getItem('lastLogin');
    const today = new Date().toISOString().split('T')[0];
    if (last === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    S.streak = last === yesterday ? S.streak + 1 : 1;
    safeSetItem('streak', S.streak);
    safeSetItem('lastLogin', today);
    if (S.streak % 5 === 0) awardBadge('Streak Master');
    if (S.streak >= 30) awardBadge('Dedicated Learner');
    const el = document.getElementById('streak-display');
    if (el) { el.textContent = S.streak + ' day streak'; if (window.gsap) gsap.from(el, {scale:.7,opacity:0,duration:.5,ease:'back.out(1.7)'}); }
    const st = document.getElementById('stat-streak');
    if (st) st.textContent = S.streak;
}

// ── Badges ────────────────────────────────────────────────────────────────────
function awardBadge(name) {
    const c = document.getElementById('badges-container');
    if (!c) return;
    const type = name.toLowerCase().replace(/\s+/g,'-');
    if (c.querySelector('[data-type="' + type + '"]')) return;
    const b = document.createElement('span');
    b.className = 'badge'; b.textContent = name; b.setAttribute('data-type', type);
    b.setAttribute('data-tooltip', 'Badge: ' + name);
    c.appendChild(b);
    if (window.gsap) gsap.from(b, {scale:0,opacity:0,duration:.55,ease:'back.out(1.7)'});
    toast('🏅 Badge unlocked: ' + name + '!','badge'); playSound('badge');
    confettiBurst();
    addXP(20); addNotification('🏅 New badge: ' + name);
    const st = document.getElementById('stat-badges');
    if (st) st.textContent = c.querySelectorAll('.badge').length;
    saveSession();
}

// ── Calculate grade ───────────────────────────────────────────────────────────
function calculateGrade(score) {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 60) return 'D';
    return 'F';
}

// ── Motivational quotes ───────────────────────────────────────────────────────
const QUOTES = [
    'The expert in anything was once a beginner. — Helen Hayes',
    'Learning never exhausts the mind. — Leonardo da Vinci',
    'Education is the most powerful weapon you can use to change the world. — Nelson Mandela',
    'The beautiful thing about learning is that no one can take it away from you. — B.B. King',
    'An investment in knowledge pays the best interest. — Benjamin Franklin',
    'Live as if you were to die tomorrow. Learn as if you were to live forever. — Gandhi',
    'The more that you read, the more things you will know. — Dr. Seuss',
    'Strive for progress, not perfection.',
    'Every expert was once a beginner. Keep going!',
    'Small daily improvements lead to stunning results.'
];
function getMotivationalQuote() {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

// ── TypeWriter effect ─────────────────────────────────────────────────────────
function typeWriter(el, text, speed=40) {
    if (!el) return;
    el.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
        el.textContent += text[i];
        i++;
        if (i >= text.length) clearInterval(interval);
    }, speed);
}

// ── Study Calendar ────────────────────────────────────────────────────────────
function renderStudyCalendar() {
    const grid = document.getElementById('study-calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = 'activity_' + d.toISOString().split('T')[0];
        const level = parseInt(localStorage.getItem(key) || '0');
        const cell = document.createElement('div');
        cell.className = 'cal-day' + (i === 0 ? ' today' : '');
        if (level > 0) cell.setAttribute('data-level', Math.min(level, 4));
        cell.title = d.toLocaleDateString() + ': ' + (level > 0 ? level + ' activities' : 'No activity');
        grid.appendChild(cell);
    }
}
function recordActivity() {
    const key = 'activity_' + new Date().toISOString().split('T')[0];
    const current = parseInt(localStorage.getItem(key) || '0');
    safeSetItem(key, current + 1);
}

// ── Study Timer (Pomodoro) ────────────────────────────────────────────────────
const StudyTimer = {
    interval: null,
    seconds: 25 * 60,
    isWork: true,
    running: false,
    start() {
        if (this.running) return;
        this.running = true;
        this.interval = setInterval(() => {
            this.seconds--;
            this.render();
            if (this.seconds <= 0) {
                this.running = false;
                clearInterval(this.interval);
                if (this.isWork) {
                    toast('Focus session complete! Take a 5-min break 🎉','success');
                    addNotification('⏱️ Pomodoro complete! Break time.');
                    this.isWork = false; this.seconds = 5 * 60;
                    addXP(15); recordActivity();
                } else {
                    toast('Break over! Back to work 💪','info');
                    this.isWork = true; this.seconds = 25 * 60;
                }
                this.render();
            }
        }, 1000);
        document.getElementById('timer-start-btn').textContent = '▶ Running';
    },
    pause() {
        this.running = false;
        clearInterval(this.interval);
        document.getElementById('timer-start-btn').textContent = '▶ Resume';
    },
    reset() {
        this.running = false;
        clearInterval(this.interval);
        this.isWork = true; this.seconds = 25 * 60;
        this.render();
        document.getElementById('timer-start-btn').textContent = '▶ Start';
    },
    stop() { this.running = false; clearInterval(this.interval); },
    render() {
        const m = Math.floor(this.seconds / 60).toString().padStart(2,'0');
        const s = (this.seconds % 60).toString().padStart(2,'0');
        const el = document.getElementById('study-timer-display');
        if (el) el.textContent = m + ':' + s;
        const badge = document.getElementById('timer-mode-badge');
        if (badge) {
            badge.textContent = this.isWork ? 'Focus' : 'Break';
            badge.className = 'timer-mode-badge' + (this.isWork ? '' : ' break');
        }
    }
};

// ── Daily Challenge ───────────────────────────────────────────────────────────
const DailyChallenge = {
    questions: [
        {q:'What is the time complexity of quicksort on average?', opts:['O(n)','O(n log n)','O(n²)','O(log n)'], ans:1},
        {q:'Which Python method removes and returns the last element of a list?', opts:['.remove()','.delete()','.pop()','.discard()'], ans:2},
        {q:'What does HTTP stand for?', opts:['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transport Protocol','High Text Transfer Protocol'], ans:0},
        {q:'What is 2^10?', opts:['512','1024','2048','256'], ans:1},
        {q:'Which CSS property controls the stacking order of elements?', opts:['stack-order','z-index','layer','depth'], ans:1},
        {q:'What is a closure in JavaScript?', opts:['A loop construct','A function with access to its outer scope','A class method','An async function'], ans:1},
        {q:'What does ACID stand for in databases?', opts:['Atomicity Consistency Isolation Durability','Async Consistent Isolated Data','Atomic Concurrent Isolated Durable','Atomicity Concurrent Isolation Data'], ans:0},
        {q:'Which sorting algorithm has the best worst-case time complexity?', opts:['Quick Sort','Bubble Sort','Merge Sort','Insertion Sort'], ans:2}
    ],
    getToday() {
        const key = 'daily_challenge_' + new Date().toISOString().split('T')[0];
        const saved = localStorage.getItem(key);
        if (saved) return JSON.parse(saved);
        const q = this.questions[new Date().getDate() % this.questions.length];
        safeSetItem(key, JSON.stringify({...q, answered:false}));
        return {...q, answered:false};
    },
    render() {
        const data = this.getToday();
        const qEl = document.getElementById('dc-question');
        const optsEl = document.getElementById('dc-options');
        const resultEl = document.getElementById('dc-result');
        if (!qEl || !optsEl) return;
        qEl.textContent = data.q;
        optsEl.innerHTML = '';
        data.opts.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'dc-opt';
            btn.textContent = opt;
            if (data.answered) {
                btn.disabled = true;
                if (i === data.ans) btn.classList.add('correct');
            } else {
                btn.addEventListener('click', () => {
                    const key = 'daily_challenge_' + new Date().toISOString().split('T')[0];
                    const updated = {...data, answered:true};
                    safeSetItem(key, JSON.stringify(updated));
                    if (i === data.ans) {
                        btn.classList.add('correct');
                        if (resultEl) resultEl.textContent = '✅ Correct! +25 XP';
                        addXP(25); S.points += 10; syncStats(); saveSession();
                        toast('Daily challenge complete! +25 XP 🌟','success');
                        awardBadge('Daily Champion');
                    } else {
                        btn.classList.add('wrong');
                        optsEl.querySelectorAll('.dc-opt')[data.ans]?.classList.add('correct');
                        if (resultEl) resultEl.textContent = '❌ Incorrect. The answer was: ' + data.opts[data.ans];
                    }
                    optsEl.querySelectorAll('.dc-opt').forEach(b => b.disabled = true);
                });
            }
            optsEl.appendChild(btn);
        });
        if (data.answered && resultEl) resultEl.textContent = '✅ Already completed today!';
    }
};

// ── Search Engine ─────────────────────────────────────────────────────────────
const SearchEngine = {
    index: [],
    build() {
        this.index = [];
        mockCourses.forEach(c => this.index.push({type:'course',icon:c.emoji||'📚',title:c.title,sub:c.difficulty+' · '+c.duration,section:'course-section',id:c.id}));
        mockQuizzes.forEach(q => this.index.push({type:'quiz',icon:'📝',title:q.question.slice(0,60)+'…',sub:'Quiz · '+q.topic,section:'quiz-section'}));
        const repoItems = ['Python Variables','Integration Techniques','HTML5 Semantics','Linked Lists','Linear Regression','CSS Grid','Recursion','Neural Networks','SQL Fundamentals','Git Workflows'];
        repoItems.forEach(r => this.index.push({type:'repo',icon:'🗂️',title:r,sub:'Repository',section:'content-repo'}));
    },
    search(q) {
        if (!q || q.length < 2) return [];
        const lower = q.toLowerCase();
        return this.index.filter(item =>
            item.title.toLowerCase().includes(lower) || item.sub.toLowerCase().includes(lower)
        ).slice(0, 8);
    }
};

function openGlobalSearch() {
    const overlay = document.getElementById('global-search-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    setTimeout(() => document.getElementById('global-search-input')?.focus(), 50);
}
function closeGlobalSearch() {
    document.getElementById('global-search-overlay')?.classList.remove('active');
    const input = document.getElementById('global-search-input');
    if (input) input.value = '';
    const results = document.getElementById('global-search-results');
    if (results) results.innerHTML = '<div class="search-hint">Type to search across courses, quizzes, and repository items</div>';
}
function setupGlobalSearch() {
    const overlay = document.getElementById('global-search-overlay');
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('global-search-results');
    if (!overlay || !input || !results) return;

    overlay.addEventListener('click', e => { if (e.target === overlay) closeGlobalSearch(); });
    document.getElementById('header-search-btn')?.addEventListener('click', openGlobalSearch);

    const doSearch = debounce(q => {
        if (!q) { results.innerHTML = '<div class="search-hint">Type to search across courses, quizzes, and repository items</div>'; return; }
        const hits = SearchEngine.search(q);
        if (!hits.length) { results.innerHTML = '<div class="search-hint">No results for "' + q + '"</div>'; return; }
        results.innerHTML = hits.map(h =>
            '<div class="search-result-item" data-section="' + h.section + '">' +
            '<span class="search-result-item__icon">' + h.icon + '</span>' +
            '<div><div class="search-result-item__title">' + h.title + '</div>' +
            '<div class="search-result-item__sub">' + h.sub + '</div></div></div>'
        ).join('');
        results.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                closeGlobalSearch();
                showSection(item.dataset.section);
            });
        });
    }, 200);

    input.addEventListener('input', e => doSearch(e.target.value.trim()));
    input.addEventListener('keydown', e => { if (e.key === 'Escape') closeGlobalSearch(); });
}

// ── Focus mode ────────────────────────────────────────────────────────────────
function toggleFocusMode() {
    document.body.classList.toggle('focus-mode');
    const active = document.body.classList.contains('focus-mode');
    toast(active ? '🎯 Focus mode on — press F to exit' : '✅ Focus mode off','info');
}
document.getElementById('focus-mode-exit')?.addEventListener('click', () => {
    document.body.classList.remove('focus-mode');
});

// ── Export / Import data ──────────────────────────────────────────────────────
function exportData() {
    const data = {
        user: S.user, role: S.role, points: S.points, streak: S.streak,
        level: S.level, xp: S.xp, enrolled: S.enrolled, scoreHistory: S.scoreHistory,
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'neurallearn-progress-' + S.user + '.json';
    a.click(); URL.revokeObjectURL(url);
    toast('Progress exported! 📤','success');
}
function importData(file) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.user) {
                Object.assign(S, {points:data.points||0, streak:data.streak||0, level:data.level||1, xp:data.xp||0, enrolled:data.enrolled||[], scoreHistory:data.scoreHistory||[]});
                syncStats(); saveSession();
                toast('Progress imported! ✅','success');
            }
        } catch { toast('Invalid file format','error'); }
    };
    reader.readAsText(file);
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).then(() => toast('Copied to clipboard! 📋','success')).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        toast('Copied! 📋','success');
    });
}

// ── Markdown to HTML ──────────────────────────────────────────────────────────
function markdownToHtml(md) {
    return md
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/`([^`]+)`/g, '<code style="background:var(--surf2);padding:1px 5px;border-radius:4px;font-family:var(--font-m)">$1</code>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^#{3}\s(.+)$/gm, '<h3 style="font-family:var(--font-h);margin:8px 0 4px">$1</h3>')
        .replace(/^#{2}\s(.+)$/gm, '<h2 style="font-family:var(--font-h);margin:10px 0 4px">$1</h2>')
        .replace(/^#{1}\s(.+)$/gm, '<h1 style="font-family:var(--font-h);margin:12px 0 4px">$1</h1>')
        .replace(/\n/g, '<br>');
}

// ── Generate insights ─────────────────────────────────────────────────────────
function generateInsights() {
    const insights = [];
    const avg = S.scoreHistory?.length ? Math.round(S.scoreHistory.reduce((s,h) => s+h.score, 0) / S.scoreHistory.length) : 0;
    if (avg >= 80) insights.push('🌟 Excellent performance! Your average score of ' + avg + '% puts you in the top tier.');
    else if (avg >= 60) insights.push('📈 Good progress! Your average score is ' + avg + '%. Focus on weak areas to improve.');
    else if (avg > 0) insights.push('💪 Keep practicing! Your average score is ' + avg + '%. Consistent effort leads to mastery.');
    if (S.streak >= 7) insights.push('🔥 Amazing ' + S.streak + '-day streak! Consistency is the key to learning.');
    if (S.enrolled?.length >= 3) insights.push('📚 You\'re enrolled in ' + S.enrolled.length + ' courses. Great commitment to learning!');
    if (S.level >= 5) insights.push('⚡ Level ' + S.level + ' achieved! You\'re becoming a true NeuralLearn expert.');
    const topics = S.scoreHistory?.map(h => h.topic) || [];
    const topicCounts = topics.reduce((acc, t) => { acc[t] = (acc[t]||0)+1; return acc; }, {});
    const favTopic = Object.entries(topicCounts).sort((a,b) => b[1]-a[1])[0];
    if (favTopic) insights.push('🎯 Your most practiced topic is <strong>' + favTopic[0] + '</strong> with ' + favTopic[1] + ' quiz attempts.');
    if (!insights.length) insights.push('📊 Complete quizzes and enroll in courses to see personalized insights here!');
    return insights.join('<br><br>');
}

// ── Study plan generator ──────────────────────────────────────────────────────
function generateStudyPlan() {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const enrolled = S.enrolled?.length ? mockCourses.filter(c => S.enrolled.includes(c.id)) : mockCourses.slice(0,3);
    const plan = days.map((day, i) => {
        const course = enrolled[i % enrolled.length];
        const tasks = ['Review lecture notes','Practice exercises','Take a quiz','Watch tutorial','Work on assignment'];
        return {day, task: course ? course.title + ' — ' + tasks[i % tasks.length] : 'Free study / Review', dur: i < 5 ? '45 min' : '30 min'};
    });
    const container = document.getElementById('study-plan-container');
    if (!container) {
        showModal(plan.map(p => p.day + ': ' + p.task + ' (' + p.dur + ')').join('\n'), '📅');
        return;
    }
    container.innerHTML = '<div class="study-plan">' + plan.map(p =>
        '<div class="study-plan-day"><span class="study-plan-day__label">' + p.day + '</span>' +
        '<span class="study-plan-day__task">' + p.task + '</span>' +
        '<span class="study-plan-day__dur">' + p.dur + '</span></div>'
    ).join('') + '</div>';
}

// ── Adaptive difficulty ───────────────────────────────────────────────────────
function adaptiveDifficulty() {
    if (!S.scoreHistory?.length) return null;
    const recent = S.scoreHistory.slice(0,5);
    const avg = recent.reduce((s,h) => s+h.score, 0) / recent.length;
    if (avg >= 85) return {suggestion:'Try harder quizzes!', level:'Advanced'};
    if (avg >= 65) return {suggestion:'You\'re on track. Keep it up!', level:'Intermediate'};
    return {suggestion:'Review the basics before moving on.', level:'Beginner'};
}

// ── Generate certificate ──────────────────────────────────────────────────────
function generateCertificate(courseName) {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 560;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,800,560);
    grad.addColorStop(0,'#0a0e1a'); grad.addColorStop(1,'#1a1040');
    ctx.fillStyle = grad; ctx.fillRect(0,0,800,560);
    ctx.strokeStyle = '#6699ff'; ctx.lineWidth = 4;
    ctx.strokeRect(20,20,760,520);
    ctx.fillStyle = '#6699ff'; ctx.font = 'bold 48px serif';
    ctx.textAlign = 'center'; ctx.fillText('⚡ NeuralLearn', 400, 100);
    ctx.fillStyle = '#ffffff'; ctx.font = '28px serif';
    ctx.fillText('Certificate of Completion', 400, 160);
    ctx.fillStyle = '#aabbff'; ctx.font = '20px serif';
    ctx.fillText('This certifies that', 400, 220);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 36px serif';
    ctx.fillText(S.user || 'Student', 400, 270);
    ctx.fillStyle = '#aabbff'; ctx.font = '20px serif';
    ctx.fillText('has successfully completed', 400, 320);
    ctx.fillStyle = '#6699ff'; ctx.font = 'bold 28px serif';
    ctx.fillText(courseName, 400, 370);
    ctx.fillStyle = '#888'; ctx.font = '16px serif';
    ctx.fillText(new Date().toLocaleDateString(), 400, 440);
    const link = document.createElement('a');
    link.download = 'certificate-' + courseName.replace(/\s+/g,'-') + '.png';
    link.href = canvas.toDataURL();
    link.click();
    toast('Certificate downloaded! 🎓','success');
}

// ── Share progress ────────────────────────────────────────────────────────────
function shareProgress() {
    const text = 'I\'m Level ' + S.level + ' on NeuralLearn with ' + S.points + ' points and a ' + S.streak + '-day streak! 🚀 #NeuralLearn #Learning';
    if (navigator.share) {
        navigator.share({title:'My NeuralLearn Progress', text, url:'https://neurallearn.ai'}).catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

// ── Export chat ───────────────────────────────────────────────────────────────
function exportChat() {
    const msgs = document.querySelectorAll('#chat-container .msg');
    let text = 'NeuralLearn Chat Export — ' + new Date().toLocaleString() + '\n\n';
    msgs.forEach(m => {
        const role = m.classList.contains('msg--ai') ? 'AI Tutor' : S.user || 'You';
        const bubble = m.querySelector('.msg__bubble');
        if (bubble) text += role + ': ' + bubble.textContent + '\n\n';
    });
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'chat-export-' + Date.now() + '.txt';
    a.click(); URL.revokeObjectURL(url);
    toast('Chat exported! 📤','success');
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!S.user) { showSection('login-form'); return; }
    const wm = document.getElementById('welcome-message');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const fullMsg = greeting + ', ' + S.user + '! Ready to learn? 🚀';
    if (wm) typeWriter(wm, fullMsg, 35);

    // Motivational quote
    const qEl = document.getElementById('motivational-quote');
    if (qEl) qEl.textContent = getMotivationalQuote();

    try {
        let courses = mockCourses;
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/courses', {headers:{Authorization:'Bearer ' + S.token}});
                const d = await res.json();
                if (d.success && d.courses?.length) { mockCourses = d.courses; courses = d.courses; }
            } catch {}
        }
        const withProg = courses.map(c => {
            const saved = localStorage.getItem('prog_' + c.id);
            return {...c, progress: saved ? parseInt(saved) : Math.floor(Math.random() * 100)};
        });
        withProg.forEach(c => safeSetItem('prog_' + c.id, c.progress));
        S.courses = withProg;
        renderCourseGrid('dashboard-course-grid', withProg, true);
        const avg = Math.round(withProg.reduce((s,c) => s+c.progress, 0) / withProg.length) || 0;
        animateProgress(avg);
        renderLeaderboard();
        syncStats();
        renderScoreHistory();
        renderStudyCalendar();
        DailyChallenge.render();
        StudyTimer.render();

        const rec = document.getElementById('recommendations');
        if (rec) {
            const adapt = adaptiveDifficulty();
            const recs = withProg.filter(c => c.progress < 50).slice(0,3).map(c => c.emoji + ' ' + c.title).join(', ');
            rec.innerHTML = '📚 <strong>Continue learning:</strong> ' + (recs || 'All courses on track! 🎉') +
                (adapt ? ' &nbsp;|&nbsp; 💡 ' + adapt.suggestion : '');
            if (window.gsap) gsap.from(rec, {opacity:0,y:16,duration:.5,delay:.2});
        }
    } catch(e) { toast('Failed to load dashboard','error'); console.error(e); }
}

function renderScoreHistory() {
    const container = document.getElementById('score-history-list');
    if (!container) return;
    if (!S.scoreHistory?.length) { container.innerHTML = '<p style="color:var(--txt3);font-size:var(--text-sm)">No quiz attempts yet</p>'; return; }
    container.innerHTML = S.scoreHistory.slice(0,5).map(s =>
        '<div class="score-entry">' +
        '<span class="score-entry__date">' + s.date + '</span>' +
        '<span>' + s.topic + '</span>' +
        '<span style="font-size:var(--text-xs);color:var(--txt3)">' + calculateGrade(s.score) + '</span>' +
        '<span class="score-entry__val">' + s.score + '%</span>' +
        '</div>'
    ).join('');
}

function animateProgress(pct) {
    const fill  = document.getElementById('overall-fill');
    const glow  = document.getElementById('overall-glow');
    const lbl   = document.getElementById('overall-pct');
    const track = document.getElementById('progress-track');
    if (fill && window.gsap) gsap.to(fill, {width:pct+'%',duration:1.2,ease:'power2.out'});
    else if (fill) fill.style.width = pct + '%';
    if (glow && window.gsap) gsap.to(glow, {left:'calc('+pct+'% - 20px)',duration:1.2,ease:'power2.out'});
    if (lbl && window.gsap) gsap.to({val:0},{val:pct,duration:1.2,ease:'power2.out',onUpdate:function(){lbl.textContent=Math.round(this.targets()[0].val)+'%';}});
    else if (lbl) lbl.textContent = pct + '%';
    if (track) track.setAttribute('aria-valuenow', pct);
    document.querySelectorAll('.ms').forEach(m => m.classList.toggle('active', pct >= parseInt(m.dataset.milestone)));
}

function renderCourseGrid(gridId, courses, showProgress=false, filter='all') {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const filtered = filter === 'all' ? courses : courses.filter(c => c.difficulty === filter);
    const diffColor = {Beginner:'var(--success)',Intermediate:'var(--warning)',Advanced:'var(--danger)'};
    grid.innerHTML = filtered.map(c => {
        const enrolled = S.enrolled?.includes(c.id);
        return '<div class="course-card" data-id="' + c.id + '" role="gridcell" tabindex="0" aria-label="Open ' + c.title + '">' +
            '<span class="course-card__emoji">' + (c.emoji||'📚') + '</span>' +
            '<h3>' + c.title + '</h3>' +
            '<p>' + c.description + '</p>' +
            (c.difficulty ? '<span style="font-size:var(--text-xs);font-weight:700;color:' + (diffColor[c.difficulty]||'var(--txt3)') + '">' + c.difficulty + ' · ' + (c.duration||'') + '</span>' : '') +
            (c.rating ? '<span style="font-size:var(--text-xs);color:var(--warning);margin-left:var(--s2)">★ ' + c.rating + '</span>' : '') +
            (enrolled ? '<div class="enrolled-tag">✅ Enrolled</div>' : '') +
            (showProgress ? '<div class="prog-label" style="margin-top:var(--s3)">Progress: ' + (c.progress||0) + '%</div><div class="prog-bar"><div class="prog-fill" style="width:0%" data-target="' + (c.progress||0) + '"></div></div>' : '') +
            '</div>';
    }).join('');
    if (showProgress) {
        setTimeout(() => {
            grid.querySelectorAll('.prog-fill').forEach(el => {
                if (window.gsap) gsap.to(el, {width:el.dataset.target+'%',duration:.9,ease:'power2.out'});
                else el.style.width = el.dataset.target + '%';
            });
        }, 200);
    }
    if (window.gsap) gsap.from('#' + gridId + ' .course-card', {opacity:0,y:28,stagger:.08,duration:.5});
    grid.querySelectorAll('.course-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const course = mockCourses.find(c => c.id === id);
            if (course) openCourseModal(course);
        });
        card.addEventListener('keydown', e => { if (e.key === 'Enter') card.click(); });
    });
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    const data = [
        {name:S.user||'You',pts:S.points,av:(S.user||'Y')[0].toUpperCase()},
        {name:'Alice',pts:142,av:'A'},{name:'Bob',pts:118,av:'B'},
        {name:'Carol',pts:97,av:'C'},{name:'Dave',pts:83,av:'D'}
    ].sort((a,b) => b.pts - a.pts);
    const medals = ['🥇','🥈','🥉'];
    list.innerHTML = data.map((u,i) =>
        '<li style="' + (u.name===S.user?'background:hsla(var(--h1),90%,62%,.08);border-radius:var(--r-sm);':'') + '">' +
        '<span style="font-size:1.1rem">' + (medals[i]||'  ') + '</span>' +
        '<span style="width:28px;height:28px;border-radius:50%;background:var(--grad);display:inline-grid;place-content:center;font-size:var(--text-xs);font-weight:800;color:#fff;flex-shrink:0">' + u.av + '</span>' +
        '<strong>' + u.name + (u.name===S.user?' (You)':'') + '</strong>' +
        '<span style="margin-left:auto;font-family:var(--font-m);font-size:var(--text-sm);color:var(--p)">' + u.pts + ' pts</span>' +
        '</li>'
    ).join('');
    if (window.gsap) gsap.from('#leaderboard-list li', {opacity:0,x:-18,stagger:.07,duration:.4});
}

// ── Course Modal ──────────────────────────────────────────────────────────────
function openCourseModal(course) {
    const veil = document.getElementById('course-modal-veil');
    if (!veil) return;
    document.getElementById('course-modal-emoji').textContent = course.emoji || '📚';
    document.getElementById('course-modal-title').textContent = course.title;
    document.getElementById('course-modal-desc').textContent = course.description;
    const syllabus = document.getElementById('course-modal-syllabus');
    if (syllabus) syllabus.innerHTML = (course.syllabus||[]).map(s => '<li>' + s + '</li>').join('');
    const assigns = document.getElementById('course-modal-assignments');
    if (assigns) assigns.innerHTML = (course.assignments||[]).map(a => '<li>' + a.title + ' — Due: ' + (a.dueDate||a.due_date||'TBD') + '</li>').join('') || '<li>No assignments yet</li>';
    const enrollBtn = document.getElementById('course-enroll-btn');
    if (enrollBtn) {
        const enrolled = S.enrolled?.includes(course.id);
        enrollBtn.textContent = enrolled ? '✅ Already Enrolled' : '🎓 Enroll in Course';
        enrollBtn.disabled = enrolled;
        enrollBtn.onclick = () => enrollCourse(course);
    }
    veil.classList.add('active'); veil.setAttribute('aria-hidden','false');
}
function closeCourseModal() {
    const veil = document.getElementById('course-modal-veil');
    if (!veil) return;
    veil.classList.remove('active'); veil.setAttribute('aria-hidden','true');
}
function enrollCourse(course) {
    if (!S.enrolled) S.enrolled = [];
    if (S.enrolled.includes(course.id)) return;
    S.enrolled.push(course.id);
    S.points += 5; addXP(15); syncStats(); saveSession();
    toast('Enrolled in ' + course.title + '! 🎓 +5 pts','success');
    addNotification('📚 Enrolled in ' + course.title);
    if (S.enrolled.length >= 3) awardBadge('Course Explorer');
    closeCourseModal();
    if (document.getElementById('course-grid')?.closest('.page.active')) loadCourseSection();
    if (document.getElementById('dashboard-course-grid')?.closest('.page.active')) loadDashboard();
}

// ── Courses ───────────────────────────────────────────────────────────────────
async function loadCourseSection() {
    const grid = document.getElementById('course-grid');
    if (!grid) return;
    try {
        let courses = mockCourses;
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/courses', {headers:{Authorization:'Bearer ' + S.token}});
                const d = await res.json();
                if (d.success && d.courses?.length) { mockCourses = d.courses; courses = d.courses; }
            } catch {}
        }
        S.courses = courses;
        renderCourseGrid('course-grid', courses, false);
        // Course search
        const searchEl = document.getElementById('course-search');
        if (searchEl) {
            searchEl.oninput = debounce(function() {
                const q = this.value.toLowerCase();
                grid.querySelectorAll('.course-card').forEach(card => {
                    card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
                });
            }, 200);
        }
        // Course filter buttons
        document.querySelectorAll('[data-course-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-course-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderCourseGrid('course-grid', courses, false, btn.dataset.courseFilter);
            });
        });
        const details = document.getElementById('course-details');
        if (details) details.innerHTML = '';
    } catch(e) { toast('Failed to load courses','error'); console.error(e); }
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function formatTime() { return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); }

function appendMsg(text, role) {
    const c = document.getElementById('chat-container');
    if (!c) return null;
    const wrap = document.createElement('div');
    wrap.className = 'msg msg--' + role;
    const safeText = markdownToHtml(text);
    wrap.innerHTML = '<div class="msg__av">' + (role==='ai'?'🤖':'👤') + '</div>' +
        '<div><div class="msg__bubble">' + safeText + '</div>' +
        '<div class="msg__time">' + formatTime() + '</div></div>';
    c.appendChild(wrap);
    c.scrollTop = c.scrollHeight;
    return wrap.querySelector('.msg__bubble');
}

async function sendChat() {
    const inp = document.getElementById('chat-input');
    if (!inp) return;
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    appendMsg(msg, 'user');
    S.chatHistory.push({role:'user', content:msg});
    const bubble = appendMsg('', 'ai');
    if (bubble) bubble.classList.add('typing');
    recordActivity();
    try {
        if (S.offline) {
            if (bubble) { bubble.classList.remove('typing'); bubble.textContent = 'You are offline. Message queued for when you reconnect.'; }
            cacheReq(APP_CONFIG.pyBase + '/api/chat', {message:msg});
            return;
        }
        const res = await fetch(APP_CONFIG.pyBase + '/api/chat', {
            method:'POST',
            headers:{'Content-Type':'application/json', ...(S.token ? {Authorization:'Bearer ' + S.token} : {})},
            body:JSON.stringify({message:msg, history:S.chatHistory.slice(-6)})});
        const d = await res.json();
        const response = d.response || "I'm not sure — try rephrasing!";
        if (bubble) { bubble.classList.remove('typing'); bubble.innerHTML = markdownToHtml(response); }
        S.chatHistory.push({role:'ai', content:response});
        if (S.chatHistory.length > 40) S.chatHistory = S.chatHistory.slice(-40);
        // Show suggestions if provided
        if (d.suggestions?.length) {
            const chips = document.getElementById('chat-suggestions');
            if (chips) {
                chips.innerHTML = d.suggestions.map(s =>
                    '<button class="chip" data-msg="' + s + '">' + s + '</button>'
                ).join('');
                chips.querySelectorAll('.chip').forEach(chip => {
                    chip.addEventListener('click', () => { inp.value = chip.dataset.msg; sendChat(); });
                });
            }
        }
    } catch(e) {
        if (bubble) { bubble.classList.remove('typing'); bubble.textContent = 'Connection error. Please try again.'; }
    }
    addXP(2); saveSession();
}

function clearChat() {
    const c = document.getElementById('chat-container');
    if (!c) return;
    c.innerHTML = '<div class="msg msg--ai"><div class="msg__av">🤖</div><div><div class="msg__bubble">Chat cleared! Ask me anything about your courses 🎓</div><div class="msg__time">' + formatTime() + '</div></div></div>';
    S.chatHistory = [];
    toast('Chat cleared','info');
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 18;

async function loadQuizzes(filter='all') {
    const qDiv = document.getElementById('quiz-questions');
    if (!qDiv) return;
    try {
        let quizzes = mockQuizzes;
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/quizzes', {headers:{Authorization:'Bearer ' + S.token}});
                const d = await res.json();
                if (d.success && d.quizzes?.length) { mockQuizzes = d.quizzes; quizzes = d.quizzes; }
            } catch {}
        }
        const filtered = filter === 'all' ? quizzes : quizzes.filter(q => q.topic === filter);
        const diffColor = {Easy:'var(--success)',Medium:'var(--warning)',Hard:'var(--danger)'};
        qDiv.innerHTML = filtered.map((q,i) =>
            '<div class="quiz-card" role="group" aria-label="Question ' + (i+1) + '">' +
            '<div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s3)">' +
            '<span style="font-size:var(--text-xs);font-weight:700;color:var(--txt3)">Q' + (i+1) + ' of ' + filtered.length + '</span>' +
            (q.difficulty ? '<span class="diff-badge diff-badge--' + q.difficulty.toLowerCase() + '">' + q.difficulty + '</span>' : '') +
            (q.topic ? '<span style="font-size:var(--text-xs);color:var(--txt3);margin-left:auto">' + q.topic + '</span>' : '') +
            '</div>' +
            '<p class="quiz-card__q">' + q.question + '</p>' +
            '<div class="quiz-opts">' +
            q.options.map((o,j) =>
                '<label class="quiz-opt"><input type="radio" name="q' + i + '" value="' + j + '" aria-label="' + o + '"><span>' + o + '</span></label>'
            ).join('') +
            '</div></div>'
        ).join('');
        if (window.gsap) gsap.from('.quiz-card', {opacity:0,y:22,stagger:.1,duration:.5});

        // Timer
        clearInterval(S.quizTimer);
        let t = 60;
        const timerEl = document.getElementById('timer');
        const arc = document.getElementById('timer-arc');
        const ring = document.getElementById('timer-ring');
        if (arc) arc.style.strokeDasharray = TIMER_CIRCUMFERENCE;
        if (timerEl) timerEl.textContent = t;
        S.quizTimer = setInterval(() => {
            t--;
            if (timerEl) timerEl.textContent = t;
            if (arc) arc.style.strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - t/60);
            if (t <= 10) { arc?.classList.add('urgent'); ring?.classList.add('urgent'); }
            if (t <= 0) { clearInterval(S.quizTimer); submitQuiz(); }
        }, 1000);

        // Quiz filter buttons
        document.querySelectorAll('[data-quiz-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-quiz-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadQuizzes(btn.dataset.quizFilter);
            });
        });
    } catch(e) { toast('Failed to load quizzes','error'); qDiv.innerHTML = '<p>Unable to load quizzes</p>'; }
}

async function submitQuiz(event) {
    if (event) event.preventDefault();
    clearInterval(S.quizTimer);
    document.getElementById('timer-arc')?.classList.remove('urgent');

    const answers = [];
    document.querySelectorAll('#quiz-content input[type="radio"]:checked').forEach(inp => {
        const idx = parseInt(inp.name.replace('q',''));
        answers.push({questionIndex:idx, question_id:mockQuizzes[idx]?.id, answer:parseInt(inp.value)});
    });
    if (!answers.length) { showModal('Please select at least one answer','⚠️'); return; }

    answers.forEach(a => {
        const opts = document.querySelectorAll('[name="q' + a.questionIndex + '"]');
        opts.forEach(inp => {
            const lbl = inp.closest('.quiz-opt');
            if (parseInt(inp.value) === mockQuizzes[a.questionIndex]?.correctAnswer) lbl?.classList.add('correct');
            else if (parseInt(inp.value) === a.answer) lbl?.classList.add('wrong');
        });
    });

    try {
        let score = 0;
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/submit-quiz', {
                    method:'POST',
                    headers:{'Content-Type':'application/json', Authorization:'Bearer ' + S.token},
                    body:JSON.stringify({answers})});
                const d = await res.json();
                if (d.success) { score = d.score; S.points += d.points_earned || 0; }
            } catch {}
        }
        if (!score) {
            answers.forEach(a => { if (mockQuizzes[a.questionIndex]?.correctAnswer === a.answer) score += Math.round(100/answers.length); });
            S.points += Math.round(score/10);
            if (S.offline) cacheReq(APP_CONFIG.pyBase + '/api/submit-quiz', {answers});
        }

        if (!S.scoreHistory) S.scoreHistory = [];
        const topic = mockQuizzes[answers[0]?.questionIndex]?.topic || 'General';
        S.scoreHistory.unshift({score, topic, date:new Date().toLocaleDateString()});
        if (S.scoreHistory.length > 20) S.scoreHistory.pop();

        const badge = document.getElementById('quiz-score-badge');
        const val = document.getElementById('quiz-score-val');
        if (badge && val) { val.textContent = score + '%'; badge.hidden = false; }

        const grade = calculateGrade(score);
        addXP(Math.round(score/5));
        syncStats(); saveSession(); recordActivity();
        showModal('Quiz complete! Score: ' + score + '% (' + grade + ') 🎉\n+' + Math.round(score/10) + ' points earned','🏆');
        playSound('success');
        addNotification('📝 Quiz score: ' + score + '% (' + grade + ')');
        if (score >= 80) awardBadge('Quiz Champion');
        if (score === 100) { awardBadge('Perfect Score'); confettiBurst(); }
        if (S.scoreHistory.length >= 5) awardBadge('Quiz Veteran');

        // Show review button
        const reviewBtn = document.getElementById('quiz-review-btn');
        if (reviewBtn) reviewBtn.hidden = false;
    } catch(e) { showModal('Failed to submit quiz','❌'); console.error(e); }
}

// ── Upload ────────────────────────────────────────────────────────────────────
function setupDropzone() {
    const zone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const body = document.getElementById('content-body');
    if (!zone || !body) return;
    zone.addEventListener('click', () => fileInput?.click());
    zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); });
    fileInput?.addEventListener('change', e => {
        const f = e.target.files[0];
        if (f) readFile(f);
        else toast('Please select a file','error');
    });
    ['dragover','dragenter'].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('drag-active'); }));
    ['dragleave','dragend'].forEach(ev => zone.addEventListener(ev, () => zone.classList.remove('drag-active')));
    zone.addEventListener('drop', e => {
        e.preventDefault(); zone.classList.remove('drag-active');
        const f = e.dataTransfer.files[0];
        if (f) readFile(f);
        else toast('Please drop a supported file','error');
    });
    function readFile(f) {
        const r = new FileReader();
        r.onload = ev => { body.value = ev.target.result; toast('File loaded!','success'); updateCharCount(); };
        r.onerror = () => toast('Failed to read file','error');
        if (f.name.endsWith('.pdf')) { toast('PDF loaded (text extraction limited in browser)','info'); body.value = '[PDF content: ' + f.name + ']'; updateCharCount(); }
        else r.readAsText(f);
    }
    body.addEventListener('input', updateCharCount);
    function updateCharCount() {
        const cc = document.getElementById('char-count');
        if (cc) cc.textContent = body.value.length.toLocaleString() + ' characters';
    }
    // File type selector
    document.querySelectorAll('.file-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.file-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (fileInput) fileInput.accept = btn.dataset.ext;
        });
    });
}

async function uploadContent(e) {
    if (e) e.preventDefault();
    if (S.role !== 'tutor') { toast('Only tutors can upload content','error'); return; }
    const title = document.getElementById('content-title').value.trim();
    const body  = document.getElementById('content-body').value.trim();
    if (!title || !body) { toast('Please fill in all fields','error'); return; }
    try {
        if (!S.offline) {
            try {
                const res = await fetch(APP_CONFIG.phpBase + '?action=upload-content', {
                    method:'POST',
                    headers:{'Content-Type':'application/json', ...(S.token ? {Authorization:'Bearer ' + S.token} : {})},
                    body:JSON.stringify({title,body,uploaded_by:S.userId})});
                const d = await res.json();
                if (!d.success) { toast(d.error || 'Upload failed','error'); return; }
            } catch {}
        } else {
            cacheReq(APP_CONFIG.phpBase + '?action=upload-content', {title,body,uploaded_by:S.userId});
        }
        S.points += 10; addXP(15); syncStats(); saveSession();
        toast('Content uploaded! +10 pts 🎉','success'); playSound('success');
        document.getElementById('content-title').value = '';
        document.getElementById('content-body').value = '';
        document.getElementById('char-count').textContent = '0 characters';
        awardBadge('Content Creator');
        addNotification('⬆️ Content uploaded: ' + title);
    } catch(e) { toast('Upload failed','error'); console.error(e); }
}

function previewContent() {
    const title = document.getElementById('content-title').value.trim();
    const body  = document.getElementById('content-body').value.trim();
    const preview = document.getElementById('content-preview');
    const pb = document.getElementById('content-preview-body');
    if (!title || !body) { toast('Fill in title and body first','error'); return; }
    if (pb) pb.innerHTML = '<h2 style="font-family:var(--font-h);margin-bottom:var(--s4)">' + title + '</h2>' + markdownToHtml(body);
    if (preview) { preview.hidden = false; if (window.gsap) gsap.from(preview, {opacity:0,y:18,duration:.4}); }
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;

    if (S.role !== 'tutor') {
        const layout = document.querySelector('.analytics-layout');
        if (layout) {
            layout.innerHTML = '<div class="glass-card" style="grid-column:1/-1"><h3 class="glass-card__title">📊 My Performance</h3><div class="stat-list" id="my-stats"></div></div>';
            const myStats = document.getElementById('my-stats');
            if (myStats) {
                const avg = S.scoreHistory?.length ? Math.round(S.scoreHistory.reduce((s,h) => s+h.score, 0) / S.scoreHistory.length) : 0;
                [{lbl:'Total Points',val:S.points},{lbl:'Current Level',val:S.level},{lbl:'Day Streak',val:S.streak},
                 {lbl:'Courses Enrolled',val:S.enrolled?.length||0},{lbl:'Avg Quiz Score',val:avg+'%'},
                 {lbl:'Quizzes Taken',val:S.scoreHistory?.length||0},{lbl:'Current Grade',val:calculateGrade(avg)}
                ].forEach(s => {
                    const row = document.createElement('div');
                    row.className = 'stat-row';
                    row.innerHTML = '<span class="stat-row__lbl">' + s.lbl + '</span><span class="stat-row__val">' + s.val + '</span>';
                    myStats.appendChild(row);
                });
            }
        }
        // AI insights for students
        const insightsEl = document.getElementById('ai-insights');
        if (insightsEl) insightsEl.innerHTML = generateInsights();
        return;
    }

    const existing = Chart.getChart(canvas);
    if (existing) existing.destroy();

    try {
        let students = ['Alice','Bob','Carol','Dave','Eve','Frank'];
        let progress = [88,74,95,62,81,70];
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/analytics', {headers:{Authorization:'Bearer ' + S.token}});
                const d = await res.json();
                if (d.success) { students = d.students; progress = d.progress; }
            } catch {}
        }
        const colors = students.map((_,i) => 'hsla(' + ((i*52+210)%360) + ',75%,62%,.85)');
        const borderColors = colors.map(c => c.replace('.85','1'));
        new Chart(canvas.getContext('2d'), {
            type: S.chartType || 'bar',
            data: {labels:students, datasets:[{
                label:'Progress (%)', data:progress,
                backgroundColor:colors, borderColor:borderColors,
                borderWidth:2, borderRadius:10, fill:S.chartType==='line',
                tension:.4, pointBackgroundColor:borderColors, pointRadius:5}]},
            options: {
                responsive:true, maintainAspectRatio:false,
                plugins:{
                    legend:{labels:{color:'rgba(255,255,255,.7)',font:{family:'Inter',size:12}}},
                    tooltip:{backgroundColor:'rgba(10,12,20,.9)',borderColor:'rgba(100,150,255,.3)',borderWidth:1,
                        callbacks:{label:ctx => ctx.label + ': ' + ctx.raw + '%'}}},
                scales:{
                    y:{beginAtZero:true,max:100,ticks:{color:'rgba(255,255,255,.5)',font:{family:'JetBrains Mono'}},grid:{color:'rgba(255,255,255,.06)'}},
                    x:{ticks:{color:'rgba(255,255,255,.5)'},grid:{color:'rgba(255,255,255,.04)'}}},
                animation:{duration:900,easing:'easeOutQuart'}}});

        const statList = document.getElementById('analytics-stat-list');
        if (statList) {
            statList.innerHTML = '';
            const avg = Math.round(progress.reduce((s,v) => s+v, 0) / progress.length);
            const top = students[progress.indexOf(Math.max(...progress))];
            [{lbl:'Average Progress',val:avg+'%'},{lbl:'Top Student',val:top},
             {lbl:'Total Students',val:students.length},{lbl:'Above 80%',val:progress.filter(p=>p>=80).length+' / '+students.length},
             {lbl:'Needs Attention',val:progress.filter(p=>p<60).length}
            ].forEach(s => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                row.innerHTML = '<span class="stat-row__lbl">' + s.lbl + '</span><span class="stat-row__val">' + s.val + '</span>';
                statList.appendChild(row);
            });
        }

        // Top performers
        const topList = document.getElementById('top-performers-list');
        if (topList) {
            const sorted = students.map((s,i) => ({name:s,score:progress[i]})).sort((a,b) => b.score-a.score).slice(0,5);
            const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
            topList.innerHTML = sorted.map((p,i) =>
                '<div class="performer-item">' +
                '<span class="performer-rank">' + medals[i] + '</span>' +
                '<strong style="min-width:80px">' + p.name + '</strong>' +
                '<div class="performer-bar"><div class="performer-bar__fill" style="width:' + p.score + '%"></div></div>' +
                '<span class="performer-score">' + p.score + '%</span>' +
                '</div>'
            ).join('');
        }

        // Heatmap
        const hm = document.getElementById('heatmap');
        if (hm) {
            hm.innerHTML = '';
            for (let i = 0; i < 28; i++) {
                const cell = document.createElement('div');
                cell.className = 'hm-cell';
                const lvl = Math.floor(Math.random() * 5);
                if (lvl > 0) cell.setAttribute('data-level', lvl);
                cell.title = 'Day ' + (i+1) + ': ' + lvl*25 + '% activity';
                hm.appendChild(cell);
            }
            if (window.gsap) gsap.from('.hm-cell', {opacity:0,scale:0,stagger:.02,duration:.3});
        }

        // AI insights
        const insightsEl = document.getElementById('ai-insights');
        if (insightsEl) insightsEl.innerHTML = generateInsights();

        if (window.gsap) gsap.from(canvas, {opacity:0,scale:.94,duration:.5});
    } catch(e) { toast('Failed to load analytics','error'); console.error(e); }
}

// ── Feedback ──────────────────────────────────────────────────────────────────
function loadFeedback() {
    const form = document.getElementById('feedback-form-el');
    if (!form || form.dataset.bound) return;
    form.dataset.bound = '1';
    form.addEventListener('submit', submitFeedback);
    document.querySelectorAll('.type-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const sel = document.getElementById('feedback-type');
            if (sel) sel.value = btn.dataset.type;
        });
    });
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            S.starRating = parseInt(star.dataset.val);
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= S.starRating));
        });
        star.addEventListener('mouseenter', () => {
            const v = parseInt(star.dataset.val);
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= v));
        });
        star.addEventListener('mouseleave', () => {
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= S.starRating));
        });
    });
    // Social share buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const platform = btn.dataset.platform;
            const text = 'I love learning on NeuralLearn! 🚀 #NeuralLearn';
            const url = 'https://neurallearn.ai';
            if (platform === 'twitter') window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank');
            else if (platform === 'linkedin') window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url), '_blank');
            else copyToClipboard(url);
        });
    });
    // Report bug button
    document.getElementById('report-bug-btn')?.addEventListener('click', () => {
        document.getElementById('feedback-type').value = 'bug';
        document.querySelectorAll('.type-pill').forEach(b => b.classList.toggle('active', b.dataset.type === 'bug'));
        document.getElementById('feedback-message')?.focus();
        toast('Bug report mode activated 🐛','info');
    });
    if (window.gsap) gsap.from(form, {opacity:0,y:20,duration:.5});
}

async function submitFeedback(e) {
    e.preventDefault();
    const type = document.getElementById('feedback-type').value;
    const message = document.getElementById('feedback-message').value.trim();
    if (!message) { toast('Please enter a message','error'); return; }
    try {
        if (!S.offline) {
            try {
                const res = await fetch(APP_CONFIG.phpBase + '?action=feedback', {
                    method:'POST',
                    headers:{'Content-Type':'application/json', ...(S.token ? {Authorization:'Bearer ' + S.token} : {})},
                    body:JSON.stringify({user_id:S.userId||0,type,message,rating:S.starRating})});
                const d = await res.json();
                if (!d.success) { toast(d.error || 'Feedback failed','error'); return; }
            } catch {}
        } else {
            cacheReq(APP_CONFIG.phpBase + '?action=feedback', {user_id:S.userId||0,type,message});
        }
        toast('Feedback submitted! Thank you 🙏','success');
        document.getElementById('feedback-message').value = '';
        S.points += 2; S.starRating = 0; addXP(5); syncStats(); saveSession();
        document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
        if (S.points >= 20) awardBadge('Feedback Star');
    } catch(e) { toast('Feedback failed','error'); console.error(e); }
}

// ── Help ──────────────────────────────────────────────────────────────────────
function loadHelp() {
    if (window.gsap) gsap.from('.faq', {opacity:0,y:14,stagger:.07,duration:.4});
}

// ── Repository ────────────────────────────────────────────────────────────────
async function loadRepository() {
    const grid = document.getElementById('repo-grid');
    if (!grid) return;
    try {
        let items = [
            {title:'Python Variables & Types',description:'Learn about variables, data types, and type conversion in Python.',tag:'Python'},
            {title:'Integration Techniques',description:'Definite and indefinite integration, substitution, and by parts.',tag:'Calculus'},
            {title:'HTML5 Semantics',description:'Semantic elements, accessibility, and modern HTML structure.',tag:'Web Dev'},
            {title:'Linked Lists',description:'Singly, doubly, and circular linked lists with complexity analysis.',tag:'DSA'},
            {title:'Linear Regression',description:'ML fundamentals: gradient descent, cost function, and evaluation.',tag:'ML'},
            {title:'CSS Grid & Flexbox',description:'Modern layout techniques for responsive, beautiful designs.',tag:'Web Dev'},
            {title:'Recursion & Backtracking',description:'Recursive thinking, memoization, and backtracking patterns.',tag:'DSA'},
            {title:'Neural Networks 101',description:'Perceptrons, activation functions, and forward propagation.',tag:'ML'},
            {title:'SQL Fundamentals',description:'SELECT, JOIN, GROUP BY — master relational databases.',tag:'Databases'},
            {title:'Git & Version Control',description:'Branching, merging, rebasing — professional Git workflows.',tag:'DevOps'},
            {title:'Docker Containers',description:'Containerization, images, volumes, and Docker Compose.',tag:'DevOps'},
            {title:'React Hooks',description:'useState, useEffect, useContext, and custom hooks.',tag:'React'},
            {title:'TypeScript Basics',description:'Types, interfaces, generics, and type guards.',tag:'TypeScript'},
        ];
        if (!S.offline && S.token) {
            try {
                const res = await fetch(APP_CONFIG.pyBase + '/api/repository', {headers:{Authorization:'Bearer ' + S.token}});
                const d = await res.json();
                if (d.success && d.items?.length) items = d.items;
            } catch {}
        }
        grid.innerHTML = items.map(item =>
            '<div class="repo-item" role="listitem">' +
            '<div class="repo-item__title">' + item.title + '</div>' +
            '<div class="repo-item__desc">' + item.description + '</div>' +
            (item.tag ? '<span class="repo-item__tag">' + item.tag + '</span>' : '') +
            '<div class="repo-item__actions">' +
            '<button class="btn btn--ghost btn--sm" onclick="copyToClipboard(\'' + item.title.replace(/'/g,"\\'") + ': ' + item.description.replace(/'/g,"\\'") + '\')">📋 Copy</button>' +
            '</div></div>'
        ).join('');
        if (window.gsap) gsap.from('.repo-item', {opacity:0,y:22,stagger:.06,duration:.4});
        document.getElementById('repo-search')?.addEventListener('input', debounce(function() {
            const q = this.value.toLowerCase();
            grid.querySelectorAll('.repo-item').forEach(item => {
                item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        }, 200));
    } catch(e) { toast('Failed to load repository','error'); grid.innerHTML = '<p>Unable to load content</p>'; }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function setupWS() {
    const body = document.getElementById('content-body');
    if (!body || !APP_CONFIG.wsUrl) return;
    let ws;
    try {
        ws = new WebSocket(APP_CONFIG.wsUrl);
        ws.onerror = () => { ws = null; };
        ws.onmessage = e => {
            try {
                const d = JSON.parse(e.data);
                if (d.content && d.user !== S.user) { body.value = d.content; toast(d.user + ' updated content','info'); }
            } catch {}
        };
    } catch { return; }
    let deb;
    body.addEventListener('input', () => {
        clearTimeout(deb);
        deb = setTimeout(() => {
            if (ws?.readyState === WebSocket.OPEN)
                try { ws.send(JSON.stringify({content:body.value,user:S.user})); } catch {}
        }, 300);
    });
}

// ── Data loader ───────────────────────────────────────────────────────────────
async function loadData() {
    try {
        const res = await fetch('Datasets/tutoring_system_data.json');
        if (!res.ok) return;
        const d = await res.json();
        if (d.courses?.length) mockCourses = d.courses.map(c => ({
            ...c, id:c.course_id||c.id, emoji:c.emoji||'📚',
            difficulty:c.difficulty||'Beginner', duration:c.duration||'4 weeks', rating:c.rating||4.5
        }));
        if (d.quizzes?.length) mockQuizzes = d.quizzes.map(q => ({
            ...q, id:q.quiz_id||q.id, correctAnswer:q.correct_answer??q.correctAnswer,
            difficulty:q.difficulty||'Easy', topic:q.topic||'General'
        }));
    } catch {}
}

// ── Mini game ─────────────────────────────────────────────────────────────────
const MiniGame = {
    active: false,
    startTime: 0,
    scores: [],
    start() {
        const target = document.getElementById('mini-game-target');
        const msg = document.getElementById('mini-game-msg');
        const score = document.getElementById('mini-game-score');
        if (!target) return;
        this.active = false;
        if (msg) msg.textContent = 'Get ready…';
        if (score) score.textContent = '—';
        const delay = 1000 + Math.random() * 3000;
        setTimeout(() => {
            if (msg) msg.textContent = 'Click NOW!';
            target.style.background = 'var(--grad3)';
            this.startTime = Date.now();
            this.active = true;
        }, delay);
    },
    click() {
        if (!this.active) { toast('Too early! Wait for the signal.','error'); return; }
        const ms = Date.now() - this.startTime;
        this.active = false;
        this.scores.push(ms);
        const target = document.getElementById('mini-game-target');
        const msg = document.getElementById('mini-game-msg');
        const score = document.getElementById('mini-game-score');
        if (target) target.style.background = 'var(--grad)';
        if (score) score.textContent = ms + 'ms';
        if (msg) msg.textContent = ms < 200 ? '⚡ Lightning fast!' : ms < 400 ? '🎯 Great!' : ms < 600 ? '👍 Good!' : '🐢 Keep practicing!';
        if (ms < 300) { addXP(5); toast('Reaction: ' + ms + 'ms — Amazing! +5 XP','success'); }
    }
};

// ── Intersection Observer for scroll animations ───────────────────────────────
function setupScrollAnimations() {
    if (!window.IntersectionObserver) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {threshold:0.1, rootMargin:'0px 0px -50px 0px'});
    document.querySelectorAll('.glass-card, .kpi, .course-card, .repo-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
}

// ── Back to top ───────────────────────────────────────────────────────────────
function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    const onScroll = throttle(() => {
        btn.classList.toggle('visible', window.scrollY > 400);
    }, 100);
    window.addEventListener('scroll', onScroll, {passive:true});
    btn.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
}

// ── Cookie banner ─────────────────────────────────────────────────────────────
function setupCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    if (localStorage.getItem('cookies_accepted')) return;
    setTimeout(() => banner.classList.add('visible'), 2000);
    document.getElementById('cookie-accept')?.addEventListener('click', () => {
        safeSetItem('cookies_accepted','1');
        banner.classList.remove('visible');
        toast('Preferences saved 🍪','success');
    });
    document.getElementById('cookie-decline')?.addEventListener('click', () => {
        banner.classList.remove('visible');
    });
}

// ── Splash screen ─────────────────────────────────────────────────────────────
function hideSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => splash.classList.add('hidden'), 1800);
}

// ── Performance monitor ───────────────────────────────────────────────────────
const PerformanceMonitor = {
    start: Date.now(),
    getTimeSpent() {
        return Object.entries(S.timeSpent).map(([section, seconds]) =>
            section + ': ' + Math.round(seconds) + 's'
        ).join(', ') || 'No data yet';
    }
};

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    initSounds();
    setupDropzone();
    initParticles();
    setupVoice();
    setupOffline();
    setupWS();
    setupSwipe();
    setupKeys();
    setupAuthTabs();
    setupProfileDropdown();
    setupGlobalSearch();
    setupRipples();
    setupBackToTop();
    setupCookieBanner();
    hideSplash();
    NetworkMonitor.init();
    SearchEngine.build();
    loadData();
    loadRepository();

    // Restore session
    if (loadSession()) {
        syncStats(); updateXPBar();
        setTimeout(() => showSection('dashboard'), 50);
    }

    // HUD controls
    document.querySelector('.sidebar-toggle')?.addEventListener('click', toggleSidebar);
    document.querySelector('.sidebar__close')?.addEventListener('click', closeSidebar);
    document.querySelector('.sidebar-overlay')?.addEventListener('click', closeSidebar);

    // Modal
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    document.getElementById('levelup-overlay')?.addEventListener('click', () => {
        document.getElementById('levelup-overlay').classList.remove('active');
    });

    // Course modal
    document.getElementById('course-modal-close')?.addEventListener('click', closeCourseModal);
    document.getElementById('course-modal-veil')?.addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCourseModal();
    });

    // Login
    document.getElementById('login-form-el')?.addEventListener('submit', login);
    document.querySelectorAll('#panel-login .role-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#panel-login .role-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const sel = document.getElementById('user-type');
            if (sel) sel.value = btn.dataset.role;
        });
    });
    document.querySelector('#panel-login .field__eye')?.addEventListener('click', () => {
        const pw = document.getElementById('password');
        if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
    });

    // Chat
    document.getElementById('send-btn')?.addEventListener('click', sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const inp = document.getElementById('chat-input');
            if (inp) { inp.value = chip.dataset.msg; sendChat(); }
        });
    });
    document.getElementById('chat-clear-btn')?.addEventListener('click', clearChat);
    document.getElementById('chat-export-btn')?.addEventListener('click', exportChat);
    document.getElementById('chat-tts-btn')?.addEventListener('click', () => {
        const lastAI = [...document.querySelectorAll('.msg--ai .msg__bubble')].pop();
        if (lastAI) speakText(lastAI.textContent);
        else toast('No AI message to speak','error');
    });

    // Quiz
    document.getElementById('quiz-content')?.addEventListener('submit', submitQuiz);
    document.getElementById('quiz-review-btn')?.addEventListener('click', () => {
        toast('Review mode: correct answers are highlighted in green','info');
    });

    // Upload
    document.getElementById('upload-btn')?.addEventListener('click', uploadContent);
    document.getElementById('preview-btn')?.addEventListener('click', previewContent);

    // Analytics chart type
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            S.chartType = btn.dataset.type;
            if (document.getElementById('analytics')?.classList.contains('active')) loadAnalytics();
        });
    });

    // Dashboard filter buttons
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (S.courses?.length) renderCourseGrid('dashboard-course-grid', S.courses, true, btn.dataset.filter);
        });
    });

    // Study timer
    document.getElementById('timer-start-btn')?.addEventListener('click', () => StudyTimer.start());
    document.getElementById('timer-pause-btn')?.addEventListener('click', () => StudyTimer.pause());
    document.getElementById('timer-reset-btn')?.addEventListener('click', () => StudyTimer.reset());

    // Study plan
    document.getElementById('study-plan-btn')?.addEventListener('click', generateStudyPlan);

    // Mini game
    document.getElementById('mini-game-btn')?.addEventListener('click', () => {
        document.getElementById('mini-game-overlay')?.classList.add('active');
    });
    document.getElementById('mini-game-start')?.addEventListener('click', () => MiniGame.start());
    document.getElementById('mini-game-target')?.addEventListener('click', () => MiniGame.click());
    document.getElementById('mini-game-target')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') MiniGame.click(); });

    // Focus mode
    document.getElementById('focus-mode-btn')?.addEventListener('click', toggleFocusMode);
    document.getElementById('focus-mode-exit')?.addEventListener('click', () => document.body.classList.remove('focus-mode'));

    // FAB
    document.getElementById('fab')?.addEventListener('click', () => showSection('quiz-section'));

    // Navigation (event delegation)
    document.body.addEventListener('click', e => {
        const link = e.target.closest('.tnav-link,.snav-item[data-section]');
        if (link) {
            e.preventDefault();
            const id = link.dataset.section || link.getAttribute('href')?.replace('#','') || 'login-form';
            showSection(id);
        }
    });

    // Scroll animations (after a short delay to let page render)
    setTimeout(setupScrollAnimations, 500);

    // Track time spent on page unload
    window.addEventListener('beforeunload', () => {
        if (S.lastSection && S._sectionStart) {
            const elapsed = (Date.now() - S._sectionStart) / 1000;
            S.timeSpent[S.lastSection] = (S.timeSpent[S.lastSection] || 0) + elapsed;
        }
        if (S.user) saveSession();
    });
});
