/* eslint-disable no-undef, no-console */

// ── App Config ────────────────────────────────────────────────────────────────
window.APP_CONFIG = {
    phpBase: '/php-api',
    pyBase:  '/py-api',
    wsUrl:   null
};

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    currentUser: null, userId: null, userType: null, token: null,
    quizTimer: null, points: 0, courses: [], streak: 0,
    offline: !navigator.onLine, chartType: 'bar', starRating: 0
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
let mockCourses = [
    { id:1, title:'Introduction to Python', description:'Master Python fundamentals.', emoji:'🐍',
      syllabus:['Week 1: Variables','Week 2: Functions','Week 3: OOP'],
      assignments:[{title:'Calculator',dueDate:'2025-06-01'}],
      forumPosts:[{id:1,user:'Alice',message:'How do I debug loops?',replies:[]}] },
    { id:2, title:'Calculus Fundamentals', description:'Learn derivatives and integrals.', emoji:'📐',
      syllabus:['Week 1: Limits','Week 2: Derivatives','Week 3: Integrals'],
      assignments:[{title:'Derivatives Problem Set',dueDate:'2025-06-15'}],
      forumPosts:[] },
    { id:3, title:'Web Development', description:'Build modern web applications.', emoji:'🌐',
      syllabus:['Week 1: HTML','Week 2: CSS','Week 3: JavaScript'],
      assignments:[{title:'Portfolio Site',dueDate:'2025-07-01'}],
      forumPosts:[] }
];

let mockQuizzes = [
    { id:1, question:'What is the output of `print(2 + 2)` in Python?', options:['22','4','Error','None'], correctAnswer:1 },
    { id:2, question:'What is the derivative of x²?', options:['2x','x','x²','2'], correctAnswer:0 },
    { id:3, question:'Which HTML tag creates a hyperlink?', options:['<link>','<a>','<href>','<url>'], correctAnswer:1 }
];

// ── Sounds ────────────────────────────────────────────────────────────────────
const sounds = {};
function initializeSounds() {
    ['toggle','click','success','error','badge'].forEach(k => {
        try {
            sounds[k] = new Howl({ src:[`assets/audio/${k}.mp3`],
                onloaderror: () => { sounds[k] = {play:()=>{}}; } });
        } catch { sounds[k] = {play:()=>{}}; }
    });
}
function playSound(t) { try { sounds[t]?.play(); } catch {} }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type='success') {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    t.setAttribute('role','alert');
    c.appendChild(t);
    gsap.fromTo(t, {x:60,opacity:0}, {x:0,opacity:1,duration:0.4,ease:'power2.out',
        onComplete:()=>setTimeout(()=>gsap.to(t,{opacity:0,x:60,duration:0.3,onComplete:()=>t.remove()}),3000)});
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal(msg, icon='ℹ️') {
    const m = document.getElementById('modal');
    if (!m) return;
    const mi = document.getElementById('modal-icon');
    const mm = document.getElementById('modal-message');
    if (mi) mi.textContent = icon;
    if (mm) mm.textContent = msg;
    m.classList.add('active');
    m.setAttribute('aria-hidden','false');
    document.getElementById('modal-close')?.focus();
}
function closeModal() {
    const m = document.getElementById('modal');
    if (!m) return;
    m.classList.remove('active');
    m.setAttribute('aria-hidden','true');
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
    const root = document.documentElement;
    const next = (root.getAttribute('data-theme')||'dark')==='dark' ? 'light' : 'dark';
    gsap.to(root,{duration:0.3,opacity:0,onComplete:()=>{
        root.setAttribute('data-theme',next);
        localStorage.setItem('theme',next);
        gsap.to(root,{duration:0.3,opacity:1});
        initParticles();
        playSound('toggle');
    }});
}

// ── Particles ─────────────────────────────────────────────────────────────────
function initParticles() {
    try {
        if (window.pJSDom?.length) { window.pJSDom[0].pJS.fn.vendors.destroypJS(); window.pJSDom=[]; }
        const dark = document.documentElement.getAttribute('data-theme')==='dark';
        particlesJS('particles-js',{
            particles:{number:{value:60,density:{enable:true,value_area:900}},
                color:{value:dark?'#6699ff':'#4466cc'},
                shape:{type:'circle'},opacity:{value:0.4,random:true},
                size:{value:2.5,random:true},
                move:{enable:true,speed:1.5,direction:'none',random:true}},
            interactivity:{detect_on:'canvas',
                events:{onhover:{enable:true,mode:'repulse'},onclick:{enable:true,mode:'push'}},
                modes:{repulse:{distance:80},push:{particles_nb:3}}},
            retina_detect:true});
    } catch(e){console.warn('Particles:',e);}
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function openSidebar() {
    const s = document.querySelector('.sidebar');
    const o = document.querySelector('.sidebar-overlay');
    s?.classList.add('active');
    o?.classList.add('active');
}
function closeSidebar() {
    const s = document.querySelector('.sidebar');
    const o = document.querySelector('.sidebar-overlay');
    s?.classList.remove('active');
    o?.classList.remove('active');
}
function toggleSidebar() {
    document.querySelector('.sidebar')?.classList.contains('active') ? closeSidebar() : openSidebar();
}

// ── Offline ───────────────────────────────────────────────────────────────────
function setupOfflineSupport() {
    const update = () => {
        state.offline = !navigator.onLine;
        document.body.classList.toggle('offline', state.offline);
        const lbl = document.querySelector('.online-indicator .label');
        if (lbl) lbl.textContent = state.offline ? 'Offline' : 'Online';
        if (!state.offline) { showToast('Back online!','success'); syncOfflineData(); }
        else showToast('Offline mode','error');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if (state.offline) document.body.classList.add('offline');
}
async function syncOfflineData() {
    if (!('caches' in window)) return;
    try {
        const cache = await caches.open('tutoring-system');
        const keys = await cache.keys();
        for (const req of keys) {
            const res = await cache.match(req);
            if (res) {
                const data = await res.json();
                await fetch(req.url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
                await cache.delete(req);
            }
        }
        if (keys.length) showToast('Offline data synced','success');
    } catch(e){console.error('Sync failed:',e);}
}
async function cacheRequest(url, data) {
    if (!('caches' in window)) return;
    try { const c=await caches.open('tutoring-system'); await c.put(url,new Response(JSON.stringify(data))); }
    catch(e){console.error('Cache failed:',e);}
}

// ── Voice Input ───────────────────────────────────────────────────────────────
function setupVoiceInput() {
    const input = document.getElementById('chat-input');
    const btn   = document.querySelector('.voice-btn');
    if (!btn||!input) return;
    if (!(window.SpeechRecognition||window.webkitSpeechRecognition)) { btn.style.display='none'; return; }
    const rec = new (window.SpeechRecognition||window.webkitSpeechRecognition)();
    rec.lang='en-US'; rec.interimResults=false;
    btn.addEventListener('click',()=>{ try{rec.start();btn.classList.add('recording');showToast('Listening…','info');}catch{} });
    rec.onresult = e => { input.value=e.results[0][0].transcript; btn.classList.remove('recording'); sendChat(); };
    rec.onerror  = () => { btn.classList.remove('recording'); showToast('Voice failed','error'); };
}

// ── Swipe ─────────────────────────────────────────────────────────────────────
function setupSwipeNavigation() {
    let sx=0;
    document.addEventListener('touchstart',e=>{sx=e.changedTouches[0].screenX;});
    document.addEventListener('touchend',e=>{
        const dx=e.changedTouches[0].screenX-sx;
        if (dx>60) openSidebar();
        else if (dx<-60) closeSidebar();
    });
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
        if (e.key==='Escape') { closeModal(); closeSidebar(); }
        if (e.key==='t'||e.key==='T') toggleTheme();
    });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showSection(id) {
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    const target = document.getElementById(id);
    if (!target) { document.getElementById('login-form')?.classList.add('active'); return; }
    target.classList.add('active');

    // Update nav active states
    document.querySelectorAll('.topnav__link,.nav-item').forEach(a=>{
        a.classList.toggle('active', a.getAttribute('href')==='#'+id || a.dataset.section===id);
    });

    // Close sidebar only if open
    if (document.querySelector('.sidebar')?.classList.contains('active')) closeSidebar();

    // Load section data
    const loaders = {
        dashboard:'loadDashboard', 'quiz-section':'loadQuizzes',
        'course-section':'loadCourseSection', analytics:'loadAnalytics',
        feedback:'loadFeedback', help:'loadHelp', 'content-repo':'loadRepository'
    };
    if (loaders[id]) window[loaders[id]]?.();
    playSound('click');
}

// ── Update sidebar user info ──────────────────────────────────────────────────
function updateSidebarUser() {
    const userEl = document.getElementById('sidebar-user');
    if (userEl) userEl.hidden = !state.currentUser;
    const av = document.getElementById('sidebar-avatar');
    if (av) av.textContent = (state.currentUser||'?')[0].toUpperCase();
    const un = document.getElementById('sidebar-username');
    if (un) un.textContent = state.currentUser||'';
    const ro = document.getElementById('sidebar-role');
    if (ro) ro.textContent = state.userType||'';
    const pts = document.getElementById('sidebar-points-val');
    if (pts) pts.textContent = state.points;
}

// ── Update stat cards ─────────────────────────────────────────────────────────
function updateStats() {
    const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
    set('stat-points', state.points);
    set('stat-streak', state.streak);
    set('stat-courses', state.courses.length);
    set('stat-badges', document.querySelectorAll('#badges-container .badge').length);
    updateSidebarUser();
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    state.userType = document.getElementById('user-type').value;
    if (!username||!password) { showModal('Please fill in all fields','⚠️'); playSound('error'); return; }

    const btn = event.target.querySelector('[type=submit]');
    const loader = btn?.querySelector('.btn__loader');
    const text   = btn?.querySelector('.btn__text');
    if (loader) loader.hidden=false;
    if (text)   text.hidden=true;
    if (btn)    btn.disabled=true;

    try {
        let data;
        if (state.offline) {
            data={success:true,token:null,user:{id:1,username,user_type:state.userType,points:0,streak:0}};
            cacheRequest(`${APP_CONFIG.phpBase}?action=login`,{username,password,user_type:state.userType});
        } else {
            const res=await fetch(`${APP_CONFIG.phpBase}?action=login`,{
                method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({username,password,user_type:state.userType})});
            data=await res.json();
        }
        if (!data.success) { showModal(data.error||'Invalid credentials','❌'); playSound('error'); return; }
        state.token=data.token; state.currentUser=data.user.username;
        state.userId=data.user.id; state.userType=data.user.user_type;
        state.points=data.user.points||0; state.streak=data.user.streak||0;
        showToast(`Welcome back, ${state.currentUser}! 🎓`,'success');
        playSound('success');
        checkStreak();
        updateStats();
        showSection('dashboard');
    } catch(e) { showModal('Network error. Please try again.','🌐'); console.error(e); }
    finally {
        if (loader) loader.hidden=true;
        if (text)   text.hidden=false;
        if (btn)    btn.disabled=false;
    }
}

// ── Streak ────────────────────────────────────────────────────────────────────
function checkStreak() {
    const last=localStorage.getItem('lastLogin');
    const today=new Date().toISOString().split('T')[0];
    if (last===today) return;
    const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
    state.streak = last===yesterday ? state.streak+1 : 1;
    localStorage.setItem('streak',state.streak);
    localStorage.setItem('lastLogin',today);
    if (state.streak%5===0) awardBadge('Streak Master');
    const el=document.getElementById('streak-display');
    if (el) { el.textContent=`${state.streak} day streak`; gsap.from(el,{scale:0.8,opacity:0,duration:0.5,ease:'back.out(1.7)'}); }
    const st=document.getElementById('stat-streak');
    if (st) st.textContent=state.streak;
}

// ── Badges ────────────────────────────────────────────────────────────────────
function awardBadge(name) {
    const c=document.getElementById('badges-container');
    if (!c) return;
    const type=name.toLowerCase().replace(/\s+/g,'-');
    if (c.querySelector(`[data-type="${type}"]`)) return;
    const b=document.createElement('div');
    b.className=`badge`; b.textContent=name; b.setAttribute('data-type',type);
    c.appendChild(b);
    gsap.from(b,{scale:0,opacity:0,duration:0.5,ease:'back.out(1.7)'});
    showToast(`🏅 Badge earned: ${name}!`,'success');
    playSound('badge');
    const st=document.getElementById('stat-badges');
    if (st) st.textContent=c.querySelectorAll('.badge').length;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
    if (!state.currentUser) { showSection('login-form'); return; }
    const wm=document.getElementById('welcome-message');
    if (wm) { wm.textContent=`Welcome back, ${state.currentUser}! 🎓`; gsap.from(wm,{opacity:0,x:-20,duration:0.5}); }

    try {
        let courses=mockCourses;
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/courses`,{headers:{Authorization:`Bearer ${state.token}`}});
            const d=await res.json();
            if (d.success&&d.courses?.length) { mockCourses=d.courses; courses=d.courses; }
        }
        const withProg=courses.map(c=>({...c,progress:Math.floor(Math.random()*100)}));
        state.courses=withProg;
        renderDashboardCourses(withProg);
        updateProgressTracker(Math.round(withProg.reduce((s,c)=>s+c.progress,0)/withProg.length)||0);
        renderLeaderboard();
        updateStats();

        const rec=document.getElementById('recommendations');
        if (rec) { rec.textContent='📚 Recommended for you: Advanced Python, Linear Algebra, Data Structures'; gsap.from(rec,{opacity:0,y:20,duration:0.5,delay:0.2}); }
    } catch(e) { showToast('Failed to load dashboard','error'); console.error(e); }
}

function updateProgressTracker(pct) {
    const fill=document.getElementById('overall-progress-fill');
    const lbl=document.getElementById('overall-progress-label');
    const track=document.querySelector('.progress-track');
    if (fill) fill.style.width=pct+'%';
    if (lbl)  lbl.textContent=pct+'%';
    if (track){ track.setAttribute('aria-valuenow',pct); }
    document.querySelectorAll('.milestone').forEach(m=>{
        m.classList.toggle('active',pct>=parseInt(m.dataset.milestone));
    });
}

function renderDashboardCourses(courses) {
    const grid=document.getElementById('dashboard-course-grid');
    if (!grid) return;
    grid.innerHTML=courses.map(c=>`
        <div class="course-card" data-course-id="${c.id}" role="gridcell" tabindex="0">
            <span class="course-card__emoji">${c.emoji||'📚'}</span>
            <h3>${c.title}</h3>
            <p>${c.description}</p>
            <div class="progress-label">Progress: ${c.progress??0}%</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${c.progress??0}%"
                role="progressbar" aria-valuenow="${c.progress??0}" aria-valuemin="0" aria-valuemax="100"></div></div>
        </div>`).join('');
    gsap.from('#dashboard-course-grid .course-card',{opacity:0,y:24,stagger:0.08,duration:0.5});
}

function renderLeaderboard() {
    const list=document.getElementById('leaderboard-list');
    if (!list) return;
    const data=[
        {username:state.currentUser||'You',points:state.points},
        {username:'Alice',points:120},{username:'Bob',points:95},{username:'Carol',points:80}
    ].sort((a,b)=>b.points-a.points);
    const medals=['🥇','🥈','🥉'];
    list.innerHTML=data.map((u,i)=>`<li>${medals[i]||'  '} <strong>${u.username}</strong> — ${u.points} pts</li>`).join('');
    gsap.from('#leaderboard-list li',{opacity:0,x:-16,stagger:0.07,duration:0.4});
}

// ── Courses ───────────────────────────────────────────────────────────────────
async function loadCourseSection() {
    const grid=document.getElementById('course-grid');
    const details=document.getElementById('course-details');
    if (!grid) return;
    try {
        let courses=mockCourses;
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/courses`,{headers:{Authorization:`Bearer ${state.token}`}});
            const d=await res.json();
            if (d.success&&d.courses?.length) { mockCourses=d.courses; courses=d.courses; }
        }
        state.courses=courses;
        grid.innerHTML=courses.map(c=>`
            <div class="course-card" data-course-id="${c.id}" role="gridcell" tabindex="0">
                <span class="course-card__emoji">${c.emoji||'📚'}</span>
                <h3>${c.title}</h3>
                <p>${c.description}</p>
            </div>`).join('');
        gsap.from('#course-grid .course-card',{opacity:0,y:24,stagger:0.08,duration:0.5});

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
                        </div>`).join('')||'<p style="color:var(--text-3)">No posts yet</p>'}
                    <form class="forum-post-form" data-course-id="${c.id}">
                        <textarea placeholder="Start a discussion…" required></textarea>
                        <button type="submit">Post</button>
                    </form>
                </div>`).join('');
            setupForumInteractions();
        }

        // Course search
        const search=document.getElementById('course-search');
        if (search) {
            search.addEventListener('input',()=>{
                const q=search.value.toLowerCase();
                grid.querySelectorAll('.course-card').forEach(card=>{
                    card.style.display=card.textContent.toLowerCase().includes(q)?'':'none';
                });
            });
        }
    } catch(e) { showToast('Failed to load courses','error'); console.error(e); }
}

function setupForumInteractions() {
    document.querySelectorAll('.forum-post-form').forEach(f=>{
        f.addEventListener('submit',e=>{
            e.preventDefault();
            const msg=f.querySelector('textarea').value.trim();
            if (!msg) return;
            showToast('Post submitted!','success');
            f.querySelector('textarea').value='';
            state.points+=5; updateStats();
            if (state.points>=50) awardBadge('Forum Contributor');
        });
    });
    document.querySelectorAll('.forum-reply-form').forEach(f=>{
        f.addEventListener('submit',e=>{
            e.preventDefault();
            const msg=f.querySelector('textarea').value.trim();
            if (!msg) return;
            showToast('Reply posted!','success');
            f.querySelector('textarea').value='';
        });
    });
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
function appendChatMsg(text, role) {
    const c=document.getElementById('chat-container');
    if (!c) return null;
    const wrap=document.createElement('div');
    wrap.className=`chat-msg chat-msg--${role}`;
    wrap.innerHTML=`
        <div class="chat-msg__avatar">${role==='ai'?'🤖':'👤'}</div>
        <div class="chat-msg__bubble">${text}</div>`;
    c.appendChild(wrap);
    c.scrollTop=c.scrollHeight;
    gsap.from(wrap,{opacity:0,y:12,duration:0.3});
    return wrap.querySelector('.chat-msg__bubble');
}

async function sendChat() {
    const input=document.getElementById('chat-input');
    if (!input) return;
    const msg=input.value.trim();
    if (!msg) return;
    input.value='';
    appendChatMsg(msg,'user');
    const bubble=appendChatMsg('','ai');
    if (bubble) bubble.classList.add('typing');
    try {
        if (state.offline) {
            if (bubble) { bubble.classList.remove('typing'); bubble.textContent='You are offline. Message queued.'; }
            cacheRequest(`${APP_CONFIG.pyBase}/api/chat`,{message:msg,user:state.currentUser});
        } else {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/chat`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(state.token?{Authorization:`Bearer ${state.token}`}:{})},
                body:JSON.stringify({message:msg})});
            const d=await res.json();
            if (bubble) { bubble.classList.remove('typing'); bubble.textContent=d.response||"I'm not sure. Try rephrasing!"; }
        }
    } catch(e) {
        if (bubble) { bubble.classList.remove('typing'); bubble.textContent='Connection error. Please try again.'; }
    }
}

// ── Quizzes ───────────────────────────────────────────────────────────────────
async function loadQuizzes() {
    const qDiv=document.getElementById('quiz-questions');
    if (!qDiv) return;
    try {
        let quizzes=mockQuizzes;
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/quizzes`,{headers:{Authorization:`Bearer ${state.token}`}});
            const d=await res.json();
            if (d.success&&d.quizzes?.length) { mockQuizzes=d.quizzes; quizzes=d.quizzes; }
        }
        qDiv.innerHTML=quizzes.map((q,i)=>`
            <div class="quiz-card" role="group" aria-label="Question ${i+1}">
                <p><strong>Q${i+1}:</strong> ${q.question}</p>
                <div class="quiz-options">
                    ${q.options.map((o,j)=>`
                        <label class="quiz-option">
                            <input type="radio" name="quiz${i}" value="${j}" aria-label="${o}">
                            <span>${o}</span>
                        </label>`).join('')}
                </div>
            </div>`).join('');
        gsap.from('.quiz-card',{opacity:0,y:20,stagger:0.1,duration:0.5});

        // Timer
        clearInterval(state.quizTimer);
        let t=60;
        const timerEl=document.getElementById('timer');
        const timerDisplay=document.getElementById('quiz-timer-display');
        if (timerEl) timerEl.textContent=t;
        state.quizTimer=setInterval(()=>{
            t--;
            if (timerEl) timerEl.textContent=t;
            if (t<=10) timerDisplay?.classList.add('urgent');
            if (t<=0) { clearInterval(state.quizTimer); submitQuiz(); }
        },1000);
    } catch(e) { showToast('Failed to load quizzes','error'); qDiv.innerHTML='<p>Unable to load quizzes</p>'; }
}

async function submitQuiz(event) {
    if (event) event.preventDefault();
    clearInterval(state.quizTimer);
    document.getElementById('quiz-timer-display')?.classList.remove('urgent');

    const answers=[];
    document.querySelectorAll('#quiz-content input[type="radio"]:checked').forEach(inp=>{
        const idx=parseInt(inp.name.replace('quiz',''));
        answers.push({questionIndex:idx,question_id:mockQuizzes[idx]?.id,answer:parseInt(inp.value)});
    });
    if (!answers.length) { showModal('Please select at least one answer','⚠️'); return; }

    try {
        let score=0;
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/submit-quiz`,{
                method:'POST',
                headers:{'Content-Type':'application/json',Authorization:`Bearer ${state.token}`},
                body:JSON.stringify({answers})});
            const d=await res.json();
            if (d.success) { score=d.score; state.points+=d.points_earned||0; }
        } else {
            answers.forEach(a=>{ if (mockQuizzes[a.questionIndex]?.correctAnswer===a.answer) score+=50; });
            state.points+=Math.round(score/10);
            if (state.offline) cacheRequest(`${APP_CONFIG.pyBase}/api/submit-quiz`,{answers});
        }

        // Show result in score display
        const sd=document.getElementById('quiz-score-display');
        const sv=document.getElementById('quiz-score-val');
        if (sd&&sv) { sv.textContent=`${score}%`; sd.hidden=false; }

        showModal(`Quiz complete! Score: ${score}% 🎉`,'🏆');
        playSound('success');
        if (score>=80) awardBadge('Quiz Champion');
        updateStats();
        loadDashboard();
    } catch(e) { showModal('Failed to submit quiz','❌'); console.error(e); }
}

// ── Upload ────────────────────────────────────────────────────────────────────
function setupDragAndDrop() {
    const zone=document.getElementById('dropzone');
    const fileInput=document.getElementById('file-input');
    const body=document.getElementById('content-body');
    if (!zone||!body) return;

    zone.addEventListener('click',()=>fileInput?.click());
    fileInput?.addEventListener('change',e=>{
        const f=e.target.files[0];
        if (f&&f.type==='text/plain') readFile(f);
        else showToast('Please select a .txt file','error');
    });
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-active');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('drag-active'));
    zone.addEventListener('drop',e=>{
        e.preventDefault(); zone.classList.remove('drag-active');
        const f=e.dataTransfer.files[0];
        if (f&&f.type==='text/plain') readFile(f);
        else showToast('Please drop a .txt file','error');
    });

    function readFile(f) {
        const r=new FileReader();
        r.onload=ev=>{ body.value=ev.target.result; showToast('File loaded!','success'); updateCharCount(); };
        r.onerror=()=>showToast('Failed to read file','error');
        r.readAsText(f);
    }

    // Char counter
    body.addEventListener('input',updateCharCount);
    function updateCharCount() {
        const cc=document.getElementById('char-count');
        if (cc) cc.textContent=`${body.value.length} characters`;
    }
}

async function uploadContent(event) {
    if (event) event.preventDefault();
    if (state.userType!=='tutor') { showToast('Only tutors can upload content','error'); return; }
    const title=document.getElementById('content-title').value.trim();
    const body=document.getElementById('content-body').value.trim();
    if (!title||!body) { showToast('Please fill in all fields','error'); return; }
    try {
        if (!state.offline) {
            const res=await fetch(`${APP_CONFIG.phpBase}?action=upload-content`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(state.token?{Authorization:`Bearer ${state.token}`}:{})},
                body:JSON.stringify({title,body,uploaded_by:state.userId})});
            const d=await res.json();
            if (!d.success) { showToast(d.error||'Upload failed','error'); return; }
        } else {
            cacheRequest(`${APP_CONFIG.phpBase}?action=upload-content`,{title,body,uploaded_by:state.userId});
        }
        state.points+=10; updateStats();
        showToast('Content uploaded! +10 pts 🎉','success'); playSound('success');
        document.getElementById('content-title').value='';
        document.getElementById('content-body').value='';
        document.getElementById('char-count').textContent='0 characters';
        awardBadge('Content Creator');
    } catch(e) { showToast('Upload failed','error'); console.error(e); }
}

function previewContent() {
    const title=document.getElementById('content-title').value.trim();
    const body=document.getElementById('content-body').value.trim();
    const preview=document.getElementById('content-preview');
    const previewBody=document.getElementById('content-preview-body');
    if (!title||!body) { showToast('Fill in title and body first','error'); return; }
    if (previewBody) previewBody.innerHTML=`<h4 style="margin-bottom:var(--sp-3)">${title}</h4><p>${body}</p>`;
    if (preview) { preview.hidden=false; gsap.from(preview,{opacity:0,y:16,duration:0.4}); }
}

// ── Analytics ─────────────────────────────────────────────────────────────────
async function loadAnalytics() {
    if (state.userType!=='tutor') { showToast('Only tutors can view analytics','error'); return; }
    const canvas=document.getElementById('progress-chart');
    if (!canvas) return;
    const existing=Chart.getChart(canvas);
    if (existing) existing.destroy();

    try {
        let students=['Alice','Bob','Carol','Dave','Eve'];
        let progress=[85,72,91,60,78];
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/analytics`,{headers:{Authorization:`Bearer ${state.token}`}});
            const d=await res.json();
            if (d.success) { students=d.students; progress=d.progress; }
        }

        const colors=students.map((_,i)=>`hsla(${(i*55+200)%360},70%,60%,0.85)`);
        new Chart(canvas.getContext('2d'),{
            type:state.chartType||'bar',
            data:{labels:students,datasets:[{
                label:'Progress (%)',data:progress,
                backgroundColor:colors,borderColor:colors.map(c=>c.replace('0.85','1')),
                borderWidth:2,borderRadius:8,fill:state.chartType==='line',tension:0.4}]},
            options:{
                responsive:true,maintainAspectRatio:false,
                plugins:{
                    legend:{labels:{color:'var(--text-2)',font:{family:'Inter'}}},
                    tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw}%`}}},
                scales:{
                    y:{beginAtZero:true,max:100,ticks:{color:'var(--text-3)'},grid:{color:'var(--border)'}},
                    x:{ticks:{color:'var(--text-3)'},grid:{color:'var(--border)'}}},
                animation:{duration:800,easing:'easeOutQuart'}}});

        // Quick stats
        const statList=document.getElementById('analytics-stat-list');
        if (statList) {
            const avg=Math.round(progress.reduce((s,v)=>s+v,0)/progress.length);
            const top=students[progress.indexOf(Math.max(...progress))];
            statList.innerHTML=[
                {label:'Average Progress',value:`${avg}%`},
                {label:'Top Student',value:top},
                {label:'Total Students',value:students.length},
                {label:'Above 80%',value:progress.filter(p=>p>=80).length}
            ].map(s=>`<div class="analytics-stat-item">
                <span class="analytics-stat-item__label">${s.label}</span>
                <span class="analytics-stat-item__value">${s.value}</span>
            </div>`).join('');
        }
        gsap.from(canvas,{opacity:0,scale:0.95,duration:0.5});
    } catch(e) { showToast('Failed to load analytics','error'); console.error(e); }
}

// ── Feedback ──────────────────────────────────────────────────────────────────
function loadFeedback() {
    const form=document.getElementById('feedback-form-el');
    if (!form||form.dataset.bound) return;
    form.dataset.bound='1';
    form.addEventListener('submit',submitFeedback);

    // Feedback type buttons
    document.querySelectorAll('.feedback-type-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.feedback-type-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('feedback-type');
            if (sel) sel.value=btn.dataset.type;
        });
    });

    // Star rating
    const stars=document.querySelectorAll('.star');
    stars.forEach(star=>{
        star.addEventListener('click',()=>{
            state.starRating=parseInt(star.dataset.val);
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=state.starRating));
        });
        star.addEventListener('mouseenter',()=>{
            const v=parseInt(star.dataset.val);
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=v));
        });
        star.addEventListener('mouseleave',()=>{
            stars.forEach(s=>s.classList.toggle('active',parseInt(s.dataset.val)<=state.starRating));
        });
    });
    gsap.from(form,{opacity:0,y:20,duration:0.5});
}

async function submitFeedback(event) {
    event.preventDefault();
    const type=document.getElementById('feedback-type').value;
    const message=document.getElementById('feedback-message').value.trim();
    if (!message) { showToast('Please enter a message','error'); return; }
    try {
        if (!state.offline) {
            const res=await fetch(`${APP_CONFIG.phpBase}?action=feedback`,{
                method:'POST',
                headers:{'Content-Type':'application/json',...(state.token?{Authorization:`Bearer ${state.token}`}:{})},
                body:JSON.stringify({user_id:state.userId||0,type,message,rating:state.starRating})});
            const d=await res.json();
            if (!d.success) { showToast(d.error||'Feedback failed','error'); return; }
        } else {
            cacheRequest(`${APP_CONFIG.phpBase}?action=feedback`,{user_id:state.userId||0,type,message});
        }
        showToast('Feedback submitted! Thank you 🙏','success');
        document.getElementById('feedback-message').value='';
        state.points+=2; state.starRating=0;
        document.querySelectorAll('.star').forEach(s=>s.classList.remove('active'));
        updateStats();
        if (state.points>=20) awardBadge('Feedback Star');
    } catch(e) { showToast('Feedback failed','error'); console.error(e); }
}

// ── Help ──────────────────────────────────────────────────────────────────────
function loadHelp() {
    gsap.from('.faq-item',{opacity:0,y:16,stagger:0.08,duration:0.4});
}

// ── Repository ────────────────────────────────────────────────────────────────
async function loadRepository() {
    const grid=document.getElementById('repo-grid');
    if (!grid) return;
    try {
        let items=[
            {title:'Python Variables',description:'Learn about variables, types, and scope in Python.'},
            {title:'Integration Basics',description:'Understand definite and indefinite integration techniques.'},
            {title:'HTML Fundamentals',description:'Introduction to web structure with semantic HTML5.'},
            {title:'Linked Lists',description:'Concepts, implementation, and complexity analysis.'},
            {title:'Linear Regression',description:'ML model fundamentals and gradient descent.'},
            {title:'CSS Grid & Flexbox',description:'Modern layout techniques for responsive design.'},
        ];
        if (!state.offline&&state.token) {
            const res=await fetch(`${APP_CONFIG.pyBase}/api/repository`,{headers:{Authorization:`Bearer ${state.token}`}});
            const d=await res.json();
            if (d.success&&d.items?.length) items=d.items;
        }
        grid.innerHTML=items.map(item=>`
            <div class="repo-item" role="listitem">
                <div class="repo-item__title">${item.title}</div>
                <div class="repo-item__desc">${item.description}</div>
            </div>`).join('');
        gsap.from('.repo-item',{opacity:0,y:20,stagger:0.07,duration:0.4});

        // Repo search
        const search=document.getElementById('repo-search');
        if (search) {
            search.addEventListener('input',()=>{
                const q=search.value.toLowerCase();
                grid.querySelectorAll('.repo-item').forEach(item=>{
                    item.style.display=item.textContent.toLowerCase().includes(q)?'':'none';
                });
            });
        }
    } catch(e) { showToast('Failed to load repository','error'); grid.innerHTML='<p>Unable to load content</p>'; }
}

// ── WebSocket collaboration ───────────────────────────────────────────────────
function setupRealTimeCollaboration() {
    const body=document.getElementById('content-body');
    if (!body) return;
    const wsUrl=window.APP_CONFIG?.wsUrl;
    if (!wsUrl) return;
    let ws;
    try {
        ws=new WebSocket(wsUrl);
        ws.onerror=()=>{ws=null;};
        ws.onmessage=e=>{
            try {
                const d=JSON.parse(e.data);
                if (d.content&&d.user!==state.currentUser) { body.value=d.content; showToast(`${d.user} updated content`,'info'); }
            } catch {}
        };
    } catch { return; }
    let deb;
    body.addEventListener('input',()=>{
        clearTimeout(deb);
        deb=setTimeout(()=>{
            if (ws?.readyState===WebSocket.OPEN)
                try{ws.send(JSON.stringify({content:body.value,user:state.currentUser}));}catch{}
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
    // Theme
    document.documentElement.setAttribute('data-theme',localStorage.getItem('theme')||'dark');

    // Subsystems
    initializeSounds();
    setupDragAndDrop();
    initParticles();
    setupVoiceInput();
    setupOfflineSupport();
    setupRealTimeCollaboration();
    setupSwipeNavigation();
    setupKeyboardShortcuts();
    loadData();
    loadRepository();

    // Controls
    document.querySelector('.theme-toggle')?.addEventListener('click',toggleTheme);
    document.querySelector('.sidebar-toggle')?.addEventListener('click',toggleSidebar);
    document.querySelector('.sidebar__close')?.addEventListener('click',closeSidebar);
    document.querySelector('.sidebar-overlay')?.addEventListener('click',closeSidebar);
    document.getElementById('modal-close')?.addEventListener('click',closeModal);

    // Login
    document.getElementById('login-form-el')?.addEventListener('submit',login);
    document.querySelectorAll('.role-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const sel=document.getElementById('user-type');
            if (sel) sel.value=btn.dataset.role;
        });
    });
    document.querySelector('.toggle-pw')?.addEventListener('click',()=>{
        const pw=document.getElementById('password');
        if (pw) pw.type=pw.type==='password'?'text':'password';
    });

    // Chat
    document.getElementById('send-btn')?.addEventListener('click',sendChat);
    document.getElementById('chat-input')?.addEventListener('keydown',e=>{
        if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}
    });
    document.querySelectorAll('.suggestion-chip').forEach(chip=>{
        chip.addEventListener('click',()=>{
            const input=document.getElementById('chat-input');
            if (input){input.value=chip.dataset.msg;sendChat();}
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
            state.chartType=btn.dataset.type;
            if (document.getElementById('analytics')?.classList.contains('active')) loadAnalytics();
        });
    });

    // Navigation — top nav + sidebar
    document.body.addEventListener('click',e=>{
        const link=e.target.closest('.topnav__link,.nav-item');
        if (link){
            e.preventDefault();
            const id=link.getAttribute('href')?.replace('#','')||link.dataset.section||'login-form';
            showSection(id);
        }
    });
});
