// edit-materials.js – Admin manage materials (view, edit, delete)
// Uses backend API for fetching, Firebase client for updates, backend for delete.

const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const dbFirestore = firebase.firestore();

// Backend API base URL – adjust if your backend runs on a different port
const API_BASE = 'http://localhost:5000/api';

let allMaterials = [];
let currentUser = null;

// DOM elements
const materialsContainer = document.getElementById('materialsContainer');
const searchInput = document.getElementById('searchInput');
const semesterFilter = document.getElementById('semesterFilter');
const categoryFilter = document.getElementById('categoryFilter');

// Toast helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// Check admin authentication
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed, user:", user);
    if (!user) {
        window.location.href = '../../auth/login-admin.html';
        return;
    }
    currentUser = user;
    try {
        const userDoc = await dbFirestore.collection('users').doc(user.uid).get();
        console.log("User doc exists:", userDoc.exists);
        if (!userDoc.exists || !['admin', 'super_admin'].includes(userDoc.data()?.role)) {
            showToast('Admin access required', 'error');
            setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
            return;
        }
        // User is admin – load materials from backend
        loadMaterials();
    } catch (error) {
        console.error("Error checking role:", error);
        showToast("Error verifying permissions", "error");
    }
});

// ============================================
// Fetch materials from backend API
// ============================================
async function loadMaterials() {
    try {
        console.log("Fetching materials from backend API...");
        const res = await fetch(`${API_BASE}/materials`);
        const data = await res.json();
        if (data.success) {
            allMaterials = data.data;
            renderMaterials(allMaterials);
            if (allMaterials.length === 0) showToast("No materials found", "info");
        } else {
            showToast('Failed to load materials: ' + (data.error || 'Unknown error'), 'error');
            fallbackMock();
        }
    } catch (error) {
        console.error("Backend fetch error:", error);
        showToast("Network error, using mock data", "warning");
        fallbackMock();
    }
}

// Fallback mock data for UI testing
function fallbackMock() {
    allMaterials = [
        {
            id: 'mock1',
            title: 'Data Structures Notes (Mock)',
            description: 'Chapter 1-5',
            category: 'Notes',
            semester: 3,
            subject: 'Computer Science',
            fileUrl: '#',
            tags: ['ds', 'algo'],
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            fileType: 'application/pdf'
        },
        {
            id: 'mock2',
            title: 'Question Bank (Mock)',
            description: '100 MCQs',
            category: 'Question Bank',
            semester: 4,
            subject: 'Mathematics',
            fileUrl: '#',
            tags: ['math'],
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            fileType: 'application/pdf'
        }
    ];
    renderMaterials(allMaterials);
}

// Render materials as cards
function renderMaterials(materials) {
    if (materials.length === 0) {
        materialsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h3>No materials found</h3><p>Try adjusting filters or upload new materials.</p></div>`;
        return;
    }
    let html = '<div class="materials-grid">';
    materials.forEach(m => {
        const icon = m.fileType?.startsWith('image/') ? 'fa-image' : 'fa-file-pdf';
        const tags = m.tags ? m.tags.join(', ') : '';
        html += `
        <div class="material-card" data-id="${m.id}">
            <div class="material-icon"><i class="fas ${icon}"></i></div>
            <div class="material-title">
                ${m.title || 'Untitled'}
                ${m.semester ? `<span style="background:var(--primary);padding:2px 8px;border-radius:20px;font-size:0.7rem;">Sem ${m.semester}</span>` : ''}
            </div>
            <div class="material-meta">
                <span><i class="fas fa-tag"></i> ${m.category || 'Uncategorized'}</span>
                <span><i class="fas fa-book"></i> ${m.subject || 'General'}</span>
                <span><i class="fas fa-user"></i> ${m.uploadedBy || 'Admin'}</span>
            </div>
            <p style="color: var(--gray); margin-bottom: 16px;">${m.description || 'No description'}</p>
            ${tags ? `<div style="margin-bottom: 12px;"><i class="fas fa-hashtag"></i> ${tags}</div>` : ''}
            <div class="material-actions">
                <a href="${m.fileUrl}" target="_blank" class="btn btn-view"><i class="fas fa-eye"></i> View</a>
                <button class="btn btn-edit" onclick="openEditModal('${m.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-delete" onclick="deleteMaterial('${m.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>`;
    });
    html += '</div>';
    materialsContainer.innerHTML = html;
}

// Filtering (client-side)
function filterMaterials() {
    const search = searchInput.value.toLowerCase();
    const semester = semesterFilter.value;
    const category = categoryFilter.value;
    const filtered = allMaterials.filter(m => {
        const matchSearch = !search || 
            (m.title?.toLowerCase().includes(search)) ||
            (m.description?.toLowerCase().includes(search)) ||
            (m.subject?.toLowerCase().includes(search)) ||
            (m.tags?.some(t => t.toLowerCase().includes(search)));
        const matchSemester = !semester || m.semester == semester;
        const matchCategory = !category || m.category === category;
        return matchSearch && matchSemester && matchCategory;
    });
    renderMaterials(filtered);
}

searchInput.addEventListener('input', filterMaterials);
semesterFilter.addEventListener('change', filterMaterials);
categoryFilter.addEventListener('change', filterMaterials);

// Modal functions
const modal = document.getElementById('editModal');
const editId = document.getElementById('editId');
const editTitle = document.getElementById('editTitle');
const editDescription = document.getElementById('editDescription');
const editCategory = document.getElementById('editCategory');
const editSemester = document.getElementById('editSemester');
const editSubject = document.getElementById('editSubject');
const editTags = document.getElementById('editTags');

function openEditModal(id) {
    const material = allMaterials.find(m => m.id === id);
    if (!material) return;
    editId.value = material.id;
    editTitle.value = material.title || '';
    editDescription.value = material.description || '';
    editCategory.value = material.category || 'Notes';
    editSemester.value = material.semester || '1';
    editSubject.value = material.subject || '';
    editTags.value = (material.tags || []).join(', ');
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}
window.closeModal = closeModal;

// Handle edit form submit (update via Firestore) – now using 'uploads' collection
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editId.value;
    if (!id) return;

    const updatedData = {
        title: editTitle.value,
        description: editDescription.value,
        category: editCategory.value,
        semester: parseInt(editSemester.value),
        subject: editSubject.value,
        tags: editTags.value.split(',').map(t => t.trim()).filter(Boolean),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // 👇 Changed from 'studyMaterials' to 'uploads'
        await dbFirestore.collection('uploads').doc(id).update(updatedData);
        showToast('Material updated successfully', 'success');
        closeModal();
        // Update local copy for instant UI update
        const index = allMaterials.findIndex(m => m.id === id);
        if (index !== -1) {
            allMaterials[index] = { ...allMaterials[index], ...updatedData, updatedAt: new Date().toISOString() };
            filterMaterials(); // re-render with current filters
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast('Update failed: ' + error.message, 'error');
    }
});

// Delete material (via backend) – this already uses '/api/upload/:id' which deletes from 'uploads'
async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) return;

    try {
        const res = await fetch(`${API_BASE}/upload/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
            showToast('Material deleted', 'success');
            allMaterials = allMaterials.filter(m => m.id !== id);
            filterMaterials();
        } else {
            showToast('Delete failed: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Network error during delete', 'error');
    }
}
window.deleteMaterial = deleteMaterial;