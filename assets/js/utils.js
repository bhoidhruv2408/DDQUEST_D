// assets/js/utils.js

class DDQuestUtils {
    constructor() {
        this.config = {
            maxFileSize: 20 * 1024 * 1024, // 20MB
            allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
            testDuration: 180, // 3 hours in minutes
            minPasswordLength: 6
        };
        
        // Detect if we're on an admin page
        this.isAdminPage = window.location.pathname.includes('/admin/');
    }

    // ========== VALIDATION FUNCTIONS ==========
    
    validateEmail(email) {
        if (!email) return false;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePhone(phone) {
        if (!phone) return false;
        const re = /^[0-9]{10}$/;
        return re.test(phone);
    }

    validatePassword(password) {
        if (!password || password.length < this.config.minPasswordLength) {
            return { valid: false, message: `Password must be at least ${this.config.minPasswordLength} characters` };
        }
        
        return { valid: true, message: 'Password is valid' };
    }

    validateEnrollmentNumber(enrollmentNo) {
        if (!enrollmentNo) return false;
        const re = /^[A-Za-z0-9]{8,15}$/;
        return re.test(enrollmentNo);
    }

    validateFile(file) {
        if (!file) {
            return { valid: false, errors: ['No file selected'] };
        }
        
        const errors = [];
        
        // Check file size
        if (file.size > this.config.maxFileSize) {
            errors.push(`File size exceeds ${this.config.maxFileSize / (1024 * 1024)}MB limit`);
        }
        
        // Check file type
        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.config.allowedFileTypes.includes(extension)) {
            errors.push(`File type not allowed. Allowed types: ${this.config.allowedFileTypes.join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ========== FORMATTING FUNCTIONS ==========
    
    formatDate(date, format = 'medium') {
        if (!date) return 'N/A';
        
        let d;
        if (typeof date === 'string') {
            d = new Date(date);
        } else if (date.toDate) {
            // Handle Firebase Timestamp
            d = date.toDate();
        } else {
            d = new Date(date);
        }
        
        if (isNaN(d.getTime())) return 'Invalid date';
        
        if (format === 'short') {
            return d.toLocaleDateString('en-IN');
        } else if (format === 'medium') {
            return d.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } else if (format === 'long') {
            return d.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else if (format === 'datetime') {
            return d.toLocaleString('en-IN');
        }
        
        return d.toLocaleDateString('en-IN');
    }

    formatTime(minutes) {
        if (!minutes && minutes !== 0) return '0m';
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours === 0) {
            return `${mins}m`;
        } else if (mins === 0) {
            return `${hours}h`;
        }
        
        return `${hours}h ${mins}m`;
    }

    formatFileSize(bytes) {
        if (!bytes) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatPercentage(value, total, decimals = 1) {
        if (!total || total === 0) return '0%';
        const percentage = (value / total) * 100;
        return `${percentage.toFixed(decimals)}%`;
    }

    // ========== UI HELPER FUNCTIONS ==========
    
    showToast(message, type = 'info', title = '') {
        // Don't show toasts on admin pages (they have their own system)
        if (this.isAdminPage) return null;
        
        // Remove existing toasts to avoid duplicates
        const existingToasts = document.querySelectorAll('.ddquest-toast');
        if (existingToasts.length > 3) {
            existingToasts[0].remove();
        }
        
        const toastId = 'toast-' + Date.now();
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = 'ddquest-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1e293b;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            border-left: 4px solid ${colors[type] || colors.info};
            animation: slideIn 0.3s ease;
            z-index: 10000;
            min-width: 300px;
            max-width: 400px;
        `;
        
        toast.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}" 
               style="color: ${colors[type] || colors.info}; font-size: 18px;"></i>
            <div style="flex: 1;">
                ${title ? `<div style="font-weight: 600; color: white; font-size: 14px; margin-bottom: 2px;">${title}</div>` : ''}
                <div style="font-size: 13px; color: #94a3b8;">${this.escapeHTML(message)}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 0;
                font-size: 14px;
            ">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Create toast container if not exists
        let toastContainer = document.getElementById('ddquest-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'ddquest-toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
            `;
            document.body.appendChild(toastContainer);
            
            // Add CSS animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const element = document.getElementById(toastId);
            if (element) element.remove();
        }, 5000);
        
        return toastId;
    }

    showLoading(text = 'Loading...', subtext = 'Please wait') {
        // Don't show loading on admin pages (they have their own)
        if (this.isAdminPage) return null;
        
        // Remove existing loading overlay
        const existingLoader = document.getElementById('ddquest-loading-overlay');
        if (existingLoader) existingLoader.remove();
        
        const loader = document.createElement('div');
        loader.id = 'ddquest-loading-overlay';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        loader.innerHTML = `
            <div style="
                background: #1e293b;
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                min-width: 300px;
            ">
                <div class="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 4px solid #334155;
                    border-top: 4px solid #4361ee;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div style="color: white; font-weight: 600; font-size: 16px; margin-bottom: 8px;">${this.escapeHTML(text)}</div>
                ${subtext ? `<div style="color: #94a3b8; font-size: 14px;">${this.escapeHTML(subtext)}</div>` : ''}
            </div>
        `;
        
        document.body.appendChild(loader);
        
        // Add CSS animation if not exists
        if (!document.getElementById('ddquest-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'ddquest-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        return loader;
    }

    hideLoading() {
        const loader = document.getElementById('ddquest-loading-overlay');
        if (loader) loader.remove();
    }

    // ========== FORM HELPER FUNCTIONS ==========
    
    serializeForm(form) {
        if (!form) return {};
        
        const data = {};
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            // Handle multiple values (like checkboxes)
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }

    validateForm(form) {
        if (!form) return false;
        
        const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            this.clearError(input);
            
            if (!input.value.trim()) {
                this.showError(input, 'This field is required');
                isValid = false;
            } else if (input.type === 'email' && !this.validateEmail(input.value)) {
                this.showError(input, 'Please enter a valid email address');
                isValid = false;
            } else if (input.type === 'tel' && !this.validatePhone(input.value)) {
                this.showError(input, 'Please enter a valid 10-digit phone number');
                isValid = false;
            } else if (input.type === 'password' && input.id === 'password') {
                const validation = this.validatePassword(input.value);
                if (!validation.valid) {
                    this.showError(input, validation.message);
                    isValid = false;
                }
            } else if (input.type === 'password' && input.id === 'confirmPassword') {
                const password = form.querySelector('#password');
                if (password && input.value !== password.value) {
                    this.showError(input, 'Passwords do not match');
                    isValid = false;
                }
            }
        });
        
        return isValid;
    }

    showError(input, message) {
        if (!input) return;
        
        input.classList.add('error');
        
        let errorElement = input.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                color: #ef4444;
                font-size: 12px;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 4px;
            `;
            input.parentNode.appendChild(errorElement);
        }
        
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${this.escapeHTML(message)}`;
    }

    clearError(input) {
        if (!input) return;
        
        input.classList.remove('error');
        
        const errorElement = input.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    // ========== DATA HELPER FUNCTIONS ==========
    
    escapeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    generateRandomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    debounce(func, wait) {
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

    throttle(func, limit) {
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

    // ========== STORAGE HELPERS ==========
    
    setLocalStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('LocalStorage set error:', error);
            return false;
        }
    }

    getLocalStorage(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('LocalStorage get error:', error);
            return null;
        }
    }

    removeLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('LocalStorage remove error:', error);
            return false;
        }
    }

    clearLocalStorage() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('LocalStorage clear error:', error);
            return false;
        }
    }

    // ========== NETWORK HELPERS ==========
    
    checkNetworkStatus() {
        return navigator.onLine;
    }

    async checkApiHealth(endpoint = '/api/health') {
        try {
            const response = await fetch(endpoint, { 
                method: 'HEAD',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // ========== MATH HELPERS ==========
    
    calculateAverage(scores) {
        if (!scores || scores.length === 0) return 0;
        const sum = scores.reduce((a, b) => a + b, 0);
        return sum / scores.length;
    }

    calculatePercentage(score, total) {
        if (!total || total === 0) return 0;
        return (score / total) * 100;
    }

    calculateGrade(percentage) {
        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        return 'F';
    }

    // ========== FIREBASE HELPERS ==========
    
    async getCurrentUser() {
        if (!window.firebaseAuth) return null;
        return new Promise((resolve) => {
            const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    async getUserData(userId) {
        if (!window.firestoreDb || !userId) return null;
        
        try {
            const userDoc = await firestoreDb.collection('users').doc(userId).get();
            return userDoc.exists ? userDoc.data() : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // ========== STRING HELPERS ==========
    
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    truncate(str, length = 50) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    // ========== ARRAY HELPERS ==========
    
    unique(array) {
        if (!array) return [];
        return [...new Set(array)];
    }

    shuffle(array) {
        if (!array) return [];
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // ========== OBJECT HELPERS ==========
    
    deepClone(obj) {
        if (!obj) return obj;
        return JSON.parse(JSON.stringify(obj));
    }

    mergeObjects(...objects) {
        return objects.reduce((result, current) => {
            return { ...result, ...current };
        }, {});
    }
}

// Initialize and export
let utils = null;

function initUtils() {
    // Don't initialize on admin pages (they have their own systems)
    if (window.location.pathname.includes('/admin/')) {
        console.log('🔧 Skipping utils initialization on admin page');
        return;
    }
    
    utils = new DDQuestUtils();
    window.utils = utils;
    console.log('✅ DDQuest Utils initialized');
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUtils);
    } else {
        initUtils();
    }
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DDQuestUtils, initUtils };
}