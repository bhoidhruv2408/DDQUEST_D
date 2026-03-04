// ============================================
// UPLOAD MATERIAL - FIREBASE INTEGRATION
// ============================================
// This file handles:
// - Admin authentication check (Firestore)
// - File selection (drag & drop or click)
// - Upload to Firebase Storage with progress
// - Save metadata to Realtime Database
// - Toast notifications (matching dashboard style)
// - AI tag suggestions
// - Fallback server-side upload (optional)
// ============================================

// ============================================
// FIREBASE CONFIG (exactly as in dashboard)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    databaseURL: "https://ddquest-614ea-default-rtdb.firebaseio.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e"
};

// Initialize Firebase (if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // use existing app
}

const auth = firebase.auth();
const dbFirestore = firebase.firestore();   // for user roles (optional)
const rtdb = firebase.database();            // for materials metadata
const storage = firebase.storage();

// ============================================
// TOAST NOTIFICATION SYSTEM (copied from dashboard)
// ============================================
function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
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
        <div class="toast-icon">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        </div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="document.getElementById('${toastId}').remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        const element = document.getElementById(toastId);
        if (element) element.remove();
    }, duration);
}

// ============================================
// ADMIN AUTHENTICATION CHECK
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        showToast('You must be logged in as admin', 'error', 'Authentication Required');
        setTimeout(() => {
            window.location.href = '../../auth/login-admin.html';
        }, 2000);
        return;
    }

    try {
        const userDoc = await dbFirestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            showToast('User account not found', 'error', 'Access Denied');
            setTimeout(() => {
                window.location.href = '../../auth/login-admin.html';
            }, 2000);
            return;
        }
        
        const userData = userDoc.data();
        if (userData.role !== 'admin' && userData.role !== 'super_admin') {
            showToast('Admin privileges required', 'error', 'Access Denied');
            setTimeout(() => {
                window.location.href = '../../auth/login-admin.html';
            }, 2000);
            return;
        }
        
        // Optional: display admin name if needed
        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl) {
            adminNameEl.textContent = userData.name || user.email || 'Admin';
        }
        
    } catch (error) {
        console.error('Error verifying admin:', error);
        showToast('Unable to verify permissions. Please try again.', 'error');
        setTimeout(() => {
            window.location.href = '../../auth/login-admin.html';
        }, 2000);
    }
});

// ============================================
// FILE UPLOAD UI HANDLING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // ========== THEME TOGGLE ==========
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
        const next = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        applyTheme(next);
    });

    // ========== UPLOAD ELEMENTS ==========
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');          // may not exist in your HTML – adapt if needed
    const fileNameSpan = document.getElementById('fileName');      // may not exist
    const previewContainer = document.getElementById('filePreviewContainer');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressSpeed = document.getElementById('progressSpeed');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');
    const cancelBtn = document.getElementById('cancelUploadBtn');

    let selectedFile = null;
    let uploadTask = null;
    let uploadStartTime = null;

    if (!dropZone || !fileInput || !uploadForm) {
        console.error('Required elements not found');
        return;
    }

    // Allowed file types & max size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png'
    ];

    // Helper: format bytes
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = 2;
        const sizes = ['B','KB','MB','GB','TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Click dropzone to open file picker
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileSelect(fileInput.files[0]);
        }
    });

    function handleFileSelect(file) {
        // Validate size
        if (file.size > MAX_SIZE) {
            showToast(`File exceeds 50MB limit (${(file.size/1024/1024).toFixed(2)} MB)`, 'error', 'File too large');
            fileInput.value = '';
            return;
        }
        // Validate type
        if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx?|pptx?|xlsx?|jpe?g|png)$/i)) {
            showToast('File type not allowed. Please upload PDF, DOCX, PPT, XLS, or images.', 'error', 'Invalid type');
            fileInput.value = '';
            return;
        }

        selectedFile = file;
        renderFilePreview(file);
    }

    function renderFilePreview(file) {
        const isImage = file.type.startsWith('image/');
        const icon = isImage ? 'fa-image' : 'fa-file-pdf';
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);

        let previewHtml = `
            <div class="file-preview" id="filePreview">
                <i class="fas ${icon}"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${sizeMB} MB</div>
                </div>
                <button type="button" class="remove-file" id="removeFileBtn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewHtml = `
                    <div class="file-preview" id="filePreview">
                        <img src="${e.target.result}" class="image-preview" alt="preview" role="button" tabindex="0">
                        <div class="file-details">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">${sizeMB} MB</div>
                        </div>
                        <button type="button" class="remove-file" id="removeFileBtn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                if (previewContainer) {
                    previewContainer.innerHTML = previewHtml;
                    previewContainer.style.display = 'block';
                }
                attachRemoveHandler();
                attachPreviewOpener();
            };
            reader.readAsDataURL(file);
        } else {
            if (previewContainer) {
                previewContainer.innerHTML = previewHtml;
                previewContainer.style.display = 'block';
            }
            attachRemoveHandler();
            attachPreviewOpener();
        }

        // Also handle simple fileInfo display if present (from original simple UI)
        if (fileInfo && fileNameSpan) {
            fileNameSpan.textContent = file.name + ' (' + sizeMB + ' MB)';
            fileInfo.style.display = 'flex';
        }
    }

    function attachPreviewOpener() {
        const preview = document.getElementById('filePreview');
        if (!preview) return;
        preview.addEventListener('click', openPreviewModal);
        preview.addEventListener('keydown', (e) => { if (e.key === 'Enter') openPreviewModal(); });
    }

    function openPreviewModal() {
        const modal = document.getElementById('previewModal');
        const frame = document.getElementById('previewFrame');
        const title = document.getElementById('previewTitle');
        if (!selectedFile || !modal || !frame || !title) return;
        title.innerText = selectedFile.name + ' • ' + formatBytes(selectedFile.size);
        if (selectedFile.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { frame.src = e.target.result; };
            reader.readAsDataURL(selectedFile);
        } else if (selectedFile.type === 'application/pdf') {
            const url = URL.createObjectURL(selectedFile);
            frame.src = url;
        } else {
            frame.srcdoc = `<div style="color:#cbd5e1;padding:20px;font-family:var(--font-sans);">Preview not available for this file type. Use download.</div>`;
        }
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.getElementById('downloadPreview').onclick = () => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(selectedFile);
            a.download = selectedFile.name;
            a.click();
        };
        document.getElementById('closePreview').onclick = closePreviewModal;
    }

    function closePreviewModal() {
        const modal = document.getElementById('previewModal');
        const frame = document.getElementById('previewFrame');
        if (!modal || !frame) return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        frame.src = 'about:blank';
    }

    function attachRemoveHandler() {
        const removeBtn = document.getElementById('removeFileBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                selectedFile = null;
                fileInput.value = '';
                if (previewContainer) {
                    previewContainer.style.display = 'none';
                    previewContainer.innerHTML = '';
                }
                if (fileInfo) fileInfo.style.display = 'none';
                if (uploadTask) {
                    uploadTask.cancel();
                    uploadTask = null;
                }
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressFill) progressFill.style.width = '0%';
                if (progressPercent) progressPercent.innerText = '0%';
                if (submitBtn) submitBtn.disabled = false;
                if (cancelBtn) cancelBtn.style.display = 'none';
            });
        }
    }

    // ============================================
    // FORM SUBMISSION (Realtime Database version)
    // ============================================
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            showToast('Please select a file to upload.', 'warning', 'Missing File');
            return;
        }

        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const category = document.getElementById('category').value;
        const semester = document.getElementById('semester').value;
        const branch = document.getElementById('branch').value;
        const tags = (document.getElementById('tagsInput')?.value || '').split(',').map(s => s.trim()).filter(Boolean);

        if (!title || !category || !semester) {
            showToast('Please fill all required fields.', 'warning', 'Incomplete Form');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            showToast('You must be logged in.', 'error', 'Authentication Required');
            return;
        }

        // Show progress bar & disable button
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressFill) progressFill.style.width = '0%';
        if (progressPercent) progressPercent.innerText = '0%';
        if (submitBtn) submitBtn.disabled = true;
        if (cancelBtn) cancelBtn.style.display = 'inline';

        try {
            const timestamp = Date.now();
            const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const filePath = `materials/${timestamp}_${safeName}`;
            const storageRef = storage.ref().child(filePath);

            uploadTask = storageRef.put(selectedFile);
            uploadStartTime = Date.now();

            cancelBtn.onclick = () => {
                if (uploadTask) {
                    uploadTask.cancel();
                    uploadTask = null;
                    showToast('Upload cancelled', 'warning', 'Cancelled');
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (submitBtn) submitBtn.disabled = false;
                    if (cancelBtn) cancelBtn.style.display = 'none';
                }
            };

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (progressFill) progressFill.style.width = progress + '%';
                    if (progressPercent) progressPercent.innerText = Math.round(progress) + '%';

                    // speed and ETA
                    const now = Date.now();
                    const elapsed = (now - uploadStartTime) / 1000;
                    const transferred = snapshot.bytesTransferred;
                    const speed = transferred / Math.max(1, elapsed);
                    const remaining = snapshot.totalBytes - transferred;
                    const eta = speed > 0 ? Math.round(remaining / speed) : null;
                    const speedText = `${formatBytes(Math.round(speed))}/s`;
                    const etaText = eta ? `${eta}s` : '--';
                    if (progressSpeed) progressSpeed.innerText = `${speedText} • ETA: ${etaText}`;
                },
                async (error) => {
                    console.error('Upload error:', error);
                    // Check for CORS/network errors to attempt fallback
                    const isCorsOrNetwork = error?.message?.toLowerCase().includes('cors') || 
                                             error?.code === 'storage/network-error' || 
                                             error?.code === 'auth/network-request-failed' || 
                                             error?.message?.toLowerCase().includes('failed');
                    if (isCorsOrNetwork) {
                        showToast('Primary upload failed, attempting server-side upload...', 'warning', 'Fallback');
                        try {
                            const fallbackResult = await fallbackUpload(selectedFile, filePath);
                            if (fallbackResult && fallbackResult.url) {
                                // Save metadata to Realtime Database using returned signed URL
                                const materialData = {
                                    title,
                                    description: description || '',
                                    category,
                                    semester: parseInt(semester),
                                    branch: branch || null,
                                    fileName: selectedFile.name,
                                    fileURL: fallbackResult.url,
                                    filePath: filePath,
                                    tags,
                                    uploadedBy: fallbackResult.uploadedBy || user.uid,
                                    uploadedByName: user.displayName || 'Admin',
                                    uploadedAt: firebase.database.ServerValue.TIMESTAMP,
                                    downloads: 0,
                                    size: selectedFile.size,
                                    type: selectedFile.type
                                };
                                await rtdb.ref('materials').push(materialData);
                                showToast('Material uploaded via server successfully!', 'success', 'Upload Complete');
                                uploadForm.reset();
                                if (fileInfo) fileInfo.style.display = 'none';
                                if (previewContainer) {
                                    previewContainer.style.display = 'none';
                                    previewContainer.innerHTML = '';
                                }
                                if (progressContainer) progressContainer.style.display = 'none';
                                if (progressFill) progressFill.style.width = '0%';
                                if (progressPercent) progressPercent.innerText = '0%';
                                if (progressSpeed) progressSpeed.innerText = '';
                                if (submitBtn) submitBtn.disabled = false;
                                if (cancelBtn) cancelBtn.style.display = 'none';
                                selectedFile = null;
                                return;
                            }
                        } catch (e) {
                            console.error('Fallback upload failed:', e);
                            showToast('Fallback upload failed: ' + (e.message || e), 'error', 'Upload Error');
                        }
                    }

                    showToast('Upload failed: ' + (error.message || 'Network error'), 'error', 'Upload Error');
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (submitBtn) submitBtn.disabled = false;
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    uploadTask = null;
                },
                async () => {
                    // Upload completed successfully
                    const downloadURL = await storageRef.getDownloadURL();

                    // Save metadata to Realtime Database
                    const materialData = {
                        title,
                        description: description || '',
                        category,
                        semester: parseInt(semester),
                        branch: branch || null,
                        fileName: selectedFile.name,
                        fileURL: downloadURL,
                        filePath: filePath,
                        tags,
                        uploadedBy: user.uid,
                        uploadedByName: user.displayName || 'Admin',
                        uploadedAt: firebase.database.ServerValue.TIMESTAMP,
                        downloads: 0,
                        size: selectedFile.size,
                        type: selectedFile.type
                    };
                    await rtdb.ref('materials').push(materialData);

                    showToast('Material uploaded successfully!', 'success', 'Upload Complete');

                    // Reset form
                    uploadForm.reset();
                    if (fileInfo) fileInfo.style.display = 'none';
                    if (previewContainer) {
                        previewContainer.style.display = 'none';
                        previewContainer.innerHTML = '';
                    }
                    selectedFile = null;
                    if (progressContainer) progressContainer.style.display = 'none';
                    if (progressFill) progressFill.style.width = '0%';
                    if (progressPercent) progressPercent.innerText = '0%';
                    if (progressSpeed) progressSpeed.innerText = '';
                    if (submitBtn) submitBtn.disabled = false;
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    uploadTask = null;
                }
            );
        } catch (error) {
            console.error('Unexpected error:', error);
            showToast('An unexpected error occurred: ' + error.message, 'error');
            if (progressContainer) progressContainer.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
            if (cancelBtn) cancelBtn.style.display = 'none';
        }
    });

    // Server-side fallback uploader (calls Cloud Function)
    async function fallbackUpload(file, filePath) {
        if (!file) throw new Error('No file provided to fallbackUpload');
        // read file as base64
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        // get id token
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');
        const idToken = await user.getIdToken();

        // call cloud function
        const FUNCTION_URL = 'https://us-central1-ddquest-614ea.cloudfunctions.net/uploadFile';
        const res = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken
            },
            body: JSON.stringify({ fileBase64: base64, filePath: filePath, contentType: file.type })
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error('Function error: ' + res.status + ' ' + txt);
        }

        const data = await res.json();
        return data;
    }

    // =====================
    // AI TAG SUGGESTIONS (simple)
    // =====================
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

        // fallback: keywords from title
        title.split(/\s+/).forEach(tok => { 
            if (tok.length > 3) suggestions.add(tok.replace(/[^a-z0-9-]/g, '')); 
        });

        return Array.from(suggestions).slice(0, 8);
    }

    function renderTagButtons(list) {
        if (!tagSuggestions) return;
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
                showToast('No suggestions found. Try a different title or add tags manually.', 'info', 'AI');
                return;
            }
            renderTagButtons(suggestions);
            showToast('AI suggested tags. Click to add.', 'success', 'AI');
        });
    }

    // Preview close on ESC / click outside
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreviewModal(); });
    const previewModal = document.getElementById('previewModal');
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target.id === 'previewModal') closePreviewModal();
        });
    }
});