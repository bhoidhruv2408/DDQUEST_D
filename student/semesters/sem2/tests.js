// tests.js – Semester 2 Tests with branch filtering and debugging

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let studentData = null;
let allTests = [];

const testsGrid = document.getElementById('testsGrid');

function showToast(message, type = 'info', title = '', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i></div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

document.addEventListener('DOMContentLoaded', function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();
    checkAuthState();
});

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../../auth/login-student.html';
            return;
        }
        currentUser = user;
        console.log('✅ User authenticated:', user.uid);
        try {
            await loadStudentData(user.uid);
            await loadTests();
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showToast('Failed to load tests.', 'error');
        }
    });
}

async function loadStudentData(uid) {
    console.log('📥 Loading student data...');
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        studentData = userDoc.data();
        console.log('✅ Student data loaded:', studentData);
        document.getElementById('userName').textContent = studentData.fullName || 'Student';
    } else {
        console.warn('⚠️ No user document found');
        document.getElementById('userName').textContent = 'Student';
    }
}

async function loadTests() {
    if (!studentData) {
        console.log('⏳ Waiting for student data...');
        return;
    }

    testsGrid.innerHTML = '<div class="loader"></div>';
    console.log('📥 Fetching tests for semester 2...');

    try {
        const snapshot = await db.collection('tests')
            .where('semester', '==', 2)
            .orderBy('createdAt', 'desc')
            .get();

        console.log(`📊 Query returned ${snapshot.size} test documents.`);
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentBranch = (studentData.branch || '').trim().toLowerCase();
        console.log(`🎓 Student branch: "${studentBranch}"`);

        // Filter by branch: include if test has no branch OR branch matches
        const filtered = all.filter(t => {
            const testBranch = (t.branch || '').trim().toLowerCase();
            const include = !t.branch || testBranch === studentBranch;
            if (!include) {
                console.log(`🚫 Excluding test "${t.title}" (branch: "${testBranch}") – branch mismatch`);
            }
            return include;
        });

        console.log(`✅ After branch filter: ${filtered.length} tests remain.`);
        allTests = filtered;

        if (filtered.length === 0) {
            testsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tests found</h3>
                    <p>Check back later for semester 2 tests.</p>
                </div>
            `;
            return;
        }

        renderTests(filtered);

    } catch (error) {
        console.error('❌ Error loading tests:', error);
        if (error.code === 'failed-precondition') {
            const match = error.message.match(/https:[^\s]+/);
            const indexUrl = match ? match[0] : '#';
            testsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>Index required</h3>
                    <p>Click <a href="${indexUrl}" target="_blank">here</a> to create the missing index, then refresh.</p>
                </div>
            `;
        } else {
            testsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load tests</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

function renderTests(tests) {
    let html = '';
    tests.forEach(test => {
        const date = test.createdAt ? formatDate(test.createdAt) : 'Recently';
        const questions = test.questions ? test.questions.length : (test.questionCount || 0);
        const duration = test.duration || 60;
        html += `
            <div class="test-card" data-id="${test.id}">
                <div class="test-icon"><i class="fas fa-clipboard-list"></i></div>
                <h3 class="test-title">${test.title || 'Untitled Test'}</h3>
                <p class="test-description">${test.description || 'No description available.'}</p>
                <div class="test-meta">
                    <span><i class="fas fa-clock"></i> ${duration} mins</span>
                    <span><i class="fas fa-question-circle"></i> ${questions} questions</span>
                </div>
                <a href="../../tests/take-test.html?id=${test.id}" class="test-link">
                    <i class="fas fa-play"></i> Take Test
                </a>
            </div>
        `;
    });
    testsGrid.innerHTML = html;
}

// ---------- Online status ----------
let lastActiveInterval;
function startOnlineStatusUpdater() {
    if (lastActiveInterval) clearInterval(lastActiveInterval);
    lastActiveInterval = setInterval(updateLastActive, 120000);
    window.addEventListener('beforeunload', updateLastActive);
}
async function updateLastActive() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).update({ lastActive: firebase.firestore.FieldValue.serverTimestamp() });
        console.log('🕒 lastActive updated');
    } catch (e) { console.warn(e); }
}

// ---------- Time & greeting ----------
function updateTimeDisplay() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function updateGreeting() {
    const h = new Date().getHours();
    let g = 'Good ';
    if (h < 12) g += 'Morning';
    else if (h < 18) g += 'Afternoon';
    else g += 'Evening';
    document.getElementById('greeting').textContent = g;
}
window.logoutUser = async function() {
    await updateLastActive();
    try {
        await auth.signOut();
        window.location.href = '../../../auth/login-student.html';
    } catch (error) { console.error('Logout error:', error); }
};

// ---------- 3D space particles ----------
function initSpaceParticles() {
    const canvas = document.getElementById('spaceCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], count = 150;
    function resize() { w = window.innerWidth; h = window.innerHeight; canvas.width = w; canvas.height = h; }
    window.addEventListener('resize', resize); resize();
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
            if (this.z <= 0) { this.z = 1000; this.x = Math.random() * w; this.y = Math.random() * h; }
        }
        draw() {
            const scale = 800 / (this.z + 100);
            const x = (this.x - w / 2) * scale + w / 2;
            const y = (this.y - h / 2) * scale + h / 2;
            const s = this.size * scale;
            ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill();
        }
    }
    for (let i = 0; i < count; i++) particles.push(new Particle());
    function animate() { ctx.clearRect(0, 0, w, h); particles.forEach(p => { p.update(); p.draw(); }); requestAnimationFrame(animate); }
    animate();
}

// ---------- Helper ----------
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}