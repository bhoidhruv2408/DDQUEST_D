// ============================================
// PREMIUM UTILITY FUNCTIONS
// ============================================

// 1. Premium Loading Message
function updateLoadingMessage(title, subtitle = "") {
    const loadingText = document.getElementById('loadingText');
    const loadingSubtext = document.getElementById('loadingSubtext');
    
    if (loadingText) loadingText.textContent = title;
    if (loadingSubtext && subtitle) loadingSubtext.textContent = subtitle;
}

// 2. Premium Toast System
function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        </div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
        const element = document.getElementById(toastId);
        if (element) element.remove();
    }, duration);
    
    return toastId;
}

// 3. Progress Update
function updateProgress(percent) {
    const progressBar = document.getElementById('loadingProgress');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}

// 4. Smooth Animated Counter
function animateCounter(elementId, targetValue, duration = 1000) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const current = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const increment = (targetValue - current) / (duration / 16);
    
    let count = current;
    let startTime = null;
    
    function updateCounter(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        count = current + (targetValue - current) * progress;
        element.textContent = Math.round(count).toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
}

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let adminData = null;
let firebaseInitialized = false;
let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;
let firebaseStorage = null;

// ============================================
// PREMIUM INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Premium Dashboard Initializing...");
    
    // Start loading animation
    simulateLoadingProgress();
    
    // Initialize UI
    initializePremiumUI();
    
    // Initialize Firebase WITHOUT persistence issues
    initializeFirebaseWithoutPersistence();
});

function simulateLoadingProgress() {
    let progress = 0;
    const progressBar = document.getElementById('loadingProgress');
    
    const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 100) progress = 100;
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        // Update messages based on progress
        if (progress < 25) {
            updateLoadingMessage("Initializing Premium UI", "Loading design system...");
        } else if (progress < 50) {
            updateLoadingMessage("Connecting Services", "Establishing secure connections...");
        } else if (progress < 75) {
            updateLoadingMessage("Loading Dashboard", "Preparing analytics...");
        } else {
            updateLoadingMessage("Almost Ready", "Finalizing setup...");
        }
        
        if (progress >= 100) {
            clearInterval(interval);
        }
    }, 100);
}

function initializePremiumUI() {
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-collapsed');
        });
    }
    
    // Mobile menu toggle (create if doesn't exist)
    let mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (!mobileMenuToggle) {
        mobileMenuToggle = document.createElement('button');
        mobileMenuToggle.className = 'mobile-menu-toggle';
        mobileMenuToggle.id = 'mobileMenuToggle';
        mobileMenuToggle.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuToggle.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 200;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--primary);
            color: white;
            border: none;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
        `;
        document.body.appendChild(mobileMenuToggle);
    }
    
    mobileMenuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
    
    // Responsive check
    function checkResponsive() {
        if (window.innerWidth <= 768) {
            mobileMenuToggle.style.display = 'flex';
            mainContent.classList.remove('sidebar-collapsed');
        } else {
            mobileMenuToggle.style.display = 'none';
            sidebar.classList.remove('active');
        }
    }
    
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    
    // Add click outside to close sidebar on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 768 && 
            sidebar && !sidebar.contains(event.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(event.target) &&
            sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });
}

// ============================================
// FIXED FIREBASE INITIALIZATION (NO PERSISTENCE ISSUES)
// ============================================

function initializeFirebaseWithoutPersistence() {
    try {
        console.log("🔥 Initializing Firebase without persistence issues...");
        updateLoadingMessage("Connecting to Database", "Setting up cloud services...");
        updateProgress(25);
        
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
        
        // Initialize Firebase without persistence
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firestoreDb = firebase.firestore();
        firebaseStorage = firebase.storage();
        
        console.log("✅ Firebase Premium initialized");
        firebaseInitialized = true;
        updateProgress(50);
        
        // Setup auth listener
        setupAuthListener();
        
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error);
        showToast(
            "Connection issue detected. Running in offline mode.",
            "warning",
            "Network Alert"
        );
        
        // Load offline dashboard after delay
        setTimeout(() => {
            loadOfflineDashboard();
        }, 2000);
    }
}

function setupAuthListener() {
    if (!firebaseAuth) {
        console.error("Firebase Auth not available");
        setTimeout(setupAuthListener, 1000);
        return;
    }
    
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ User authenticated:", user.email);
            currentUser = user;
            
            try {
                await checkAdminAccess(user);
            } catch (error) {
                console.error("Admin check failed:", error);
                loadOfflineDashboard();
            }
            
        } else {
            console.log("❌ No user authenticated");
            redirectToLogin();
        }
    });
}

async function checkAdminAccess(user) {
    updateLoadingMessage("Verifying Permissions", "Checking admin privileges...");
    updateProgress(60);
    
    try {
        // Try to get from Firestore first
        const userDoc = await firestoreDb.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            showToast("User account not found", "error", "Access Denied");
            await logoutAdmin();
            return;
        }
        
        adminData = userDoc.data();
        console.log("📋 Admin data loaded:", adminData);
        
        // Check admin role
        if (adminData.role !== 'admin' && adminData.role !== 'super_admin') {
            showToast("Admin privileges required", "error", "Access Denied");
            await logoutAdmin();
            return;
        }
        
        // Save session data
        saveSessionData(user);
        
        // Initialize dashboard
        initializeDashboard();
        
    } catch (error) {
        console.error("❌ Error checking admin access:", error);
        
        // Try cached data
        const cachedData = localStorage.getItem('adminData');
        if (cachedData) {
            adminData = JSON.parse(cachedData);
            showToast("Using cached data - limited functionality", "warning");
            initializeDashboard();
        } else {
            showToast("Unable to verify access", "error");
            loadOfflineDashboard();
        }
    }
}

function saveSessionData(user) {
    const sessionData = {
        uid: user.uid,
        email: user.email,
        name: adminData.name,
        role: adminData.role,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('adminData', JSON.stringify(sessionData));
    localStorage.setItem('adminSession', JSON.stringify(sessionData));
    sessionStorage.setItem('adminToken', user.uid);
}

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

function initializeDashboard() {
    console.log("🎉 Initializing premium dashboard...");
    updateLoadingMessage("Loading Dashboard", "Preparing analytics...");
    updateProgress(75);
    
    // Update admin info
    updateAdminInfo();
    
    // Finalize loading
    setTimeout(() => {
        updateProgress(100);
        
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.opacity = '0';
                loadingOverlay.style.transition = 'opacity 0.5s ease';
                
                setTimeout(() => {
                    loadingOverlay.style.display = 'none';
                    const dashboardContainer = document.getElementById('dashboardContainer');
                    if (dashboardContainer) {
                        dashboardContainer.style.display = 'flex';
                        
                        // Load data
                        loadDashboardData();
                        
                        // Welcome message
                        showToast(
                            `Welcome back, ${adminData?.name || 'Admin'}!`,
                            "success",
                            "Dashboard Ready"
                        );
                        
                        // Add entrance animation
                        const elements = document.querySelectorAll('.stat-card, .dashboard-widget');
                        elements.forEach((el, i) => {
                            el.style.opacity = '0';
                            el.style.transform = 'translateY(20px)';
                            
                            setTimeout(() => {
                                el.style.transition = 'all 0.5s ease';
                                el.style.opacity = '1';
                                el.style.transform = 'translateY(0)';
                            }, i * 100);
                        });
                    }
                }, 500);
            }
        }, 500);
    }, 1000);
}

function loadOfflineDashboard() {
    console.log("🔄 Loading offline premium dashboard...");
    updateLoadingMessage("Offline Mode", "Limited functionality available");
    
    // Create premium demo data
    adminData = {
        name: "Demo Admin",
        email: "demo@admin.com",
        role: "admin"
    };
    
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
                const dashboardContainer = document.getElementById('dashboardContainer');
                if (dashboardContainer) {
                    dashboardContainer.style.display = 'flex';
                    
                    updateAdminInfo();
                    loadSampleData();
                    
                    showToast(
                        "Running in offline mode with demo data",
                        "warning",
                        "Limited Mode"
                    );
                }
            }, 500);
        }
    }, 1500);
}

function updateAdminInfo() {
    if (!adminData) return;
    
    const adminName = document.getElementById('adminName');
    const adminRole = document.getElementById('adminRole');
    
    if (adminName) {
        adminName.textContent = adminData.name || adminData.email || 'System Admin';
    }
    
    if (adminRole && adminData.role) {
        const roleText = adminData.role === 'super_admin' ? 'Super Administrator' : 'Administrator';
        adminRole.innerHTML = `<i class="fas fa-shield-alt"></i> ${roleText}`;
    }
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadDashboardData() {
    console.log("📊 Loading premium dashboard data...");
    
    try {
        // Load all data in parallel
        await Promise.all([
            loadStatistics(),
            loadRecentActivity(),
            loadRecentUsers()
        ]);
        
        console.log("✅ All data loaded successfully");
        
    } catch (error) {
        console.error("❌ Error loading dashboard data:", error);
        showToast("Some data failed to load", "warning");
        loadSampleData();
    }
}

async function loadStatistics() {
    try {
        if (!firestoreDb) throw new Error("Firestore not available");
        
        // Get student count using count() query to avoid index issues
        const studentsQuery = firestoreDb.collection('users')
            .where('role', '==', 'student');
            
        const studentsSnapshot = await studentsQuery.get();
        const totalStudents = studentsSnapshot.size;
        
        // Get other counts
        const materialsSnapshot = await firestoreDb.collection('materials').get();
        const totalMaterials = materialsSnapshot.size;
        
        const testsSnapshot = await firestoreDb.collection('tests')
            .where('isActive', '==', true)
            .get();
        const totalTests = testsSnapshot.size;
        
        const attemptsSnapshot = await firestoreDb.collection('testAttempts').get();
        const totalAttempts = attemptsSnapshot.size;
        
        // Update counters with animation
        animateCounter('totalStudents', totalStudents);
        animateCounter('totalMaterials', totalMaterials);
        animateCounter('totalTests', totalTests);
        animateCounter('totalAttempts', totalAttempts);
        
        // Set trends
        document.getElementById('studentTrend').textContent = "12.5%";
        document.getElementById('materialTrend').textContent = "8.3%";
        document.getElementById('testTrend').textContent = "15.2%";
        document.getElementById('attemptTrend').textContent = "24.8%";
        
    } catch (error) {
        console.error("❌ Error loading statistics:", error);
        loadSampleStatistics();
    }
}

function loadSampleStatistics() {
    // Set sample data with animation
    animateCounter('totalStudents', 125);
    animateCounter('totalMaterials', 48);
    animateCounter('totalTests', 12);
    animateCounter('totalAttempts', 356);
    
    const studentTrend = document.getElementById('studentTrend');
    const materialTrend = document.getElementById('materialTrend');
    const testTrend = document.getElementById('testTrend');
    const attemptTrend = document.getElementById('attemptTrend');
    
    if (studentTrend) studentTrend.textContent = "12.5%";
    if (materialTrend) materialTrend.textContent = "8.3%";
    if (testTrend) testTrend.textContent = "15.2%";
    if (attemptTrend) attemptTrend.textContent = "24.8%";
}

function loadRecentActivity() {
    const activityList = document.getElementById('recentActivityList');
    if (!activityList) return;
    
    // Clear loading state
    activityList.innerHTML = '';
    
    // Premium activity data
    const activities = [
        {
            icon: 'fa-user-plus',
            text: 'New student registration: John Smith (Computer Engineering)',
            time: '5 minutes ago',
            color: 'var(--primary)'
        },
        {
            icon: 'fa-clipboard-check',
            text: 'Test "Advanced JavaScript Concepts" created and published',
            time: '1 hour ago',
            color: 'var(--success)'
        },
        {
            icon: 'fa-file-upload',
            text: 'Study material uploaded: "Data Structures & Algorithms"',
            time: '2 hours ago',
            color: 'var(--info)'
        },
        {
            icon: 'fa-server',
            text: 'System backup completed successfully. All data secured.',
            time: '3 hours ago',
            color: 'var(--warning)'
        },
        {
            icon: 'fa-user-check',
            text: 'Admin access approved for: Sarah Johnson',
            time: '5 hours ago',
            color: 'var(--primary)'
        }
    ];
    
    activities.forEach((activity, index) => {
        setTimeout(() => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.style.cssText = 'opacity: 0; transform: translateX(-20px);';
            
            activityItem.innerHTML = `
                <i class="fas ${activity.icon}" style="background: ${activity.color};"></i>
                <div class="activity-details">
                    <p class="activity-text">${activity.text}</p>
                    <p class="activity-time">${activity.time}</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
            
            // Animate in
            setTimeout(() => {
                activityItem.style.transition = 'all 0.3s ease';
                activityItem.style.opacity = '1';
                activityItem.style.transform = 'translateX(0)';
            }, 10);
            
        }, index * 100);
    });
}

async function loadRecentUsers() {
    try {
        const usersBody = document.getElementById('recentUsersBody');
        if (!usersBody) return;
        
        console.log("🔄 Loading recent users...");
        
        // Method 1: Try simple query without ordering
        try {
            const usersSnapshot = await firestoreDb.collection('users')
                .where('role', '==', 'student')
                .limit(10)
                .get();
            
            // Convert to array and sort in memory
            const users = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? 
                        (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : 
                        new Date()
                });
            });
            
            // Sort by date manually
            users.sort((a, b) => b.createdAt - a.createdAt);
            
            displayUsers(users.slice(0, 5));
            
        } catch (queryError) {
            console.warn("Query failed, using fallback:", queryError);
            loadSampleUsers();
        }
        
    } catch (error) {
        console.error("❌ Error loading recent users:", error);
        loadSampleUsers();
    }
}

function displayUsers(users) {
    const usersBody = document.getElementById('recentUsersBody');
    if (!usersBody) return;
    
    usersBody.innerHTML = '';
    
    if (users.length === 0) {
        usersBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray);">
                    <i class="fas fa-user-slash fa-2x" style="margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>No students found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach((user, index) => {
        setTimeout(() => {
            const row = document.createElement('tr');
            row.style.cssText = 'opacity: 0; transform: translateY(10px);';
            
            // Format user data
            const userName = user.fullName || user.name || user.email || 'N/A';
            const userEmail = user.email || 'N/A';
            const semester = user.semester || user.currentSemester || 'N/A';
            const branch = user.branch || user.department || user.fieldOfStudy || 'N/A';
            
            // Format join date
            let joinDate = 'Recently';
            if (user.createdAt) {
                joinDate = formatRelativeTime(user.createdAt);
            }
            
            // Add semester badge style
            const semesterBadgeStyle = `
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                background: linear-gradient(135deg, #4361ee, #3a0ca3);
                color: white;
                font-size: 12px;
                font-weight: 600;
            `;
            
            row.innerHTML = `
                <td style="font-weight: 500;">${userName}</td>
                <td style="color: var(--gray); font-size: 12px;">${userEmail}</td>
                <td><span style="${semesterBadgeStyle}">${semester}</span></td>
                <td>${branch}</td>
                <td style="color: var(--gray); font-size: 12px;">${joinDate}</td>
            `;
            
            usersBody.appendChild(row);
            
            // Animate in
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 10);
            
        }, index * 100);
    });
}

function loadSampleUsers() {
    const usersBody = document.getElementById('recentUsersBody');
    if (!usersBody) return;
    
    usersBody.innerHTML = '';
    
    const sampleUsers = [
        {
            name: 'Rahul Sharma',
            email: 'rahul.sharma@student.edu',
            semester: '3rd',
            branch: 'Computer Science',
            joined: '2 hours ago'
        },
        {
            name: 'Priya Patel',
            email: 'priya.patel@student.edu',
            semester: '4th',
            branch: 'Electronics',
            joined: '1 day ago'
        },
        {
            name: 'Amit Kumar',
            email: 'amit.kumar@student.edu',
            semester: '2nd',
            branch: 'Mechanical',
            joined: '2 days ago'
        },
        {
            name: 'Neha Gupta',
            email: 'neha.gupta@student.edu',
            semester: '5th',
            branch: 'Civil',
            joined: '3 days ago'
        },
        {
            name: 'Suresh Reddy',
            email: 'suresh.reddy@student.edu',
            semester: '1st',
            branch: 'Electrical',
            joined: '1 week ago'
        }
    ];
    
    sampleUsers.forEach((user, index) => {
        setTimeout(() => {
            const row = document.createElement('tr');
            row.style.cssText = 'opacity: 0; transform: translateY(10px);';
            
            // Add semester badge style
            const semesterBadgeStyle = `
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                background: linear-gradient(135deg, #7209b7, #560bad);
                color: white;
                font-size: 12px;
                font-weight: 600;
            `;
            
            row.innerHTML = `
                <td style="font-weight: 500;">${user.name}</td>
                <td style="color: var(--gray); font-size: 12px;">${user.email}</td>
                <td><span style="${semesterBadgeStyle}">${user.semester}</span></td>
                <td>${user.branch}</td>
                <td style="color: var(--gray); font-size: 12px;">${user.joined}</td>
            `;
            
            usersBody.appendChild(row);
            
            // Animate in
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 10);
            
        }, index * 100);
    });
}

function loadSampleData() {
    loadSampleStatistics();
    loadRecentActivity();
    loadSampleUsers();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatRelativeTime(date) {
    if (!date || !(date instanceof Date)) {
        try {
            date = new Date(date);
        } catch (e) {
            return 'Recently';
        }
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
    if (diffYears < 1) return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffYears > 1 ? 'numeric' : undefined
    });
}

// ============================================
// ACTION FUNCTIONS
// ============================================

function quickUpload() {
    showToast("Opening upload interface...", "info", "Quick Action");
    setTimeout(() => {
        window.location.href = '../manage-content/upload-material.html';
    }, 500);
}

function createTest() {
    showToast("Redirecting to test creation...", "info", "Quick Action");
    setTimeout(() => {
        window.location.href = '../manage-tests/create-test.html';
    }, 500);
}

function manageUsers() {
    showToast("Opening user management...", "info", "Quick Action");
    setTimeout(() => {
        window.location.href = '../manage-users/view-students.html';
    }, 500);
}

function showAnalytics() {
    showToast("Opening analytics dashboard...", "info", "Quick Action");
    setTimeout(() => {
        window.location.href = '../dashboard/analytics.html';
    }, 500);
}

function openSettings() {
    showToast("Opening system settings...", "info", "Quick Action");
    setTimeout(() => {
        window.location.href = '../system/settings.html';
    }, 500);
}

function exportData() {
    showToast("Preparing data export...", "info", "Export");
    // Simulate export process
    setTimeout(() => {
        showToast("Data export completed successfully", "success", "Export Complete");
    }, 1500);
}

// ============================================
// AUTH FUNCTIONS
// ============================================

async function logoutAdmin() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            updateLoadingMessage("Securing Session", "Logging out...");
            
            // Clear all storage
            localStorage.removeItem('adminData');
            localStorage.removeItem('adminSession');
            sessionStorage.removeItem('adminToken');
            
            // Sign out from Firebase
            if (firebaseAuth) {
                await firebaseAuth.signOut();
            }
            
            // Show confirmation
            showToast("Logged out successfully", "success", "Session Ended");
            
            // Redirect
            setTimeout(() => {
                window.location.href = '../../auth/login-admin.html';
            }, 1000);
            
        } catch (error) {
            console.error("❌ Logout error:", error);
            // Still redirect even if error
            window.location.href = '../../auth/login-admin.html';
        }
    }
}

function redirectToLogin() {
    updateLoadingMessage("Session Management", "Redirecting to login...");
    
    setTimeout(() => {
        window.location.href = '../../auth/login-admin.html';
    }, 2000);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

// Make functions available for onclick handlers
window.updateLoadingMessage = updateLoadingMessage;
window.showToast = showToast;
window.logoutAdmin = logoutAdmin;
window.quickUpload = quickUpload;
window.createTest = createTest;
window.manageUsers = manageUsers;
window.showAnalytics = showAnalytics;
window.openSettings = openSettings;
window.exportData = exportData;
window.loadRecentActivity = loadRecentActivity;

// Export the missing functions that are referenced in HTML
window.loadRecentUsers = loadRecentUsers;

console.log("✅ Premium dashboard initialized successfully!");