/**
 * DDQuest - Student Signup Script
 * Handles student registration with Firebase Authentication and Firestore
 */

// DOM Elements
let steps, sections, signupForm, signupBtn, alertContainer, passwordInput;
let strengthFill, strengthText, loadingOverlay, loadingText, loadingSubtext;
let currentStep = 1;

// Initialize the signup page
function initSignupPage() {
    console.log("📄 Initializing signup page...");
    
    // Get DOM elements
    steps = document.querySelectorAll('.step');
    sections = document.querySelectorAll('.form-section');
    signupForm = document.getElementById('signupForm');
    signupBtn = document.getElementById('signupBtn');
    alertContainer = document.getElementById('alertContainer');
    passwordInput = document.getElementById('password');
    strengthFill = document.getElementById('strengthFill');
    strengthText = document.getElementById('strengthText');
    loadingOverlay = document.getElementById('loadingOverlay');
    loadingText = document.getElementById('loadingText');
    loadingSubtext = document.getElementById('loadingSubtext');
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize first step
    showStep(1);
    
    console.log("✅ Signup page initialized");
}

// Setup all event listeners
function setupEventListeners() {
    // Password strength indicator
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
    
    // Step navigation
    const nextStep1 = document.getElementById('nextStep1');
    const prevStep2 = document.getElementById('prevStep2');
    const nextStep2 = document.getElementById('nextStep2');
    const prevStep3 = document.getElementById('prevStep3');
    
    if (nextStep1) nextStep1.addEventListener('click', handleNextStep1);
    if (prevStep2) prevStep2.addEventListener('click', handlePrevStep2);
    if (nextStep2) nextStep2.addEventListener('click', handleNextStep2);
    if (prevStep3) prevStep3.addEventListener('click', handlePrevStep3);
    
    // Form submission
    if (signupForm) {
        signupForm.addEventListener('submit', handleFormSubmit);
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

// Show/hide step sections
function showStep(stepNumber) {
    // Hide all sections
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Update steps
    steps.forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Show current section
    const currentSection = document.getElementById(`section${stepNumber}`);
    if (currentSection) {
        currentSection.classList.add('active');
    }
    
    // Update steps
    for (let i = 1; i <= stepNumber; i++) {
        const step = document.getElementById(`step${i}`);
        if (step) {
            if (i === stepNumber) {
                step.classList.add('active');
            } else {
                step.classList.add('completed');
            }
        }
    }
    
    currentStep = stepNumber;
}

// Step 1 validation
function validateStep1() {
    let isValid = true;
    
    const fullName = document.getElementById('fullName')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const college = document.getElementById('college')?.value.trim();
    
    // Clear errors
    clearError('fullName');
    clearError('email');
    clearError('phone');
    clearError('college');
    
    // Validate name
    if (!fullName) {
        showError('fullName', 'Full name is required');
        isValid = false;
    } else if (fullName.length < 3) {
        showError('fullName', 'Name must be at least 3 characters');
        isValid = false;
    }
    
    // Validate email
    if (!email) {
        showError('email', 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('email', 'Invalid email format');
        isValid = false;
    }
    
    // Validate phone (optional)
    if (phone && !validatePhone(phone)) {
        showError('phone', 'Invalid phone number (10 digits required)');
        isValid = false;
    }
    
    // Validate college
    if (!college) {
        showError('college', 'College name is required');
        isValid = false;
    }
    
    return isValid;
}

// Step 2 validation
function validateStep2() {
    let isValid = true;
    
    const semester = document.getElementById('semester')?.value;
    const branch = document.getElementById('branch')?.value;
    const enrollmentNo = document.getElementById('enrollmentNo')?.value.trim();
    
    // Clear errors
    clearError('semester');
    clearError('branch');
    clearError('enrollmentNo');
    
    // Validate semester
    if (!semester) {
        showError('semester', 'Please select semester');
        isValid = false;
    }
    
    // Validate branch
    if (!branch) {
        showError('branch', 'Please select branch');
        isValid = false;
    }
    
    // Validate enrollment number
    if (!enrollmentNo) {
        showError('enrollmentNo', 'Enrollment number is required');
        isValid = false;
    } else if (enrollmentNo.length < 5) {
        showError('enrollmentNo', 'Enrollment number is too short');
        isValid = false;
    }
    
    return isValid;
}

// Step 3 validation
function validateStep3() {
    let isValid = true;
    
    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const terms = document.getElementById('terms')?.checked;
    
    // Clear errors
    clearError('password');
    clearError('confirmPassword');
    
    // Validate password
    if (!password) {
        showError('password', 'Password is required');
        isValid = false;
    } else {
        const validation = validatePassword(password);
        if (!validation.valid) {
            showError('password', validation.message);
            isValid = false;
        }
    }
    
    // Validate confirm password
    if (!confirmPassword) {
        showError('confirmPassword', 'Please confirm password');
        isValid = false;
    } else if (password !== confirmPassword) {
        showError('confirmPassword', 'Passwords do not match');
        isValid = false;
    }
    
    // Validate terms
    if (!terms) {
        showAlert('You must agree to the terms and conditions', 'error');
        isValid = false;
    }
    
    return isValid;
}

// Validation helper functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

function validatePassword(password) {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    return { valid: true, message: 'Password is strong' };
}

// Error display helper functions
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

// Password strength checker
function checkPasswordStrength(password) {
    if (!strengthFill || !strengthText) return;
    
    let strength = 0;
    let text = '';
    let color = '#f94144';
    
    // Length check
    if (password.length >= 8) strength++;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength++;
    // Lowercase check
    if (/[a-z]/.test(password)) strength++;
    // Number check
    if (/[0-9]/.test(password)) strength++;
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch(strength) {
        case 0:
        case 1:
            text = 'Weak';
            color = '#f94144';
            break;
        case 2:
            text = 'Fair';
            color = '#f8961e';
            break;
        case 3:
            text = 'Good';
            color = '#4cc9f0';
            break;
        case 4:
        case 5:
            text = 'Strong';
            color = '#2ed573';
            break;
    }
    
    strengthFill.style.width = `${strength * 20}%`;
    strengthFill.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
}

// Step navigation handlers
function handleNextStep1() {
    if (validateStep1()) {
        showStep(2);
    }
}

function handlePrevStep2() {
    showStep(1);
}

function handleNextStep2() {
    if (validateStep2()) {
        showStep(3);
    }
}

function handlePrevStep3() {
    showStep(2);
}

// Main form submission handler
async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    // Check if Firebase is initialized
    if (!window.authService) {
        showAlert('Authentication service is not ready. Please refresh the page.', 'error');
        return;
    }
    
    // Collect form data
    const studentData = {
        fullName: document.getElementById('fullName')?.value.trim() || '',
        email: document.getElementById('email')?.value.trim().toLowerCase() || '',
        phone: document.getElementById('phone')?.value.trim() || '',
        college: document.getElementById('college')?.value.trim() || '',
        semester: document.getElementById('semester')?.value || '',
        branch: document.getElementById('branch')?.value || '',
        enrollmentNo: document.getElementById('enrollmentNo')?.value.trim().toUpperCase() || '',
        admissionYear: document.getElementById('admissionYear')?.value || new Date().getFullYear().toString(),
        password: document.getElementById('password')?.value || '',
        newsletter: document.getElementById('newsletter')?.checked || false
    };
    
    // Validate required fields
    if (!studentData.fullName || !studentData.email || !studentData.college || 
        !studentData.semester || !studentData.branch || !studentData.enrollmentNo) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    // Show loading state
    showLoading('Creating your account...', 'This may take a few seconds');
    
    if (signupBtn) {
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    }
    
    try {
        // Call auth service
        const result = await authService.signupStudent(studentData);
        
        if (result.success) {
            // Success message
            showAlert(result.message, 'success');
            
            // Update loading message
            showLoading('Account created successfully!', 'Redirecting to login page...');
            
            // Clear form
            if (signupForm) signupForm.reset();
            if (strengthFill) strengthFill.style.width = '0%';
            if (strengthText) strengthText.textContent = 'Password strength';
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
                const emailParam = encodeURIComponent(studentData.email);
                window.location.href = `login-student.html?message=signup_success&email=${emailParam}`;
            }, 3000);
            
        } else {
            // Error message
            showAlert(result.error, 'error');
            
            // Reset button
            if (signupBtn) {
                signupBtn.disabled = false;
                signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
            }
            
            hideLoading();
        }
        
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('An unexpected error occurred. Please try again.', 'error');
        
        // Reset button
        if (signupBtn) {
            signupBtn.disabled = false;
            signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
        
        hideLoading();
    }
}

// Check Firebase connection
function checkFirebaseConnection() {
    setTimeout(() => {
        if (!window.firebaseApp) {
            showAlert('Unable to connect to DDQuest servers. Please check your internet connection and refresh the page.', 'error');
            if (signupBtn) signupBtn.disabled = true;
        } else {
            console.log("✅ Firebase connection verified");
        }
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 Signup page loaded");
    initSignupPage();
    checkFirebaseConnection();
});

// Make functions available globally (for inline event handlers if needed)
window.showAlert = showAlert;
window.showStep = showStep;

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
    
    .password-hints {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px;
    }
    
    .password-hints small {
        font-size: 11px;
        color: #666;
        opacity: 0.7;
    }
`;
document.head.appendChild(style);