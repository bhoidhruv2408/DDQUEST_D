// materials.js – Semester 2 Materials with strict filtering by semester and branch

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let studentData = null;
let allMaterials = [];

// DOM elements
const materialsGrid = document.getElementById('materialsGrid');
const viewModal = document.getElementById('viewModal');
const viewFrame = document.getElementById('viewFrame');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewDirectLink = document.getElementById('viewDirectLink');
const iframeLoader = document.getElementById('iframeLoader');
const viewReloadBtn = document.getElementById('viewReloadBtn');

// Toast helper
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

// Helper to extract Google Drive file ID
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

document.addEventListener('DOMContentLoaded', function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();
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
            await loadMaterials();
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('❌ Error loading data:', error);
            showToast('Failed to load materials.', 'error');
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

// ---------- Load Materials with strict semester and branch filtering ----------
async function loadMaterials() {
    if (!studentData) {
        console.log('⏳ Waiting for student data...');
        return;
    }

    materialsGrid.innerHTML = '<div class="loader"></div>';
    console.log('📥 Fetching all materials (will filter for semester 2)...');

    try {
        const snapshot = await db.collection('materials')
            .orderBy('createdAt', 'desc')
            .get();

        console.log(`📊 Raw query returned ${snapshot.size} documents.`);

        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentBranch = (studentData.branch || '').trim().toLowerCase();
        console.log(`🎓 Student branch: "${studentBranch}"`);

        // Filter by semester 2 – strict equality, handle both number and string
        const filteredBySemester = all.filter(m => {
            const sem = m.semester;
            // Allow both number 2 and string "2"
            const isSem2 = sem == 2; // loose equality
            if (!isSem2) {
                console.log(`🚫 Excluding material "${m.title}" (semester: ${sem}) – not semester 2`);
            }
            return isSem2;
        });

        console.log(`📌 After semester filter: ${filteredBySemester.length} materials remain.`);

        // Filter by branch: include if material has no branch OR branch matches (case‑insensitive)
        const filtered = filteredBySemester.filter(m => {
            const materialBranch = (m.branch || '').trim().toLowerCase();
            const include = !m.branch || materialBranch === studentBranch;
            if (!include) {
                console.log(`🚫 Excluding material "${m.title}" (branch: "${materialBranch}") – branch mismatch`);
            }
            return include;
        });

        console.log(`✅ After branch filter: ${filtered.length} materials remain.`);
        allMaterials = filtered; // store for viewModal

        if (filtered.length === 0) {
            materialsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-books"></i>
                    <h3>No materials found</h3>
                    <p>Check back later for semester 2 study materials.</p>
                </div>
            `;
            return;
        }

        renderMaterials(filtered);

    } catch (error) {
        console.error('❌ Error loading materials:', error);
        if (error.code === 'failed-precondition') {
            const match = error.message.match(/https:[^\s]+/);
            const indexUrl = match ? match[0] : '#';
            materialsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>Index required</h3>
                    <p>Click <a href="${indexUrl}" target="_blank">here</a> to create the missing index, then refresh.</p>
                </div>
            `;
        } else {
            materialsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load materials</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

function renderMaterials(materials) {
    let html = '';
    materials.forEach(m => {
        const date = m.createdAt ? formatDate(m.createdAt) : 'Recently';
        const icon = 'file-alt';
        const category = m.category || 'General';
        const tags = m.tags ? m.tags.join(', ') : '';

        html += `
            <div class="material-card" data-id="${m.id}">
                <div class="material-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <h3 class="material-title">${m.title || 'Untitled'}</h3>
                <p class="material-description">${m.description || 'No description available.'}</p>
                <div class="material-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    <span><i class="fas fa-tag"></i> ${category}</span>
                </div>
                ${tags ? `<div style="margin-bottom: 12px; color: var(--gray);"><i class="fas fa-hashtag"></i> ${tags}</div>` : ''}
                <button class="material-link" onclick="viewMaterial('${m.id}')">
                    <i class="fas fa-eye"></i> View / Download
                </button>
            </div>
        `;
    });
    materialsGrid.innerHTML = html;
}

// ---------- View modal functions ----------
function viewMaterial(id) {
    const material = allMaterials.find(m => m.id === id);
    if (!material || !material.link) {
        showToast('No link available', 'warning');
        return;
    }
    const embedUrl = material.link.includes('/preview') ? material.link : toPreviewLink(material.link);
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    viewFrame.src = embedUrl;
    viewModalTitle.innerHTML = `<i class="fas fa-eye"></i> ${material.title || 'View Material'}`;
    viewDirectLink.href = material.link.includes('/preview') ? material.link.replace('/preview', '/view?usp=sharing') : material.link;
    viewModal.style.display = 'flex';
}
window.viewMaterial = viewMaterial;

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