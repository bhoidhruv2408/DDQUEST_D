// syllabus.js – Semester 5 Syllabus (filtered by branch)

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = () => {
            if (firebase.apps.length) {
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

// Global variables
let auth, db, currentUser = null, studentData = null, allSyllabus = [];

// DOM elements
const syllabusGrid = document.getElementById('syllabusGrid');
const viewModal = document.getElementById('viewModal');
const viewFrame = document.getElementById('viewFrame');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewDirectLink = document.getElementById('viewDirectLink');
const iframeLoader = document.getElementById('iframeLoader');
const viewReloadBtn = document.getElementById('viewReloadBtn');
const branchFilter = document.getElementById('branchFilter');
const subjectFilter = document.getElementById('subjectFilter');
const currentBranchSpan = document.getElementById('currentBranch');

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

// Convert any Drive link to preview format
function toPreviewLink(url) {
    if (!url) return '';
    const fileId = extractFileId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
}

// Parse topics from description (if stored as JSON or plain text)
function parseTopics(description) {
    if (!description) return [];
    try {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        // Not JSON, treat as plain text
        return description.split('\n').filter(line => line.trim());
    }
    return [];
}

// DOM Ready
document.addEventListener('DOMContentLoaded', async function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();

    const fb = await waitForFirebase();
    auth = fb.auth;
    db = fb.db;
    checkAuthState();
});

// Authentication
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

// Load student data
async function loadStudentData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        studentData = userDoc.data();
        console.log('✅ Student data loaded:', studentData);
        document.getElementById('userName').textContent = studentData.fullName || 'Student';
        currentBranchSpan.textContent = studentData.branch || 'All Branches';
    } else {
        document.getElementById('userName').textContent = 'Student';
        currentBranchSpan.textContent = 'All Branches';
    }
}

// Load syllabus (only materials with category "Syllabus" or type "syllabus")
async function loadSyllabus() {
    if (!studentData) return;
    
    syllabusGrid.innerHTML = '<div class="loader"></div>';
    console.log('📥 Fetching syllabus materials...');

    try {
        const snapshot = await db.collection('materials')
            .orderBy('createdAt', 'desc')
            .get();

        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📊 Total materials: ${all.length}`);

        // Filter by semester 5 and category "Syllabus"
        const filtered = all.filter(m => {
            const sem = m.semester;
            const category = (m.category || '').toLowerCase();
            const isSem5 = sem == 5;
            const isSyllabus = category === 'syllabus' || category === 'syllabi';
            
            if (!isSem5) console.log(`🚫 Not semester 5: "${m.title}" (semester: ${sem})`);
            if (!isSyllabus) console.log(`🚫 Not syllabus category: "${m.title}" (category: ${m.category})`);
            
            return isSem5 && isSyllabus;
        });

        console.log(`📌 After semester+category filter: ${filtered.length} syllabus materials`);

        // Populate subject filter
        const subjects = [...new Set(filtered.map(m => m.subject).filter(Boolean))];
        subjectFilter.innerHTML = '<option value="">All Subjects</option>' + 
            subjects.map(s => `<option value="${s}">${s}</option>`).join('');

        allSyllabus = filtered;
        renderSyllabus(filtered);

        if (filtered.length === 0) {
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>No syllabus found</h3>
                    <p>Check back later for semester 5 syllabus materials.</p>
                </div>
            `;
        }

    } catch (error) {
        console.error('❌ Error loading syllabus:', error);
        if (error.code === 'failed-precondition') {
            const match = error.message.match(/https:[^\s]+/);
            const indexUrl = match ? match[0] : '#';
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>Index required</h3>
                    <p>Click <a href="${indexUrl}" target="_blank">here</a> to create the missing index, then refresh.</p>
                </div>
            `;
        } else {
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load syllabus</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

// Render syllabus cards
function renderSyllabus(materials) {
    let html = '';
    materials.forEach(m => {
        const date = m.createdAt ? formatDate(m.createdAt) : 'Recently';
        const topics = parseTopics(m.description || '');
        const subject = m.subject || 'General';
        const branch = m.branch || 'All Branches';
        
        html += `
            <div class="syllabus-card" data-id="${m.id}" data-branch="${branch}" data-subject="${subject}">
                <div class="syllabus-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <h3 class="syllabus-title">${m.title || 'Untitled Syllabus'}</h3>
                <p class="syllabus-description">${m.description ? (topics.length ? '' : m.description.substring(0, 100) + '...') : 'No description available.'}</p>
                
                <div class="syllabus-meta">
                    <span><i class="fas fa-book"></i> ${subject}</span>
                    <span><i class="fas fa-code-branch"></i> ${branch}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>

                ${topics.length > 0 ? `
                <div class="syllabus-topics">
                    <h4>📌 Key Topics</h4>
                    <ul class="topic-list">
                        ${topics.slice(0, 5).map(t => `<li>${t}</li>`).join('')}
                        ${topics.length > 5 ? '<li>...</li>' : ''}
                    </ul>
                </div>
                ` : ''}

                <div class="syllabus-actions">
                    <button class="btn-view" onclick="viewSyllabus('${m.id}')">
                        <i class="fas fa-eye"></i> View Syllabus
                    </button>
                    <button class="btn-download" onclick="downloadSyllabus('${m.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    });
    syllabusGrid.innerHTML = html;
}

// Filter function
function filterSyllabus() {
    const branch = branchFilter.value;
    const subject = subjectFilter.value;
    
    const filtered = allSyllabus.filter(m => {
        const matchBranch = !branch || (m.branch || '') === branch;
        const matchSubject = !subject || (m.subject || '') === subject;
        return matchBranch && matchSubject;
    });
    
    renderSyllabus(filtered);
    
    if (filtered.length === 0) {
        syllabusGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>No matching syllabus</h3>
                <p>Try adjusting your filters.</p>
            </div>
        `;
    }
}

branchFilter.addEventListener('change', filterSyllabus);
subjectFilter.addEventListener('change', filterSyllabus);

// View syllabus (modal)
function viewSyllabus(id) {
    const material = allSyllabus.find(m => m.id === id);
    if (!material || !material.link) {
        showToast('No link available', 'warning');
        return;
    }
    const embedUrl = material.link.includes('/preview') ? material.link : toPreviewLink(material.link);
    
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    viewFrame.src = embedUrl;
    viewModalTitle.innerHTML = `<i class="fas fa-eye"></i> ${material.title || 'View Syllabus'}`;
    viewDirectLink.href = material.link.includes('/preview') ? material.link.replace('/preview', '/view?usp=sharing') : material.link;
    
    viewModal.style.display = 'flex';
}
window.viewSyllabus = viewSyllabus;

// Download syllabus (trigger download)
function downloadSyllabus(id) {
    const material = allSyllabus.find(m => m.id === id);
    if (!material || !material.link) {
        showToast('No link available', 'warning');
        return;
    }
    
    // If it's a Google Drive link, open in new tab
    if (material.link.includes('drive.google.com')) {
        window.open(material.link, '_blank');
    } else {
        // For direct links, trigger download
        const a = document.createElement('a');
        a.href = material.link;
        a.download = material.title || 'syllabus.pdf';
        a.click();
    }
}
window.downloadSyllabus = downloadSyllabus;

// Hide loader when iframe loads
viewFrame.addEventListener('load', () => {
    iframeLoader.classList.add('hidden');
    viewFrame.classList.add('loaded');
});

// Reload button
viewReloadBtn.addEventListener('click', () => {
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    const temp = viewFrame.src;
    viewFrame.src = '';
    setTimeout(() => { viewFrame.src = temp; }, 50);
});

// Close modal
function closeViewModal() {
    viewModal.style.display = 'none';
    viewFrame.src = 'about:blank';
}
window.closeViewModal = closeViewModal;

// Close on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewModal.style.display === 'flex') {
        closeViewModal();
    }
});

// ========== ONLINE STATUS ==========
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
    } catch (e) { console.warn('Failed to update lastActive:', e); }
}

// ========== TIME & GREETING ==========
function updateTimeDisplay() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function updateGreeting() {
    const hour = new Date().getHours();
    let greet = 'Good ';
    if (hour < 12) greet += 'Morning';
    else if (hour < 18) greet += 'Afternoon';
    else greet += 'Evening';
    document.getElementById('greeting').textContent = greet;
}

// ========== LOGOUT ==========
window.logoutUser = async function() {
    await updateLastActive();
    try {
        await auth.signOut();
        window.location.href = '../../../auth/login-student.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// ========== 3D SPACE PARTICLES ==========
function initSpaceParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, particles = [], count = 80;

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
            this.color = `rgba(0, 224, 255, ${Math.random() * 0.5 + 0.2})`;
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

// ========== HELPER ==========
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}