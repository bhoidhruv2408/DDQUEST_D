/**
 * DDQuest - Main JavaScript File
 * Contains common functionality used across the entire platform
 */

console.log('🚀 DDQuest Main.js Loaded');

// ==================== GLOBAL VARIABLES ====================
const DDQuest = {
    // Configuration
    config: {
        appName: 'DDQuest',
        version: '1.0.0',
        debug: true,
        apiBase: '/api',
        firebaseProjectId: 'ddquest-614ea'
    },
    
    // State
    state: {
        user: null,
        userRole: null,
        isAuthenticated: false,
        isOnline: true,
        currentPage: null
    },
    
    // Cache
    cache: {
        userData: null,
        notifications: [],
        settings: {}
    },
    
    // DOM Elements
    elements: {
        // Will be populated on init
    }
};

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Ready - Initializing DDQuest');
    
    initDDQuest();
    setupCommonEventListeners();
    setupOfflineDetection();
    initNotifications();
    
    // Check if we're on a protected page
    if (isProtectedPage()) {
        checkAuthState();
    }
});

// ==================== INITIALIZATION ====================
function initDDQuest() {
    console.log('🔧 Initializing DDQuest Platform');
    
    // Store current page
    DDQuest.state.currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Initialize common elements
    initCommonElements();
    
    // Setup theme
    setupTheme();
    
    // Load user preferences
    loadUserPreferences();
    
    // Setup analytics
    setupAnalytics();
    
    // Check for service worker
    if ('serviceWorker' in navigator) {
        registerServiceWorker();
    }
    
    console.log(`✅ DDQuest initialized on: ${DDQuest.state.currentPage}`);
}

function initCommonElements() {
    DDQuest.elements = {
        // Preloader
        preloader: document.getElementById('preloader'),
        
        // Connection status
        connectionStatus: document.getElementById('connectionStatusBadge'),
        firebaseNotification: document.getElementById('firebaseNotification'),
        firebaseRetryBtn: document.getElementById('firebaseRetryBtn'),
        
        // Navigation
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mobileMenu: document.getElementById('mobileMenu'),
        closeMenuBtn: document.getElementById('closeMenuBtn'),
        
        // User menu
        userMenuBtn: document.getElementById('userMenuBtn'),
        userMenu: document.getElementById('userMenu'),
        
        // Notifications
        notificationBell: document.getElementById('notificationBell'),
        notificationPanel: document.getElementById('notificationPanel'),
        
        // Search
        searchBtn: document.getElementById('searchBtn'),
        searchBox: document.getElementById('searchBox'),
        
        // Theme toggle
        themeToggle: document.getElementById('themeToggle')
    };
}

// ==================== AUTH & USER MANAGEMENT ====================
function checkAuthState() {
    // Check if user is logged in via Firebase
    if (window.firebaseAuth) {
        firebaseAuth.onAuthStateChanged((user) => {
            if (user) {
                DDQuest.state.user = user;
                DDQuest.state.isAuthenticated = true;
                console.log('👤 User authenticated:', user.uid);
                
                // Load user data
                loadUserData(user.uid);
                
                // Update UI
                updateAuthUI(true);
            } else {
                DDQuest.state.user = null;
                DDQuest.state.isAuthenticated = false;
                console.log('👤 No user authenticated');
                
                // Update UI
                updateAuthUI(false);
                
                // Redirect to login if on protected page
                if (isProtectedPage() && !isAuthPage()) {
                    redirectToLogin();
                }
            }
        });
    } else {
        console.warn('⚠️ Firebase Auth not available');
    }
}

function updateAuthUI(isLoggedIn) {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const profileBtn = document.getElementById('profileBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'block';
    if (signupBtn) signupBtn.style.display = isLoggedIn ? 'none' : 'block';
    if (profileBtn) profileBtn.style.display = isLoggedIn ? 'block' : 'none';
    if (logoutBtn) logoutBtn.style.display = isLoggedIn ? 'block' : 'none';
    
    if (isLoggedIn && DDQuest.state.user) {
        // Update user avatar/name
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (userAvatar) {
            userAvatar.textContent = DDQuest.state.user.displayName 
                ? DDQuest.state.user.displayName.charAt(0).toUpperCase()
                : DDQuest.state.user.email?.charAt(0).toUpperCase() || 'U';
        }
        
        if (userName) {
            userName.textContent = DDQuest.state.user.displayName 
                || DDQuest.state.user.email?.split('@')[0]
                || 'User';
        }
    }
}

async function loadUserData(userId) {
    try {
        if (!window.firestoreDb) {
            console.warn('Firestore not available for user data');
            return;
        }
        
        const userDoc = await firestoreDb.collection('users').doc(userId).get();
        if (userDoc.exists) {
            DDQuest.cache.userData = userDoc.data();
            DDQuest.state.userRole = DDQuest.cache.userData.role || 'student';
            
            console.log('✅ User data loaded:', DDQuest.cache.userData);
            
            // Dispatch event
            document.dispatchEvent(new CustomEvent('user-data-loaded', {
                detail: DDQuest.cache.userData
            }));
        }
    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

function isProtectedPage() {
    const protectedPages = [
        'dashboard.html', 'profile.html', 'take-test.html',
        'view-material.html', 'ddcet/', 'admin/'
    ];
    
    const currentPath = window.location.pathname;
    return protectedPages.some(page => currentPath.includes(page));
}

function isAuthPage() {
    const authPages = ['login', 'signup', 'auth/'];
    const currentPath = window.location.pathname;
    return authPages.some(page => currentPath.includes(page));
}

function redirectToLogin() {
    // Don't redirect if already on auth page
    if (isAuthPage()) return;
    
    // Store current page for redirect after login
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    
    // Redirect to login
    window.location.href = '/auth/login-student.html';
}

// ==================== NAVIGATION & MENU ====================
function setupCommonEventListeners() {
    // Mobile menu toggle
    if (DDQuest.elements.mobileMenuBtn) {
        DDQuest.elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    if (DDQuest.elements.closeMenuBtn) {
        DDQuest.elements.closeMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (DDQuest.elements.mobileMenu && 
            DDQuest.elements.mobileMenu.classList.contains('active') &&
            !DDQuest.elements.mobileMenu.contains(e.target) &&
            !DDQuest.elements.mobileMenuBtn.contains(e.target)) {
            toggleMobileMenu();
        }
    });
    
    // User menu toggle
    if (DDQuest.elements.userMenuBtn) {
        DDQuest.elements.userMenuBtn.addEventListener('click', toggleUserMenu);
    }
    
    // Close user menu when clicking outside
    document.addEventListener('click', (e) => {
        if (DDQuest.elements.userMenu && 
            DDQuest.elements.userMenu.classList.contains('active') &&
            !DDQuest.elements.userMenu.contains(e.target) &&
            !DDQuest.elements.userMenuBtn.contains(e.target)) {
            toggleUserMenu();
        }
    });
    
    // Notification bell
    if (DDQuest.elements.notificationBell) {
        DDQuest.elements.notificationBell.addEventListener('click', toggleNotifications);
    }
    
    // Search
    if (DDQuest.elements.searchBtn) {
        DDQuest.elements.searchBtn.addEventListener('click', toggleSearch);
    }
    
    // Theme toggle
    if (DDQuest.elements.themeToggle) {
        DDQuest.elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', smoothScroll);
    });
    
    // Preloader auto-hide
    window.addEventListener('load', () => {
        setTimeout(hidePreloader, 1000);
    });
}

function toggleMobileMenu() {
    if (DDQuest.elements.mobileMenu) {
        DDQuest.elements.mobileMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    }
}

function toggleUserMenu() {
    if (DDQuest.elements.userMenu) {
        DDQuest.elements.userMenu.classList.toggle('active');
    }
}

function toggleSearch() {
    if (DDQuest.elements.searchBox) {
        DDQuest.elements.searchBox.classList.toggle('active');
        if (DDQuest.elements.searchBox.classList.contains('active')) {
            DDQuest.elements.searchBox.querySelector('input').focus();
        }
    }
}

function smoothScroll(e) {
    e.preventDefault();
    
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    
    const targetElement = document.querySelector(targetId);
    if (targetElement) {
        window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
        });
        
        // Close mobile menu if open
        if (DDQuest.elements.mobileMenu?.classList.contains('active')) {
            toggleMobileMenu();
        }
    }
}

function hidePreloader() {
    if (DDQuest.elements.preloader) {
        DDQuest.elements.preloader.style.opacity = '0';
        DDQuest.elements.preloader.style.visibility = 'hidden';
    }
}

// ==================== THEME MANAGEMENT ====================
function setupTheme() {
    const savedTheme = localStorage.getItem('ddquest-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update toggle button
    if (DDQuest.elements.themeToggle) {
        DDQuest.elements.themeToggle.innerHTML = savedTheme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ddquest-theme', newTheme);
    
    // Update toggle button
    if (DDQuest.elements.themeToggle) {
        DDQuest.elements.themeToggle.innerHTML = newTheme === 'dark' 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
    }
    
    // Dispatch theme change event
    document.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
}

// ==================== NOTIFICATIONS ====================
function initNotifications() {
    // Check for existing notifications
    const storedNotifications = localStorage.getItem('ddquest-notifications');
    if (storedNotifications) {
        DDQuest.cache.notifications = JSON.parse(storedNotifications);
    }
    
    // Update notification badge
    updateNotificationBadge();
    
    // Listen for new notifications
    document.addEventListener('new-notification', (e) => {
        addNotification(e.detail);
    });
}

function addNotification(notification) {
    const newNotification = {
        id: Date.now(),
        title: notification.title || 'Notification',
        message: notification.message || '',
        type: notification.type || 'info',
        read: false,
        timestamp: new Date().toISOString(),
        action: notification.action || null
    };
    
    DDQuest.cache.notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    if (DDQuest.cache.notifications.length > 50) {
        DDQuest.cache.notifications = DDQuest.cache.notifications.slice(0, 50);
    }
    
    // Save to localStorage
    localStorage.setItem('ddquest-notifications', JSON.stringify(DDQuest.cache.notifications));
    
    // Update UI
    updateNotificationBadge();
    
    // Show toast if enabled
    if (notification.showToast !== false) {
        showToast(newNotification.title, newNotification.message, newNotification.type);
    }
}

function updateNotificationBadge() {
    const unreadCount = DDQuest.cache.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (badge) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
}

function toggleNotifications() {
    if (DDQuest.elements.notificationPanel) {
        DDQuest.elements.notificationPanel.classList.toggle('active');
        
        if (DDQuest.elements.notificationPanel.classList.contains('active')) {
            renderNotifications();
        }
    }
}

function renderNotifications() {
    if (!DDQuest.elements.notificationPanel) return;
    
    const notificationsHTML = DDQuest.cache.notifications.map(notification => `
        <div class="notification-item ${notification.read ? 'read' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${escapeHTML(notification.title)}</div>
                <div class="notification-message">${escapeHTML(notification.message)}</div>
                <div class="notification-time">${formatTime(notification.timestamp)}</div>
            </div>
            <button class="notification-mark-read" onclick="markNotificationAsRead(${notification.id})">
                <i class="fas fa-check"></i>
            </button>
        </div>
    `).join('');
    
    DDQuest.elements.notificationPanel.innerHTML = `
        <div class="notification-header">
            <h4>Notifications</h4>
            <button class="btn btn-sm" onclick="markAllNotificationsAsRead()">Mark all as read</button>
        </div>
        <div class="notification-list">
            ${notificationsHTML || '<div class="no-notifications">No notifications</div>'}
        </div>
    `;
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(title, message, type = 'info', duration = 5000) {
    // Create toast container if not exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-${getToastIcon(type)}"></i>
            <strong>${escapeHTML(title)}</strong>
            <button class="toast-close" onclick="removeToast('${toastId}')">&times;</button>
        </div>
        <div class="toast-body">${escapeHTML(message)}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        removeToast(toastId);
    }, duration);
    
    return toastId;
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return 'Just now';
    
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    
    // Less than 1 day
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    // Less than 1 week
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    // Otherwise, show date
    return date.toLocaleDateString();
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle',
        'test': 'file-alt',
        'material': 'book',
        'system': 'cog'
    };
    return icons[type] || 'bell';
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'times-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== OFFLINE DETECTION ====================
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        DDQuest.state.isOnline = true;
        document.dispatchEvent(new CustomEvent('connection-change', { detail: true }));
        showToast('Connection Restored', 'You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        DDQuest.state.isOnline = false;
        document.dispatchEvent(new CustomEvent('connection-change', { detail: false }));
        showToast('Connection Lost', 'You are offline. Some features may not work.', 'warning');
    });
    
    // Initial check
    DDQuest.state.isOnline = navigator.onLine;
}

// ==================== ANALYTICS ====================
function setupAnalytics() {
    // Page view tracking
    const pageData = {
        page: DDQuest.state.currentPage,
        timestamp: new Date().toISOString(),
        referrer: document.referrer
    };
    
    // Save page view to localStorage (for offline analytics)
    const pageViews = JSON.parse(localStorage.getItem('ddquest-pageviews') || '[]');
    pageViews.push(pageData);
    
    // Keep only last 100 page views
    if (pageViews.length > 100) {
        pageViews.splice(0, pageViews.length - 100);
    }
    
    localStorage.setItem('ddquest-pageviews', JSON.stringify(pageViews));
    
    // Send to analytics if online and Firebase available
    if (DDQuest.state.isOnline && window.firestoreDb) {
        // You can implement Firebase Analytics here
        logAnalyticsEvent('page_view', pageData);
    }
}

function logAnalyticsEvent(eventName, eventData) {
    if (!window.firestoreDb || !DDQuest.state.user) return;
    
    const analyticsData = {
        event: eventName,
        userId: DDQuest.state.user.uid,
        userRole: DDQuest.state.userRole,
        timestamp: new Date().toISOString(),
        ...eventData
    };
    
    // Save to Firestore
    firestoreDb.collection('analytics').add(analyticsData)
        .catch(error => console.error('Analytics error:', error));
}

// ==================== SERVICE WORKER ====================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('✅ Service Worker registered:', registration);
            })
            .catch(error => {
                console.warn('⚠️ Service Worker registration failed:', error);
            });
    }
}

// ==================== PREFERENCES ====================
function loadUserPreferences() {
    const preferences = JSON.parse(localStorage.getItem('ddquest-preferences') || '{}');
    
    // Apply preferences
    if (preferences.fontSize) {
        document.documentElement.style.fontSize = preferences.fontSize;
    }
    
    if (preferences.animations === false) {
        document.documentElement.classList.add('no-animations');
    }
    
    DDQuest.cache.settings = preferences;
}

function saveUserPreference(key, value) {
    DDQuest.cache.settings[key] = value;
    localStorage.setItem('ddquest-preferences', JSON.stringify(DDQuest.cache.settings));
    
    // Dispatch event
    document.dispatchEvent(new CustomEvent('preference-change', {
        detail: { key, value }
    }));
}

// ==================== API FUNCTIONS ====================
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${DDQuest.config.apiBase}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': DDQuest.state.user ? `Bearer ${await DDQuest.state.user.getIdToken()}` : ''
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// ==================== GLOBAL EXPORTS ====================
// Make functions available globally
window.DDQuest = DDQuest;
window.showToast = showToast;
window.removeToast = removeToast;
window.addNotification = addNotification;
window.toggleMobileMenu = toggleMobileMenu;
window.toggleUserMenu = toggleUserMenu;
window.toggleSearch = toggleSearch;
window.toggleTheme = toggleTheme;
window.markNotificationAsRead = function(id) {
    const notification = DDQuest.cache.notifications.find(n => n.id === id);
    if (notification) {
        notification.read = true;
        localStorage.setItem('ddquest-notifications', JSON.stringify(DDQuest.cache.notifications));
        updateNotificationBadge();
        renderNotifications();
    }
};
window.markAllNotificationsAsRead = function() {
    DDQuest.cache.notifications.forEach(n => n.read = true);
    localStorage.setItem('ddquest-notifications', JSON.stringify(DDQuest.cache.notifications));
    updateNotificationBadge();
    renderNotifications();
};

// ==================== ERROR HANDLING ====================
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Show user-friendly error
    if (DDQuest.config.debug) {
        showToast('Error', event.error.message || 'An error occurred', 'error');
    }
    
    // Log to analytics
    logAnalyticsEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
    });
});

// ==================== INITIALIZATION COMPLETE ====================
console.log('✅ DDQuest Main.js Initialized');