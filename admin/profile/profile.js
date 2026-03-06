// profile.js – Admin Profile Page (Full Working Version)

const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let userData = null;

// DOM elements
const toastContainer = document.getElementById('toastContainer');
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
const avatarPreview = document.getElementById('avatarPreview');
const avatarIcon = document.getElementById('avatarIcon');
const avatarImage = document.getElementById('avatarImage');
const avatarUploadBtn = document.getElementById('avatarUploadBtn');
const avatarInput = document.getElementById('avatarInput');
const displayName = document.getElementById('displayName');
const displayRole = document.getElementById('displayRole');
const displayEmail = document.getElementById('displayEmail');
const fullName = document.getElementById('fullName');
const email = document.getElementById('email');
const role = document.getElementById('role');
const college = document.getElementById('college');
const branch = document.getElementById('branch');
const phone = document.getElementById('phone');
const address = document.getElementById('address');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const resetProfileBtn = document.getElementById('resetProfileBtn');
const profileForm = document.getElementById('profileForm');
const passwordForm = document.getElementById('passwordForm');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const refreshActivity = document.getElementById('refreshActivity');
const activityLog = document.getElementById('activityLog');
const statUploads = document.getElementById('statUploads');
const statEdits = document.getElementById('statEdits');
const statStudents = document.getElementById('statStudents');
const memberSince = document.getElementById('memberSince');

// Toast helper
function showToast(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// Theme toggle
const savedTheme = localStorage.getItem('ddq_theme') || 'dark';
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
        themeLabel.textContent = 'Light';
    } else {
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark</span>';
        themeLabel.textContent = 'Dark';
    }
    localStorage.setItem('ddq_theme', theme);
}
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
});

// Auth state
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../../auth/login-admin.html';
        return;
    }
    currentUser = user;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || !['admin', 'super_admin'].includes(userDoc.data().role)) {
            showToast('Admin access required', 'error');
            setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
            return;
        }
        userData = userDoc.data();
        loadProfile();
        loadActivity();
        loadStats();
    } catch (error) {
        console.error('Auth error:', error);
        showToast('Error loading profile', 'error');
    }
});

// Load profile data
function loadProfile() {
    if (!userData) return;
    displayName.textContent = userData.fullName || 'Admin';
    displayRole.textContent = userData.role === 'super_admin' ? 'Super Admin' : 'Administrator';
    displayEmail.textContent = userData.email || currentUser.email;

    fullName.value = userData.fullName || '';
    email.value = userData.email || currentUser.email;
    role.value = userData.role || 'admin';
    college.value = userData.college || '';
    branch.value = userData.branch || '';
    phone.value = userData.phone || '';
    address.value = userData.address || '';

    if (userData.photoURL) {
        avatarImage.src = userData.photoURL;
        avatarImage.style.display = 'block';
        avatarIcon.style.display = 'none';
    } else {
        avatarIcon.style.display = 'block';
        avatarImage.style.display = 'none';
    }
}

// Update profile
profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveProfileBtn.disabled = true;
    saveProfileBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const updatedData = {
        fullName: fullName.value,
        college: college.value,
        branch: branch.value,
        phone: phone.value,
        address: address.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).update(updatedData);
        userData = { ...userData, ...updatedData };
        displayName.textContent = fullName.value;
        showToast('Profile updated successfully', 'success');
    } catch (error) {
        console.error('Update error:', error);
        showToast('Update failed: ' + error.message, 'error');
    } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
    }
});

// Reset form
resetProfileBtn.addEventListener('click', () => {
    fullName.value = userData.fullName || '';
    college.value = userData.college || '';
    branch.value = userData.branch || '';
    phone.value = userData.phone || '';
    address.value = userData.address || '';
});

// Change password
passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (newPass !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
    }
    if (newPass.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    changePasswordBtn.disabled = true;
    changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        const user = auth.currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, current);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPass);
        showToast('Password updated successfully', 'success');
        passwordForm.reset();
    } catch (error) {
        console.error('Password error:', error);
        if (error.code === 'auth/wrong-password') {
            showToast('Current password is incorrect', 'error');
        } else {
            showToast('Password update failed: ' + error.message, 'error');
        }
    } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Password';
    }
});

// Avatar upload
avatarUploadBtn.addEventListener('click', () => avatarInput.click());
avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('Image must be less than 2MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        avatarImage.src = event.target.result;
        avatarImage.style.display = 'block';
        avatarIcon.style.display = 'none';
    };
    reader.readAsDataURL(file);

    try {
        const storageRef = storage.ref(`profilePictures/${currentUser.uid}`);
        await storageRef.put(file);
        const photoURL = await storageRef.getDownloadURL();
        await db.collection('users').doc(currentUser.uid).update({ photoURL });
        userData.photoURL = photoURL;
        showToast('Profile picture updated', 'success');
    } catch (error) {
        console.error('Avatar upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
        if (userData.photoURL) {
            avatarImage.src = userData.photoURL;
        } else {
            avatarImage.style.display = 'none';
            avatarIcon.style.display = 'block';
        }
    }
});

// Activity log
async function loadActivity() {
    activityLog.innerHTML = '<div class="text-center"><div class="loader"></div></div>';
    try {
        const snapshot = await db.collection('activity')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        if (snapshot.empty) {
            activityLog.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No recent activity</p></div>';
            return;
        }
        let html = '';
        snapshot.forEach(doc => {
            const act = doc.data();
            const time = act.timestamp ? formatTimeAgo(act.timestamp.toDate()) : 'Just now';
            html += `
                <div class="activity-item">
                    <div class="activity-icon"><i class="fas fa-${getActivityIcon(act.type)}"></i></div>
                    <div class="activity-details">
                        <h4>${act.title || 'Activity'}</h4>
                        <p>${act.description || ''}</p>
                    </div>
                    <div class="activity-time">${time}</div>
                </div>
            `;
        });
        activityLog.innerHTML = html;
    } catch (error) {
        console.error('Activity error:', error);
        activityLog.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load activity</p></div>';
    }
}

refreshActivity.addEventListener('click', loadActivity);

function getActivityIcon(type) {
    const icons = {
        upload: 'upload',
        edit: 'edit',
        delete: 'trash',
        login: 'sign-in-alt',
        password_change: 'key',
        default: 'circle'
    };
    return icons[type] || icons.default;
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + ' hour' + (hrs > 1 ? 's' : '') + ' ago';
    const days = Math.floor(hrs / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

// Load stats
async function loadStats() {
    try {
        const uploadsSnap = await db.collection('uploads')
            .where('uploadedBy', '==', currentUser.uid)
            .count()
            .get();
        statUploads.textContent = uploadsSnap.data().count || 0;

        const editsSnap = await db.collection('activity')
            .where('userId', '==', currentUser.uid)
            .where('type', '==', 'edit')
            .count()
            .get();
        statEdits.textContent = editsSnap.data().count || 0;

        const studentsSnap = await db.collection('users')
            .where('role', '==', 'student')
            .count()
            .get();
        statStudents.textContent = studentsSnap.data().count || 0;

        if (userData.createdAt) {
            const created = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
            memberSince.textContent = created.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else {
            memberSince.textContent = 'N/A';
        }
    } catch (error) {
        console.error('Stats error:', error);
    }
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
});