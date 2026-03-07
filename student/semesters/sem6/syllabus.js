// syllabus.js – Semester 6 Syllabus (adapted from Semester 5)

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (window.firebase && firebase.apps.length) {
                resolve({
                    auth: firebase.auth(),
                    db: firebase.firestore()
                });
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

let auth, db, currentUser = null, studentData = null, syllabusItems = [];

const syllabusGrid = document.getElementById('syllabusGrid');
const viewModal = document.getElementById('viewModal');
const viewFrame = document.getElementById('viewFrame');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewDirectLink = document.getElementById('viewDirectLink');
const iframeLoader = document.getElementById('iframeLoader');
const viewReloadBtn = document.getElementById('viewReloadBtn');

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

// ---------- Google Drive helpers ----------
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
    console.log("🚀 Syllabus page loading...");
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();

    const fb = await waitForFirebase();
    auth = fb.auth;
    db = fb.db;
    console.log("✅ Firebase ready");
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
            await loadSyllabus();
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showToast('Failed to load syllabus.', 'error');
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

// ---------- Load Syllabus (semester 6) ----------
async function loadSyllabus() {
    if (!studentData) {
        console.log('⏳ Waiting for student data...');
        setTimeout(loadSyllabus, 200);
        return;
    }

    syllabusGrid.innerHTML = '<div class="loader"></div>';
    console.log('📥 Fetching syllabus materials for semester 6...');

    try {
        // Query: category == 'Syllabus', order by createdAt
        const snapshot = await db.collection('materials')
            .where('category', '==', 'Syllabus')
            .orderBy('createdAt', 'desc')
            .get();

        console.log(`📊 Raw query returned ${snapshot.size} syllabus documents.`);

        if (snapshot.empty) {
            syllabusGrid.innerHTML = `<div class="empty-state"><i class="fas fa-file-alt"></i><h3>No syllabus found</h3><p>No syllabus documents exist in the database.</p></div>`;
            return;
        }

        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentBranch = (studentData.branch || '').trim().toLowerCase();
        console.log(`🎓 Student branch: "${studentBranch}"`);

        // Filter by semester 6
        const filteredBySemester = all.filter(m => {
            const sem = m.semester;
            return sem == 6;
        });

        console.log(`📌 After semester 6 filter: ${filteredBySemester.length} syllabus items remain.`);

        // Filter by branch
        const filtered = filteredBySemester.filter(m => {
            const materialBranch = (m.branch || '').trim().toLowerCase();
            return !m.branch || materialBranch === studentBranch;
        });

        console.log(`✅ After branch filter: ${filtered.length} syllabus items remain.`);
        syllabusItems = filtered;

        if (filtered.length === 0) {
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No syllabus for semester 6</h3>
                    <p>Check back later or contact your admin.</p>
                </div>
            `;
            return;
        }

        renderSyllabus(filtered);

    } catch (error) {
        console.error('❌ Error loading syllabus:', error);
        if (error.code === 'failed-precondition') {
            const match = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
            const indexUrl = match ? match[0] : '#';
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>Index required</h3>
                    <p>Click <a href="${indexUrl}" target="_blank">here</a> to create the missing index, then refresh.</p>
                </div>
            `;
        } else {
            syllabusGrid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Failed to load syllabus</h3><p>${error.message}</p></div>`;
        }
    }
}

function renderSyllabus(items) {
    let html = '';
    items.forEach(item => {
        const date = item.createdAt ? formatDate(item.createdAt) : 'Recently';
        html += `
            <div class="syllabus-card" data-id="${item.id}">
                <div class="syllabus-icon"><i class="fas fa-file-pdf"></i></div>
                <h3 class="syllabus-title">${item.title || 'Syllabus'}</h3>
                <p class="syllabus-description">${item.description || 'Semester 6 syllabus document.'}</p>
                <div class="syllabus-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    <span><i class="fas fa-tag"></i> ${item.category || 'Syllabus'}</span>
                </div>
                <button class="syllabus-link" onclick="viewSyllabus('${item.id}')">
                    <i class="fas fa-eye"></i> View Syllabus
                </button>
            </div>
        `;
    });
    syllabusGrid.innerHTML = html;
}

// ---------- View Modal ----------
function viewSyllabus(id) {
    const item = syllabusItems.find(i => i.id === id);
    if (!item || !item.link) {
        showToast('No link available', 'warning');
        return;
    }
    const embedUrl = item.link.includes('/preview') ? item.link : toPreviewLink(item.link);
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    viewFrame.src = embedUrl;
    viewModalTitle.innerHTML = `<i class="fas fa-eye"></i> ${item.title || 'Syllabus'}`;
    viewDirectLink.href = item.link.includes('/preview') ? item.link.replace('/preview', '/view?usp=sharing') : item.link;
    viewModal.style.display = 'flex';
}
window.viewSyllabus = viewSyllabus;

viewFrame.addEventListener('load', () => {
    iframeLoader.classList.add('hidden');
    viewFrame.classList.add('loaded');
});

viewReloadBtn.addEventListener('click', () => {
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    const temp = viewFrame.src;
    viewFrame.src = '';
    setTimeout(() => { viewFrame.src = temp; }, 50);
});

function closeViewModal() {
    viewModal.style.display = 'none';
    viewFrame.src = 'about:blank';
}
window.closeViewModal = closeViewModal;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewModal.style.display === 'flex') closeViewModal();
});

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
    const canvas = document.getElementById('spaceCanvas'); // matches HTML canvas id
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