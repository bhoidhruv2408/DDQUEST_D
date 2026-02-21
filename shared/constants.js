// shared/constants.js

const DDQuestConstants = {
    // App Info
    APP_NAME: 'DDQuest',
    APP_VERSION: '1.0.0',
    APP_DESCRIPTION: 'Diploma Student Support Platform',
    
    // Firebase Collections
    COLLECTIONS: {
        USERS: 'users',
        STUDENTS: 'students',
        ADMINS: 'admins',
        MATERIALS: 'materials',
        TESTS: 'tests',
        QUESTIONS: 'questions',
        TEST_RESULTS: 'testResults',
        ADMIN_REQUESTS: 'adminRequests',
        NOTIFICATIONS: 'notifications',
        STUDENT_PROGRESS: 'studentProgress',
        ADMIN_LOGS: 'adminLogs',
        LIVE_TESTS: 'liveTests',
        SUBSCRIPTIONS: 'subscriptions'
    },
    
    // User Roles
    ROLES: {
        STUDENT: 'student',
        ADMIN: 'admin',
        SUPER_ADMIN: 'super_admin'
    },
    
    // Admin Levels
    ADMIN_LEVELS: {
        SUPER: 'super',
        CONTENT: 'content',
        MODERATOR: 'moderator'
    },
    
    // Admin Permissions
    PERMISSIONS: {
        // Super Admin
        MANAGE_USERS: 'manage_users',
        MANAGE_ADMINS: 'manage_admins',
        MANAGE_CONTENT: 'manage_content',
        MANAGE_TESTS: 'manage_tests',
        VIEW_ANALYTICS: 'view_analytics',
        APPROVE_REQUESTS: 'approve_requests',
        SYSTEM_SETTINGS: 'system_settings',
        
        // Content Admin
        UPLOAD_MATERIALS: 'upload_materials',
        CREATE_TESTS: 'create_tests',
        EDIT_CONTENT: 'edit_content',
        
        // Moderator
        MODERATE_CONTENT: 'moderate_content',
        VIEW_REPORTS: 'view_reports'
    },
    
    // Diploma Branches
    BRANCHES: [
        'Computer Engineering',
        'Information Technology',
        'Electrical Engineering',
        'Electronics & Telecommunication',
        'Mechanical Engineering',
        'Civil Engineering',
        'Chemical Engineering',
        'Automobile Engineering',
        'Instrumentation Engineering',
        'Production Engineering',
        'Textile Technology',
        'Printing Technology',
        'Other'
    ],
    
    // Semesters
    SEMESTERS: [
        { id: 1, name: 'Semester 1', subjects: ['Basic Mathematics', 'Physics', 'Communication Skills'] },
        { id: 2, name: 'Semester 2', subjects: ['Applied Mathematics', 'Engineering Drawing', 'Basic Electronics'] },
        { id: 3, name: 'Semester 3', subjects: ['Programming', 'Digital Electronics', 'Engineering Mechanics'] },
        { id: 4, name: 'Semester 4', subjects: ['Database Management', 'Computer Networks', 'Theory of Machines'] },
        { id: 5, name: 'Semester 5', subjects: ['Software Engineering', 'Web Development', 'Project Work'] },
        { id: 6, name: 'Semester 6', subjects: ['Final Project', 'Industrial Training', 'DDCET Preparation'] }
    ],
    
    // Test Types
    TEST_TYPES: {
        WEEKLY: 'weekly',
        DDCET: 'ddcet',
        SUBJECT: 'subject',
        MOCK: 'mock',
        PRACTICE: 'practice'
    },
    
    // Material Types
    MATERIAL_TYPES: {
        PDF: 'pdf',
        VIDEO: 'video',
        IMAGE: 'image',
        DOCUMENT: 'document',
        PRESENTATION: 'presentation',
        NOTES: 'notes'
    },
    
    // Question Types
    QUESTION_TYPES: {
        MCQ: 'mcq',
        TRUE_FALSE: 'true_false',
        SHORT_ANSWER: 'short_answer',
        DESCRIPTIVE: 'descriptive'
    },
    
    // Difficulty Levels
    DIFFICULTY: {
        EASY: 'easy',
        MEDIUM: 'medium',
        HARD: 'hard'
    },
    
    // Status Codes
    STATUS: {
        ACTIVE: 'active',
        INACTIVE: 'inactive',
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        SUSPENDED: 'suspended'
    },
    
    // File Upload Limits
    UPLOAD_LIMITS: {
        MAX_FILE_SIZE: 20 * 1024 * 1024, // 20MB
        MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi', 'ppt', 'pptx']
    },
    
    // Test Configuration
    TEST_CONFIG: {
        DURATION: {
            WEEKLY: 30, // minutes
            DDCET: 180, // 3 hours
            SUBJECT: 60 // 1 hour
        },
        PASSING_SCORE: 40, // percentage
        MAX_ATTEMPTS: 3
    },
    
    // Grading System
    GRADES: [
        { min: 90, max: 100, grade: 'A+', remark: 'Outstanding' },
        { min: 80, max: 89, grade: 'A', remark: 'Excellent' },
        { min: 70, max: 79, grade: 'B+', remark: 'Very Good' },
        { min: 60, max: 69, grade: 'B', remark: 'Good' },
        { min: 50, max: 59, grade: 'C', remark: 'Average' },
        { min: 40, max: 49, grade: 'D', remark: 'Pass' },
        { min: 0, max: 39, grade: 'F', remark: 'Fail' }
    ],
    
    // Notification Types
    NOTIFICATION_TYPES: {
        TEST_RESULT: 'test_result',
        NEW_MATERIAL: 'new_material',
        ADMIN_APPROVAL: 'admin_approval',
        WEEKLY_TEST: 'weekly_test',
        SYSTEM_UPDATE: 'system_update',
        ANNOUNCEMENT: 'announcement'
    },
    
    // Time Constants
    TIME: {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        WEEK: 7 * 24 * 60 * 60 * 1000
    },
    
    // API Endpoints (if using backend)
    API: {
        BASE_URL: 'https://api.ddquest.com/v1',
        ENDPOINTS: {
            AUTH: '/auth',
            USERS: '/users',
            MATERIALS: '/materials',
            TESTS: '/tests',
            ANALYTICS: '/analytics'
        }
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        USER_DATA: 'ddquest_user_data',
        AUTH_TOKEN: 'ddquest_auth_token',
        REMEMBER_ME: 'ddquest_remember_me',
        THEME: 'ddquest_theme',
        LANGUAGE: 'ddquest_language',
        LAST_VISIT: 'ddquest_last_visit'
    },
    
    // Theme Colors
    THEME: {
        PRIMARY: '#4361ee',
        SECONDARY: '#7209b7',
        SUCCESS: '#4cc9f0',
        WARNING: '#f8961e',
        DANGER: '#f94144',
        INFO: '#3a0ca3',
        LIGHT: '#f8f9fa',
        DARK: '#212529'
    },
    
    // Academic Year
    ACADEMIC_YEAR: {
        START_MONTH: 6, // June
        END_MONTH: 5    // May next year
    },
    
    // DDCET Specific
    DDCET: {
        TOTAL_MARKS: 200,
        DURATION: 180, // minutes
        SUBJECTS: ['Mathematics', 'Physics', 'Chemistry', 'General Knowledge'],
        PASSING_SCORE: 60
    },
    
    // Utility Functions
    getCurrentAcademicYear: function() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12
        
        if (currentMonth >= this.ACADEMIC_YEAR.START_MONTH) {
            return `${currentYear}-${currentYear + 1}`;
        } else {
            return `${currentYear - 1}-${currentYear}`;
        }
    },
    
    getGrade: function(percentage) {
        const grade = this.GRADES.find(g => percentage >= g.min && percentage <= g.max);
        return grade || { grade: 'F', remark: 'Fail' };
    },
    
    formatDuration: function(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    },
    
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    validateEmail: function(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    validatePhone: function(phone) {
        const re = /^[0-9]{10}$/;
        return re.test(phone);
    },
    
    generateId: function(prefix = '') {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },
    
    getSemesterName: function(semesterNumber) {
        const sem = this.SEMESTERS.find(s => s.id === semesterNumber);
        return sem ? sem.name : `Semester ${semesterNumber}`;
    },
    
    getBranchSubjects: function(branch, semester) {
        // This would be expanded with actual subject data
        const commonSubjects = {
            1: ['Mathematics', 'Physics', 'Communication Skills'],
            2: ['Applied Mathematics', 'Engineering Drawing', 'Basic Electronics'],
            3: ['Programming', 'Digital Electronics', 'Engineering Mechanics']
        };
        
        return commonSubjects[semester] || ['Subject 1', 'Subject 2', 'Subject 3'];
    },
    
    // Date formatting
    formatDate: function(date, format = 'medium') {
        const d = new Date(date);
        const options = {};
        
        switch(format) {
            case 'short':
                options.day = 'numeric';
                options.month = 'short';
                options.year = 'numeric';
                break;
            case 'medium':
                options.day = 'numeric';
                options.month = 'short';
                options.year = 'numeric';
                options.hour = '2-digit';
                options.minute = '2-digit';
                break;
            case 'long':
                options.weekday = 'long';
                options.day = 'numeric';
                options.month = 'long';
                options.year = 'numeric';
                options.hour = '2-digit';
                options.minute = '2-digit';
                break;
            case 'time':
                options.hour = '2-digit';
                options.minute = '2-digit';
                break;
        }
        
        return d.toLocaleDateString('en-IN', options);
    },
    
    // Calculate age/experience
    calculateExperience: function(startDate) {
        const start = new Date(startDate);
        const now = new Date();
        
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        if (years === 0) {
            return `${months} month${months !== 1 ? 's' : ''}`;
        } else if (months === 0) {
            return `${years} year${years !== 1 ? 's' : ''}`;
        } else {
            return `${years} year${years !== 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
        }
    }
};

// Make it globally available
if (typeof window !== 'undefined') {
    window.DDQuestConstants = DDQuestConstants;
}

// Export for Node.js/Modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DDQuestConstants;
}