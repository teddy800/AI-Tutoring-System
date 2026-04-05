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
