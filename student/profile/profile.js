// profile.js – Student Profile with 3D space theme and Firestore integration

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let userData = null;
let isEditing = false;

// DOM Elements
const userNameSpan = document.getElementById('userName');
const fullNameInput = document.getElementById('fullName');
const emailInput = document.getElementById('email');
const collegeInput = document.getElementById('college');
const semesterSelect = document.getElementById('semester');
const branchInput = document.getElementById('branch');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const editToggleBtn = document.getElementById('editToggleBtn');
const formActions = document.getElementById('formActions');
const cancelBtn = document.getElementById('cancelBtn');
const profileForm = document.getElementById('profileForm');

// Initialize
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
            window.location.href = '../../auth/login-student.html';
            return;
        }
        currentUser = user;
        try {
            await loadUserData(user.uid);
            await updateLastActive(); // update online status
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('Error loading user data:', error);
            alert('Failed to load profile. Please refresh.');
        }
    });
}

// ---------- Load User Data ----------
async function loadUserData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        userData = userDoc.data();
        if (userData.role !== 'student') {
            handleNonStudentUser(userData.role);
            return;
        }
        // Ensure all fields exist
        userData = {
            fullName: userData.fullName || 'Student',
            email: userData.email || currentUser.email,
            college: userData.college || 'Not specified',
            semester: userData.semester || 1,
            branch: userData.branch || 'Computer Engineering',
            phone: userData.phone || '',
            address: userData.address || '',
            ...userData
        };
        // Update UI
        userNameSpan.textContent = userData.fullName;
        fullNameInput.value = userData.fullName;
        emailInput.value = userData.email;
        collegeInput.value = userData.college;
        semesterSelect.value = userData.semester;
        branchInput.value = userData.branch;
        phoneInput.value = userData.phone || '';
        addressInput.value = userData.address || '';
    } else {
        // Create default document
        await createUserDocument(uid);
    }
}

// ---------- Create Default Document ----------
async function createUserDocument(uid) {
    const user = currentUser;
    const defaultData = {
        uid,
        email: user.email,
        fullName: user.displayName || user.email.split('@')[0].replace(/\b\w/g, l => l.toUpperCase()),
        college: 'Not specified',
        semester: 1,
        branch: 'Computer Engineering',
        phone: '',
        address: '',
        role: 'student',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(uid).set(defaultData);
    userData = defaultData;
    userNameSpan.textContent = defaultData.fullName;
    fullNameInput.value = defaultData.fullName;
    emailInput.value = defaultData.email;
    collegeInput.value = defaultData.college;
    semesterSelect.value = defaultData.semester;
    branchInput.value = defaultData.branch;
    phoneInput.value = '';
    addressInput.value = '';
}

// ---------- Edit Mode Toggle ----------
editToggleBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    const inputs = [fullNameInput, collegeInput, semesterSelect, branchInput, phoneInput, addressInput];
    inputs.forEach(input => input.disabled = !isEditing);
    formActions.style.display = isEditing ? 'flex' : 'none';
    editToggleBtn.innerHTML = isEditing ? '<i class="fas fa-times"></i> Cancel' : '<i class="fas fa-pen"></i> Edit';
});

cancelBtn.addEventListener('click', () => {
    // Revert to original data
    fullNameInput.value = userData.fullName;
    collegeInput.value = userData.college;
    semesterSelect.value = userData.semester;
    branchInput.value = userData.branch;
    phoneInput.value = userData.phone || '';
    addressInput.value = userData.address || '';
    // Exit edit mode
    isEditing = true; // toggle will set to false
    editToggleBtn.click(); // simulate click to toggle off
});

// ---------- Save Changes ----------
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedData = {
        fullName: fullNameInput.value.trim(),
        college: collegeInput.value.trim(),
        semester: parseInt(semesterSelect.value),
        branch: branchInput.value.trim(),
        phone: phoneInput.value.trim(),
        address: addressInput.value.trim(),
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).update(updatedData);
        // Update local object
        userData = { ...userData, ...updatedData };
        userNameSpan.textContent = updatedData.fullName;
        // Exit edit mode
        isEditing = true;
        editToggleBtn.click();
        showToast('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile. Try again.', 'error');
    }
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

// ---------- Non-student Redirect ----------
function handleNonStudentUser(role) {
    alert(`Logged in as ${role}. Redirecting...`);
    if (role === 'admin') window.location.href = '../../admin/dashboard/index.html';
    else if (role === 'teacher') window.location.href = '../../teacher/dashboard/index.html';
    else window.location.href = '../../auth/login-student.html';
}

// ---------- Time & Greeting ----------
function updateTimeDisplay() {
    const now = new Date();
    // Not needed on profile, but we can display if you add elements; optional.
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
        window.location.href = '../../auth/login-student.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
};

// ---------- 3D Space Particles (Canvas) ----------
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

// ---------- Toast ----------
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span class="toast-message">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}