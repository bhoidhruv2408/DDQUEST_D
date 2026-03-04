// dashboard.js - Student Dashboard (Firebase compat version)

// ============================================
// Global Variables
// ============================================
let currentUser = null;
let userData = null;

// ============================================
// Firebase Initialization (already done by HTML)
// ============================================
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (optional)
db.enablePersistence().catch(err => console.warn('Persistence error:', err));

// ============================================
// DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log("📊 DDQuest Dashboard Initializing...");

    initLoadingAnimation();
    checkAuthState();
    initEventListeners();
    initAnimations();
    updateTimeDisplay();
    updateGreeting();
});

// ============================================
// Authentication State
// ============================================
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../auth/login-student.html';
            return;
        }
        currentUser = user;
        console.log("👤 User authenticated:", user.uid);

        try {
            await loadUserData(user.uid);
            await loadDashboardData();
            await updateLastLogin(user.uid);
            hideLoadingOverlay();
        } catch (error) {
            console.error("❌ Error during initialization:", error);
            showToast("Error loading your data. Please refresh.", "error");
        }
    });
}

// ============================================
// Load User Data from Firestore
// ============================================
async function loadUserData(userId) {
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
            userData = userDoc.data();
            console.log("✅ User data loaded:", userData);

            if (userData.role !== 'student') {
                handleNonStudentUser(userData.role);
                return;
            }

            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userId', userId);
            localStorage.setItem('userRole', userData.role);

            updateUserUI(userData);
        } else {
            await createUserDocument(userId);
        }
    } catch (error) {
        console.error("❌ Error loading user data:", error);
        showToast("Error loading profile. Using cached data.", "warning");
        const stored = localStorage.getItem('userData');
        if (stored) {
            userData = JSON.parse(stored);
            updateUserUI(userData);
        }
    }
}

// Create a basic user document if not exists
async function createUserDocument(userId) {
    const user = auth.currentUser;
    const basicUserData = {
        uid: userId,
        email: user.email,
        fullName: user.displayName || user.email.split('@')[0] || 'Student',
        role: 'student',
        college: 'Not specified',
        semester: 1,
        branch: 'Computer Engineering',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        stats: {
            testsCompleted: 0,
            averageScore: 0,
            totalScore: 0,
            studyHours: 0,
            materialsViewed: 0,
            streak: 0
        },
        progress: {
            overall: 25,
            tests: 0,
            materials: 0
        }
    };
    await db.collection("users").doc(userId).set(basicUserData);
    userData = basicUserData;
    updateUserUI(basicUserData);
    localStorage.setItem('userData', JSON.stringify(basicUserData));
    console.log("✅ Created new user document");
}

// ============================================
// Update UI with User Data
// ============================================
function updateUserUI(data) {
    document.getElementById('userName').textContent = data.fullName || 'Student';
    document.getElementById('userEmail').textContent = data.email || '—';
    document.getElementById('userCollege').textContent = data.college || '—';
    document.getElementById('userSemester').textContent = data.semester ? `Semester ${data.semester}` : '—';
    document.getElementById('userBranch').textContent = data.branch || '—';

    highlightCurrentSemester(data.semester);
    toggleDDCETOption(data.semester);
}

// ============================================
// Load Dashboard Data (Tests, Materials, Activity, Stats)
// ============================================
async function loadDashboardData() {
    if (!userData) return;

    updateStatCards(userData.stats);
    await loadUpcomingTests();
    await loadRecommendedMaterials();
    await loadRecentActivity();
    updateProgressRings();
}

// Update statistics cards with animation
function updateStatCards(stats) {
    if (!stats) stats = { testsCompleted: 0, averageScore: 0, studyHours: 0, materialsViewed: 0 };
    animateNumber('testsCompleted', stats.testsCompleted || 0);
    animateNumber('averageScore', stats.averageScore || 0);
    animateNumber('studyHours', stats.studyHours || 0);
    animateNumber('materialsViewed', stats.materialsViewed || 0);
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    let current = 0;
    const increment = target / 50 || 0;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(current);
        }
    }, 20);
}

// Upcoming tests
async function loadUpcomingTests() {
    try {
        const testsRef = db.collection("tests");
        const snapshot = await testsRef
            .where("semester", "==", userData.semester)
            .where("status", "==", "upcoming")
            .limit(3)
            .get();

        const tests = [];
        snapshot.forEach(doc => tests.push({ id: doc.id, ...doc.data() }));

        const container = document.getElementById('upcomingTests');
        if (tests.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>No upcoming tests</p></div>`;
        } else {
            let html = '';
            tests.forEach(t => {
                const date = t.scheduledDate ? formatDate(t.scheduledDate) : 'TBA';
                html += `
                <div class="test-item">
                    <i class="fas fa-clipboard-list"></i>
                    <div class="test-info">
                        <h4>${t.title || 'Test'}</h4>
                        <p>${t.subject || 'General'} • ${t.duration || 60} mins</p>
                        <span class="test-date">${date}</span>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (error) {
        console.error("Error loading tests:", error);
        document.getElementById('upcomingTests').innerHTML = `<div class="empty-state"><p>Unable to load tests</p></div>`;
    }
}

// Recommended materials
async function loadRecommendedMaterials() {
    try {
        const materialsRef = db.collection("materials");
        const snapshot = await materialsRef
            .where("semester", "==", userData.semester)
            .where("status", "==", "published")
            .limit(3)
            .get();

        const materials = [];
        snapshot.forEach(doc => materials.push({ id: doc.id, ...doc.data() }));

        const container = document.getElementById('recommendedMaterials');
        if (materials.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-book"></i><p>No materials yet</p></div>`;
        } else {
            let html = '';
            materials.forEach(m => {
                const icon = m.type === 'video' ? 'video' : m.type === 'pdf' ? 'file-pdf' : 'file-alt';
                html += `
                <div class="material-item">
                    <i class="fas fa-${icon}"></i>
                    <div class="material-info">
                        <h4>${m.title || 'Material'}</h4>
                        <p>${m.subject || 'General'}</p>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (error) {
        console.error("Error loading materials:", error);
        document.getElementById('recommendedMaterials').innerHTML = `<div class="empty-state"><p>Unable to load materials</p></div>`;
    }
}

// Recent activity
async function loadRecentActivity() {
    try {
        const activityRef = db.collection("activity");
        const snapshot = await activityRef
            .where("userId", "==", currentUser.uid)
            .orderBy("timestamp", "desc")
            .limit(5)
            .get();

        const activities = [];
        snapshot.forEach(doc => activities.push(doc.data()));

        const container = document.getElementById('recentActivity');
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="activity-item"><i class="fas fa-sign-in-alt"></i><div><h4>Logged in</h4><p>Welcome back</p><span>Just now</span></div></div>
                <div class="activity-item"><i class="fas fa-user-edit"></i><div><h4>Profile loaded</h4><p>Dashboard ready</p><span>Now</span></div></div>
            `;
        } else {
            let html = '';
            activities.forEach(a => {
                const icon = getActivityIcon(a.type);
                const time = a.timestamp ? formatTimeAgo(a.timestamp) : '';
                html += `
                <div class="activity-item">
                    <i class="fas fa-${icon}"></i>
                    <div>
                        <h4>${a.title || 'Activity'}</h4>
                        <p>${a.description || ''}</p>
                        <span>${time}</span>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }
    } catch (error) {
        console.error("Error loading activity:", error);
        document.getElementById('recentActivity').innerHTML = `
            <div class="activity-item"><i class="fas fa-sign-in-alt"></i><div><h4>Logged in</h4><p>Welcome back</p><span>Just now</span></div></div>`;
    }
}

// Update progress rings
function updateProgressRings() {
    const progress = userData?.progress || { overall: 25, tests: 0, materials: 0 };
    document.getElementById('dailyGoal').textContent = progress.overall + '%';
    
    const rings = document.querySelectorAll('.progress-ring-fill');
    rings.forEach(ring => {
        const value = parseInt(ring.dataset.value) || 0;
        const radius = ring.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = circumference - (value / 100) * circumference;
    });
}

// ============================================
// Semester & DDCET visibility
// ============================================
function toggleDDCETOption(semester) {
    const ddcetCard = document.getElementById('ddcetLink');
    if (ddcetCard) {
        ddcetCard.style.display = (semester >= 6) ? 'block' : 'none';
    }
}

function highlightCurrentSemester(semester) {
    document.querySelectorAll('#semesterLinks .access-card').forEach(card => {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent.includes(`Semester ${semester}`)) {
            card.style.border = '2px solid #4361ee';
            card.style.boxShadow = '0 10px 25px rgba(67, 97, 238, 0.2)';
        }
    });
}

// ============================================
// Update last login timestamp
// ============================================
async function updateLastLogin(userId) {
    try {
        await db.collection("users").doc(userId).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.warn("Could not update last login:", error);
    }
}

// ============================================
// Event Listeners
// ============================================
function initEventListeners() {
    document.querySelector('.logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('refreshBtn')?.addEventListener('click', () => location.reload());

    // Semester cards – ensure they link correctly
    document.querySelectorAll('.access-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const href = card.getAttribute('href');
            if (!href || href === '#' || href.includes('javascript')) {
                e.preventDefault();
                showToast('Feature coming soon!', 'info');
            }
        });
    });
}

// ============================================
// Logout
// ============================================
async function handleLogout() {
    try {
        await auth.signOut();
        localStorage.clear();
        showToast('Logged out', 'success');
        setTimeout(() => window.location.href = '../../auth/login-student.html', 1500);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}
window.logoutUser = handleLogout; // for HTML button

// ============================================
// Non-student user redirect
// ============================================
function handleNonStudentUser(role) {
    showToast(`Logged in as ${role}. Redirecting...`, 'warning');
    setTimeout(() => {
        if (role === 'admin') window.location.href = '../../admin/dashboard/index.html';
        else if (role === 'teacher') window.location.href = '../../teacher/dashboard/index.html';
        else handleLogout();
    }, 2000);
}

// ============================================
// Time & Greeting
// ============================================
function updateTimeDisplay() {
    const update = () => {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };
    update();
    setInterval(update, 60000);
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greet = 'Good ';
    if (hour < 12) greet += 'Morning';
    else if (hour < 18) greet += 'Afternoon';
    else greet += 'Evening';
    document.getElementById('greeting').textContent = greet;
}

// ============================================
// Loading animation
// ============================================
function initLoadingAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `<div class="loader"></div><p>Loading Dashboard...</p>`;
    document.body.appendChild(overlay);
    setTimeout(hideLoadingOverlay, 3000);
}
function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
}

function initAnimations() {
    document.querySelectorAll('.info-card, .access-card, .stat-card').forEach((el, i) => {
        el.style.animation = `fadeInUp 0.6s ease ${i*0.1}s forwards`;
        el.style.opacity = 0;
    });
}

// ============================================
// Toast notification
// ============================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':type==='error'?'exclamation-circle':type==='warning'?'exclamation-triangle':'info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ============================================
// Helper functions
// ============================================
function formatDate(timestamp) {
    if (!timestamp) return 'TBA';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - d) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hour' + (hrs > 1 ? 's' : '') + ' ago';
    const days = Math.floor(hrs / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}
function getActivityIcon(type) {
    const icons = {
        test_completed: 'check-circle',
        material_viewed: 'book-open',
        login: 'sign-in-alt',
        profile_update: 'user-edit',
        test_started: 'play-circle',
        default: 'circle'
    };
    return icons[type] || icons.default;
}