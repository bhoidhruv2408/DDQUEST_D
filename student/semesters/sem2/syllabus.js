// syllabus.js – Semester 2 Syllabus

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let studentData = null;
let syllabusItems = [];

const syllabusGrid = document.getElementById('syllabusGrid');
const viewModal = document.getElementById('viewModal');
const viewFrame = document.getElementById('viewFrame');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewDirectLink = document.getElementById('viewDirectLink');
const iframeLoader = document.getElementById('iframeLoader');
const viewReloadBtn = document.getElementById('viewReloadBtn');

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

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../../auth/login-student.html';
            return;
        }
        currentUser = user;
        try {
            await loadStudentData(user.uid);
            await loadSyllabus();
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load syllabus.', 'error');
        }
    });
}

async function loadStudentData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        studentData = userDoc.data();
        document.getElementById('userName').textContent = studentData.fullName || 'Student';
    } else {
        document.getElementById('userName').textContent = 'Student';
    }
}

async function loadSyllabus() {
    if (!studentData) return;
    syllabusGrid.innerHTML = '<div class="loader"></div>';
    try {
        const snapshot = await db.collection('materials')
            .where('semester', '==', 2)
            .where('category', '==', 'Syllabus')
            .orderBy('createdAt', 'desc')
            .get();
        syllabusItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (syllabusItems.length === 0) {
            syllabusGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No syllabus found</h3>
                    <p>Check back later for semester 2 syllabus.</p>
                </div>
            `;
            return;
        }
        renderSyllabus(syllabusItems);
    } catch (error) {
        console.error('Error loading syllabus:', error);
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
                <p class="syllabus-description">${item.description || 'Semester 2 syllabus document.'}</p>
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
    } catch (e) { console.warn(e); }
}
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

function initSpaceParticles() { /* same as before */ }

function formatDate(ts) {
    if (!ts) return 'N/A';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}