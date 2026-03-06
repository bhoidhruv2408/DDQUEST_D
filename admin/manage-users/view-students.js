// view-students.js – 3D Space Student Management with Live Status & Progress Link

const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    databaseURL: "https://ddquest-614ea-default-rtdb.firebaseio.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e",
    measurementId: "G-1CRQVW0WF9"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allStudents = [];
let filteredStudents = [];

const studentGrid = document.getElementById('studentGrid');
const searchInput = document.getElementById('searchInput');
const branchFilter = document.getElementById('branchFilter');
const semesterFilter = document.getElementById('semesterFilter');
const statusFilter = document.getElementById('statusFilter');
const studentCountSpan = document.getElementById('studentCount');

// ---------- 3D Space Canvas ----------
const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 100;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.z = Math.random() * 1000;
        this.speed = Math.random() * 2 + 0.5;
        this.size = Math.random() * 2 + 0.5;
        this.color = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`;
    }
    update() {
        this.z -= this.speed;
        if (this.z <= 0) {
            this.z = 1000;
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
        }
    }
    draw() {
        const scale = 1000 / (this.z + 1);
        const x = (this.x - canvas.width/2) * scale + canvas.width/2;
        const y = (this.y - canvas.height/2) * scale + canvas.height/2;
        const size = this.size * scale;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI*2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

function initParticles() {
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    requestAnimationFrame(animateParticles);
}
initParticles();
animateParticles();

// ---------- Authentication & Admin Check ----------
auth.onAuthStateChanged(user => {
    if (!user) {
        window.location.href = '../../auth/login-admin.html';
    } else {
        checkAdminRole(user.uid);
        loadStudents();
    }
});

async function checkAdminRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data.role !== 'admin' && data.role !== 'super_admin') {
                alert('Access denied. Admin only.');
                window.location.href = '../../auth/login-admin.html';
            }
        } else {
            window.location.href = '../../auth/login-admin.html';
        }
    } catch (error) {
        console.error('Role check error:', error);
    }
}

// ---------- Load Students (real-time) ----------
function loadStudents() {
    db.collection('users')
        .where('role', '==', 'student')
        .onSnapshot(snapshot => {
            allStudents = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                allStudents.push({
                    id: doc.id,
                    name: data.fullName || data.name || 'N/A',
                    email: data.email || '',
                    branch: data.branch || data.department || 'N/A',
                    semester: data.semester || 'N/A',
                    phone: data.phone || '—',
                    registeredAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                    lastActive: data.lastActive ? data.lastActive.toDate() : null,
                    photoURL: data.photoURL || null
                });
            });
            applyFilters();
        }, error => {
            studentGrid.innerHTML = `<div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load students</h3>
                <p>${error.message}</p>
            </div>`;
        });
}

// ---------- Online Status Logic ----------
function getOnlineStatus(lastActive) {
    if (!lastActive) return 'offline';
    const now = Date.now();
    const diff = now - lastActive.getTime();
    if (diff < 5 * 60 * 1000) return 'online';
    if (diff < 30 * 60 * 1000) return 'away';
    return 'offline';
}

function timeAgo(date) {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day ago`;
    return date.toLocaleDateString();
}

// ---------- Apply Filters ----------
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const branch = branchFilter.value;
    const semester = semesterFilter.value;
    const status = statusFilter.value;

    filteredStudents = allStudents.filter(student => {
        if (searchTerm && !(student.name.toLowerCase().includes(searchTerm) || student.email.toLowerCase().includes(searchTerm))) return false;
        if (branch && student.branch !== branch) return false;
        if (semester && student.semester !== semester) return false;
        if (status) {
            const onlineStatus = getOnlineStatus(student.lastActive);
            if (status !== onlineStatus) return false;
        }
        return true;
    });

    renderStudents();
    studentCountSpan.textContent = filteredStudents.length;
}

// ---------- Render Cards ----------
function renderStudents() {
    if (filteredStudents.length === 0) {
        studentGrid.innerHTML = `<div class="empty-state">
            <i class="fas fa-user-slash"></i>
            <h3>No students found</h3>
            <p>Try adjusting your filters</p>
        </div>`;
        return;
    }

    let html = '';
    filteredStudents.forEach((student, index) => {
        const onlineStatus = getOnlineStatus(student.lastActive);
        const statusClass = onlineStatus;
        const lastActiveStr = timeAgo(student.lastActive);
        const registeredStr = timeAgo(student.registeredAt);
        const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        html += `
            <div class="student-card" data-id="${student.id}" style="animation: fadeInUp 0.5s ease ${index * 0.05}s both;">
                <div class="card-header">
                    <div class="avatar">
                        ${student.photoURL ? `<img src="${student.photoURL}" style="width:100%; height:100%; object-fit:cover;">` : initials}
                    </div>
                    <div class="name-email">
                        <h3>${student.name}</h3>
                        <p><i class="fas fa-envelope"></i> ${student.email}</p>
                    </div>
                    <div class="online-status ${statusClass}" title="${onlineStatus}"></div>
                </div>
                <div class="card-details">
                    <div class="detail-item">
                        <i class="fas fa-code-branch"></i>
                        <span>Branch</span>
                        <strong>${student.branch}</strong>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-graduation-cap"></i>
                        <span>Semester</span>
                        <strong>${student.semester}</strong>
                    </div>
                </div>
                <div class="last-active">
                    <i class="fas fa-clock"></i>
                    <span>Last active: ${lastActiveStr}</span>
                </div>
                <div class="last-active" style="margin-top: 8px;">
                    <i class="fas fa-calendar-check"></i>
                    <span>Registered: ${registeredStr}</span>
                </div>
                <div class="card-footer">
                    <a href="student-progress.html?id=${student.id}" class="btn-icon view" title="View Progress">
                        <i class="fas fa-chart-line"></i>
                    </a>
                </div>
            </div>
        `;
    });

    studentGrid.innerHTML = html;
}

// ---------- Event Listeners ----------
searchInput.addEventListener('input', applyFilters);
branchFilter.addEventListener('change', applyFilters);
semesterFilter.addEventListener('change', applyFilters);
statusFilter.addEventListener('change', applyFilters);

// ---------- Add Animation Keyframes ----------
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);