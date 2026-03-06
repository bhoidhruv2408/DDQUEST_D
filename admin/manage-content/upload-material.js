// upload-material.js – Admin upload page (Google Drive + Firestore version)

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const dbFirestore = firebase.firestore();

// Toast helper
function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toastId = 'toast-' + Date.now();
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icons[type] || 'info-circle'}"></i></div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="document.getElementById('${toastId}').remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        const el = document.getElementById(toastId);
        if (el) el.remove();
    }, duration);
}

// Helper to extract Google Drive file ID from various URL formats
function extractFileId(url) {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Admin authentication check
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        showToast('You must be logged in as admin', 'error', 'Authentication Required');
        setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
        return;
    }

    try {
        const userDoc = await dbFirestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            showToast('User account not found', 'error', 'Access Denied');
            setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
            return;
        }
        const userData = userDoc.data();
        if (!['admin', 'super_admin'].includes(userData.role)) {
            showToast('Admin privileges required', 'error', 'Access Denied');
            setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
            return;
        }
        window.currentUser = user;
    } catch (error) {
        console.error('Auth check error:', error);
        showToast('Unable to verify permissions', 'error');
    }
});

// DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeLabel = document.getElementById('themeLabel');
    const savedTheme = localStorage.getItem('ddq_theme') || 'dark';
    function applyTheme(t) {
        if (t === 'light') {
            document.body.classList.add('light-theme');
            themeToggle?.setAttribute('aria-pressed', 'true');
            if (themeLabel) themeLabel.innerText = 'Light';
        } else {
            document.body.classList.remove('light-theme');
            themeToggle?.setAttribute('aria-pressed', 'false');
            if (themeLabel) themeLabel.innerText = 'Dark';
        }
        localStorage.setItem('ddq_theme', t);
    }
    applyTheme(savedTheme);
    themeToggle?.addEventListener('click', () => {
        applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
    });

    // Elements
    const uploadForm = document.getElementById('uploadForm');
    const submitBtn = document.getElementById('submitBtn');

    // Form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const driveLink = document.getElementById('driveLink').value.trim();
        const category = document.getElementById('category').value;
        const semester = document.getElementById('semester').value;
        const branch = document.getElementById('branch').value;
        const tagsInput = document.getElementById('tagsInput')?.value || '';
        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

        if (!title || !category || !semester) {
            showToast('Please fill all required fields.', 'warning', 'Incomplete Form');
            return;
        }

        if (!driveLink) {
            showToast('Please paste a Google Drive link.', 'warning', 'Missing Link');
            return;
        }

        // Extract file ID and build preview link
        const fileId = extractFileId(driveLink);
        if (!fileId) {
            showToast('Invalid Google Drive link. Please check the URL.', 'error', 'Invalid Link');
            return;
        }
        const previewLink = `https://drive.google.com/file/d/${fileId}/preview`;

        const user = auth.currentUser;
        if (!user) {
            showToast('You must be logged in.', 'error', 'Authentication Required');
            return;
        }

        // Disable button during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

        try {
            // Prepare data for Firestore (collection 'materials')
            const materialData = {
                title,
                description: description || '',
                link: previewLink,
                category,
                semester: parseInt(semester),
                branch: branch || null,
                tags,
                uploadedBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await dbFirestore.collection('materials').add(materialData);

            showToast('Material added successfully!', 'success', 'Upload Complete');
            uploadForm.reset();

        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to add material: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload"></i> Add Material';
        }
    });

    // ============================================
    // AI TAG SUGGESTIONS (simple, unchanged)
    // ============================================
    const suggestBtn = document.getElementById('suggestTagsBtn');
    const tagSuggestions = document.getElementById('tagSuggestions');
    const tagsInput = document.getElementById('tagsInput');

    function suggestTagsFromText(title, description) {
        const text = (title + ' ' + description).toLowerCase();
        const suggestions = new Set();
        const mapping = {
            'data': ['data-structures','data','algorithms'],
            'algorithm': ['algorithms','complexity'],
            'network': ['computer-networks','networking'],
            'database': ['database','sql','nosql'],
            'os': ['operating-system','processes'],
            'machine learning': ['machine-learning','ml','ai'],
            'deep learning': ['deep-learning','neural-networks'],
            'web': ['web','frontend','backend'],
            'pdf': ['pdf','document'],
            'lab': ['lab-manual','practical'],
            'question': ['question-bank','mcq']
        };
        for (const key in mapping) {
            if (text.includes(key)) mapping[key].forEach(t => suggestions.add(t));
        }
        title.split(/\s+/).forEach(tok => {
            if (tok.length > 3) suggestions.add(tok.replace(/[^a-z0-9-]/g, ''));
        });
        return Array.from(suggestions).slice(0, 8);
    }

    function renderTagButtons(list) {
        tagSuggestions.innerHTML = '';
        list.forEach(tag => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-submit';
            btn.style.padding = '6px 10px';
            btn.style.fontSize = '0.9rem';
            btn.style.background = 'transparent';
            btn.style.border = '1px solid rgba(255,255,255,0.06)';
            btn.style.color = 'inherit';
            btn.textContent = tag;
            btn.addEventListener('click', () => {
                const current = (tagsInput?.value || '').split(',').map(s => s.trim()).filter(Boolean);
                if (!current.includes(tag)) current.push(tag);
                if (tagsInput) tagsInput.value = current.join(', ');
            });
            tagSuggestions.appendChild(btn);
        });
    }

    if (suggestBtn) {
        suggestBtn.addEventListener('click', () => {
            const title = document.getElementById('title')?.value || '';
            const description = document.getElementById('description')?.value || '';
            const suggestions = suggestTagsFromText(title, description);
            if (suggestions.length === 0) {
                showToast('No suggestions found.', 'info', 'AI');
                return;
            }
            renderTagButtons(suggestions);
            showToast('AI suggested tags. Click to add.', 'success', 'AI');
        });
    }
});