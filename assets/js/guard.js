// assets/js/guard.js

class RouteGuard {
    constructor() {
        this.auth = window.firebaseAuth;
        this.db = window.firebaseDb;
        this.currentUser = null;
        this.currentUserData = null;
    }

    // Initialize guard
    async init() {
        if (!this.auth || !this.db) {
            console.error('Firebase services not available');
            return false;
        }

        return new Promise((resolve) => {
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    // Get user data from Firestore
                    try {
                        const userDoc = await this.db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            this.currentUserData = userDoc.data();
                            resolve(true);
                        } else {
                            console.warn('User document not found in Firestore');
                            this.redirectToLogin();
                            resolve(false);
                        }
                    } catch (error) {
                        console.error('Error fetching user data:', error);
                        this.redirectToLogin();
                        resolve(false);
                    }
                } else {
                    this.currentUser = null;
                    this.currentUserData = null;
                    this.redirectToLogin();
                    resolve(false);
                }
            });
        });
    }

    // Protect route for specific role
    async protect(requiredRole = null, redirectPath = null) {
        const isAuthenticated = await this.init();
        
        if (!isAuthenticated) {
            return false;
        }

        // Check role if specified
        if (requiredRole && this.currentUserData) {
            if (this.currentUserData.role !== requiredRole) {
                this.redirectToRole(requiredRole, redirectPath);
                return false;
            }
        }

        return true;
    }

    // Get current user data
    getUser() {
        return this.currentUserData;
    }

    // Get user ID
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Check if user has specific role
    hasRole(role) {
        return this.currentUserData && this.currentUserData.role === role;
    }

    // Redirect to login
    redirectToLogin() {
        if (!window.location.pathname.includes('/auth/') && 
            !window.location.pathname.includes('/role.html') &&
            !window.location.pathname.includes('/index.html')) {
            window.location.href = '/role.html';
        }
    }

    // Redirect based on role
    redirectToRole(requiredRole, customPath = null) {
        if (customPath) {
            window.location.href = customPath;
        } else {
            switch(requiredRole) {
                case 'student':
                    window.location.href = '/student/dashboard/index.html';
                    break;
                case 'admin':
                    window.location.href = '/admin/dashboard/index.html';
                    break;
                default:
                    window.location.href = '/role.html';
            }
        }
    }

    // Logout user
    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            this.currentUserData = null;
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Update user data in Firestore
    async updateUserData(data) {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }
            await this.db.collection('users').doc(this.currentUser.uid).update(data);
            
            // Refresh user data
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                this.currentUserData = userDoc.data();
            }
            
            return { success: true };
        } catch (error) {
            console.error('Update user data error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user is verified (email)
    isEmailVerified() {
        return this.currentUser ? this.currentUser.emailVerified : false;
    }

    // Send email verification
    async sendEmailVerification() {
        try {
            if (!this.currentUser) {
                throw new Error('No user logged in');
            }
            await this.currentUser.sendEmailVerification();
            return { success: true };
        } catch (error) {
            console.error('Send verification email error:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user needs to complete profile
    isProfileComplete() {
        if (!this.currentUserData) return false;
        
        // Check student profile
        if (this.currentUserData.role === 'student') {
            return this.currentUserData.studentProfile && 
                   this.currentUserData.studentProfile.profileComplete === true;
        }
        
        // Check admin profile
        if (this.currentUserData.role === 'admin') {
            return this.currentUserData.adminProfile && 
                   this.currentUserData.adminProfile.profileComplete === true;
        }
        
        return true;
    }
}

// Initialize and export
let routeGuard = null;

function initRouteGuard() {
    if (window.firebaseAuth && window.firebaseDb) {
        routeGuard = new RouteGuard();
        window.routeGuard = routeGuard;
        console.log('✅ Route Guard initialized');
    } else {
        console.error('Firebase services not available for Route Guard');
    }
}

// Initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    setTimeout(initRouteGuard, 1000);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RouteGuard, initRouteGuard };
}