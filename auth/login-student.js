/**
 * DDQuest - Student Login Script
 * Handles student authentication with Firebase
 */

// DOM Elements
let loginForm, loginBtn, alertContainer, forgotPasswordLink;
let emailInput, passwordInput, rememberMeCheckbox;
let loadingOverlay, loadingText, loadingSubtext;
let signupSuccess, successMessage;

// Initialize the login page
function initLoginPage() {
    console.log("📄 Initializing login page...");
    
    // Get DOM elements
    loginForm = document.getElementById('loginForm');
    loginBtn = document.getElementById('loginBtn');
    alertContainer = document.getElementById('alertContainer');
    forgotPasswordLink = document.getElementById('forgotPasswordLink');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    rememberMeCheckbox = document.getElementById('rememberMe');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingText = document.getElementById('loadingText');
    loadingSubtext = document.getElementById('loadingSubtext');
    signupSuccess = document.getElementById('signupSuccess');
    successMessage = document.getElementById('successMessage');
    
    // Check for success messages from signup
    checkSignupSuccess();
    
    // Setup event listeners
    setupEventListeners();
    
    // Auto-fill saved credentials
    autoFillCredentials();
    
    console.log("✅ Login page initialized");
}

// Check for signup success messages in URL
function checkSignupSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const email = urlParams.get('email');
    
    if (message === 'signup_success' && email) {
        // Show success message and auto-fill email
        if (successMessage) {
            successMessage.textContent = `Account created successfully! Please log in with ${email}`;
        }
        if (signupSuccess) {
            signupSuccess.classList.add('show');
        }
        if (emailInput) {
            emailInput.value = decodeURIComponent(email);
            emailInput.focus();
        }
        
        // Auto-hide success message after 10 seconds
        setTimeout(() => {
            if (signupSuccess) {
                signupSuccess.classList.remove('show');
            }
        }, 10000);
        
        // Clean URL (remove parameters)
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // Forgot password link
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
}

// Auto-fill saved credentials from localStorage
function autoFillCredentials() {
    if (!emailInput || !rememberMeCheckbox) return;
    
    const savedEmail = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail');
    const savedRememberMe = localStorage.getItem('rememberMe');
    
    if (savedEmail) {
        emailInput.value = savedEmail;
        if (savedRememberMe === 'true' && rememberMeCheckbox) {
            rememberMeCheckbox.checked = true;
        }
    }
}

// Show alert message
function showAlert(message, type = 'error') {
    if (!alertContainer) return;
    
    alertContainer.innerHTML = `
        <div class="alert alert-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
            <button class="alert-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Auto-remove success alerts after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    }
}

// Show loading overlay
function showLoading(message = 'Processing...', subtext = 'Please wait') {
    if (loadingText) loadingText.textContent = message;
    if (loadingSubtext) loadingSubtext.textContent = subtext;
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

// Clear form error
function clearError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.style.display = 'none';
        input.classList.remove('error');
    }
}

// Show form error
function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const errorDiv = input.parentElement.querySelector('.error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        input.classList.add('error');
    }
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate login form
function validateLoginForm() {
    let isValid = true;
    
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    
    // Clear errors
    clearError('email');
    clearError('password');
    
    // Validate email
    if (!email) {
        showError('email', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('email', 'Invalid email format');
        isValid = false;
    }
    
    // Validate password
    if (!password) {
        showError('password', 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showError('password', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    return isValid;
}

// Handle login form submission
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    if (!validateLoginForm()) return;
    
    // Check if Firebase auth service is available
    if (!window.authService) {
        showAlert('Authentication service is not ready. Please refresh the page.', 'error');
        return;
    }
    
    // Get form data
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;
    
    // Show loading state
    showLoading('Logging in...', 'Authenticating your credentials');
    
    // Disable login button
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    }
    
    try {
        // Call auth service for login
        const result = await authService.loginStudent(email, password, rememberMe);
        
        if (result.success) {
            // Show success message
            showAlert('Login successful! Redirecting...', 'success');
            
            // Store user credentials if remember me is checked
            if (rememberMe) {
                localStorage.setItem('userEmail', email);
                localStorage.setItem('rememberMe', 'true');
                // Clear session storage
                sessionStorage.removeItem('userEmail');
            } else {
                sessionStorage.setItem('userEmail', email);
                localStorage.removeItem('rememberMe');
            }
            
            // Store user data
            if (result.userData) {
                localStorage.setItem('userData', JSON.stringify(result.userData));
                localStorage.setItem('userId', result.user.uid);
                localStorage.setItem('userRole', result.userData.role || 'student');
            }
            
            // Update loading message
            showLoading('Login successful!', 'Redirecting to dashboard...');
            
            // Check if email is verified
            if (result.user && !result.user.emailVerified) {
                console.warn('⚠️ Email not verified');
                // You can show a warning or resend verification email here
            }
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = '../student/dashboard/index.html';
            }, 1500);
            
        } else {
            // Show error message
            showAlert(result.error, 'error');
            
            // Re-enable login button
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Account';
            }
            
            hideLoading();
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An unexpected error occurred. Please try again.', 'error');
        
        // Re-enable login button
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login to Account';
        }
        
        hideLoading();
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    // Get email from input or prompt
    let email = '';
    if (emailInput && emailInput.value.trim()) {
        email = emailInput.value.trim();
    } else {
        email = prompt('Enter your email address to reset password:');
        if (!email) return;
    }
    
    // Validate email
    if (!validateEmail(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Check if auth service is available
    if (!window.authService) {
        alert('Authentication service not available. Please refresh the page.');
        return;
    }
    
    // Show confirmation
    const confirmReset = confirm(`Send password reset email to ${email}?`);
    if (!confirmReset) return;
    
    try {
        const result = await authService.resetPassword(email);
        
        if (result.success) {
            alert('✅ Password reset email sent! Please check your inbox and spam folder.');
            showAlert('Password reset email sent. Check your inbox.', 'success');
        } else {
            alert('❌ Error: ' + result.error);
            showAlert('Failed to send reset email: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        alert('Failed to send reset email. Please try again.');
        showAlert('Failed to send reset email. Please try again.', 'error');
    }
}

// Check Firebase connection status
function checkFirebaseConnection() {
    setTimeout(() => {
        if (!window.firebaseApp) {
            showAlert('Unable to connect to DDQuest servers. Please check your internet connection.', 'error');
            if (loginBtn) loginBtn.disabled = true;
        } else {
            console.log("✅ Firebase connection verified");
        }
    }, 3000);
}

// Check if user is already logged in and redirect
function checkAuthState() {
    if (!window.firebaseAuth) return;
    
    // Listen for auth state changes
    firebaseAuth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("👤 User already authenticated:", user.uid.substring(0, 8) + "...");
            
            try {
                // Get user data from Firestore
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js");
                const userDoc = await getDoc(doc(firestoreDb, "users", user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Redirect based on role
                    if (userData.role === 'student') {
                        console.log("🎯 Redirecting student to dashboard");
                        window.location.href = '../student/dashboard/index.html';
                    } else if (userData.role === 'admin') {
                        window.location.href = '../admin/dashboard/index.html';
                    }
                }
            } catch (error) {
                console.warn("Could not check user role:", error);
            }
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Login page loaded");
    initLoginPage();
    checkFirebaseConnection();
    
    // Check auth state after Firebase is initialized
    setTimeout(checkAuthState, 1000);
});

// Make functions available globally (for inline event handlers if needed)
window.showAlert = showAlert;
window.handleForgotPassword = handleForgotPassword;

// Add CSS for alerts if not already present
const style = document.createElement('style');
style.textContent = `
    .alert-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        margin-left: auto;
        opacity: 0.7;
        transition: opacity 0.3s;
        padding: 0;
        font-size: 16px;
    }
    
    .alert-close:hover {
        opacity: 1;
    }
    
    .signup-success {
        background: #d4edda;
        color: #155724;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 25px;
        border: 1px solid #c3e6cb;
        display: none;
    }
    
    .signup-success.show {
        display: block;
        animation: fadeIn 0.5s ease;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);