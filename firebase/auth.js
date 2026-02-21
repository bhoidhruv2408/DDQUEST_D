// firebase/auth.js - Firebase v9 Modular Version

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp,
    collection,
    addDoc,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

class AuthService {
    constructor() {
        this.auth = window.firebaseAuth;
        this.firestore = window.firestoreDb;
        this.currentUser = null;
        this.userData = null;
        
        // Listen for auth state changes
        if (this.auth) {
            onAuthStateChanged(this.auth, async (user) => {
                this.currentUser = user;
                if (user) {
                    await this.loadUserData(user.uid);
                } else {
                    this.userData = null;
                }
            });
        }
    }

    // ==================== LOAD USER DATA ====================
    
    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(this.firestore, "users", uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                return this.userData;
            }
            return null;
        } catch (error) {
            console.error("Error loading user data:", error);
            return null;
        }
    }

    // ==================== STUDENT AUTH ====================
    
    async signupStudent(studentData) {
        try {
            // Validate data
            if (!this.validateStudentData(studentData)) {
                return { success: false, error: "Invalid student data" };
            }
            
            // Check if email already exists
            const emailCheck = await getDocs(
                query(collection(this.firestore, "users"), 
                      where("email", "==", studentData.email))
            );
            
            if (!emailCheck.empty) {
                return { success: false, error: "Email already registered" };
            }
            
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                this.auth,
                studentData.email,
                studentData.password
            );
            
            const user = userCredential.user;
            
            // Prepare user document
            const userDoc = {
                uid: user.uid,
                email: studentData.email,
                fullName: studentData.fullName,
                role: 'student',
                studentProfile: {
                    semester: parseInt(studentData.semester),
                    branch: studentData.branch,
                    enrollmentNo: studentData.enrollmentNo,
                    college: studentData.college,
                    admissionYear: studentData.admissionYear || new Date().getFullYear(),
                    phone: studentData.phone || '',
                    address: studentData.address || ''
                },
                status: 'active',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                emailVerified: false,
                profileComplete: false,
                notifications: {
                    email: true,
                    push: true,
                    testReminders: true
                }
            };
            
            // Save to Firestore
            await setDoc(doc(this.firestore, "users", user.uid), userDoc);
            
            // Create initial progress document
            await setDoc(doc(this.firestore, "studentProgress", user.uid), {
                userId: user.uid,
                semester: parseInt(studentData.semester),
                totalTestsTaken: 0,
                averageScore: 0,
                totalStudyTime: 0, // in minutes
                subjectsCompleted: {},
                lastActive: serverTimestamp(),
                achievements: [],
                streak: 0,
                weeklyProgress: [],
                ddcetScore: 0
            });
            
            // Send verification email
            await sendEmailVerification(user);
            
            // Sign in automatically
            this.currentUser = user;
            this.userData = userDoc;
            
            return { 
                success: true, 
                user: user,
                userData: userDoc,
                message: "Account created successfully! Please verify your email."
            };
            
        } catch (error) {
            console.error("Signup error:", error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    async loginStudent(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(this.firestore, "users", user.uid));
            
            if (!userDoc.exists()) {
                await signOut(this.auth);
                return { success: false, error: "Account not found in system" };
            }
            
            const userData = userDoc.data();
            
            // Validate role
            if (userData.role !== 'student') {
                await signOut(this.auth);
                return { success: false, error: "Not a student account" };
            }
            
            // Validate status
            if (userData.status !== 'active') {
                await signOut(this.auth);
                return { success: false, error: "Account is suspended" };
            }
            
            // Update last login
            await updateDoc(doc(this.firestore, "users", user.uid), {
                lastLogin: serverTimestamp()
            });
            
            // Update student progress last active
            await updateDoc(doc(this.firestore, "studentProgress", user.uid), {
                lastActive: serverTimestamp()
            });
            
            this.currentUser = user;
            this.userData = userData;
            
            return { 
                success: true, 
                user: user,
                userData: userData
            };
            
        } catch (error) {
            console.error("Login error:", error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // ==================== ADMIN AUTH ====================
    
    async loginAdmin(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            const user = userCredential.user;
            
            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(this.firestore, "users", user.uid));
            
            if (!userDoc.exists()) {
                await signOut(this.auth);
                return { success: false, error: "Admin account not found" };
            }
            
            const userData = userDoc.data();
            
            // Validate role
            if (userData.role !== 'admin') {
                await signOut(this.auth);
                return { success: false, error: "Not an admin account" };
            }
            
            // Validate status
            if (userData.status !== 'active') {
                await signOut(this.auth);
                return { success: false, error: "Admin account is suspended" };
            }
            
            // Check email verification for non-super admins
            if (!user.emailVerified && userData.adminLevel !== 'super') {
                await signOut(this.auth);
                return { success: false, error: "Please verify your email first" };
            }
            
            // Update last login
            await updateDoc(doc(this.firestore, "users", user.uid), {
                lastLogin: serverTimestamp()
            });
            
            this.currentUser = user;
            this.userData = userData;
            
            return { 
                success: true, 
                user: user,
                userData: userData
            };
            
        } catch (error) {
            console.error("Admin login error:", error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    async submitAdminRequest(requestData) {
        try {
            // Check if email already exists in users
            const usersSnapshot = await getDocs(
                query(collection(this.firestore, "users"), 
                      where("email", "==", requestData.email))
            );
            
            if (!usersSnapshot.empty) {
                return { success: false, error: "Email already registered as user" };
            }
            
            // Check for existing pending request
            const requestsSnapshot = await getDocs(
                query(collection(this.firestore, "adminRequests"),
                      where("email", "==", requestData.email),
                      where("status", "==", "pending"))
            );
            
            if (!requestsSnapshot.empty) {
                return { success: false, error: "Request already submitted and pending review" };
            }
            
            // Create admin request
            const requestRef = await addDoc(collection(this.firestore, "adminRequests"), {
                ...requestData,
                status: 'pending',
                requestedAt: serverTimestamp(),
                reviewedBy: null,
                reviewedAt: null,
                adminLevel: null
            });
            
            return { 
                success: true, 
                requestId: requestRef.id,
                message: "Admin request submitted successfully. You'll be notified once approved."
            };
            
        } catch (error) {
            console.error("Admin request error:", error);
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    // ==================== COMMON FUNCTIONS ====================
    
    async getCurrentUser(forceRefresh = false) {
        if (this.currentUser && !forceRefresh) {
            return {
                user: this.currentUser,
                data: this.userData
            };
        }
        
        return new Promise((resolve) => {
            onAuthStateChanged(this.auth, async (user) => {
                if (user) {
                    const userData = await this.loadUserData(user.uid);
                    resolve({
                        user: user,
                        data: userData
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    async logout() {
        try {
            await signOut(this.auth);
            this.currentUser = null;
            this.userData = null;
            return { success: true, message: "Logged out successfully" };
        } catch (error) {
            console.error("Logout error:", error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { 
                success: true, 
                message: "Password reset email sent. Check your inbox." 
            };
        } catch (error) {
            return { 
                success: false, 
                error: this.getErrorMessage(error) 
            };
        }
    }

    async updateProfile(userId, data) {
        try {
            await updateDoc(doc(this.firestore, "users", userId), {
                ...data,
                updatedAt: serverTimestamp()
            });
            
            // Refresh user data if it's the current user
            if (userId === this.currentUser?.uid) {
                await this.loadUserData(userId);
            }
            
            return { success: true, message: "Profile updated successfully" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async verifyEmail() {
        try {
            if (!this.currentUser) {
                return { success: false, error: "No user logged in" };
            }
            
            await sendEmailVerification(this.currentUser);
            return { success: true, message: "Verification email sent" };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    
    validateStudentData(data) {
        const requiredFields = ['email', 'password', 'fullName', 'semester', 'branch', 'enrollmentNo', 'college'];
        
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                return false;
            }
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return false;
        }
        
        // Validate password length
        if (data.password.length < 6) {
            return false;
        }
        
        // Validate semester (1-6)
        const semester = parseInt(data.semester);
        if (isNaN(semester) || semester < 1 || semester > 6) {
            return false;
        }
        
        return true;
    }

    getErrorMessage(error) {
        const errorMessages = {
            'auth/email-already-in-use': 'Email already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/user-disabled': 'Account has been disabled',
            'auth/user-not-found': 'User not found',
            'auth/wrong-password': 'Incorrect password',
            'auth/too-many-requests': 'Too many attempts. Try again later',
            'auth/requires-recent-login': 'Please login again to continue',
            'auth/network-request-failed': 'Network error. Check your connection',
            'auth/user-token-expired': 'Session expired. Please login again',
            'auth/popup-closed-by-user': 'Login popup was closed',
            'auth/cancelled-popup-request': 'Login cancelled',
            'auth/popup-blocked': 'Popup blocked by browser. Allow popups for this site'
        };
        
        return errorMessages[error.code] || error.message || 'An error occurred';
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUserRole() {
        return this.userData?.role || null;
    }

    getUserData() {
        return this.userData;
    }

    getUserId() {
        return this.currentUser?.uid || null;
    }

    async checkEmailExists(email) {
        try {
            const snapshot = await getDocs(
                query(collection(this.firestore, "users"), 
                      where("email", "==", email))
            );
            return !snapshot.empty;
        } catch (error) {
            console.error("Check email error:", error);
            return false;
        }
    }
}

// Initialize and export
let authService = null;

async function initAuthService() {
    try {
        // Wait for Firebase to be initialized
        if (!window.firebaseAuth || !window.firestoreDb) {
            console.warn("Firebase services not available yet. Retrying in 1 second...");
            setTimeout(initAuthService, 1000);
            return;
        }
        
        authService = new AuthService();
        window.authService = authService;
        console.log("✅ Auth Service v9 initialized successfully");
        
        // Dispatch event that auth service is ready
        window.dispatchEvent(new Event('authServiceReady'));
        
        return authService;
    } catch (error) {
        console.error("Failed to initialize Auth Service:", error);
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, initAuthService, authService };
}

// Auto-initialize when Firebase is ready
if (window.firebaseModules) {
    // Initialize after a short delay to ensure Firebase is ready
    setTimeout(initAuthService, 500);
} else {
    console.warn("Firebase modules not loaded. Auth service will initialize when available.");
    
    // Listen for Firebase initialization
    window.addEventListener('firebaseReady', initAuthService);
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initAuthService, 1000);
    });
}