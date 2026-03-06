// dashboard.js – Student Dashboard with 3D space, live data, and online status

const auth = firebase.auth();
const db = firebase.firestore();

db.enablePersistence().catch(err => console.warn('Persistence error:', err));

let currentUser = null;
let userData = null;

document.addEventListener('DOMContentLoaded', function() {
    initLoadingAnimation();
    checkAuthState();
    initEventListeners();
    initAnimations();
    updateTimeDisplay();
    updateGreeting();
    startOnlineStatusUpdater();
    initSpaceParticles();
});

// ---------- Authentication ----------
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../auth/login-student.html';
            return;
        }
        currentUser = user;
        try {
            await loadUserData(user.uid);
            await loadDashboardData();
            await updateLastLogin(user.uid);
            await updateLastActive();
            hideLoadingOverlay();
        } catch (error) {
            console.error('Initialization error:', error);
            showToast('Error loading your data. Please refresh.', 'error');
        }
    });
}

async function loadUserData(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
        userData = userDoc.data();
        if (userData.role !== 'student') {
            handleNonStudentUser(userData.role);
            return;
        }
        // Ensure fullName exists
        if (!userData.fullName) {
            const displayName = currentUser.displayName;
            const emailName = currentUser.email ? currentUser.email.split('@')[0] : 'Student';
            const newName = (displayName || emailName).replace(/\b\w/g, l => l.toUpperCase());
            userData.fullName = newName;
            await db.collection('users').doc(userId).update({ fullName: newName });
        }
        localStorage.setItem('userData', JSON.stringify(userData));
        updateUserUI(userData);
    } else {
        await createUserDocument(userId);
    }
}

async function createUserDocument(userId) {
    const user = auth.currentUser;
    let name = user.displayName;
    if (!name) {
        name = user.email ? user.email.split('@')[0] : 'Student';
        name = name.replace(/\b\w/g, l => l.toUpperCase());
    }
    const basicUserData = {
        uid: userId,
        email: user.email,
        fullName: name,
        role: 'student',
        college: 'Not specified',
        semester: 1,
        branch: 'Computer Engineering',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        stats: { testsCompleted: 0, averageScore: 0, totalScore: 0, studyHours: 0, materialsViewed: 0, streak: 0 },
        progress: { overall: 25, tests: 0, materials: 0 }
    };
    await db.collection('users').doc(userId).set(basicUserData);
    userData = basicUserData;
    updateUserUI(basicUserData);
    localStorage.setItem('userData', JSON.stringify(basicUserData));
}

function updateUserUI(data) {
    document.getElementById('userName').textContent = data.fullName || 'Student';
    document.getElementById('userEmail').textContent = data.email || '—';
    document.getElementById('userCollege').textContent = data.college || '—';
    document.getElementById('userSemester').textContent = data.semester ? `Semester ${data.semester}` : '—';
    document.getElementById('userBranch').textContent = data.branch || '—';
    highlightCurrentSemester(data.semester);
    toggleDDCETOption(data.semester);
    const materialsLink = document.getElementById('materialsLink');
    if (materialsLink && data.semester) {
        materialsLink.href = `../semesters/sem${data.semester}/index.html`;
    }
}

// ---------- Dashboard Data ----------
async function loadDashboardData() {
    if (!userData) return;
    updateStatCards(userData.stats);
    await loadUpcomingTests();
    await loadRecommendedMaterials();
    await loadRecentActivity();
    updateProgressRings();
}

function updateStatCards(stats) {
    stats = stats || { testsCompleted: 0, averageScore: 0, studyHours: 0, materialsViewed: 0 };
    animateNumber('testsCompleted', stats.testsCompleted || 0);
    animateNumber('averageScore', stats.averageScore || 0);
    animateNumber('studyHours', stats.studyHours || 0);
    animateNumber('materialsViewed', stats.materialsViewed || 0);
}

function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const inc = Math.ceil(target / 50) || 1;
    const timer = setInterval(() => {
        current += inc;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = current;
        }
    }, 20);
}

async function loadUpcomingTests() {
    try {
        const snap = await db.collection('tests')
            .where('semester', '==', userData.semester)
            .where('status', '==', 'upcoming')
            .limit(3)
            .get();
        const tests = [];
        snap.forEach(doc => tests.push({ id: doc.id, ...doc.data() }));
        const container = document.getElementById('upcomingTests');
        if (tests.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming tests</p></div>`;
        } else {
            let html = '';
            tests.forEach(t => {
                const date = t.scheduledDate ? formatDate(t.scheduledDate) : 'TBA';
                html += `
                <div class="test-item">
                    <i class="fas fa-clipboard-list"></i>
                    <div class="test-info">
                        <h4>${t.title || 'Test'}</h4>
                        <p>${t.subject || 'General'} • ${t.duration || 60} mins</p>
                        <span class="test-date">${date}</span>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('upcomingTests').innerHTML = `<div class="empty-state"><p>Unable to load tests</p></div>`;
    }
}

async function loadRecommendedMaterials() {
    try {
        const snap = await db.collection('materials')
            .where('semester', '==', userData.semester)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        const materials = [];
        snap.forEach(doc => materials.push({ id: doc.id, ...doc.data() }));
        const container = document.getElementById('recommendedMaterials');
        if (materials.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><p>No materials yet</p></div>`;
        } else {
            let html = '';
            materials.forEach(m => {
                html += `
                <div class="material-item">
                    <i class="fas fa-file-alt"></i>
                    <div class="material-info">
                        <h4>${m.title || 'Material'}</h4>
                        <p>${m.description ? m.description.substring(0, 60) + '...' : 'No description'}</p>
                        <a href="../../admin/manage-content/viewer.html?id=${m.id}" target="_blank" class="btn-view-material">View</a>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (e) {
        console.error(e);
        document.getElementById('recommendedMaterials').innerHTML = `<div class="empty-state"><p>Unable to load materials</p></div>`;
    }
}

async function loadRecentActivity() {
    try {
        const snap = await db.collection('activity')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        const activities = [];
        snap.forEach(doc => activities.push(doc.data()));
        const container = document.getElementById('recentActivity');
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="activity-item"><i class="fas fa-sign-in-alt"></i><div><h4>Logged in</h4><p>Welcome back</p><span>Just now</span></div></div>
                <div class="activity-item"><i class="fas fa-user-edit"></i><div><h4>Profile loaded</h4><p>Dashboard ready</p><span>Now</span></div></div>
            `;
        } else {
            let html = '';
            activities.forEach(a => {
                const icon = getActivityIcon(a.type);
                const time = a.timestamp ? formatTimeAgo(a.timestamp) : '';
                html += `
                <div class="activity-item">
                    <i class="fas fa-${icon}"></i>
                    <div>
                        <h4>${a.title || 'Activity'}</h4>
                        <p>${a.description || ''}</p>
                        <span class="activity-time">${time}</span>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (e) {
        console.error(e);
    }
}

function updateProgressRings() {
    const prog = userData?.progress || { overall: 25, tests: 0 };
    document.getElementById('dailyGoal').textContent = prog.overall + '%';
    document.getElementById('courseProgress').textContent = (prog.overall || 0) + '%';
    document.getElementById('testReadiness').textContent = (prog.tests || 0) + '%';
    const rings = document.querySelectorAll('.progress-ring-fill');
    rings.forEach((r, i) => {
        let val = i === 0 ? prog.overall : i === 1 ? prog.overall : prog.tests || 65;
        const rad = r.r.baseVal.value;
        const circ = rad * 2 * Math.PI;
        r.style.strokeDasharray = `${circ} ${circ}`;
        r.style.strokeDashoffset = circ - (val / 100) * circ;
    });
}

// ---------- Semester Helpers ----------
function toggleDDCETOption(sem) {
    const el = document.getElementById('ddcetLink');
    if (el) el.style.display = (sem >= 6) ? 'block' : 'none';
}

function highlightCurrentSemester(sem) {
    document.querySelectorAll('#semesterLinks .access-card').forEach(c => {
        if (c.querySelector('h3')?.textContent.includes(`Semester ${sem}`)) {
            c.classList.add('current-semester');
        } else {
            c.classList.remove('current-semester');
        }
    });
}

// ---------- Online Status ----------
let lastActiveInterval;
function startOnlineStatusUpdater() {
    if (lastActiveInterval) clearInterval(lastActiveInterval);
    lastActiveInterval = setInterval(updateLastActive, 120000);
    window.addEventListener('beforeunload', updateLastActive);
}

async function updateLastActive() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn(e); }
}

async function updateLastLogin(uid) {
    try {
        await db.collection('users').doc(uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn(e); }
}

// ---------- Event Listeners ----------
function initEventListeners() {
    document.querySelector('.logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());
}

async function handleLogout() {
    await updateLastActive();
    try {
        await auth.signOut();
        localStorage.clear();
        showToast('Logged out', 'success');
        setTimeout(() => window.location.href = '../../auth/login-student.html', 1500);
    } catch (e) { showToast('Logout failed', 'error'); }
}
window.logoutUser = handleLogout;

function handleNonStudentUser(role) {
    showToast(`Logged in as ${role}. Redirecting...`, 'warning');
    setTimeout(() => {
        if (role === 'admin') window.location.href = '../../admin/dashboard/index.html';
        else if (role === 'teacher') window.location.href = '../../teacher/dashboard/index.html';
        else handleLogout();
    }, 2000);
}

// ---------- Time & Greeting ----------
function updateTimeDisplay() {
    const upd = () => {
        const n = new Date();
        document.getElementById('currentTime').textContent = n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('currentDate').textContent = n.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    upd(); setInterval(upd, 60000);
}

function updateGreeting() {
    const h = new Date().getHours();
    let g = 'Good ';
    if (h < 12) g += 'Morning';
    else if (h < 18) g += 'Afternoon';
    else g += 'Evening';
    document.getElementById('greeting').textContent = g;
}

// ---------- Loading & Animations ----------
function initLoadingAnimation() {
    const o = document.createElement('div');
    o.className = 'loading-overlay';
    o.innerHTML = `<div class="loader"></div><p>Loading Dashboard...</p>`;
    document.body.appendChild(o);
    setTimeout(hideLoadingOverlay, 3000);
}
function hideLoadingOverlay() {
    document.querySelector('.loading-overlay')?.remove();
}

function initAnimations() {
    document.querySelectorAll('.info-card, .access-card, .stat-card').forEach((el, i) => {
        el.style.opacity = 0;
        setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease';
            el.style.opacity = 1;
        }, i * 100);
    });
}

// ---------- 3D Space Particles (Canvas) ----------
function initSpaceParticles() {
    const canvas = document.getElementById('spaceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], count = 150;

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = w;
        canvas.height = h;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.z = Math.random() * 1000;
            this.speed = Math.random() * 3 + 0.5;
            this.size = Math.random() * 2 + 0.5;
            this.color = `rgba(76, 201, 240, ${Math.random() * 0.5 + 0.2})`;
        }
        update() {
            this.z -= this.speed;
            if (this.z <= 0) {
                this.z = 1000;
                this.x = Math.random() * w;
                this.y = Math.random() * h;
            }
        }
        draw() {
            const scale = 800 / (this.z + 100);
            const x = (this.x - w / 2) * scale + w / 2;
            const y = (this.y - h / 2) * scale + h / 2;
            const s = this.size * scale;
            ctx.beginPath();
            ctx.arc(x, y, s, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }

    for (let i = 0; i < count; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    animate();
}

// ---------- Toast ----------
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i><span class="toast-message">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ---------- Helpers ----------
function formatDate(ts) {
    if (!ts) return 'TBA';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeAgo(ts) {
    if (!ts) return 'Just now';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const sec = Math.floor((Date.now() - d) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return Math.floor(sec / 60) + ' min ago';
    if (sec < 86400) return Math.floor(sec / 3600) + ' hr ago';
    return Math.floor(sec / 86400) + ' day ago';
}

function getActivityIcon(t) {
    const icons = {
        test_completed: 'check-circle',
        material_viewed: 'book-open',
        login: 'sign-in-alt',
        profile_update: 'user-edit',
        test_started: 'play-circle'
    };
    return icons[t] || 'circle';
}