// Admin Request Form Handler - Firebase v9
class AdminRequestHandler {
    constructor() {
        this.form = null;
        this.submitBtn = null;
        this.saveDraftBtn = null;
        this.alertContainer = null;
        this.loadingOverlay = null;
        this.permissionWarning = null;
        this.draftKey = 'adminRequestDraft';
        this.isSubmitting = false;
        
        this.init();
    }
    
    async init() {
        console.log("📄 Admin Request Handler initializing...");
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Initialize elements
        this.initializeElements();
        
        // Wait for adminRequestService to be ready
        await this.waitForAdminRequestService();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load saved draft
        this.loadDraft();
        
        // Setup auto-save
        this.setupAutoSave();
        
        console.log("✅ Admin Request Handler initialized");
    }
    
    initializeElements() {
        this.form = document.getElementById('requestForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.saveDraftBtn = document.getElementById('saveDraftBtn');
        this.alertContainer = document.getElementById('alertContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.loadingSubtext = document.getElementById('loadingSubtext');
        this.permissionWarning = document.getElementById('permissionWarning');
        
        if (!this.form) {
            throw new Error('Request form not found');
        }
    }
    
    async waitForAdminRequestService() {
        // Check if service already exists
        if (window.adminRequestService) {
            return true;
        }
        
        // Wait for service to be ready
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.adminRequestService) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('AdminRequestService not available after 10 seconds');
                this.showAlert('Service not available. Please refresh the page.', 'error');
                resolve(false);
            }, 10000);
        });
    }
    
    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Save draft button
        if (this.saveDraftBtn) {
            this.saveDraftBtn.addEventListener('click', () => this.saveDraft());
        }
        
        // Clear errors on input
        this.form.addEventListener('input', (e) => {
            if (e.target.classList.contains('error')) {
                this.clearError(e.target.id);
            }
        });
        
        // Email validation on blur
        const emailField = document.getElementById('email');
        if (emailField) {
            emailField.addEventListener('blur', () => this.validateEmailField());
        }
        
        // Phone validation on blur
        const phoneField = document.getElementById('phone');
        if (phoneField) {
            phoneField.addEventListener('blur', () => this.validatePhoneField());
        }
        
        // Reason validation on input
        const reasonField = document.getElementById('reason');
        if (reasonField) {
            reasonField.addEventListener('input', () => this.validateReasonField());
        }
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Show permission warning
        this.showPermissionWarning();
        
        // Collect form data
        const formData = this.collectFormData();
        
        // Show loading
        this.showLoading('Submitting your request...', 'Please wait while we process your application');
        this.setSubmitButtonState(true);
        this.isSubmitting = true;
        
        try {
            const result = await window.adminRequestService.submitAdminRequest(formData);
            
            if (result.success) {
                // Hide permission warning
                this.hidePermissionWarning();
                
                this.showAlert(result.message, 'success');
                
                // Show request ID
                if (result.requestId) {
                    this.showAlert(`Your Request ID: ${result.requestId}. Please save this for reference.`, 'info');
                }
                
                // Clear form and localStorage
                this.form.reset();
                localStorage.removeItem(this.draftKey);
                
                // Update loading message
                this.showLoading('Request submitted successfully!', 'Redirecting to admin login...');
                
                // Redirect after 3 seconds
                setTimeout(() => {
                    window.location.href = 'login-admin.html?message=request_submitted&email=' + encodeURIComponent(formData.email);
                }, 3000);
                
            } else {
                this.showAlert(result.error, 'error');
                this.setSubmitButtonState(false);
                this.isSubmitting = false;
                this.hideLoading();
                this.hidePermissionWarning();
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showAlert('An unexpected error occurred. Please try again.', 'error');
            this.setSubmitButtonState(false);
            this.isSubmitting = false;
            this.hideLoading();
            this.hidePermissionWarning();
        }
    }
    
    validateForm() {
        let isValid = true;
        
        // Clear previous errors
        this.clearAllErrors();
        
        // Required fields
        const requiredFields = [
            'fullName', 'email', 'phone', 'designation', 
            'college', 'department', 'adminLevel', 'reason'
        ];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            const value = field.type === 'select-one' ? field.value : field.value.trim();
            
            if (!value) {
                this.showError(fieldId, 'This field is required');
                isValid = false;
            }
        });
        
        // Email validation
        const email = document.getElementById('email').value.trim();
        if (email && !this.isValidEmail(email)) {
            this.showError('email', 'Invalid email address format');
            isValid = false;
        }
        
        // Phone validation
        const phone = document.getElementById('phone').value.trim();
        if (phone && !this.isValidPhone(phone)) {
            this.showError('phone', 'Invalid phone number (10 digits required)');
            isValid = false;
        }
        
        // Check for institutional email (warning only)
        if (email && !this.isInstitutionalEmail(email)) {
            const confirmContinue = confirm('For better verification, please use your institutional email (.edu, .ac.in, etc.). Continue with this email?');
            if (!confirmContinue) {
                document.getElementById('email').focus();
                return false;
            }
        }
        
        // Reason length validation
        const reason = document.getElementById('reason').value.trim();
        if (reason && reason.length < 20) {
            this.showError('reason', 'Please provide a more detailed reason (minimum 20 characters)');
            isValid = false;
        }
        
        // Checkboxes validation
        const verifyCheckbox = document.getElementById('verifyInfo');
        const termsCheckbox = document.getElementById('agreeTerms');
        
        if (!verifyCheckbox.checked) {
            this.showAlert('Please verify that your information is accurate', 'error');
            isValid = false;
        }
        
        if (!termsCheckbox.checked) {
            this.showAlert('Please agree to the admin guidelines', 'error');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateEmailField() {
        const email = document.getElementById('email').value.trim();
        if (email && !this.isValidEmail(email)) {
            this.showError('email', 'Invalid email format');
        } else {
            this.clearError('email');
        }
    }
    
    validatePhoneField() {
        const phone = document.getElementById('phone').value.trim();
        if (phone && !this.isValidPhone(phone)) {
            this.showError('phone', 'Invalid phone number (10 digits)');
        } else {
            this.clearError('phone');
        }
    }
    
    validateReasonField() {
        const reason = document.getElementById('reason').value.trim();
        if (reason && reason.length < 20 && reason.length > 0) {
            this.showError('reason', 'Please provide a more detailed reason (minimum 20 characters)');
        } else {
            this.clearError('reason');
        }
    }
    
    // Helper functions
    clearError(fieldId) {
        const input = document.getElementById(fieldId);
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.style.display = 'none';
            input.classList.remove('error');
        }
    }
    
    clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.style.display = 'none';
        });
        document.querySelectorAll('.form-control').forEach(el => {
            el.classList.remove('error');
        });
        this.alertContainer.innerHTML = '';
    }
    
    showError(fieldId, message) {
        const input = document.getElementById(fieldId);
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            input.classList.add('error');
        }
    }
    
    showAlert(message, type = 'error') {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        this.alertContainer.innerHTML = `
            <div class="alert alert-${type}">
                <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Auto-remove success alerts after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                const alert = this.alertContainer.querySelector('.alert');
                if (alert) alert.remove();
            }, 5000);
        }
    }
    
    showLoading(message = 'Processing...', subtext = 'Please wait') {
        if (this.loadingText) this.loadingText.textContent = message;
        if (this.loadingSubtext) this.loadingSubtext.textContent = subtext;
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'flex';
    }
    
    hideLoading() {
        if (this.loadingOverlay) this.loadingOverlay.style.display = 'none';
    }
    
    showPermissionWarning() {
        if (this.permissionWarning) this.permissionWarning.classList.add('show');
    }
    
    hidePermissionWarning() {
        if (this.permissionWarning) this.permissionWarning.classList.remove('show');
    }
    
    setSubmitButtonState(isLoading) {
        if (!this.submitBtn) return;
        
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
            if (this.saveDraftBtn) this.saveDraftBtn.disabled = true;
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request for Review';
            if (this.saveDraftBtn) this.saveDraftBtn.disabled = false;
        }
    }
    
    collectFormData() {
        return {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim().toLowerCase(),
            phone: document.getElementById('phone').value.trim(),
            designation: document.getElementById('designation').value,
            college: document.getElementById('college').value.trim(),
            department: document.getElementById('department').value.trim(),
            experience: document.getElementById('experience').value || '',
            adminLevel: document.getElementById('adminLevel').value,
            reason: document.getElementById('reason').value.trim(),
            subjects: document.getElementById('subjects').value.trim() || ''
        };
    }
    
    saveDraft() {
        try {
            const formData = this.collectFormData();
            localStorage.setItem(this.draftKey, JSON.stringify(formData));
            this.showAlert('Draft saved successfully', 'success');
        } catch (error) {
            console.error('Save draft error:', error);
            this.showAlert('Failed to save draft', 'error');
        }
    }
    
    loadDraft() {
        try {
            const savedDraft = localStorage.getItem(this.draftKey);
            if (!savedDraft) return;
            
            const formData = JSON.parse(savedDraft);
            
            // Ask user if they want to restore
            if (confirm('Found a saved draft. Restore previous data?')) {
                Object.keys(formData).forEach(key => {
                    const element = document.getElementById(key);
                    if (element && formData[key]) {
                        element.value = formData[key];
                    }
                });
            } else {
                localStorage.removeItem(this.draftKey);
            }
        } catch (error) {
            console.error('Load draft error:', error);
            localStorage.removeItem(this.draftKey);
        }
    }
    
    setupAutoSave() {
        let saveTimeout;
        
        this.form.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveDraft();
            }, 1000);
        });
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isValidPhone(phone) {
        const phoneRegex = /^[0-9]{10}$/;
        return phoneRegex.test(phone);
    }
    
    isInstitutionalEmail(email) {
        const institutionalDomains = ['.edu', '.ac.in', '.edu.in', '.ac.', '.sch.'];
        return institutionalDomains.some(domain => email.includes(domain));
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.adminRequestHandler = new AdminRequestHandler();
    } catch (error) {
        console.error('Failed to initialize Admin Request Handler:', error);
        alert('Failed to initialize the form. Please refresh the page.');
    }
});