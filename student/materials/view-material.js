// view-material.js – Student Material Viewer (by ID)

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let materialId = null;

// Get ID from URL
const urlParams = new URLSearchParams(window.location.search);
materialId = urlParams.get('id');

// DOM elements
const materialTitleEl = document.getElementById('materialTitle');
const viewFrame = document.getElementById('viewFrame');
const iframeLoader = document.getElementById('iframeLoader');
const directLink = document.getElementById('directLink');
const reloadBtn = document.getElementById('reloadBtn');

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

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', function() {
    initSpaceParticles();
    updateGreeting();
    checkAuthState();
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
            if (materialId) {
                await loadMaterial(materialId);
            } else {
                showToast('No material ID provided', 'error');
                materialTitleEl.textContent = 'No material specified';
            }
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('Error:', error);
            showToast('Failed to load material.', 'error');
        }
    });
}

async function loadUserData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        document.getElementById('userName').textContent = userDoc.data().fullName || 'Student';
    } else {
        document.getElementById('userName').textContent = 'Student';
    }
}

async function loadMaterial(id) {
    try {
        const doc = await db.collection('materials').doc(id).get();
        if (!doc.exists) {
            showToast('Material not found', 'error');
            materialTitleEl.textContent = 'Material not found';
            return;
        }

        const material = doc.data();
        materialTitleEl.textContent = material.title || 'Untitled';

        let embedUrl = material.link || '';
        if (!embedUrl) {
            showToast('No link available', 'warning');
            return;
        }

        // Ensure it's a preview link
        embedUrl = embedUrl.includes('/preview') ? embedUrl : toPreviewLink(embedUrl);
        directLink.href = material.link.includes('/preview') ? material.link.replace('/preview', '/view?usp=sharing') : material.link;

        // Load iframe
        iframeLoader.classList.remove('hidden');
        viewFrame.classList.remove('loaded');
        viewFrame.src = embedUrl;

    } catch (error) {
        console.error('Error loading material:', error);
        showToast('Failed to load material', 'error');
    }
}

// Iframe load event
viewFrame.addEventListener('load', () => {
    iframeLoader.classList.add('hidden');
    viewFrame.classList.add('loaded');
});

// Reload button
reloadBtn.addEventListener('click', () => {
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    const temp = viewFrame.src;
    viewFrame.src = '';
    setTimeout(() => { viewFrame.src = temp; }, 50);
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
        await db.collection('users').doc(currentUser.uid).update({
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) { console.warn('Failed to update lastActive:', e); }
}

// ---------- Logout ----------
window.logoutUser = async function() {
    await updateLastActive();
    try {
        await auth.signOut();
        window.location.href = '../../auth/login-student.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// ---------- Greeting ----------
function updateGreeting() {
    const hour = new Date().getHours();
    let greet = 'Good ';
    if (hour < 12) greet += 'Morning';
    else if (hour < 18) greet += 'Afternoon';
    else greet += 'Evening';
    document.getElementById('greeting').textContent = greet;
}

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