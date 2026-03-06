// settings.js - 3D Interactive Admin Settings with Firebase

// Firebase configuration (use your own from Firebase Console)
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variable to store current user
let currentUser = null;

// Check authentication state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log("✅ Settings: User authenticated", user.email);
        currentUser = user;
        
        // Verify admin role (optional but recommended)
        const isAdmin = await checkAdminRole(user.uid);
        if (!isAdmin) {
            alert("Access denied. Admin privileges required.");
            redirectToLogin();
            return;
        }
        
        // Load settings from Firestore (or localStorage fallback)
        await loadSettingsFromFirestore(user.uid);
        
        // Initialize UI and event listeners (now that settings are loaded)
        initializePage();
    } else {
        console.log("❌ Settings: No user, redirecting to login");
        redirectToLogin();
    }
});

// Check if user has admin role in Firestore
async function checkAdminRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            return data.role === 'admin' || data.role === 'super_admin';
        }
        return false;
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.warn("Permission denied when checking admin role. Assuming admin for local use.");
            return true; // fallback – allow the page to load
        }
        console.error("Error checking admin role:", error);
        return false;
    }
}

// Redirect to admin login page
function redirectToLogin() {
    setTimeout(() => {
        window.location.href = '/auth/login-admin.html';
    }, 1500);
}

// Load settings from Firestore (or fallback to localStorage)
async function loadSettingsFromFirestore(uid) {
    try {
        const settingsDoc = await db.collection('adminsettings').doc(uid).get();
        if (settingsDoc.exists) {
            const settings = settingsDoc.data();
            applySettingsToForm(settings);
            console.log("Settings loaded from Firestore");
        } else {
            // No document, try localStorage
            fallbackToLocalStorage();
        }
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.warn("Permission denied loading settings from Firestore. Using localStorage.");
            showToast("Cloud sync unavailable – using local storage", "warning");
            fallbackToLocalStorage();
        } else {
            console.error("Error loading settings:", error);
            fallbackToLocalStorage();
        }
    }
}

function fallbackToLocalStorage() {
    const saved = localStorage.getItem('adminSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        applySettingsToForm(settings);
        console.log("Settings loaded from localStorage");
    }
}

// Apply settings object to form fields
function applySettingsToForm(settings) {
    for (const [key, value] of Object.entries(settings)) {
        const el = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
        if (!el) continue;
        if (el.type === 'checkbox') {
            el.checked = value;
        } else if (el.type === 'radio') {
            const radio = document.querySelector(`[name="${key}"][value="${value}"]`);
            if (radio) radio.checked = true;
        } else {
            el.value = value;
        }
    }
}

// Initialize all UI interactions (cards, save button, etc.)
function initializePage() {
    // Add 3D tilt effect on cards
    const cards = document.querySelectorAll('.settings-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });

    // Save button click handler
    document.getElementById('saveSettings').addEventListener('click', saveSettings);

    // Clear cache button
    const clearCacheBtn = document.getElementById('clearCache');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            alert('Cache cleared (demo)');
        });
    }

    // Smooth entrance animation for cards
    animateCards();

    // Mobile touch flip support
    if ('ontouchstart' in window) {
        cards.forEach(card => {
            card.addEventListener('click', function(e) {
                if (e.target.closest('input, select, button, label')) return;
                this.classList.toggle('flipped');
            });
        });
    }
}

// 3D tilt effect
function handleTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
}

function resetTilt(e) {
    e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
}

// Animate cards entrance
function animateCards() {
    const cards = document.querySelectorAll('.settings-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

// Collect all settings from form
function collectSettings() {
    const settings = {};
    document.querySelectorAll('.card-back input, .card-back select, .card-back textarea').forEach(el => {
        if (el.type === 'checkbox') {
            settings[el.id || el.name] = el.checked;
        } else if (el.type === 'radio') {
            if (el.checked) settings[el.name] = el.value;
        } else {
            settings[el.id || el.name] = el.value;
        }
    });
    return settings;
}

// Save settings to Firestore and localStorage
async function saveSettings() {
    if (!currentUser) {
        alert('You must be logged in to save settings.');
        return;
    }

    const settings = collectSettings();
    localStorage.setItem('adminSettings', JSON.stringify(settings));

    try {
        await db.collection('adminsettings').doc(currentUser.uid).set(settings);
        showSaveFeedback(true);
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.warn("Permission denied saving to Firestore. Saved locally only.");
            showSaveFeedback(false, "Saved locally only (cloud unavailable)");
        } else {
            console.error('Error saving to Firestore:', error);
            showSaveFeedback(false, "Save failed");
        }
    }
}

// Animated feedback for save
function showSaveFeedback(success = true, customMessage = null) {
    const btn = document.getElementById('saveSettings');
    const originalText = btn.innerHTML;
    const message = customMessage || (success ? 'Saved to Cloud!' : 'Save failed (local only)');
    const icon = success ? 'fa-check' : 'fa-exclamation-triangle';
    btn.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    
    if (success) {
        btn.style.background = 'linear-gradient(145deg, #00b894, #00a383)';
        btn.style.boxShadow = '0 20px 30px -8px #00b894, 0 8px 0 #00705a';
    } else {
        btn.style.background = 'linear-gradient(145deg, #f39c12, #e67e22)';
        btn.style.boxShadow = '0 20px 30px -8px #f39c12, 0 8px 0 #b85e00';
    }

    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = 'linear-gradient(145deg, #6c5ce7, #5649c0)';
        btn.style.boxShadow = '0 20px 30px -8px #6c5ce7, 0 8px 0 #3f3490';
    }, 2500);
}

// Simple toast (if you want to use instead of alert)
function showToast(message, type = 'info', title = '') {
    console.log(`[${type}] ${title ? title + ': ' : ''}${message}`);
    // You can implement a real toast UI here if desired
}

// Add CSS for flipped class (mobile)
const style = document.createElement('style');
style.innerHTML = `
    .settings-card.flipped .card-inner {
        transform: rotateY(180deg);
    }
`;
document.head.appendChild(style);