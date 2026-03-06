// student-progress.js – Enhanced Admin Student Progress Viewer

let auth, db;

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

// Get student ID from URL
const urlParams = new URLSearchParams(window.location.search);
const studentId = urlParams.get('id');

const profileContainer = document.getElementById('profileContainer');
const statsContainer = document.getElementById('statsContainer');
const attemptsContainer = document.getElementById('attemptsContainer');
const loadingEl = document.getElementById('loading');

// ---------- 3D Space Canvas (unchanged) ----------
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

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', async function() {
    await waitForFirebase();          // Wait for Firebase ready
    checkAuthState();
});

// ---------- Authentication & Admin Check ----------
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../auth/login-admin.html';
            return;
        }
        try {
            await checkAdminRole(user.uid);
            if (!studentId) {
                showError('No student ID provided. Please add ?id=STUDENT_ID to the URL.');
            } else {
                loadStudentData(studentId);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            showError('Authentication failed. Please log in again.');
        }
    });
}

async function checkAdminRole(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        window.location.href = '../../auth/login-admin.html';
        return;
    }
    const data = userDoc.data();
    if (data.role !== 'admin' && data.role !== 'super_admin') {
        alert('Access denied. Admin only.');
        window.location.href = '../../auth/login-admin.html';
    }
}

// ---------- Load Student Data ----------
async function loadStudentData(studentId) {
    try {
        // Fetch student document
        const studentDoc = await db.collection('users').doc(studentId).get();
        if (!studentDoc.exists) {
            showError('Student not found. The ID may be invalid.');
            return;
        }

        const studentData = studentDoc.data();
        const student = {
            id: studentId,
            name: studentData.fullName || studentData.name || 'N/A',
            email: studentData.email || '',
            branch: studentData.branch || studentData.department || 'N/A',
            semester: studentData.semester || 'N/A',
            photoURL: studentData.photoURL || null,
            registeredAt: studentData.createdAt ? studentData.createdAt.toDate() : new Date(),
            lastActive: studentData.lastActive ? studentData.lastActive.toDate() : null
        };

        // Fetch test attempts – try both 'studentId' and 'userId' fields
        let attemptsSnapshot;
        try {
            attemptsSnapshot = await db.collection('testAttempts')
                .where('studentId', '==', studentId)
                .orderBy('completedAt', 'desc')
                .get();
        } catch (e) {
            // Fallback to 'userId'
            attemptsSnapshot = await db.collection('testAttempts')
                .where('userId', '==', studentId)
                .orderBy('completedAt', 'desc')
                .get();
        }

        const attempts = [];
        attemptsSnapshot.forEach(doc => {
            const data = doc.data();
            attempts.push({
                id: doc.id,
                testId: data.testId,
                score: data.score || 0,
                totalMarks: data.totalMarks || 100,
                completedAt: data.completedAt ? data.completedAt.toDate() : new Date(),
                testName: data.testName || 'Unknown Test'
            });
        });

        // Compute stats
        const totalTests = attempts.length;
        let avgScore = 0;
        let highestScore = 0;
        let lastScore = 0;

        if (totalTests > 0) {
            const sum = attempts.reduce((acc, cur) => acc + (cur.score / cur.totalMarks) * 100, 0);
            avgScore = sum / totalTests;
            highestScore = Math.max(...attempts.map(a => (a.score / a.totalMarks) * 100));
            lastScore = attempts[0] ? (attempts[0].score / attempts[0].totalMarks) * 100 : 0;
        }

        // Render
        renderProfile(student);
        renderStats(totalTests, avgScore, highestScore, lastScore);
        renderAttempts(attempts);

        loadingEl.style.display = 'none';

    } catch (error) {
        console.error('Error loading student data:', error);
        showError('Failed to load data: ' + error.message);
    }
}

// ---------- Render Profile ----------
function renderProfile(student) {
    const initials = student.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const avatarHtml = student.photoURL
        ? `<img src="${student.photoURL}" alt="${student.name}">`
        : initials;

    profileContainer.innerHTML = `
        <div class="profile-card" style="animation: fadeInUp 0.5s ease;">
            <div class="avatar-large">
                ${avatarHtml}
            </div>
            <div class="profile-info">
                <h2>${student.name}</h2>
                <p><i class="fas fa-envelope"></i> ${student.email}</p>
                <p><i class="fas fa-code-branch"></i> ${student.branch}</p>
                <p><i class="fas fa-graduation-cap"></i> Semester ${student.semester}</p>
                <p><i class="fas fa-calendar-alt"></i> Registered: ${timeAgo(student.registeredAt)}</p>
            </div>
        </div>
    `;
}

// ---------- Render Stats Cards ----------
function renderStats(totalTests, avgScore, highestScore, lastScore) {
    statsContainer.innerHTML = `
        <div class="stat-card" style="animation: fadeInUp 0.5s ease 0.1s both;">
            <div class="stat-value">${totalTests}</div>
            <div class="stat-label">Tests Taken</div>
        </div>
        <div class="stat-card" style="animation: fadeInUp 0.5s ease 0.15s both;">
            <div class="stat-value">${avgScore.toFixed(1)}%</div>
            <div class="stat-label">Average Score</div>
        </div>
        <div class="stat-card" style="animation: fadeInUp 0.5s ease 0.2s both;">
            <div class="stat-value">${highestScore.toFixed(1)}%</div>
            <div class="stat-label">Highest Score</div>
        </div>
        <div class="stat-card" style="animation: fadeInUp 0.5s ease 0.25s both;">
            <div class="stat-value">${lastScore.toFixed(1)}%</div>
            <div class="stat-label">Last Test</div>
        </div>
    `;
}

// ---------- Render Attempts ----------
function renderAttempts(attempts) {
    if (attempts.length === 0) {
        attemptsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>No test attempts yet</h3>
                <p>This student hasn't taken any tests.</p>
            </div>
        `;
        return;
    }

    let html = '';
    attempts.forEach((attempt, index) => {
        const percent = (attempt.score / attempt.totalMarks) * 100;
        const dateStr = attempt.completedAt.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        html += `
            <div class="attempt-card" style="animation: fadeInUp 0.5s ease ${0.3 + index * 0.1}s both;">
                <div class="attempt-header">
                    <div class="attempt-title">${attempt.testName}</div>
                    <div class="attempt-date"><i class="fas fa-calendar-alt"></i> ${dateStr}</div>
                </div>
                <div class="attempt-score">
                    <div class="score-badge">${percent.toFixed(1)}%</div>
                    <div class="score-progress">
                        <div class="progress-label">
                            <span>Score</span>
                            <span>${attempt.score}/${attempt.totalMarks}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    attemptsContainer.innerHTML = html;
}

// ---------- Utility: timeAgo ----------
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

// ---------- Show Error ----------
function showError(msg) {
    loadingEl.style.display = 'none';
    profileContainer.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>${msg}</h3></div>`;
}

// ---------- Add Animation Keyframes ----------
const style = document.createElement('style');
style.innerHTML = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);