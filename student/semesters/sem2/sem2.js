// sem2.js – Semester 2 Landing Page

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();
    checkAuthState();
    loadRecentMaterials();
    loadUpcomingTests();
});

// ---------- Authentication ----------
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../../auth/login-student.html';
            return;
        }
        currentUser = user;
        try {
            await loadUserData(user.uid);
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('Error loading user:', error);
        }
    });
}

async function loadUserData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const data = userDoc.data();
        document.getElementById('userName').textContent = data.fullName || 'Student';
    } else {
        document.getElementById('userName').textContent = 'Student';
    }
}

// ---------- Load Recent Materials (Semester 2) ----------
async function loadRecentMaterials() {
    try {
        const snapshot = await db.collection('materials')
            .where('semester', '==', 2)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();

        const container = document.getElementById('recentMaterials');
        if (snapshot.empty) {
            container.innerHTML = `<div class="empty-state">No materials yet.</div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const m = doc.data();
            html += `
                <div class="recent-item">
                    <h4>${m.title || 'Untitled'}</h4>
                    <p>${m.description ? m.description.substring(0, 80) + '…' : 'No description'}</p>
                    <div class="meta">
                        <span><i class="fas fa-calendar-alt"></i> ${formatDate(m.createdAt)}</span>
                        <span><i class="fas fa-file-pdf"></i> PDF</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading materials:', error);
        document.getElementById('recentMaterials').innerHTML = `<div class="empty-state">Failed to load materials.</div>`;
    }
}

// ---------- Load Upcoming Tests (Semester 2) ----------
async function loadUpcomingTests() {
    try {
        const snapshot = await db.collection('tests')
            .where('semester', '==', 2)
            .where('status', '==', 'upcoming')
            .orderBy('scheduledDate', 'asc')
            .limit(3)
            .get();

        const container = document.getElementById('upcomingTests');
        if (snapshot.empty) {
            container.innerHTML = `<div class="empty-state">No upcoming tests.</div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const t = doc.data();
            const date = t.scheduledDate ? formatDate(t.scheduledDate) : 'TBA';
            html += `
                <div class="recent-item">
                    <h4>${t.title || 'Test'}</h4>
                    <p>${t.subject || 'General'} • ${t.duration || 60} mins</p>
                    <div class="meta">
                        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                        <span><i class="fas fa-question-circle"></i> ${t.questions || 0} questions</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading tests:', error);
        document.getElementById('upcomingTests').innerHTML = `<div class="empty-state">Failed to load tests.</div>`;
    }
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
    } catch (e) { console.warn('Failed to update lastActive:', e); }
}

// ---------- Time & Greeting ----------
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

// ---------- Logout ----------
window.logoutUser = async function() {
    await updateLastActive();
    try {
        await auth.signOut();
        window.location.href = '../../../auth/login-student.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
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