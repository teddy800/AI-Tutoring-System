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

// ── Sounds ────────────────────────────────────────────────────────────────────
const sounds = {};
function initSounds() {
    ['toggle','click','success','error','badge'].forEach(k => {
        try { sounds[k] = new Howl({ src:[`assets/audio/${k}.mp3`], onloaderror:()=>{ sounds[k]={play:()=>{}}; } }); }
        catch { sounds[k]={play:()=>{}}; }
    });
}
function playSound(t) { try { sounds[t]?.play(); } catch {} }

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type='success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    el.setAttribute('role','alert');
    c.appendChild(el);
    gsap.fromTo(el, {x:60,opacity:0}, {x:0,opacity:1,duration:.38,ease:'power2.out',
        onComplete:()=>setTimeout(()=>gsap.to(el,{opacity:0,x:60,duration:.28,onComplete:()=>el.remove()}),3200)});
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(msg, icon='ℹ️') {
    const m=document.getElementById('modal'); if (!m) return;
    const i=document.getElementById('modal-icon'), t=document.getElementById('modal-msg');
    if (i) i.textContent=icon; if (t) t.textContent=msg;
    m.classList.add('active'); m.setAttribute('aria-hidden','false');
    document.getElementById('modal-close')?.focus();
}
function closeModal() {
    const m=document.getElementById('modal'); if (!m) return;
    m.classList.remove('active'); m.setAttribute('aria-hidden','true');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
    const root=document.documentElement;
    const next=(root.getAttribute('data-theme')||'dark')==='dark'?'light':'dark';
    gsap.to(root,{duration:.28,opacity:0,onComplete:()=>{
        root.setAttribute('data-theme',next);
        localStorage.setItem('theme',next);
        gsap.to(root,{duration:.28,opacity:1});
        initParticles(); playSound('toggle');
    }});
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
    try {
        if (window.pJSDom?.length) { window.pJSDom[0].pJS.fn.vendors.destroypJS(); window.pJSDom=[]; }
        const dark=document.documentElement.getAttribute('data-theme')==='dark';
        particlesJS('particles-js',{
            particles:{number:{value:55,density:{enable:true,value_area:900}},
                color:{value:dark?'#6699ff':'#3355cc'},shape:{type:'circle'},
                opacity:{value:.35,random:true},size:{value:2.2,random:true},
                move:{enable:true,speed:1.2,direction:'none',random:true,out_mode:'out'}},
            interactivity:{detect_on:'canvas',
                events:{onhover:{enable:true,mode:'repulse'},onclick:{enable:true,mode:'push'}},
                modes:{repulse:{distance:75},push:{particles_nb:3}}},
            retina_detect:true});
    } catch(e){console.warn('Particles:',e);}
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function openSidebar()  { document.querySelector('.sidebar')?.classList.add('active'); document.querySelector('.sidebar-overlay')?.classList.add('active'); }
function closeSidebar() { document.querySelector('.sidebar')?.classList.remove('active'); document.querySelector('.sidebar-overlay')?.classList.remove('active'); }
function toggleSidebar(){ document.querySelector('.sidebar')?.classList.contains('active')?closeSidebar():openSidebar(); }

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
    document.getElementById('notif-btn')?.addEventListener('click', showNotifications);
}

function syncHeaderUser() {
    const dropdown = document.getElementById('profile-dropdown');
    const sidebarLogout = document.getElementById('sidebar-logout');
    if (!S.user) {
        dropdown?.classList.remove('visible');
        if (sidebarLogout) sidebarLogout.style.display = 'none';
        return;
    }
    dropdown?.classList.add('visible');
    if (sidebarLogout) sidebarLogout.style.display = 'flex';
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
    if (mp) mp.textContent = `${S.points} pts`;
}

function showNotifications() {
    const badge = document.getElementById('notif-badge');
    if (badge) badge.classList.remove('visible');
    if (!S.notifications.length) { showModal('No new notifications 🔔','ℹ️'); return; }
    const list = S.notifications.slice(0,5).map(n=>`• ${n.msg} (${n.time})`).join('\n');
    showModal(list, '🔔');
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout() {
    clearSession();
    syncHeaderUser();
    syncSidebarUser();
    document.getElementById('profile-dropdown')?.classList.remove('open','visible');
    toast('Signed out. See you soon! 👋','info');
    setTimeout(()=>showSection('login-form'), 300);
}

// ── Offline ───────────────────────────────────────────────────────────────────
function setupOffline() {
    const sync=()=>{
        S.offline=!navigator.onLine;
        document.body.classList.toggle('offline',S.offline);
        const lbl=document.querySelector('.status-label');
        if (lbl) lbl.textContent=S.offline?'Offline':'Online';
        const badge=document.getElementById('user-status');
        if (badge) badge.textContent=S.offline?'● Offline':'● Online';
        if (!S.offline){toast('Back online! Syncing…','success');syncOffline();}
        else toast('Offline mode active','error');
    };
    window.addEventListener('online',sync);
    window.addEventListener('offline',sync);
    if (S.offline) document.body.classList.add('offline');
}
async function syncOffline() {
    if (!('caches' in window)) return;
    try {
        const cache=await caches.open('nl-v1');
        const keys=await cache.keys();
        for (const req of keys) {
            const res=await cache.match(req);
            if (res) {
                const data=await res.json();
                await fetch(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
                await cache.delete(req);
            }
        }
        if (keys.length) toast('Offline data synced ✓','success');
    } catch(e){console.error('Sync:',e);}
}
async function cacheReq(url,data) {
    if (!('caches' in window)) return;
    try { const c=await caches.open('nl-v1'); await c.put(url,new Response(JSON.stringify(data))); }
    catch(e){console.error('Cache:',e);}
}

// ── Voice ─────────────────────────────────────────────────────────────────────
function setupVoice() {
    const inp=document.getElementById('chat-input');
    const btn=document.querySelector('.voice-btn');
    if (!btn||!inp) return;
    if (!(window.SpeechRecognition||window.webkitSpeechRecognition)){btn.style.display='none';return;}
    const rec=new (window.SpeechRecognition||window.webkitSpeechRecognition)();
    rec.lang='en-US'; rec.interimResults=false;
    btn.addEventListener('click',()=>{try{rec.start();btn.classList.add('recording');toast('Listening…','info');}catch{}});
    rec.onresult=e=>{inp.value=e.results[0][0].transcript;btn.classList.remove('recording');sendChat();};
    rec.onerror=()=>{btn.classList.remove('recording');toast('Voice failed','error');};
}

// ── Swipe + Keyboard ──────────────────────────────────────────────────────────
function setupSwipe() {
    let sx=0;
    document.addEventListener('touchstart',e=>{sx=e.changedTouches[0].screenX;},{passive:true});
    document.addEventListener('touchend',e=>{
        const dx=e.changedTouches[0].screenX-sx;
        if (dx>65) openSidebar(); else if (dx<-65) closeSidebar();
    },{passive:true});
}
function setupKeys() {
    document.addEventListener('keydown',e=>{
        if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
        if (e.key==='Escape'){closeModal();closeSidebar();closeCourseModal();}
        if (e.key==='t'||e.key==='T') toggleTheme();
        if (e.key==='m'||e.key==='M') toggleSidebar();
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
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const target=document.getElementById(id);
    if (!target){document.getElementById('login-form')?.classList.add('active');return;}
    target.classList.add('active');
    document.querySelectorAll('.tnav-link,.snav-item').forEach(a=>{
        a.classList.toggle('active',a.dataset.section===id||a.getAttribute('href')==='#'+id);
    });
    if (document.querySelector('.sidebar')?.classList.contains('active')) closeSidebar();
    const map={
        dashboard:loadDashboard,
        'quiz-section':loadQuizzes,
        'course-section':loadCourseSection,
        analytics:loadAnalytics,
        feedback:loadFeedback,
        help:loadHelp,
        'content-repo':loadRepository
    };
    map[id]?.();
    playSound('click');
}

// ── Sidebar user ──────────────────────────────────────────────────────────────
function syncSidebarUser() {
    const prof=document.getElementById('sidebar-profile');
    if (prof) prof.hidden=!S.user;
    const av=document.getElementById('sidebar-avatar');
    if (av) av.textContent=(S.user||'?')[0].toUpperCase();
    const un=document.getElementById('sidebar-username');
    if (un) un.textContent=S.user||'';
    const ro=document.getElementById('sidebar-role');
    if (ro) ro.textContent=S.role||'';
    const pts=document.getElementById('sidebar-points-val');
    if (pts) pts.textContent=S.points;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function syncStats() {
    const set=(id,v)=>{const el=document.getElementById(id);if(el){gsap.to(el,{textContent:v,duration:.4,snap:{textContent:1},ease:'power1.out'});}};
    set('stat-points',S.points);
    set('stat-streak',S.streak);
    set('stat-courses',S.enrolled.length||S.courses.length);
    set('stat-badges',document.querySelectorAll('#badges-container .badge').length);
    syncSidebarUser();
    syncHeaderUser();
    updateXPBar();
}

// ── Local user store ──────────────────────────────────────────────────────────
const LOCAL_USERS_KEY = 'nl_users';
function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]'); } catch { return []; }
}
function saveLocalUsers(u) { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(u)); }

// ── Auth tabs ─────────────────────────────────────────────────────────────────
function setupAuthTabs() {
    const tL=document.getElementById('tab-login'), tS=document.getElementById('tab-signup');
    const pL=document.getElementById('panel-login'), pS=document.getElementById('panel-signup');
    if (!tL||!tS) return;
    tL.addEventListener('click',()=>{
        tL.classList.add('active'); tL.setAttribute('aria-selected','true');
        tS.classList.remove('active'); tS.setAttribute('aria-selected','false');
        pL.hidden=false; pS.hidden=true;
    });
    tS.addEventListener('click',()=>{
        tS.classList.add('active'); tS.setAttribute('aria-selected','true');
        tL.classList.remove('active'); tL.setAttribute('aria-selected','false');
        pS.hidden=false; pL.hidden=true;
    });
    document.querySelectorAll('#panel-signup .role-pill').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('#panel-signup .role-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('signup-user-type');
            if (sel) sel.value=btn.dataset.role;
        });
    });
    document.querySelector('[data-target="signup-password"]')?.addEventListener('click',()=>{
        const pw=document.getElementById('signup-password');
        if (pw) pw.type=pw.type==='password'?'text':'password';
    });
    document.getElementById('signup-form-el')?.addEventListener('submit', signup);
}

// ── Signup ────────────────────────────────────────────────────────────────────
async function signup(e) {
    e.preventDefault();
    const fullname=document.getElementById('signup-fullname').value.trim();
    const username=document.getElementById('signup-username').value.trim();
    const email=document.getElementById('signup-email').value.trim();
    const password=document.getElementById('signup-password').value;
    const confirm=document.getElementById('signup-confirm').value;
    const role=document.getElementById('signup-user-type').value;
    if (!fullname||!username||!email||!password){showModal('Please fill in all fields','⚠️');return;}
    if (password.length<6){showModal('Password must be at least 6 characters','⚠️');return;}
    if (password!==confirm){showModal('Passwords do not match','❌');return;}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showModal('Please enter a valid email','⚠️');return;}

    const btn=e.target.querySelector('[type=submit]');
    const txt=btn?.querySelector('.btn__text'), spin=btn?.querySelector('.btn__spin');
    if (txt) txt.hidden=true; if (spin) spin.hidden=false; if (btn) btn.disabled=true;

    try {
        let saved=false;
        if (!S.offline) {
            try {
                const res=await fetch(`${APP_CONFIG.phpBase}?action=signup`,{
                    method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({fullname,username,email,password,user_type:role})});
                const d=await res.json();
                if (d.success) saved=true;
                else if (d.error){showModal(d.error,'❌');return;}
            } catch { /* backend unavailable */ }
        }
        if (!saved) {
            const users=getLocalUsers();
            if (users.find(u=>u.username===username)){showModal('Username already taken','❌');return;}
            if (users.find(u=>u.email===email)){showModal('Email already registered','❌');return;}
            users.push({id:Date.now(),fullname,username,email,password,user_type:role,points:0,streak:0});
            saveLocalUsers(users);
        }
        toast(`Account created! Welcome, ${username}! 🎉`,'success'); playSound('success');
        S.user=username; S.userId=Date.now(); S.role=role; S.points=0; S.streak=0; S.token=null;
        S.enrolled=[]; S.scoreHistory=[];
        checkStreak(); syncStats(); addXP(10); saveSession();
        addNotification(`🎉 Welcome to NeuralLearn, ${username}!`);
        setTimeout(()=>showSection('dashboard'), 50);
    } catch(err){showModal('Signup failed. Please try again.','❌');console.error(err);}
    finally { if (txt) txt.hidden=false; if (spin) spin.hidden=true; if (btn) btn.disabled=false; }
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(e) {
    e.preventDefault();
    const username=document.getElementById('username').value.trim();
    const password=document.getElementById('password').value;
    S.role=document.getElementById('user-type').value;
    if (!username||!password){showModal('Please fill in all fields','⚠️');playSound('error');return;}

    const btn=e.target.querySelector('[type=submit]');
    const txt=btn?.querySelector('.btn__text'), spin=btn?.querySelector('.btn__spin');
    if (txt) txt.hidden=true; if (spin) spin.hidden=false; if (btn) btn.disabled=true;

    try {
        let data=null;
        if (!S.offline) {
            try {
                const res=await fetch(`${APP_CONFIG.phpBase}?action=login`,{
                    method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({username,password,user_type:S.role})});
                data=await res.json();
            } catch { /* backend down */ }
        }
        // Local store — supports username OR email login
        if (!data?.success) {
            const found=getLocalUsers().find(u=>
                (u.username===username || u.email===username) && u.password===password
            );
            if (found) data={success:true,token:null,user:found};
        }
        // Demo fallback
        if (!data?.success) {
            data={success:true,token:null,user:{id:1,username,user_type:S.role,points:0,streak:0}};
        }
        S.token=data.token;
        S.user  = data.user.username || username;
        S.userId = data.user.id;
        S.role  = data.user.user_type || S.role;
        S.points = data.user.points || 0;
        S.streak = data.user.streak || 0;
        if (!S.enrolled) S.enrolled = [];
        if (!S.scoreHistory) S.scoreHistory = [];

        toast(`Welcome back, ${S.user}! 🎓`,'success'); playSound('success');
        checkStreak(); syncStats(); addXP(10); saveSession();
        addNotification(`👋 Welcome back, ${S.user}!`);
        setTimeout(()=>showSection('dashboard'), 50);
    } catch(err){showModal('Login failed. Please try again.','❌');console.error(err);}
    finally { if (txt) txt.hidden=false; if (spin) spin.hidden=true; if (btn) btn.disabled=false; }
}

// ── Streak ────────────────────────────────────────────────────────────────────
function checkStreak() {
    const last=localStorage.getItem('lastLogin');
    const today=new Date().toISOString().split('T')[0];
    if (last===today) return;
    const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
    S.streak=last===yesterday?S.streak+1:1;
    localStorage.setItem('streak',S.streak);
    localStorage.setItem('lastLogin',today);
    if (S.streak%5===0) awardBadge('Streak Master');
    if (S.streak>=30) awardBadge('Dedicated Learner');
    const el=document.getElementById('streak-display');
    if (el){el.textContent=`${S.streak} day streak`;gsap.from(el,{scale:.7,opacity:0,duration:.5,ease:'back.out(1.7)'});}
    const st=document.getElementById('stat-streak');
    if (st) st.textContent=S.streak;
}

// ── Badges ────────────────────────────────────────────────────────────────────
function awardBadge(name) {
    const c=document.getElementById('badges-container');
    if (!c) return;
    const type=name.toLowerCase().replace(/\s+/g,'-');
    if (c.querySelector(`[data-type="${type}"]`)) return;
    const b=document.createElement('span');
    b.className='badge'; b.textContent=name; b.setAttribute('data-type',type);
    c.appendChild(b);
    gsap.from(b,{scale:0,opacity:0,duration:.55,ease:'back.out(1.7)'});
    toast(`🏅 Badge unlocked: ${name}!`,'badge'); playSound('badge');
    addXP(20); addNotification(`🏅 New badge: ${name}`);
    const st=document.getElementById('stat-badges');
    if (st) st.textContent=c.querySelectorAll('.badge').length;
    saveSession();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!S.user){showSection('login-form');return;}
    const wm=document.getElementById('welcome-message');
    const hour = new Date().getHours();
    const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
    if (wm){
        wm.textContent=`${greeting}, ${S.user}! Ready to learn? 🚀`;
        gsap.from(wm,{opacity:0,x:-24,duration:.5});
    }
    try {
        let courses=mockCourses;
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/courses`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success&&d.courses?.length){mockCourses=d.courses;courses=d.courses;}
        }
        // Persist progress per course
        const withProg=courses.map(c=>{
            const saved=localStorage.getItem(`prog_${c.id}`);
            return {...c, progress: saved ? parseInt(saved) : Math.floor(Math.random()*100)};
        });
        withProg.forEach(c=>localStorage.setItem(`prog_${c.id}`,c.progress));
        S.courses=withProg;
        renderCourseGrid('dashboard-course-grid',withProg,true);
        const avg=Math.round(withProg.reduce((s,c)=>s+c.progress,0)/withProg.length)||0;
        animateProgress(avg);
        renderLeaderboard();
        syncStats();
        renderScoreHistory();
        const rec=document.getElementById('recommendations');
        if (rec){
            const recs = withProg.filter(c=>c.progress<50).slice(0,3).map(c=>c.emoji+' '+c.title).join(', ');
            rec.innerHTML=`📚 <strong>Continue learning:</strong> ${recs||'All courses on track! 🎉'}`;
            gsap.from(rec,{opacity:0,y:16,duration:.5,delay:.2});
        }
    } catch(e){toast('Failed to load dashboard','error');console.error(e);}
}

function renderScoreHistory() {
    const container = document.getElementById('score-history-list');
    if (!container) return;
    if (!S.scoreHistory?.length) { container.innerHTML='<p style="color:var(--txt3);font-size:.83rem">No quiz attempts yet</p>'; return; }
    container.innerHTML = S.scoreHistory.slice(0,5).map(s=>`
        <div class="score-entry">
            <span class="score-entry__date">${s.date}</span>
            <span>${s.topic}</span>
            <span class="score-entry__val">${s.score}%</span>
        </div>`).join('');
}

function animateProgress(pct) {
    const fill=document.getElementById('overall-fill');
    const glow=document.getElementById('overall-glow');
    const lbl=document.getElementById('overall-pct');
    const track=document.getElementById('progress-track');
    if (fill) gsap.to(fill,{width:pct+'%',duration:1.2,ease:'power2.out'});
    if (glow) gsap.to(glow,{left:`calc(${pct}% - 20px)`,duration:1.2,ease:'power2.out'});
    if (lbl)  gsap.to({val:0},{val:pct,duration:1.2,ease:'power2.out',onUpdate:function(){lbl.textContent=Math.round(this.targets()[0].val)+'%';}});
    if (track) track.setAttribute('aria-valuenow',pct);
    document.querySelectorAll('.ms').forEach(m=>m.classList.toggle('active',pct>=parseInt(m.dataset.milestone)));
}

function renderCourseGrid(gridId, courses, showProgress=false) {
    const grid=document.getElementById(gridId);
    if (!grid) return;
    const diffColor = {Beginner:'var(--success)',Intermediate:'var(--warning)',Advanced:'var(--danger)'};
    grid.innerHTML=courses.map(c=>{
        const enrolled = S.enrolled?.includes(c.id);
        return `
        <div class="course-card" data-id="${c.id}" role="gridcell" tabindex="0" aria-label="Open ${c.title}">
            <span class="course-card__emoji">${c.emoji||'📚'}</span>
            <h3>${c.title}</h3>
            <p>${c.description}</p>
            ${c.difficulty?`<span style="font-size:.7rem;font-weight:700;color:${diffColor[c.difficulty]||'var(--txt3)'}">${c.difficulty} · ${c.duration||''}</span>`:''}
            ${c.rating?`<span style="font-size:.75rem;color:var(--warning);margin-left:var(--s2)">★ ${c.rating}</span>`:''}
            ${enrolled?`<div class="enrolled-tag">✅ Enrolled</div>`:''}
            ${showProgress?`
            <div class="prog-label" style="margin-top:var(--s3)">Progress: ${c.progress??0}%</div>
            <div class="prog-bar"><div class="prog-fill" style="width:0%" data-target="${c.progress??0}"></div></div>
            `:''}
        </div>`;
    }).join('');
    if (showProgress) {
        setTimeout(()=>{
            grid.querySelectorAll('.prog-fill').forEach(el=>{
                gsap.to(el,{width:el.dataset.target+'%',duration:.9,ease:'power2.out'});
            });
        },200);
    }
    gsap.from(`#${gridId} .course-card`,{opacity:0,y:28,stagger:.08,duration:.5});
    // Click to open course modal
    grid.querySelectorAll('.course-card').forEach(card=>{
        card.addEventListener('click',()=>{
            const id=parseInt(card.dataset.id);
            const course=mockCourses.find(c=>c.id===id);
            if (course) openCourseModal(course);
        });
        card.addEventListener('keydown',e=>{if(e.key==='Enter')card.click();});
    });
}

function renderLeaderboard() {
    const list=document.getElementById('leaderboard-list');
    if (!list) return;
    const data=[
        {name:S.user||'You',pts:S.points,av:(S.user||'Y')[0].toUpperCase()},
        {name:'Alice',pts:142,av:'A'},{name:'Bob',pts:118,av:'B'},
        {name:'Carol',pts:97,av:'C'},{name:'Dave',pts:83,av:'D'}
    ].sort((a,b)=>b.pts-a.pts);
    const medals=['🥇','🥈','🥉'];
    list.innerHTML=data.map((u,i)=>`
        <li style="${u.name===S.user?'background:hsla(var(--h1),90%,62%,.08);border-radius:var(--r-sm);':''}">
            <span style="font-size:1.1rem">${medals[i]||'  '}</span>
            <span style="width:28px;height:28px;border-radius:50%;background:var(--grad);display:inline-grid;place-content:center;font-size:.75rem;font-weight:800;color:#fff;flex-shrink:0">${u.av}</span>
            <strong>${u.name}${u.name===S.user?' (You)':''}</strong>
            <span style="margin-left:auto;font-family:var(--font-m);font-size:.82rem;color:var(--p)">${u.pts} pts</span>
        </li>`).join('');
    gsap.from('#leaderboard-list li',{opacity:0,x:-18,stagger:.07,duration:.4});
}

// ── Course Modal ──────────────────────────────────────────────────────────────
function openCourseModal(course) {
    const veil = document.getElementById('course-modal-veil');
    if (!veil) return;
    document.getElementById('course-modal-emoji').textContent = course.emoji||'📚';
    document.getElementById('course-modal-title').textContent = course.title;
    document.getElementById('course-modal-desc').textContent = course.description;
    const syllabus = document.getElementById('course-modal-syllabus');
    if (syllabus) syllabus.innerHTML = (course.syllabus||[]).map(s=>`<li>${s}</li>`).join('');
    const assigns = document.getElementById('course-modal-assignments');
    if (assigns) assigns.innerHTML = (course.assignments||[]).map(a=>`<li>${a.title} — Due: ${a.dueDate||a.due_date||'TBD'}</li>`).join('') || '<li>No assignments yet</li>';
    const enrollBtn = document.getElementById('course-enroll-btn');
    if (enrollBtn) {
        const enrolled = S.enrolled?.includes(course.id);
        enrollBtn.textContent = enrolled ? '✅ Already Enrolled' : '🎓 Enroll in Course';
        enrollBtn.disabled = enrolled;
        enrollBtn.onclick = () => enrollCourse(course);
    }
    veil.classList.add('active');
    veil.setAttribute('aria-hidden','false');
}
function closeCourseModal() {
    const veil = document.getElementById('course-modal-veil');
    if (!veil) return;
    veil.classList.remove('active');
    veil.setAttribute('aria-hidden','true');
}
function enrollCourse(course) {
    if (!S.enrolled) S.enrolled = [];
    if (S.enrolled.includes(course.id)) return;
    S.enrolled.push(course.id);
    S.points += 5; addXP(15); syncStats(); saveSession();
    toast(`Enrolled in ${course.title}! 🎓 +5 pts`,'success');
    addNotification(`📚 Enrolled in ${course.title}`);
    if (S.enrolled.length >= 3) awardBadge('Course Explorer');
    closeCourseModal();
    // Refresh grids
    if (document.getElementById('course-grid')?.closest('.page.active')) loadCourseSection();
    if (document.getElementById('dashboard-course-grid')?.closest('.page.active')) loadDashboard();
}

// ── Courses ───────────────────────────────────────────────────────────────────
async function loadCourseSection() {
    const grid=document.getElementById('course-grid');
    if (!grid) return;
    try {
        let courses=mockCourses;
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/courses`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success&&d.courses?.length){mockCourses=d.courses;courses=d.courses;}
        }
        S.courses=courses;
        renderCourseGrid('course-grid',courses,false);
        // Search
        const searchEl = document.getElementById('course-search');
        if (searchEl) {
            searchEl.oninput = function(){
                const q=this.value.toLowerCase();
                grid.querySelectorAll('.course-card').forEach(card=>{
                    card.style.display=card.textContent.toLowerCase().includes(q)?'':'none';
                });
            };
        }
        // Hide old details panel
        const details=document.getElementById('course-details');
        if (details) details.innerHTML='';
    } catch(e){toast('Failed to load courses','error');console.error(e);}
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function formatTime() {
    return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
}
function appendMsg(text, role) {
    const c=document.getElementById('chat-container');
    if (!c) return null;
    const wrap=document.createElement('div');
    wrap.className=`msg msg--${role}`;
    const safeText = text.replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
        .replace(/`(.*?)`/g,'<code style="background:var(--surf2);padding:1px 5px;border-radius:4px;font-family:var(--font-m)">$1</code>');
    wrap.innerHTML=`
        <div class="msg__av">${role==='ai'?'🤖':'👤'}</div>
        <div>
            <div class="msg__bubble">${safeText}</div>
            <div class="msg__time">${formatTime()}</div>
        </div>`;
    c.appendChild(wrap);
    c.scrollTop=c.scrollHeight;
    return wrap.querySelector('.msg__bubble');
}

async function sendChat() {
    const inp=document.getElementById('chat-input');
    if (!inp) return;
    const msg=inp.value.trim();
    if (!msg) return;
    inp.value='';
    appendMsg(msg,'user');
    const bubble=appendMsg('','ai');
    if (bubble) bubble.classList.add('typing');
    try {
        if (S.offline){
            if (bubble){bubble.classList.remove('typing');bubble.textContent='You are offline. Message queued for when you reconnect.';}
            cacheReq(`${APP_CONFIG.pyBase}/api/chat`,{message:msg});
            return;
        }
        const res=await fetch(`${APP_CONFIG.pyBase}/api/chat`,{
            method:'POST',
            headers:{'Content-Type':'application/json',...(S.token?{Authorization:`Bearer ${S.token}`}:{})},
            body:JSON.stringify({message:msg})});
        const d=await res.json();
        if (bubble){bubble.classList.remove('typing');bubble.innerHTML=d.response?.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`(.*?)`/g,'<code style="background:var(--surf2);padding:1px 5px;border-radius:4px;font-family:var(--font-m)">$1</code>')||"I'm not sure — try rephrasing!";}
    } catch(e){
        if (bubble){bubble.classList.remove('typing');bubble.textContent='Connection error. Please try again.';}
    }
    addXP(2);
}

function clearChat() {
    const c=document.getElementById('chat-container');
    if (!c) return;
    c.innerHTML=`<div class="msg msg--ai"><div class="msg__av">🤖</div><div><div class="msg__bubble">Chat cleared! Ask me anything about your courses 🎓</div><div class="msg__time">${formatTime()}</div></div></div>`;
    toast('Chat cleared','info');
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 18;

async function loadQuizzes() {
    const qDiv=document.getElementById('quiz-questions');
    if (!qDiv) return;
    try {
        let quizzes=mockQuizzes;
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/quizzes`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success&&d.quizzes?.length){mockQuizzes=d.quizzes;quizzes=d.quizzes;}
        }
        const diffColor={Easy:'var(--success)',Medium:'var(--warning)',Hard:'var(--danger)'};
        qDiv.innerHTML=quizzes.map((q,i)=>`
            <div class="quiz-card" role="group" aria-label="Question ${i+1}">
                <div style="display:flex;align-items:center;gap:var(--s3);margin-bottom:var(--s3)">
                    <span style="font-size:.72rem;font-weight:700;color:var(--txt3)">Q${i+1} of ${quizzes.length}</span>
                    ${q.difficulty?`<span class="diff-badge diff-badge--${q.difficulty.toLowerCase()}">${q.difficulty}</span>`:''}
                    ${q.topic?`<span style="font-size:.72rem;color:var(--txt3);margin-left:auto">${q.topic}</span>`:''}
                </div>
                <p class="quiz-card__q">${q.question}</p>
                <div class="quiz-opts">
                    ${q.options.map((o,j)=>`
                        <label class="quiz-opt">
                            <input type="radio" name="q${i}" value="${j}" aria-label="${o}">
                            <span>${o}</span>
                        </label>`).join('')}
                </div>
            </div>`).join('');
        gsap.from('.quiz-card',{opacity:0,y:22,stagger:.1,duration:.5});

        // Timer
        clearInterval(S.quizTimer);
        let t=60;
        const timerEl=document.getElementById('timer');
        const arc=document.getElementById('timer-arc');
        const ring=document.getElementById('timer-ring');
        if (arc) arc.style.strokeDasharray=TIMER_CIRCUMFERENCE;
        if (timerEl) timerEl.textContent=t;
        S.quizTimer=setInterval(()=>{
            t--;
            if (timerEl) timerEl.textContent=t;
            if (arc) arc.style.strokeDashoffset=TIMER_CIRCUMFERENCE*(1-t/60);
            if (t<=10){arc?.classList.add('urgent');ring?.classList.add('urgent');}
            if (t<=0){clearInterval(S.quizTimer);submitQuiz();}
        },1000);
    } catch(e){toast('Failed to load quizzes','error');qDiv.innerHTML='<p>Unable to load quizzes</p>';}
}

async function submitQuiz(event) {
    if (event) event.preventDefault();
    clearInterval(S.quizTimer);
    document.getElementById('timer-arc')?.classList.remove('urgent');

    const answers=[];
    document.querySelectorAll('#quiz-content input[type="radio"]:checked').forEach(inp=>{
        const idx=parseInt(inp.name.replace('q',''));
        answers.push({questionIndex:idx,question_id:mockQuizzes[idx]?.id,answer:parseInt(inp.value)});
    });
    if (!answers.length){showModal('Please select at least one answer','⚠️');return;}

    answers.forEach(a=>{
        const opts=document.querySelectorAll(`[name="q${a.questionIndex}"]`);
        opts.forEach(inp=>{
            const lbl=inp.closest('.quiz-opt');
            if (parseInt(inp.value)===mockQuizzes[a.questionIndex]?.correctAnswer) lbl?.classList.add('correct');
            else if (parseInt(inp.value)===a.answer) lbl?.classList.add('wrong');
        });
    });

    try {
        let score=0;
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/submit-quiz`,{
                method:'POST',
                headers:{'Content-Type':'application/json',Authorization:`Bearer ${S.token}`},
                body:JSON.stringify({answers})});
            const d=await res.json();
            if (d.success){score=d.score;S.points+=d.points_earned||0;}
        } else {
            answers.forEach(a=>{if(mockQuizzes[a.questionIndex]?.correctAnswer===a.answer)score+=50;});
            S.points+=Math.round(score/10);
            if (S.offline) cacheReq(`${APP_CONFIG.pyBase}/api/submit-quiz`,{answers});
        }

        // Save score history
        if (!S.scoreHistory) S.scoreHistory=[];
        const topic = mockQuizzes[answers[0]?.questionIndex]?.topic || 'General';
        S.scoreHistory.unshift({score, topic, date: new Date().toLocaleDateString()});
        if (S.scoreHistory.length>20) S.scoreHistory.pop();

        const badge=document.getElementById('quiz-score-badge');
        const val=document.getElementById('quiz-score-val');
        if (badge&&val){val.textContent=`${score}%`;badge.hidden=false;}

        addXP(Math.round(score/5));
        syncStats(); saveSession();
        showModal(`Quiz complete! Score: ${score}% 🎉\n+${Math.round(score/10)} points earned`,'🏆');
        playSound('success');
        addNotification(`📝 Quiz score: ${score}%`);
        if (score>=80) awardBadge('Quiz Champion');
        if (score===100) awardBadge('Perfect Score');
        if (S.scoreHistory.length>=5) awardBadge('Quiz Veteran');
    } catch(e){showModal('Failed to submit quiz','❌');console.error(e);}
}

// ── Upload ────────────────────────────────────────────────────────────────────
function setupDropzone() {
    const zone=document.getElementById('dropzone');
    const fileInput=document.getElementById('file-input');
    const body=document.getElementById('content-body');
    if (!zone||!body) return;
    zone.addEventListener('click',()=>fileInput?.click());
    zone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')fileInput?.click();});
    fileInput?.addEventListener('change',e=>{
        const f=e.target.files[0];
        if (f&&f.type==='text/plain') readTxt(f);
        else toast('Please select a .txt file','error');
    });
    ['dragover','dragenter'].forEach(ev=>zone.addEventListener(ev,e=>{e.preventDefault();zone.classList.add('drag-active');}));
    ['dragleave','dragend'].forEach(ev=>zone.addEventListener(ev,()=>zone.classList.remove('drag-active')));
    zone.addEventListener('drop',e=>{
        e.preventDefault(); zone.classList.remove('drag-active');
        const f=e.dataTransfer.files[0];
        if (f&&f.type==='text/plain') readTxt(f);
        else toast('Please drop a .txt file','error');
    });
    function readTxt(f) {
        const r=new FileReader();
        r.onload=ev=>{body.value=ev.target.result;toast('File loaded!','success');updateCharCount();};
        r.onerror=()=>toast('Failed to read file','error');
        r.readAsText(f);
    }
    body.addEventListener('input',updateCharCount);
    function updateCharCount(){
        const cc=document.getElementById('char-count');
        if (cc) cc.textContent=`${body.value.length.toLocaleString()} characters`;
    }
}

async function uploadContent(e) {
    if (e) e.preventDefault();
    if (S.role!=='tutor'){toast('Only tutors can upload content','error');return;}
    const title=document.getElementById('content-title').value.trim();
    const body=document.getElementById('content-body').value.trim();
    if (!title||!body){toast('Please fill in all fields','error');return;}
    try {
        if (!S.offline){
            const res=await fetch(`${APP_CONFIG.phpBase}?action=upload-content`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(S.token?{Authorization:`Bearer ${S.token}`}:{})},
                body:JSON.stringify({title,body,uploaded_by:S.userId})});
            const d=await res.json();
            if (!d.success){toast(d.error||'Upload failed','error');return;}
        } else {
            cacheReq(`${APP_CONFIG.phpBase}?action=upload-content`,{title,body,uploaded_by:S.userId});
        }
        S.points+=10; addXP(15); syncStats(); saveSession();
        toast('Content uploaded! +10 pts 🎉','success'); playSound('success');
        document.getElementById('content-title').value='';
        document.getElementById('content-body').value='';
        document.getElementById('char-count').textContent='0 characters';
        awardBadge('Content Creator');
        addNotification(`⬆️ Content uploaded: ${title}`);
    } catch(e){toast('Upload failed','error');console.error(e);}
}

function previewContent() {
    const title=document.getElementById('content-title').value.trim();
    const body=document.getElementById('content-body').value.trim();
    const preview=document.getElementById('content-preview');
    const pb=document.getElementById('content-preview-body');
    if (!title||!body){toast('Fill in title and body first','error');return;}
    if (pb) pb.innerHTML=`<h4 style="margin-bottom:var(--s3);font-family:var(--font-h)">${title}</h4><p>${body}</p>`;
    if (preview){preview.hidden=false;gsap.from(preview,{opacity:0,y:18,duration:.4});}
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
    const canvas=document.getElementById('progress-chart');
    if (!canvas) return;

    // Students can see their own stats; tutors see all
    if (S.role!=='tutor') {
        const layout = document.querySelector('.analytics-layout');
        if (layout) {
            layout.innerHTML=`
                <div class="glass-card" style="grid-column:1/-1">
                    <h3 class="glass-card__title">📊 My Performance</h3>
                    <div class="stat-list" id="my-stats"></div>
                </div>`;
            const myStats = document.getElementById('my-stats');
            if (myStats) {
                const avg = S.scoreHistory?.length
                    ? Math.round(S.scoreHistory.reduce((s,h)=>s+h.score,0)/S.scoreHistory.length)
                    : 0;
                [
                    {lbl:'Total Points',val:S.points},
                    {lbl:'Current Level',val:S.level},
                    {lbl:'Day Streak',val:S.streak},
                    {lbl:'Courses Enrolled',val:S.enrolled?.length||0},
                    {lbl:'Avg Quiz Score',val:`${avg}%`},
                    {lbl:'Quizzes Taken',val:S.scoreHistory?.length||0}
                ].forEach(s=>{
                    const row=document.createElement('div');
                    row.className='stat-row';
                    row.innerHTML=`<span class="stat-row__lbl">${s.lbl}</span><span class="stat-row__val">${s.val}</span>`;
                    myStats.appendChild(row);
                });
            }
        }
        return;
    }

    const existing=Chart.getChart(canvas);
    if (existing) existing.destroy();

    try {
        let students=['Alice','Bob','Carol','Dave','Eve','Frank'];
        let progress=[88,74,95,62,81,70];
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/analytics`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success){students=d.students;progress=d.progress;}
        }
        const colors=students.map((_,i)=>`hsla(${(i*52+210)%360},75%,62%,.85)`);
        const borderColors=colors.map(c=>c.replace('.85','1'));
        new Chart(canvas.getContext('2d'),{
            type:S.chartType||'bar',
            data:{labels:students,datasets:[{
                label:'Progress (%)',data:progress,
                backgroundColor:colors,borderColor:borderColors,
                borderWidth:2,borderRadius:10,fill:S.chartType==='line',
                tension:.4,pointBackgroundColor:borderColors,pointRadius:5}]},
            options:{
                responsive:true,maintainAspectRatio:false,
                plugins:{
                    legend:{labels:{color:'rgba(255,255,255,.7)',font:{family:'Inter',size:12}}},
                    tooltip:{backgroundColor:'rgba(10,12,20,.9)',borderColor:'rgba(100,150,255,.3)',borderWidth:1,
                        callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw}%`}}},
                scales:{
                    y:{beginAtZero:true,max:100,ticks:{color:'rgba(255,255,255,.5)',font:{family:'JetBrains Mono'}},grid:{color:'rgba(255,255,255,.06)'}},
                    x:{ticks:{color:'rgba(255,255,255,.5)'},grid:{color:'rgba(255,255,255,.04)'}}},
                animation:{duration:900,easing:'easeOutQuart'}}});

        const statList=document.getElementById('analytics-stat-list');
        if (statList){
            statList.innerHTML='';
            const avg=Math.round(progress.reduce((s,v)=>s+v,0)/progress.length);
            const top=students[progress.indexOf(Math.max(...progress))];
            const above80=progress.filter(p=>p>=80).length;
            [{lbl:'Average Progress',val:`${avg}%`},{lbl:'Top Student',val:top},
             {lbl:'Total Students',val:students.length},{lbl:'Above 80%',val:`${above80} / ${students.length}`},
             {lbl:'Needs Attention',val:progress.filter(p=>p<60).length}
            ].forEach(s=>{
                const row=document.createElement('div');
                row.className='stat-row';
                row.innerHTML=`<span class="stat-row__lbl">${s.lbl}</span><span class="stat-row__val">${s.val}</span>`;
                statList.appendChild(row);
            });
        }
        const hm=document.getElementById('heatmap');
        if (hm){
            hm.innerHTML='';
            for (let i=0;i<28;i++){
                const cell=document.createElement('div');
                cell.className='hm-cell';
                const lvl=Math.floor(Math.random()*5);
                if (lvl>0) cell.setAttribute('data-level',lvl);
                cell.title=`Day ${i+1}: ${lvl*25}% activity`;
                hm.appendChild(cell);
            }
            gsap.from('.hm-cell',{opacity:0,scale:0,stagger:.02,duration:.3});
        }
        gsap.from(canvas,{opacity:0,scale:.94,duration:.5});
    } catch(e){toast('Failed to load analytics','error');console.error(e);}
}

// ── Feedback ──────────────────────────────────────────────────────────────────
function loadFeedback() {
    const form=document.getElementById('feedback-form-el');
    if (!form||form.dataset.bound) return;
    form.dataset.bound='1';
    form.addEventListener('submit',submitFeedback);
    document.querySelectorAll('.type-pill').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.type-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('feedback-type');
            if (sel) sel.value=btn.dataset.type;
        });
    });
    const stars=document.querySelectorAll('.star');
    stars.forEach(star=>{
        star.addEventListener('click',()=>{
            S.starRating=parseInt(star.dataset.val);
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=S.starRating));
        });
        star.addEventListener('mouseenter',()=>{
            const v=parseInt(star.dataset.val);
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=v));
        });
        star.addEventListener('mouseleave',()=>{
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=S.starRating));
        });
    });
    gsap.from(form,{opacity:0,y:20,duration:.5});
}

async function submitFeedback(e) {
    e.preventDefault();
    const type=document.getElementById('feedback-type').value;
    const message=document.getElementById('feedback-message').value.trim();
    if (!message){toast('Please enter a message','error');return;}
    try {
        if (!S.offline){
            const res=await fetch(`${APP_CONFIG.phpBase}?action=feedback`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(S.token?{Authorization:`Bearer ${S.token}`}:{})},
                body:JSON.stringify({user_id:S.userId||0,type,message,rating:S.starRating})});
            const d=await res.json();
            if (!d.success){toast(d.error||'Feedback failed','error');return;}
        } else {
            cacheReq(`${APP_CONFIG.phpBase}?action=feedback`,{user_id:S.userId||0,type,message});
        }
        toast('Feedback submitted! Thank you 🙏','success');
        document.getElementById('feedback-message').value='';
        S.points+=2; S.starRating=0; addXP(5); syncStats(); saveSession();
        document.querySelectorAll('.star').forEach(s=>s.classList.remove('active'));
        if (S.points>=20) awardBadge('Feedback Star');
    } catch(e){toast('Feedback failed','error');console.error(e);}
}

// ── Help ──────────────────────────────────────────────────────────────────────
function loadHelp() { gsap.from('.faq',{opacity:0,y:14,stagger:.07,duration:.4}); }

// ── Repository ────────────────────────────────────────────────────────────────
async function loadRepository() {
    const grid=document.getElementById('repo-grid');
    if (!grid) return;
    try {
        let items=[
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
        ];
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/repository`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success&&d.items?.length) items=d.items;
        }
        grid.innerHTML=items.map(item=>`
            <div class="repo-item" role="listitem">
                <div class="repo-item__title">${item.title}</div>
                <div class="repo-item__desc">${item.description}</div>
                ${item.tag?`<span class="repo-item__tag">${item.tag}</span>`:''}
            </div>`).join('');
        gsap.from('.repo-item',{opacity:0,y:22,stagger:.06,duration:.4});
        document.getElementById('repo-search')?.addEventListener('input',function(){
            const q=this.value.toLowerCase();
            grid.querySelectorAll('.repo-item').forEach(item=>{
                item.style.display=item.textContent.toLowerCase().includes(q)?'':'none';
            });
        });
    } catch(e){toast('Failed to load repository','error');grid.innerHTML='<p>Unable to load content</p>';}
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
function setupWS() {
    const body=document.getElementById('content-body');
    if (!body||!APP_CONFIG.wsUrl) return;
    let ws;
    try {
        ws=new WebSocket(APP_CONFIG.wsUrl);
        ws.onerror=()=>{ws=null;};
        ws.onmessage=e=>{
            try {
                const d=JSON.parse(e.data);
                if (d.content&&d.user!==S.user){body.value=d.content;toast(`${d.user} updated content`,'info');}
            } catch {}
        };
    } catch {return;}
    let deb;
    body.addEventListener('input',()=>{
        clearTimeout(deb);
        deb=setTimeout(()=>{
            if (ws?.readyState===WebSocket.OPEN)
                try{ws.send(JSON.stringify({content:body.value,user:S.user}));}catch{}
        },300);
    });
}

// ── Data loader ───────────────────────────────────────────────────────────────
async function loadData() {
    try {
        const res=await fetch('Datasets/tutoring_system_data.json');
        if (!res.ok) return;
        const d=await res.json();
        if (d.courses?.length) mockCourses=d.courses.map(c=>({
            ...c, id:c.course_id||c.id, emoji:c.emoji||'📚',
            difficulty:c.difficulty||'Beginner', duration:c.duration||'4 weeks', rating:c.rating||4.5
        }));
        if (d.quizzes?.length) mockQuizzes=d.quizzes.map(q=>({
            ...q, id:q.quiz_id||q.id, correctAnswer:q.correct_answer??q.correctAnswer,
            difficulty:q.difficulty||'Easy', topic:q.topic||'General'
        }));
    } catch {}
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark');

    initSounds(); setupDropzone(); initParticles(); setupVoice();
    setupOffline(); setupWS(); setupSwipe(); setupKeys();
    setupAuthTabs(); setupProfileDropdown();
    loadData(); loadRepository();

    // Restore session
    if (loadSession()) {
        syncStats(); updateXPBar();
        setTimeout(()=>showSection('dashboard'), 50);
    }

    // Controls
    document.querySelector('.theme-toggle')?.addEventListener('click',toggleTheme);
    document.querySelector('.sidebar-toggle')?.addEventListener('click',toggleSidebar);
    document.querySelector('.sidebar__close')?.addEventListener('click',closeSidebar);
    document.querySelector('.sidebar-overlay')?.addEventListener('click',closeSidebar);
    document.getElementById('modal-close')?.addEventListener('click',closeModal);
    document.getElementById('levelup-overlay')?.addEventListener('click',()=>{
        document.getElementById('levelup-overlay').classList.remove('active');
    });
    // Course modal close
    document.getElementById('course-modal-close')?.addEventListener('click',closeCourseModal);
    document.getElementById('course-modal-veil')?.addEventListener('click',e=>{
        if (e.target===e.currentTarget) closeCourseModal();
    });

    // Login
    document.getElementById('login-form-el')?.addEventListener('submit',login);
    document.querySelectorAll('#panel-login .role-pill').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('#panel-login .role-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('user-type');
            if (sel) sel.value=btn.dataset.role;
        });
    });
    document.querySelector('#panel-login .field__eye')?.addEventListener('click',()=>{
        const pw=document.getElementById('password');
        if (pw) pw.type=pw.type==='password'?'text':'password';
    });

    // Chat
    document.getElementById('send-btn')?.addEventListener('click',sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown',e=>{
        if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
    });
    document.querySelectorAll('.chip').forEach(chip=>{
        chip.addEventListener('click',()=>{
            const inp=document.getElementById('chat-input');
            if (inp){inp.value=chip.dataset.msg;sendChat();}
        });
    });
    document.getElementById('chat-clear-btn')?.addEventListener('click',clearChat);

    // Quiz
    document.getElementById('quiz-content')?.addEventListener('submit',submitQuiz);

    // Upload
    document.getElementById('upload-btn')?.addEventListener('click',uploadContent);
    document.getElementById('preview-btn')?.addEventListener('click',previewContent);

    // Analytics chart type
    document.querySelectorAll('.chart-type-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.chart-type-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            S.chartType=btn.dataset.type;
            if (document.getElementById('analytics')?.classList.contains('active')) loadAnalytics();
        });
    });

    // Navigation
    document.body.addEventListener('click',e=>{
        const link=e.target.closest('.tnav-link,.snav-item[data-section]');
        if (link){
            e.preventDefault();
            const id=link.dataset.section||link.getAttribute('href')?.replace('#','')||'login-form';
            showSection(id);
        }
    });
});
