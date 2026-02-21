// auth/login-admin.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Admin Login Page Loaded");
    
    // Check if user is already logged in
    checkAdminSession();
    
    // Initialize form
    initLoginForm();
    
    // Check Firebase status
    checkFirebaseStatus();
});

// Check if admin is already logged in
async function checkAdminSession() {
    try {
        // Wait for Firebase to be ready
        if (!window.firebaseAuth) {
            console.log("⏳ Waiting for Firebase...");
            return;
        }
        
        const user = firebaseAuth.currentUser;
        if (user) {
            console.log("👤 User already authenticated:", user.uid);
            
            // Check if user exists in users collection
            const userDoc = await firestoreDb.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.role === 'admin' || userData.role === 'super_admin' || userData.adminLevel === 'admin' || userData.adminLevel === 'super_admin') {
                    console.log("✅ Admin already logged in, redirecting to dashboard");
                    window.location.href = '../admin/dashboard/index.html';
                    return;
                }
            }
            
            // If not in users, check adminRequests
            const adminRequestDoc = await firestoreDb.collection('adminRequests').doc(user.uid).get();
            if (adminRequestDoc.exists) {
                const requestData = adminRequestDoc.data();
                if ((requestData.adminLevel === 'admin' || requestData.adminLevel === 'super_admin') && requestData.approved === true) {
                    console.log("✅ Approved admin found in adminRequests, redirecting...");
                    window.location.href = '../admin/dashboard/index.html';
                }
            }
        }
    } catch (error) {
        console.error("❌ Session check error:", error);
    }
}

// Initialize login form
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const alertContainer = document.getElementById('alertContainer');
    
    if (!loginForm) {
        console.error("❌ Login form not found!");
        return;
    }
    
    // Load saved email if exists
    const savedEmail = localStorage.getItem('adminEmail');
    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
    }
    
    // Form submission handler
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        // Validate inputs
        if (!validateInputs(email, password)) {
            return;
        }
        
        // Show loading
        showLoading(true);
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
        
        try {
            // Sign in with Firebase Auth
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log("✅ Firebase authentication successful:", user.uid);
            
            // Check user role in Firestore
            let userDoc = await firestoreDb.collection('users').doc(user.uid).get();
            let userData = null;
            let isAdminUser = false;
            
            if (userDoc.exists) {
                // User exists in users collection
                userData = userDoc.data();
                console.log("✅ User found in users collection:", userData);
                
                // Check if user is admin
                isAdminUser = userData.role === 'admin' || 
                             userData.role === 'super_admin' || 
                             userData.adminLevel === 'admin' || 
                             userData.adminLevel === 'super_admin' ||
                             userData.isAdmin === true;
                
                if (!isAdminUser) {
                    await firebaseAuth.signOut();
                    throw new Error("This account does not have admin privileges");
                }
                
                // Check if admin account is active
                if (userData.isActive === false) {
                    await firebaseAuth.signOut();
                    throw new Error("Admin account is deactivated. Contact super admin.");
                }
                
            } else {
                // User doesn't exist in users collection, check adminRequests
                console.log("⏳ User not in users, checking adminRequests...");
                const adminRequestDoc = await firestoreDb.collection('adminRequests').doc(user.uid).get();
                
                if (adminRequestDoc.exists) {
                    const requestData = adminRequestDoc.data();
                    console.log("✅ User found in adminRequests:", requestData);
                    
                    // Check if this is an admin request
                    const isAdminRequest = requestData.adminLevel === 'admin' || 
                                          requestData.adminLevel === 'super_admin' ||
                                          requestData.adminLevel === 'content';
                    
                    if (!isAdminRequest) {
                        await firebaseAuth.signOut();
                        throw new Error("This account does not have admin privileges");
                    }
                    
                    // Check if request is approved
                    if (requestData.approved !== true && requestData.status !== 'approved') {
                        await firebaseAuth.signOut();
                        throw new Error("Admin account is pending approval. Contact super admin.");
                    }
                    
                    // Approved admin found in adminRequests - create user document
                    console.log("🔄 Creating user document for approved admin...");
                    
                    userData = {
                        email: requestData.email || email,
                        fullName: requestData.fullName || user.displayName || 'Admin User',
                        role: requestData.adminLevel || 'admin',
                        college: requestData.college || 'Not specified',
                        isActive: true,
                        createdAt: new Date(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogout: null,
                        profileImage: requestData.profileImage || '',
                        uid: user.uid,
                        adminLevel: requestData.adminLevel,
                        permissions: requestData.permissions || {}
                    };
                    
                    // Create user document
                    await firestoreDb.collection('users').doc(user.uid).set(userData);
                    
                    // Update adminRequest to mark as processed
                    await firestoreDb.collection('adminRequests').doc(user.uid).update({
                        processed: true,
                        movedToUsers: true,
                        processedAt: new Date()
                    });
                    
                    console.log("✅ Admin user document created successfully");
                    
                } else {
                    // User not found in any collection
                    throw new Error("Admin account not found in database. Please contact support.");
                }
            }
            
            // Save email if remember me is checked
            if (rememberMe) {
                localStorage.setItem('adminEmail', email);
                localStorage.setItem('adminRememberMe', 'true');
            } else {
                sessionStorage.setItem('adminEmail', email);
                localStorage.removeItem('adminEmail');
            }
            
            // Update last login if user exists in users
            if (userDoc.exists) {
                await firestoreDb.collection('users').doc(user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true
                });
            }
            
            // Show success message
            showAlert('✅ Admin login successful! Redirecting to dashboard...', 'success');
            
            // Store user data in localStorage for dashboard
            const finalUserData = userData || userDoc.data();
            localStorage.setItem('adminData', JSON.stringify(finalUserData));
            localStorage.setItem('adminId', user.uid);
            localStorage.setItem('adminRole', finalUserData.role || finalUserData.adminLevel);
            
            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = '../admin/dashboard/index.html';
            }, 1500);
            
        } catch (error) {
            console.error("❌ Login error:", error);
            
            let errorMessage = "Login failed. Please check your credentials.";
            
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = "Invalid email or password.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Invalid email address format.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "This account has been disabled.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "Too many failed attempts. Try again later.";
                    break;
                case 'auth/network-request-failed':
                    errorMessage = "Network error. Check your internet connection.";
                    break;
                default:
                    errorMessage = error.message || "Login failed. Please try again.";
            }
            
            showAlert(`❌ ${errorMessage}`, 'error');
            
            // Reset button
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-lock"></i> Login to Admin Portal';
            showLoading(false);
        }
    });
    
    // Forgot password handler
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', async function(e) {
            e.preventDefault();
            
            let email = emailInput.value.trim();
            if (!email) {
                email = prompt("Enter your admin email address:");
                if (!email) return;
            }
            
            if (!validateEmail(email)) {
                alert("Please enter a valid email address");
                return;
            }
            
            try {
                await firebaseAuth.sendPasswordResetEmail(email);
                showAlert("✅ Password reset email sent! Check your inbox.", 'success');
            } catch (error) {
                console.error("Password reset error:", error);
                showAlert("❌ Failed to send reset email. Please check the email address.", 'error');
            }
        });
    }
}

// Validate inputs
function validateInputs(email, password) {
    if (!email || !validateEmail(email)) {
        showAlert("❌ Please enter a valid email address", 'error');
        return false;
    }
    
    if (!password || password.length < 6) {
        showAlert("❌ Password must be at least 6 characters", 'error');
        return false;
    }
    
    return true;
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show alert message
function showAlert(message, type = 'error') {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Create alert container if doesn't exist
function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Show/hide loading
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Check Firebase status
function checkFirebaseStatus() {
    const checkInterval = setInterval(() => {
        if (window.firebaseAuth) {
            clearInterval(checkInterval);
            showFirebaseStatus(true);
        }
    }, 500);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.firebaseAuth) {
            showFirebaseStatus(false);
        }
    }, 10000);
}

// Show Firebase connection status
function showFirebaseStatus(connected) {
    const statusBadge = document.getElementById('firebaseStatusBadge');
    if (statusBadge) {
        if (connected) {
            statusBadge.innerHTML = '<i class="fas fa-check-circle"></i> Connected to DDQuest';
            statusBadge.style.background = '#10b981';
        } else {
            statusBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Connection Failed';
            statusBadge.style.background = '#ef4444';
        }
        statusBadge.style.display = 'flex';
    }
}