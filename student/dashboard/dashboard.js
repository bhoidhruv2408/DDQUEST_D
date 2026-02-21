// dashboard.js - Enhanced Dashboard Functionality

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    databaseURL: "https://ddquest-614ea-default-rtdb.firebaseio.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.firebasestorage.app",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e",
    measurementId: "G-1CRQVW0WF9"
};

// Global Variables
let auth, db, currentUser = null;
let userData = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
    console.log("📊 DDQuest Dashboard Initializing...");
    
    try {
        // Initialize Firebase
        await initializeFirebase();
        
        // Initialize loading animation
        initLoadingAnimation();
        
        // Check authentication
        await checkAuthState();
        
        // Initialize event listeners
        initEventListeners();
        
        // Initialize animations
        initAnimations();
        
        console.log("✅ Dashboard initialized successfully");
    } catch (error) {
        console.error("❌ Dashboard initialization failed:", error);
        showToast("Failed to initialize dashboard. Please refresh.", "error");
    }
});

// Initialize Firebase
async function initializeFirebase() {
    try {
        // Import Firebase modules
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js");
        const { getAuth } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js");
        const { getFirestore } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        
        console.log("✅ Firebase initialized successfully");
    } catch (error) {
        console.error("❌ Firebase initialization error:", error);
        throw error;
    }
}

// Check authentication state
async function checkAuthState() {
    if (!auth) {
        console.error("❌ Firebase not initialized");
        return;
    }
    
    // Import auth modules dynamically
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js");
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            console.log("⚠️ No user found, redirecting to login...");
            window.location.href = '../../auth/login-student.html';
            return;
        }
        
        currentUser = user;
        console.log("👤 User authenticated:", user.uid, user.email);
        
        try {
            // Load user data
            await loadUserData(user.uid);
            
            // Load dashboard data
            await loadDashboardData(user.uid);
            
            // Update last login
            await updateLastLogin(user.uid);
            
            // Hide loading overlay
            hideLoadingOverlay();
            
            console.log("✅ User session initialized");
        } catch (error) {
            console.error("❌ Error during user initialization:", error);
            showToast("Error loading your data. Please refresh.", "error");
        }
    });
}

// Load user data from Firestore
async function loadUserData(userId) {
    try {
        const { doc, getDoc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        console.log("📋 Loading user data for:", userId);
        
        const userDoc = await getDoc(doc(db, "users", userId));
        
        if (userDoc.exists()) {
            userData = userDoc.data();
            console.log("✅ User data found:", userData);
            
            // Check if user is a student
            if (userData.role !== 'student') {
                handleNonStudentUser(userData.role);
                return;
            }
            
            // Update UI with user data
            updateUserUI(userData);
            
            // Store in localStorage for quick access
            localStorage.setItem('userData', JSON.stringify(userData));
            localStorage.setItem('userId', userId);
            localStorage.setItem('userRole', userData.role);
            
        } else {
            // Create basic user document if not exists
            console.log("📝 Creating new user document...");
            await createUserDocument(userId);
        }
    } catch (error) {
        console.error("❌ Error loading user data:", error);
        showToast("Error loading user profile", "error");
        
        // Use localStorage as fallback
        const storedData = localStorage.getItem('userData');
        if (storedData) {
            const parsedData = JSON.parse(storedData);
            updateUserUI(parsedData);
            console.log("📂 Using stored user data");
        }
    }
}

// Create user document if not exists
async function createUserDocument(userId) {
    try {
        const { setDoc, doc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        const user = auth.currentUser;
        
        const basicUserData = {
            uid: userId,
            email: user.email,
            fullName: user.displayName || user.email.split('@')[0] || 'Student',
            role: 'student',
            college: 'Not specified',
            semester: 1,
            branch: 'Computer Engineering',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
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
        
        await setDoc(doc(db, "users", userId), basicUserData);
        userData = basicUserData;
        updateUserUI(basicUserData);
        
        localStorage.setItem('userData', JSON.stringify(basicUserData));
        localStorage.setItem('userId', userId);
        localStorage.setItem('userRole', 'student');
        
        console.log("✅ Created user document for:", userId);
    } catch (error) {
        console.error("❌ Error creating user document:", error);
        showToast("Error creating user profile", "error");
    }
}

// Update user interface
function updateUserUI(userData) {
    console.log("🎨 Updating UI with user data:", userData);
    
    // Update user name
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userData.fullName) {
        userNameElement.textContent = userData.fullName;
    }
    
    // Update user email
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement && userData.email) {
        userEmailElement.textContent = userData.email;
    }
    
    // Update college info
    const collegeElement = document.getElementById('userCollege');
    if (collegeElement && userData.college) {
        collegeElement.textContent = userData.college;
    }
    
    // Update semester info
    const semesterElement = document.getElementById('userSemester');
    if (semesterElement && userData.semester) {
        semesterElement.textContent = `Semester ${userData.semester}`;
        
        // Highlight current semester card
        highlightCurrentSemester(userData.semester);
        
        // Show/hide DDCET option based on semester
        toggleDDCETOption(userData.semester);
    }
    
    // Update branch info
    const branchElement = document.getElementById('userBranch');
    if (branchElement && userData.branch) {
        branchElement.textContent = userData.branch;
    }
    
    // Update greeting based on time
    updateGreeting();
    
    // Update time display
    updateTimeDisplay();
    
    console.log("✅ UI updated successfully");
}

// Toggle DDCET option visibility based on semester
function toggleDDCETOption(semester) {
    const ddcetCard = document.querySelector('.access-card[href*="ddcet"]');
    if (ddcetCard) {
        if (semester >= 6) {
            ddcetCard.style.display = 'block';
        } else {
            ddcetCard.style.display = 'none';
        }
    }
}

// Load dashboard data
async function loadDashboardData(userId) {
    try {
        console.log("📊 Loading dashboard data...");
        
        // Load user statistics
        await loadUserStatistics(userId);
        
        // Load upcoming tests (with index error handling)
        await loadUpcomingTests(userId);
        
        // Load recommended materials (with index error handling)
        await loadRecommendedMaterials(userId);
        
        // Load recent activity (with permission error handling)
        await loadRecentActivity(userId);
        
        // Update progress rings
        updateProgressRings();
        
        console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        showToast("Error loading dashboard data", "error");
    }
}

// Load user statistics
async function loadUserStatistics(userId) {
    try {
        if (userData && userData.stats) {
            const stats = userData.stats;
            console.log("📈 Loading user statistics:", stats);
            
            // Update statistics cards with animation
            updateStatCard('testsCompleted', stats.testsCompleted || 0);
            updateStatCard('averageScore', stats.averageScore || 0);
            updateStatCard('studyHours', stats.studyHours || 0);
            updateStatCard('materialsViewed', stats.materialsViewed || 0);
            
            // Update streak if available
            if (stats.streak) {
                updateStreakDisplay(stats.streak);
            }
            
            return stats;
        } else {
            console.log("ℹ️ No statistics found, using defaults");
            updateStatCard('testsCompleted', 0);
            updateStatCard('averageScore', 0);
            updateStatCard('studyHours', 0);
            updateStatCard('materialsViewed', 0);
            return null;
        }
    } catch (error) {
        console.error("❌ Error loading user statistics:", error);
        return null;
    }
}

// Update statistic card with animation
function updateStatCard(statId, value) {
    const statElements = document.querySelectorAll('.stat-value');
    statElements.forEach(element => {
        const label = element.nextElementSibling;
        if (label && label.textContent.toLowerCase().includes(statId.toLowerCase())) {
            animateValue(element, 0, value, 1500);
        }
    });
}

// Animate value counter
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            element.textContent = end;
        }
    };
    
    window.requestAnimationFrame(step);
}

// Load upcoming tests with error handling for missing indexes
async function loadUpcomingTests(userId) {
    try {
        const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        console.log("📅 Loading upcoming tests...");
        
        // Query tests collection - simplified query to avoid index issues
        const testsRef = collection(db, "tests");
        const q = query(
            testsRef, 
            where("status", "==", "upcoming"),
            limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        const upcomingTests = [];
        
        querySnapshot.forEach((doc) => {
            const testData = doc.data();
            // Only show tests for user's semester
            if (!testData.semester || testData.semester === userData?.semester) {
                upcomingTests.push({ id: doc.id, ...testData });
            }
        });
        
        // Sort by date manually if available
        upcomingTests.sort((a, b) => {
            const dateA = a.scheduledDate?.seconds || 0;
            const dateB = b.scheduledDate?.seconds || 0;
            return dateA - dateB;
        });
        
        console.log(`✅ Found ${upcomingTests.length} upcoming tests`);
        
        // Display upcoming tests
        displayUpcomingTests(upcomingTests);
        
        return upcomingTests;
    } catch (error) {
        console.error("❌ Error loading upcoming tests:", error);
        
        // Show empty state
        const testsContainer = document.getElementById('upcomingTests');
        if (testsContainer) {
            testsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>No upcoming tests scheduled</p>
                </div>
            `;
        }
        
        return [];
    }
}

// Display upcoming tests
function displayUpcomingTests(tests) {
    const testsContainer = document.getElementById('upcomingTests');
    if (!testsContainer) return;
    
    if (tests.length === 0) {
        testsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-check"></i>
                <p>No upcoming tests scheduled</p>
            </div>
        `;
        return;
    }
    
    let testsHTML = '';
    tests.forEach(test => {
        const date = test.scheduledDate ? formatDate(test.scheduledDate) : 'TBA';
        const testSemester = test.semester ? `Sem ${test.semester}` : '';
        testsHTML += `
            <div class="test-item">
                <div class="test-icon">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="test-info">
                    <h4>${test.title || 'Untitled Test'}</h4>
                    <p>${test.subject || 'General'} • ${test.duration || 60} mins ${testSemester}</p>
                    <span class="test-date">${date}</span>
                </div>
            </div>
        `;
    });
    
    testsContainer.innerHTML = testsHTML;
}

// Load recommended materials with error handling for missing indexes
async function loadRecommendedMaterials(userId) {
    try {
        const { collection, query, where, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        // Get user's semester
        const semester = userData?.semester || 1;
        
        console.log(`📚 Loading recommended materials for semester ${semester}...`);
        
        // Query materials for user's semester - simplified query
        const materialsRef = collection(db, "materials");
        const q = query(
            materialsRef, 
            where("semester", "==", semester),
            where("status", "==", "published"),
            limit(3)
        );
        
        const querySnapshot = await getDocs(q);
        const materials = [];
        
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Found ${materials.length} recommended materials`);
        
        // Display recommended materials
        displayRecommendedMaterials(materials);
        
        return materials;
    } catch (error) {
        console.error("❌ Error loading materials:", error);
        
        // Show empty state
        const materialsContainer = document.getElementById('recommendedMaterials');
        if (materialsContainer) {
            materialsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <p>No materials available for your semester</p>
                </div>
            `;
        }
        
        return [];
    }
}

// Display recommended materials
function displayRecommendedMaterials(materials) {
    const materialsContainer = document.getElementById('recommendedMaterials');
    if (!materialsContainer) return;
    
    if (materials.length === 0) {
        materialsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>No materials available for your semester</p>
            </div>
        `;
        return;
    }
    
    let materialsHTML = '';
    materials.forEach(material => {
        const icon = material.type === 'video' ? 'video' : 
                    material.type === 'pdf' ? 'file-pdf' : 'file-alt';
        const type = material.type ? material.type.toUpperCase() : 'PDF';
        const size = material.size || 'N/A';
        
        materialsHTML += `
            <div class="material-item">
                <div class="material-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="material-info">
                    <h4>${material.title || 'Untitled Material'}</h4>
                    <p>${material.subject || 'General'} • ${type}</p>
                    <span class="material-size">${size}</span>
                </div>
            </div>
        `;
    });
    
    materialsContainer.innerHTML = materialsHTML;
}

// Load recent activity with permission handling
async function loadRecentActivity(userId) {
    try {
        const { collection, query, where, orderBy, limit, getDocs } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        console.log("📋 Loading recent activity...");
        
        // Query user's activity
        const activityRef = collection(db, "activity");
        const q = query(
            activityRef, 
            where("userId", "==", userId),
            orderBy("timestamp", "desc"),
            limit(5)
        );
        
        const querySnapshot = await getDocs(q);
        const activities = [];
        
        querySnapshot.forEach((doc) => {
            activities.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Found ${activities.length} recent activities`);
        
        // Display recent activity
        displayRecentActivity(activities);
        
        return activities;
    } catch (error) {
        console.error("❌ Error loading activity:", error);
        
        // Show empty state or mock data
        const activityContainer = document.getElementById('recentActivity');
        if (activityContainer) {
            // Show default activity items
            const defaultActivities = [
                {
                    type: 'login',
                    title: 'Logged in',
                    description: 'Welcome back to DDQuest',
                    timestamp: new Date()
                },
                {
                    type: 'profile_update',
                    title: 'Profile Updated',
                    description: 'Your profile information was loaded',
                    timestamp: new Date(Date.now() - 3600000)
                }
            ];
            
            displayRecentActivity(defaultActivities);
        }
        
        return [];
    }
}

// Display recent activity
function displayRecentActivity(activities) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    if (activities.length === 0) {
        activityContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No recent activity</p>
            </div>
        `;
        return;
    }
    
    let activityHTML = '';
    activities.forEach(activity => {
        const icon = getActivityIcon(activity.type);
        const time = activity.timestamp ? formatTimeAgo(activity.timestamp) : 'Just now';
        const title = activity.title || 'Activity';
        const description = activity.description || 'No description available';
        
        activityHTML += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="activity-info">
                    <h4>${title}</h4>
                    <p>${description}</p>
                    <span class="activity-time">${time}</span>
                </div>
            </div>
        `;
    });
    
    activityContainer.innerHTML = activityHTML;
}

// Get activity icon based on type
function getActivityIcon(type) {
    const icons = {
        'test_completed': 'check-circle',
        'material_viewed': 'book-open',
        'login': 'sign-in-alt',
        'profile_update': 'user-edit',
        'test_started': 'play-circle',
        'course_enrolled': 'graduation-cap',
        'quiz_taken': 'question-circle',
        'assignment_submitted': 'paper-plane',
        'certificate_earned': 'award',
        'discussion_participated': 'comments',
        'default': 'circle'
    };
    
    return icons[type] || icons.default;
}

// Update last login timestamp
async function updateLastLogin(userId) {
    try {
        const { updateDoc, doc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        await updateDoc(doc(db, "users", userId), {
            lastLogin: serverTimestamp()
        });
        
        console.log("✅ Updated last login timestamp");
    } catch (error) {
        console.error("❌ Error updating last login:", error);
    }
}

// Update progress rings
function updateProgressRings() {
    const progressRings = document.querySelectorAll('.progress-ring-fill');
    progressRings.forEach(ring => {
        const radius = ring.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = circumference;
        
        const value = parseInt(ring.dataset.value) || 0;
        const offset = circumference - (value / 100) * circumference;
        
        // Animate progress ring
        setTimeout(() => {
            ring.style.strokeDashoffset = offset;
        }, 100);
    });
    
    // Update progress values based on user data
    if (userData && userData.progress) {
        const overallProgress = userData.progress.overall || 25;
        const dailyGoalElement = document.getElementById('dailyGoal');
        if (dailyGoalElement) {
            dailyGoalElement.textContent = `${overallProgress}%`;
            const progressRing = dailyGoalElement.parentElement.querySelector('.progress-ring-fill');
            if (progressRing) {
                progressRing.dataset.value = overallProgress;
                
                // Update the circle animation
                const radius = progressRing.r.baseVal.value;
                const circumference = radius * 2 * Math.PI;
                const offset = circumference - (overallProgress / 100) * circumference;
                progressRing.style.strokeDashoffset = offset;
            }
        }
    }
}

// Initialize event listeners
function initEventListeners() {
    console.log("🔗 Initializing event listeners...");
    
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    } else {
        console.warn("⚠️ Logout button not found");
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            showToast("Refreshing dashboard...", "info");
            setTimeout(() => {
                location.reload();
            }, 1000);
        });
    }
    
    // Quick access cards
    const accessCards = document.querySelectorAll('.access-card');
    accessCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!this.href || this.href === '#' || this.href.includes('javascript')) {
                e.preventDefault();
                showToast("This feature is coming soon!", "info");
            }
        });
    });
    
    console.log("✅ Event listeners initialized");
}

// Handle logout
async function handleLogout() {
    try {
        console.log("🚪 Logging out...");
        
        // Import necessary modules
        const { signOut } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js");
        const { updateDoc, doc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
        
        // Update logout time
        if (currentUser) {
            try {
                await updateDoc(doc(db, "users", currentUser.uid), {
                    lastLogout: serverTimestamp()
                });
                console.log("✅ Updated logout timestamp");
            } catch (error) {
                console.warn("⚠️ Could not update logout timestamp:", error);
            }
        }
        
        // Sign out
        await signOut(auth);
        
        // Clear local storage
        localStorage.removeItem('userData');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        
        // Show success message
        showToast("Logged out successfully", "success");
        
        // Redirect to login
        setTimeout(() => {
            window.location.href = '../../auth/login-student.html';
        }, 1500);
        
    } catch (error) {
        console.error("❌ Logout error:", error);
        showToast("Logout failed. Please try again.", "error");
    }
}

// Handle non-student user
function handleNonStudentUser(role) {
    console.warn(`⚠️ Non-student role detected: ${role}`);
    
    showToast(`You are logged in as ${role}. Redirecting...`, "warning");
    
    setTimeout(() => {
        if (role === 'admin') {
            window.location.href = '../../admin/dashboard/index.html';
        } else if (role === 'teacher') {
            window.location.href = '../../teacher/dashboard/index.html';
        } else {
            handleLogout();
        }
    }, 2000);
}

// Update greeting based on time
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) greeting = 'Good Morning';
    else if (hour < 18) greeting = 'Good Afternoon';
    else greeting = 'Good Evening';
    
    const greetingElement = document.getElementById('greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

// Update time display
function updateTimeDisplay() {
    const updateTime = () => {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        const timeElement = document.getElementById('currentTime');
        const dateElement = document.getElementById('currentDate');
        
        if (timeElement) timeElement.textContent = timeString;
        if (dateElement) dateElement.textContent = dateString;
    };
    
    // Update immediately
    updateTime();
    
    // Update every minute
    setInterval(updateTime, 60000);
}

// Update streak display
function updateStreakDisplay(streak) {
    const streakElement = document.getElementById('currentStreak');
    if (streakElement) {
        streakElement.textContent = `${streak} days`;
        
        // Add fire emoji for streaks > 7
        if (streak > 7) {
            streakElement.innerHTML += ' 🔥';
        }
    }
}

// Highlight current semester card
function highlightCurrentSemester(semester) {
    const semesterCards = document.querySelectorAll('.access-card');
    semesterCards.forEach(card => {
        const cardText = card.querySelector('h3').textContent;
        if (cardText.includes(`Semester ${semester}`)) {
            card.style.border = '2px solid #4361ee';
            card.style.boxShadow = '0 10px 25px rgba(67, 97, 238, 0.2)';
        }
    });
}

// Initialize loading animation
function initLoadingAnimation() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loader-content">
            <div class="loader"></div>
            <p style="color: white; margin-top: 20px; font-weight: 500;">Loading Dashboard...</p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Auto-hide after 5 seconds (fallback)
    setTimeout(() => {
        hideLoadingOverlay();
    }, 5000);
}

// Hide loading overlay
function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
            overlay.style.display = 'none';
            console.log("✅ Loading overlay hidden");
        }, 500);
    }
}

// Initialize animations
function initAnimations() {
    // Add animation classes to elements
    const animatedElements = document.querySelectorAll('.info-card, .access-card, .stat-card');
    animatedElements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
        el.style.opacity = '0';
        el.style.animation = 'fadeInUp 0.8s ease forwards';
    });
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'TBA';
    
    try {
        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        console.error("❌ Error formatting date:", error);
        return 'TBA';
    }
}

// Format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    try {
        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }
        
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + ' year' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + ' month' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + ' day' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + ' hour' + (interval > 1 ? 's' : '') + ' ago';
        
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + ' minute' + (interval > 1 ? 's' : '') + ' ago';
        
        return 'Just now';
    } catch (error) {
        console.error("❌ Error formatting time ago:", error);
        return 'Recently';
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close">&times;</button>
    `;
    
    document.body.appendChild(toast);
    
    // Add close event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }, 5000);
}

// Get toast icon based on type
function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Make functions available globally
window.logoutUser = handleLogout;
window.refreshDashboard = () => {
    showToast("Refreshing dashboard...", "info");
    setTimeout(() => location.reload(), 1000);
};

console.log("✅ dashboard.js loaded successfully");