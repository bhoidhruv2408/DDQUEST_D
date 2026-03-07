// tests.js – Semester 6 Tests (waits for Firebase)

let auth, db, currentUser = null, studentData = null, allTests = [];

// Wait for Firebase to be initialized
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (firebase.apps.length) {
                auth = firebase.auth();
                db = firebase.firestore();
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

const testsGrid = document.getElementById('testsGrid');

// ---------- Toast ----------
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

// ---------- Google Drive helpers (for possible future use) ----------
function extractFileId(url) {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}
function toPreviewLink(url) {
    if (!url) return '';
    const fileId = extractFileId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
}

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', async function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();

    await waitForFirebase();          // Wait for Firebase ready
    checkAuthState();
});

// ---------- Authentication ----------
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

// ---------- Load Tests (semester 6) ----------
async function loadTests() {
    if (!studentData) {
        console.log('⏳ Waiting for student data...');
        return;
    }

    testsGrid.innerHTML = '<div class="loader"></div>';
    console.log('📥 Fetching all tests (will filter for semester 6)...');

    try {
        const snapshot = await db.collection('tests')
            .orderBy('createdAt', 'desc')
            .get();

        console.log(`📊 Raw query returned ${snapshot.size} documents.`);

        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentBranch = (studentData.branch || '').trim().toLowerCase();
        console.log(`🎓 Student branch: "${studentBranch}"`);

        // Filter by semester 6 (loose equality)
        const filteredBySemester = all.filter(t => {
            const sem = t.semester;
            const isSem6 = sem == 6;
            if (!isSem6) {
                console.log(`🚫 Excluding test "${t.title}" (semester: ${sem}) – not semester 6`);
            }
            return isSem6;
        });

        console.log(`📌 After semester filter: ${filteredBySemester.length} tests remain.`);

        // Filter by branch: include if test has no branch OR branch matches
        const filtered = filteredBySemester.filter(t => {
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
                    <p>Check back later for semester 6 tests.</p>
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
    tests.forEach(t => {
        const date = t.createdAt ? formatDate(t.createdAt) : 'Recently';
        const questions = t.questions ? t.questions.length : (t.questionCount || 0);
        const duration = t.duration || 60;

        html += `
            <div class="test-card" data-id="${t.id}">
                <div class="test-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h3 class="test-title">${t.title || 'Untitled Test'}</h3>
                <p class="test-description">${t.description || 'No description available.'}</p>
                <div class="test-meta">
                    <span><i class="fas fa-clock"></i> ${duration} mins</span>
                    <span><i class="fas fa-question-circle"></i> ${questions} questions</span>
                </div>
                <a href="../../tests/take-test.html?id=${t.id}" class="test-link">
                    <i class="fas fa-play"></i> Take Test
                </a>
            </div>
        `;
    });
    testsGrid.innerHTML = html;
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
        await db.collection('users').doc(currentUser.uid).update({ lastActive: firebase.firestore.FieldValue.serverTimestamp() });
        console.log('🕒 lastActive updated');
    } catch (e) { console.warn(e); }
}

// ---------- Time & Greeting ----------
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

// ---------- 3D Space Particles ----------
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

// ---------- Helper ----------
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}