/* eslint-disable no-undef, no-console */
'use strict';

// ── Config ────────────────────────────────────────────────────────────────────
window.APP_CONFIG = { phpBase:'http://localhost:8080', pyBase:'http://localhost:5000', wsUrl:null };

// ── State ─────────────────────────────────────────────────────────────────────
const S = {
    user:null, userId:null, role:null, token:null,
    points:0, streak:0, level:1, xp:0,
    courses:[], quizTimer:null, chartType:'bar', starRating:0,
    offline:!navigator.onLine
};

// ── XP / Level system ─────────────────────────────────────────────────────────
const XP_PER_LEVEL = 100;
function addXP(amount) {
    S.xp += amount;
    const newLevel = Math.floor(S.xp / XP_PER_LEVEL) + 1;
    if (newLevel > S.level) {
        S.level = newLevel;
        showLevelUp(newLevel);
    }
    updateXPBar();
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
    setTimeout(() => {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden','true');
    }, 2800);
}

// ── Mock data ─────────────────────────────────────────────────────────────────
let mockCourses = [
    { id:1, emoji:'🐍', title:'Introduction to Python', description:'Master Python fundamentals — variables, functions, OOP and more.',
      syllabus:['Week 1: Variables & Types','Week 2: Functions & Scope','Week 3: OOP & Classes','Week 4: File I/O'],
      assignments:[{title:'Build a Calculator',dueDate:'2025-06-01'},{title:'OOP Bank Account',dueDate:'2025-06-15'}],
      forumPosts:[{id:1,user:'Alice',message:'How do I debug infinite loops?',replies:[{user:'Bob',message:'Use print statements or a debugger!'}]}] },
    { id:2, emoji:'📐', title:'Calculus Fundamentals', description:'Derivatives, integrals, and limits — the language of change.',
      syllabus:['Week 1: Limits','Week 2: Derivatives','Week 3: Integration','Week 4: Applications'],
      assignments:[{title:'Derivatives Problem Set',dueDate:'2025-06-15'}],
      forumPosts:[] },
    { id:3, emoji:'🌐', title:'Web Development', description:'Build stunning modern web apps with HTML, CSS, and JavaScript.',
      syllabus:['Week 1: HTML5 Semantics','Week 2: CSS Grid & Flexbox','Week 3: JavaScript ES6+','Week 4: APIs & Fetch'],
      assignments:[{title:'Portfolio Website',dueDate:'2025-07-01'}],
      forumPosts:[] },
    { id:4, emoji:'🤖', title:'Machine Learning Basics', description:'Understand ML algorithms, data preprocessing, and model evaluation.',
      syllabus:['Week 1: Data Preprocessing','Week 2: Linear Regression','Week 3: Classification','Week 4: Neural Networks'],
      assignments:[{title:'Iris Classification',dueDate:'2025-07-15'}],
      forumPosts:[] }
];

let mockQuizzes = [
    { id:1, question:'What is the output of `print(2 ** 3)` in Python?', options:['6','8','9','Error'], correctAnswer:1 },
    { id:2, question:'What is the derivative of sin(x)?', options:['cos(x)','-cos(x)','sin(x)','-sin(x)'], correctAnswer:0 },
    { id:3, question:'Which HTML tag creates a hyperlink?', options:['<link>','<a>','<href>','<url>'], correctAnswer:1 },
    { id:4, question:'What does CSS stand for?', options:['Computer Style Sheets','Creative Style Syntax','Cascading Style Sheets','Colorful Style Sheets'], correctAnswer:2 },
    { id:5, question:'What is the time complexity of binary search?', options:['O(n)','O(n²)','O(log n)','O(1)'], correctAnswer:2 }
];

// ── Sounds ────────────────────────────────────────────────────────────────────
const sounds = {};
function initSounds() {
    ['toggle','click','success','error','badge'].forEach(k => {
        try {
            sounds[k] = new Howl({ src:[`assets/audio/${k}.mp3`], onloaderror:()=>{ sounds[k]={play:()=>{}}; } });
        } catch { sounds[k]={play:()=>{}}; }
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
    const m=document.getElementById('modal');
    if (!m) return;
    const i=document.getElementById('modal-icon'), t=document.getElementById('modal-msg');
    if (i) i.textContent=icon;
    if (t) t.textContent=msg;
    m.classList.add('active'); m.setAttribute('aria-hidden','false');
    document.getElementById('modal-close')?.focus();
}
function closeModal() {
    const m=document.getElementById('modal');
    if (!m) return;
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
                color:{value:dark?'#6699ff':'#3355cc'},
                shape:{type:'circle'},opacity:{value:.35,random:true},
                size:{value:2.2,random:true},
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
        if (e.key==='Escape'){closeModal();closeSidebar();}
        if (e.key==='t'||e.key==='T') toggleTheme();
        if (e.key==='m'||e.key==='M') toggleSidebar();
    });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const target=document.getElementById(id);
    if (!target){document.getElementById('login-form')?.classList.add('active');return;}
    target.classList.add('active');

    // Sync nav highlights
    document.querySelectorAll('.tnav-link,.snav-item').forEach(a=>{
        a.classList.toggle('active',a.dataset.section===id||a.getAttribute('href')==='#'+id);
    });

    if (document.querySelector('.sidebar')?.classList.contains('active')) closeSidebar();

    const map={dashboard:loadDashboard,'quiz-section':loadQuizzes,'course-section':loadCourseSection,
        analytics:loadAnalytics,feedback:loadFeedback,help:loadHelp,'content-repo':loadRepository};
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
    set('stat-courses',S.courses.length);
    set('stat-badges',document.querySelectorAll('#badges-container .badge').length);
    syncSidebarUser();
    updateXPBar();
}

// ── Local user store (works without any backend) ──────────────────────────────
const LOCAL_USERS_KEY = 'nl_users';
function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '[]'); } catch { return []; }
}
function saveLocalUsers(u) { localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(u)); }

// ── Auth tab setup ────────────────────────────────────────────────────────────
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
    // Signup role pills
    document.querySelectorAll('#panel-signup .role-pill').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('#panel-signup .role-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('signup-user-type');
            if (sel) sel.value=btn.dataset.role;
        });
    });
    // Signup eye
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
            users.push({id:Date.now(),fullname,username,email,password,user_type:role,points:0,streak:0});
            saveLocalUsers(users);
        }
        toast(`Account created! Welcome, ${username}! 🎉`,'success'); playSound('success');
        S.user=username; S.userId=Date.now(); S.role=role; S.points=0; S.streak=0; S.token=null;
        checkStreak(); syncStats(); addXP(10);
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
        // 1. Try PHP backend
        if (!S.offline) {
            try {
                const res=await fetch(`${APP_CONFIG.phpBase}?action=login`,{
                    method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({username,password,user_type:S.role})});
                data=await res.json();
            } catch { /* backend down */ }
        }
        // 2. Try local user store (by username OR email)
        if (!data?.success) {
            const found=getLocalUsers().find(u=>
                (u.username===username || u.email===username) && u.password===password
            );
            if (found) data={success:true,token:null,user:found};
        }
        // 3. Demo fallback — always works
        if (!data?.success) {
            data={success:true,token:null,user:{id:1,username,user_type:S.role,points:0,streak:0}};
        }
        S.token=data.token;
        // Use the stored username (not the email they typed)
        S.user  = data.user.username || username;
        S.userId = data.user.id;
        S.role  = data.user.user_type || S.role;
        S.points = data.user.points || 0;
        S.streak = data.user.streak || 0;

        toast(`Welcome back, ${S.user}! 🎓`,'success'); playSound('success');
        checkStreak(); syncStats(); addXP(10);
        // Small delay so state is fully set before dashboard renders
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
    addXP(20);
    const st=document.getElementById('stat-badges');
    if (st) st.textContent=c.querySelectorAll('.badge').length;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!S.user){showSection('login-form');return;}
    const wm=document.getElementById('welcome-message');
    if (wm){wm.textContent=`Welcome back, ${S.user}! Ready to learn? 🚀`;gsap.from(wm,{opacity:0,x:-24,duration:.5});}

    try {
        let courses=mockCourses;
        if (!S.offline&&S.token){
            const res=await fetch(`${APP_CONFIG.pyBase}/api/courses`,{headers:{Authorization:`Bearer ${S.token}`}});
            const d=await res.json();
            if (d.success&&d.courses?.length){mockCourses=d.courses;courses=d.courses;}
        }
        const withProg=courses.map(c=>({...c,progress:Math.floor(Math.random()*100)}));
        S.courses=withProg;
        renderCourseGrid('dashboard-course-grid',withProg,true);
        const avg=Math.round(withProg.reduce((s,c)=>s+c.progress,0)/withProg.length)||0;
        animateProgress(avg);
        renderLeaderboard();
        syncStats();
        const rec=document.getElementById('recommendations');
        if (rec){
            rec.innerHTML='📚 <strong>Recommended for you:</strong> Advanced Python, Linear Algebra, Data Structures & Algorithms';
            gsap.from(rec,{opacity:0,y:16,duration:.5,delay:.2});
        }
    } catch(e){toast('Failed to load dashboard','error');console.error(e);}
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
    grid.innerHTML=courses.map(c=>`
        <div class="course-card" data-id="${c.id}" role="gridcell" tabindex="0">
            <span class="course-card__emoji">${c.emoji||'📚'}</span>
            <h3>${c.title}</h3>
            <p>${c.description}</p>
            ${showProgress?`
            <div class="prog-label">Progress: ${c.progress??0}%</div>
            <div class="prog-bar"><div class="prog-fill" style="width:0%" data-target="${c.progress??0}"></div></div>
            `:''}
        </div>`).join('');
    // Animate progress bars
    if (showProgress) {
        setTimeout(()=>{
            grid.querySelectorAll('.prog-fill').forEach(el=>{
                gsap.to(el,{width:el.dataset.target+'%',duration:.9,ease:'power2.out'});
            });
        },200);
    }
    gsap.from(`#${gridId} .course-card`,{opacity:0,y:28,stagger:.08,duration:.5});
}

function renderLeaderboard() {
    const list=document.getElementById('leaderboard-list');
    if (!list) return;
    const data=[
        {name:S.user||'You',pts:S.points},
        {name:'Alice',pts:142},{name:'Bob',pts:118},{name:'Carol',pts:97},{name:'Dave',pts:83}
    ].sort((a,b)=>b.pts-a.pts);
    const medals=['🥇','🥈','🥉'];
    list.innerHTML=data.map((u,i)=>`<li>${medals[i]||'  '} <strong>${u.name}</strong> — ${u.pts} pts</li>`).join('');
    gsap.from('#leaderboard-list li',{opacity:0,x:-18,stagger:.07,duration:.4});
}

// ── Courses ───────────────────────────────────────────────────────────────────
async function loadCourseSection() {
    const grid=document.getElementById('course-grid');
    const details=document.getElementById('course-details');
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

        if (details) {
            details.innerHTML=courses.map(c=>`
                <div class="course-detail">
                    <h3>${c.emoji||'📚'} ${c.title}</h3>
                    <p>${c.description}</p>
                    <h4>Syllabus</h4>
                    <ul>${(c.syllabus||[]).map(i=>`<li>${i}</li>`).join('')||'<li>No syllabus</li>'}</ul>
                    <h4>Assignments</h4>
                    <ul>${(c.assignments||[]).map(a=>`<li>${a.title} — Due: ${a.dueDate}</li>`).join('')||'<li>None</li>'}</ul>
                    <h4>Discussion Forum</h4>
                    ${(c.forumPosts||[]).map(p=>`
                        <div class="forum-post">
                            <p><strong>${p.user}:</strong> ${p.message}</p>
                            ${(p.replies||[]).map(r=>`<p class="reply"><strong>${r.user}:</strong> ${r.message}</p>`).join('')}
                            <form class="forum-reply-form" data-post-id="${p.id}">
                                <textarea placeholder="Reply…" required></textarea>
                                <button type="submit">Reply</button>
                            </form>
                        </div>`).join('')||'<p style="color:var(--txt3);font-size:.85rem">No posts yet — start the conversation!</p>'}
                    <form class="forum-post-form" data-course-id="${c.id}">
                        <textarea placeholder="Start a discussion…" required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>`).join('');
            setupForum();
        }

        // Search
        document.getElementById('course-search')?.addEventListener('input',function(){
            const q=this.value.toLowerCase();
            grid.querySelectorAll('.course-card').forEach(card=>{
                card.style.display=card.textContent.toLowerCase().includes(q)?'':'none';
            });
        });
    } catch(e){toast('Failed to load courses','error');console.error(e);}
}

function setupForum() {
    document.querySelectorAll('.forum-post-form').forEach(f=>{
        f.addEventListener('submit',e=>{
            e.preventDefault();
            const msg=f.querySelector('textarea').value.trim();
            if (!msg) return;
            toast('Post submitted! +5 pts','success');
            f.querySelector('textarea').value='';
            S.points+=5; addXP(5); syncStats();
            if (S.points>=50) awardBadge('Forum Contributor');
        });
    });
    document.querySelectorAll('.forum-reply-form').forEach(f=>{
        f.addEventListener('submit',e=>{
            e.preventDefault();
            const msg=f.querySelector('textarea').value.trim();
            if (!msg) return;
            toast('Reply posted!','success');
            f.querySelector('textarea').value='';
        });
    });
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function appendMsg(text, role) {
    const c=document.getElementById('chat-container');
    if (!c) return null;
    const wrap=document.createElement('div');
    wrap.className=`msg msg--${role}`;
    wrap.innerHTML=`<div class="msg__av">${role==='ai'?'🤖':'👤'}</div><div class="msg__bubble">${text}</div>`;
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
            cacheReq(`${APP_CONFIG.pyBase}/api/chat`,{message:msg,user:S.user});
        } else {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/chat`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(S.token?{Authorization:`Bearer ${S.token}`}:{})},
                body:JSON.stringify({message:msg})});
            const d=await res.json();
            if (bubble){bubble.classList.remove('typing');bubble.textContent=d.response||"I'm not sure — try rephrasing your question!";}
        }
    } catch(e){
        if (bubble){bubble.classList.remove('typing');bubble.textContent='Connection error. Please try again.';}
    }
    addXP(2);
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
const TIMER_CIRCUMFERENCE = 2 * Math.PI * 18; // r=18

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
        qDiv.innerHTML=quizzes.map((q,i)=>`
            <div class="quiz-card" role="group" aria-label="Question ${i+1}">
                <p class="quiz-card__q"><strong>Q${i+1}:</strong> ${q.question}</p>
                <div class="quiz-opts">
                    ${q.options.map((o,j)=>`
                        <label class="quiz-opt">
                            <input type="radio" name="q${i}" value="${j}" aria-label="${o}">
                            <span>${o}</span>
                        </label>`).join('')}
                </div>
            </div>`).join('');
        gsap.from('.quiz-card',{opacity:0,y:22,stagger:.1,duration:.5});

        // Timer with SVG ring
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

    // Show correct/wrong visually
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

        const badge=document.getElementById('quiz-score-badge');
        const val=document.getElementById('quiz-score-val');
        if (badge&&val){val.textContent=`${score}%`;badge.hidden=false;}

        addXP(Math.round(score/5));
        syncStats();
        showModal(`Quiz complete! Score: ${score}% 🎉\n+${Math.round(score/10)} points earned`,'🏆');
        playSound('success');
        if (score>=80) awardBadge('Quiz Champion');
        if (score===100) awardBadge('Perfect Score');
        loadDashboard();
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
        S.points+=10; addXP(15); syncStats();
        toast('Content uploaded! +10 pts 🎉','success'); playSound('success');
        document.getElementById('content-title').value='';
        document.getElementById('content-body').value='';
        document.getElementById('char-count').textContent='0 characters';
        awardBadge('Content Creator');
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
    if (S.role!=='tutor'){toast('Only tutors can view analytics','error');return;}
    const canvas=document.getElementById('progress-chart');
    if (!canvas) return;
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
                    tooltip:{
                        backgroundColor:'rgba(10,12,20,.9)',
                        borderColor:'rgba(100,150,255,.3)',borderWidth:1,
                        callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw}%`}}},
                scales:{
                    y:{beginAtZero:true,max:100,
                        ticks:{color:'rgba(255,255,255,.5)',font:{family:'JetBrains Mono'}},
                        grid:{color:'rgba(255,255,255,.06)'}},
                    x:{ticks:{color:'rgba(255,255,255,.5)'},grid:{color:'rgba(255,255,255,.04)'}}},
                animation:{duration:900,easing:'easeOutQuart'}}});

        // Quick stats
        const statList=document.getElementById('analytics-stat-list');
        if (statList){
            const avg=Math.round(progress.reduce((s,v)=>s+v,0)/progress.length);
            const top=students[progress.indexOf(Math.max(...progress))];
            const above80=progress.filter(p=>p>=80).length;
            [
                {lbl:'Average Progress',val:`${avg}%`},
                {lbl:'Top Student',val:top},
                {lbl:'Total Students',val:students.length},
                {lbl:'Above 80%',val:`${above80} / ${students.length}`},
                {lbl:'Needs Attention',val:progress.filter(p=>p<60).length}
            ].forEach(s=>{
                const row=document.createElement('div');
                row.className='stat-row';
                row.innerHTML=`<span class="stat-row__lbl">${s.lbl}</span><span class="stat-row__val">${s.val}</span>`;
                statList.appendChild(row);
            });
        }

        // Heatmap
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
        S.points+=2; S.starRating=0; addXP(5); syncStats();
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
        if (d.courses?.length) mockCourses=d.courses;
        if (d.quizzes?.length) mockQuizzes=d.quizzes;
    } catch {}
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
    document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark');

    initSounds(); setupDropzone(); initParticles(); setupVoice();
    setupOffline(); setupWS(); setupSwipe(); setupKeys();
    setupAuthTabs();
    loadData(); loadRepository();

    // Controls
    document.querySelector('.theme-toggle')?.addEventListener('click',toggleTheme);
    document.querySelector('.sidebar-toggle')?.addEventListener('click',toggleSidebar);
    document.querySelector('.sidebar__close')?.addEventListener('click',closeSidebar);
    document.querySelector('.sidebar-overlay')?.addEventListener('click',closeSidebar);
    document.getElementById('modal-close')?.addEventListener('click',closeModal);
    document.getElementById('levelup-overlay')?.addEventListener('click',()=>{
        document.getElementById('levelup-overlay').classList.remove('active');
    });

    // Login
    document.getElementById('login-form-el')?.addEventListener('submit',login);
    document.querySelectorAll('.role-pill').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.role-pill').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('user-type');
            if (sel) sel.value=btn.dataset.role;
        });
    });
    document.querySelector('.field__eye')?.addEventListener('click',()=>{
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
        const link=e.target.closest('.tnav-link,.snav-item');
        if (link){
            e.preventDefault();
            const id=link.dataset.section||link.getAttribute('href')?.replace('#','')||'login-form';
            showSection(id);
        }
    });
});
