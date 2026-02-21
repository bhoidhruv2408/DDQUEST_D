// assets/js/role-check.js - Firebase v9 Version

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

class RoleChecker {
    constructor() {
        this.auth = window.firebaseAuth;
        this.firestore = window.firestoreDb;
        this.currentUser = null;
        this.userData = null;
        this.initialized = false;
        
        this.init();
    }

    async init() {
        if (!this.auth || !this.firestore) {
            console.warn("Firebase services not available for RoleChecker");
            setTimeout(() => this.init(), 1000);
            return;
        }
        
        // Listen for auth state changes
        onAuthStateChanged(this.auth, async (user) => {
            this.currentUser = user;
            if (user) {
                this.userData = await this.loadUserData(user.uid);
            } else {
                this.userData = null;
            }
            this.checkAndRedirect();
        });
        
        this.initialized = true;
        console.log("✅ Role Checker v9 initialized");
    }

    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(this.firestore, "users", uid));
            return userDoc.exists() ? userDoc.data() : null;
        } catch (error) {
            console.error("Error loading user data:", error);
            return null;
        }
    }

    // Check current user role and redirect if needed
    async checkAndRedirect() {
        if (!this.currentUser || !this.userData) {
            return false;
        }

        const currentPath = window.location.pathname;
        const userRole = this.userData.role;
        const userStatus = this.userData.status;

        // Check if account is active
        if (userStatus !== 'active') {
            await window.authService?.logout();
            this.showAccessDenied("Account is suspended. Please contact support.");
            return false;
        }

        // Define allowed paths for each role
        const studentPaths = ['/student/', '/auth/login-student.html', '/auth/signup-student.html'];
        const adminPaths = ['/admin/', '/auth/login-admin.html', '/auth/admin-request.html'];
        
        const isStudent = userRole === 'student';
        const isAdmin = userRole === 'admin';

        // Check if current path is allowed for user's role
        let isPathAllowed = false;
        
        if (isStudent) {
            isPathAllowed = studentPaths.some(path => currentPath.includes(path));
        } else if (isAdmin) {
            isPathAllowed = adminPaths.some(path => currentPath.includes(path));
        }

        // If path is not allowed, redirect to appropriate dashboard
        if (!isPathAllowed) {
            if (isStudent && !currentPath.includes('/student/')) {
                window.location.href = '/student/dashboard/index.html';
                return true;
            } else if (isAdmin && !currentPath.includes('/admin/')) {
                window.location.href = '/admin/dashboard/index.html';
                return true;
            }
        }

        // If on role selection page but logged in, redirect
        if ((isStudent || isAdmin) && currentPath.includes('/role.html')) {
            window.location.href = isStudent ? 
                '/student/dashboard/index.html' : 
                '/admin/dashboard/index.html';
            return true;
        }

        return false;
    }

    // Get user role
    async getUserRole() {
        if (!this.currentUser) return null;
        
        if (this.userData) {
            return this.userData.role;
        }
        
        try {
            const userDoc = await getDoc(doc(this.firestore, "users", this.currentUser.uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                return this.userData.role;
            }
            return null;
        } catch (error) {
            console.error('Get user role error:', error);
            return null;
        }
    }

    // Verify user has specific role
    async hasRole(requiredRole) {
        const role = await this.getUserRole();
        return role === requiredRole;
    }

    // Protect page based on role
    async protectPage(requiredRole, redirectOnFail = true) {
        if (!this.initialized) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const hasRequiredRole = await this.hasRole(requiredRole);
        
        if (!hasRequiredRole) {
            if (redirectOnFail) {
                // Store current page for redirect after login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                
                // Redirect to appropriate login
                if (requiredRole === 'student') {
                    window.location.href = '/auth/login-student.html';
                } else if (requiredRole === 'admin') {
                    window.location.href = '/auth/login-admin.html';
                } else {
                    window.location.href = '/role.html';
                }
            } else {
                this.showAccessDenied("You don't have permission to access this page.");
            }
            return false;
        }
        
        return true;
    }

    // Show access denied message
    showAccessDenied(message = "You don't have permission to access this page.") {
        // Check if already showing access denied
        if (document.querySelector('.access-denied')) {
            return;
        }

        // Save current page content
        const currentBody = document.body.innerHTML;
        sessionStorage.setItem('previousPage', currentBody);

        document.body.innerHTML = `
            <div class="access-denied">
                <div class="denied-content">
                    <div class="denied-icon">
                        <i class="fas fa-shield-alt"></i>
                    </div>
                    <h2>Access Restricted</h2>
                    <p>${message}</p>
                    <div class="denied-actions">
                        <a href="/role.html" class="btn btn-primary">
                            <i class="fas fa-home"></i> Go to Home
                        </a>
                        <button onclick="window.location.reload()" class="btn btn-outline">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    </div>
                    <div class="denied-help">
                        <p><i class="fas fa-info-circle"></i> Need help? Contact support: support@ddquest.in</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles if not already added
        if (!document.querySelector('#access-denied-styles')) {
            const style = document.createElement('style');
            style.id = 'access-denied-styles';
            style.textContent = `
                .access-denied {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }
                .denied-content {
                    background: rgba(255, 255, 255, 0.95);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 500px;
                    width: 100%;
                    backdrop-filter: blur(10px);
                }
                .denied-icon {
                    font-size: 4rem;
                    color: #ff4757;
                    margin-bottom: 20px;
                }
                .denied-icon i {
                    background: linear-gradient(135deg, #ff6b6b, #ee5a52);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .denied-content h2 {
                    color: #2d3436;
                    margin-bottom: 15px;
                    font-size: 28px;
                    font-weight: 700;
                }
                .denied-content p {
                    color: #636e72;
                    margin-bottom: 30px;
                    line-height: 1.6;
                    font-size: 16px;
                }
                .denied-actions {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    margin-bottom: 25px;
                }
                .denied-actions .btn {
                    padding: 12px 25px;
                    border-radius: 10px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .denied-actions .btn-primary {
                    background: linear-gradient(135deg, #3498db, #2980b9);
                    color: white;
                    border: none;
                }
                .denied-actions .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
                }
                .denied-actions .btn-outline {
                    background: transparent;
                    color: #3498db;
                    border: 2px solid #3498db;
                }
                .denied-actions .btn-outline:hover {
                    background: #3498db;
                    color: white;
                }
                .denied-help {
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                .denied-help p {
                    color: #7f8c8d;
                    font-size: 14px;
                    margin: 0;
                }
                .denied-help i {
                    color: #3498db;
                    margin-right: 8px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }

    // Get user data
    getUserData() {
        return this.userData;
    }

    // Get user ID
    getUserId() {
        return this.currentUser?.uid || null;
    }

    // Check if user has permission for specific action
    async hasPermission(permission) {
        if (!this.userData) return false;
        
        const permissions = {
            'student': ['view_materials', 'take_tests', 'view_progress'],
            'admin': ['manage_materials', 'create_tests', 'view_analytics', 'manage_users'],
            'super_admin': ['*']
        };
        
        const role = this.userData.role;
        const adminLevel = this.userData.adminLevel;
        
        if (role === 'student') {
            return permissions.student.includes(permission);
        } else if (role === 'admin') {
            if (adminLevel === 'super') {
                return true; // Super admin has all permissions
            }
            return permissions.admin.includes(permission);
        }
        
        return false;
    }
}

// Initialize and export
let roleChecker = null;

async function initRoleChecker() {
    try {
        // Wait for Firebase to be ready
        if (!window.firebaseAuth || !window.firestoreDb) {
            console.warn("Firebase services not available. Retrying in 1 second...");
            setTimeout(initRoleChecker, 1000);
            return;
        }
        
        roleChecker = new RoleChecker();
        window.roleChecker = roleChecker;
        
        console.log('✅ Role Checker v9 initialized successfully');
        
        // Dispatch event that role checker is ready
        window.dispatchEvent(new Event('roleCheckerReady'));
        
        return roleChecker;
    } catch (error) {
        console.error('Failed to initialize Role Checker:', error);
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RoleChecker, initRoleChecker, roleChecker };
}

// Auto-initialize when Firebase is ready
if (window.firebaseModules) {
    setTimeout(initRoleChecker, 1000);
} else {
    // Listen for Firebase initialization
    window.addEventListener('firebaseReady', initRoleChecker);
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initRoleChecker, 1500);
    });
}

// Global helper functions
window.checkRoleAndRedirect = async () => {
    if (window.roleChecker) {
        return await window.roleChecker.checkAndRedirect();
    }
    return false;
};

window.protectPage = async (requiredRole) => {
    if (window.roleChecker) {
        return await window.roleChecker.protectPage(requiredRole);
    }
    return false;
};

window.getUserRole = async () => {
    if (window.roleChecker) {
        return await window.roleChecker.getUserRole();
    }
    return null;
};