// edit-materials.js – Admin manage materials (Google Drive + Firestore version)
// Now with flying particles and fast view modal

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

let allMaterials = [];
let currentUser = null;

// DOM elements
const materialsContainer = document.getElementById('materialsContainer');
const searchInput = document.getElementById('searchInput');
const semesterFilter = document.getElementById('semesterFilter');
const categoryFilter = document.getElementById('categoryFilter');

// Edit modal elements
const editModal = document.getElementById('editModal');
const editId = document.getElementById('editId');
const editTitle = document.getElementById('editTitle');
const editDescription = document.getElementById('editDescription');
const editLink = document.getElementById('editLink');
const editCategory = document.getElementById('editCategory');
const editSemester = document.getElementById('editSemester');
const editTags = document.getElementById('editTags');

// View modal elements
const viewModal = document.getElementById('viewModal');
const viewFrame = document.getElementById('viewFrame');
const viewModalTitle = document.getElementById('viewModalTitle');
const viewDirectLink = document.getElementById('viewDirectLink');
const iframeLoader = document.getElementById('iframeLoader');

// Toast helper
function showToast(message, type = 'info', title = '', duration = 4000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i></div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// Helper to extract Google Drive file ID
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

// Convert any Drive link to preview format
function toPreviewLink(url) {
    if (!url) return '';
    const fileId = extractFileId(url);
    return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const themeLabel = document.getElementById('themeLabel');
const savedTheme = localStorage.getItem('ddq_theme') || 'dark';
function applyTheme(t) {
    if (t === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
        themeLabel.textContent = 'Light';
    } else {
        document.body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark</span>';
        themeLabel.textContent = 'Dark';
    }
    localStorage.setItem('ddq_theme', t);
}
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
    applyTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
});

// Admin auth check
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = '../../auth/login-admin.html';
        return;
    }
    currentUser = user;
    try {
        const userDoc = await dbFirestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists || !['admin', 'super_admin'].includes(userDoc.data()?.role)) {
            showToast('Admin access required', 'error');
            setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
            return;
        }
        loadMaterials();
    } catch (error) {
        console.error('Auth error:', error);
        showToast('Permission error', 'error');
    }
});

// Load materials from Firestore
async function loadMaterials() {
    try {
        const snapshot = await dbFirestore.collection('materials').orderBy('createdAt', 'desc').get();
        allMaterials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderMaterials(allMaterials);
        if (allMaterials.length === 0) showToast('No materials found', 'info');
    } catch (error) {
        console.error('Load error:', error);
        showToast('Failed to load materials', 'error');
        fallbackMock();
    }
}

// Fallback mock data
function fallbackMock() {
    allMaterials = [
        {
            id: 'mock1',
            title: 'Python Loops (Mock)',
            description: 'For loop, while loop examples',
            category: 'Notes',
            semester: 3,
            tags: ['python', 'loops'],
            link: '#',
            uploadedBy: 'admin',
            createdAt: new Date().toISOString()
        },
        {
            id: 'mock2',
            title: 'Sample Paper (Mock)',
            description: '100 MCQs',
            category: 'Question Bank',
            semester: 4,
            tags: ['math'],
            link: '#',
            uploadedBy: 'admin',
            createdAt: new Date().toISOString()
        }
    ];
    renderMaterials(allMaterials);
}

// Render cards
function renderMaterials(materials) {
    if (materials.length === 0) {
        materialsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-box-open"></i><h3>No materials found</h3><p>Try adjusting filters or add new materials.</p></div>`;
        return;
    }
    let html = '<div class="materials-grid">';
    materials.forEach(m => {
        const tags = m.tags ? m.tags.join(', ') : '';
        const semesterBadge = m.semester ? `<span style="background:var(--primary);padding:2px 8px;border-radius:20px;font-size:0.7rem;">Sem ${m.semester}</span>` : '';
        html += `
        <div class="material-card" data-id="${m.id}">
            <div class="material-icon"><i class="fas fa-file-alt"></i></div>
            <div class="material-title">
                ${m.title || 'Untitled'}
                ${semesterBadge}
            </div>
            <div class="material-meta">
                <span><i class="fas fa-tag"></i> ${m.category || 'Uncategorized'}</span>
                <span><i class="fas fa-user"></i> ${m.uploadedBy || 'Admin'}</span>
            </div>
            <p style="color: var(--gray); margin-bottom: 16px;">${m.description || 'No description'}</p>
            ${tags ? `<div style="margin-bottom: 12px;"><i class="fas fa-hashtag"></i> ${tags}</div>` : ''}
            <div class="material-actions">
                <button class="btn btn-view" onclick="viewMaterial('${m.id}')"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-edit" onclick="openEditModal('${m.id}')"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-delete" onclick="deleteMaterial('${m.id}')"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>`;
    });
    html += '</div>';
    materialsContainer.innerHTML = html;
}

// Filtering
function filterMaterials() {
    const search = searchInput.value.toLowerCase();
    const semester = semesterFilter.value;
    const category = categoryFilter.value;
    const filtered = allMaterials.filter(m => {
        const matchSearch = !search ||
            (m.title?.toLowerCase().includes(search)) ||
            (m.description?.toLowerCase().includes(search)) ||
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

// ---------- Edit Modal ----------
function openEditModal(id) {
    const material = allMaterials.find(m => m.id === id);
    if (!material) return;
    editId.value = material.id;
    editTitle.value = material.title || '';
    editDescription.value = material.description || '';
    editLink.value = material.link || '';
    editCategory.value = material.category || 'Notes';
    editSemester.value = material.semester || '1';
    editTags.value = (material.tags || []).join(', ');
    editModal.style.display = 'flex';
}
window.openEditModal = openEditModal;

function closeModal() {
    editModal.style.display = 'none';
}
window.closeModal = closeModal;

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editId.value;
    if (!id) return;

    const rawLink = editLink.value.trim();
    const previewLink = toPreviewLink(rawLink);

    const updatedData = {
        title: editTitle.value.trim(),
        description: editDescription.value.trim(),
        link: previewLink,
        category: editCategory.value,
        semester: parseInt(editSemester.value),
        tags: editTags.value.split(',').map(t => t.trim()).filter(Boolean),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await dbFirestore.collection('materials').doc(id).update(updatedData);
        showToast('Material updated successfully', 'success');
        closeModal();
        const index = allMaterials.findIndex(m => m.id === id);
        if (index !== -1) {
            allMaterials[index] = { ...allMaterials[index], ...updatedData, updatedAt: new Date().toISOString() };
            filterMaterials();
        }
    } catch (error) {
        console.error('Update error:', error);
        showToast('Update failed: ' + error.message, 'error');
    }
});

// ---------- View Modal (with loader) ----------
let currentViewUrl = '';

function viewMaterial(id) {
    const material = allMaterials.find(m => m.id === id);
    if (!material || !material.link) {
        showToast('No link available', 'warning');
        return;
    }
    const embedUrl = material.link.includes('/preview') ? material.link : toPreviewLink(material.link);
    currentViewUrl = embedUrl;
    
    // Reset loader and iframe
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    viewFrame.src = embedUrl;
    viewModalTitle.innerHTML = `<i class="fas fa-eye"></i> ${material.title || 'View Material'}`;
    
    // Set direct link
    viewDirectLink.href = material.link.includes('/preview') ? material.link.replace('/preview', '/view?usp=sharing') : material.link;
    
    viewModal.style.display = 'flex';
}
window.viewMaterial = viewMaterial;

// Hide loader when iframe loads
viewFrame.addEventListener('load', () => {
    iframeLoader.classList.add('hidden');
    viewFrame.classList.add('loaded');
});

// Reload button
document.getElementById('viewReloadBtn').addEventListener('click', () => {
    iframeLoader.classList.remove('hidden');
    viewFrame.classList.remove('loaded');
    const temp = viewFrame.src;
    viewFrame.src = '';
    setTimeout(() => { viewFrame.src = temp; }, 50);
});

function closeViewModal() {
    viewModal.style.display = 'none';
    viewFrame.src = 'about:blank';
}
window.closeViewModal = closeViewModal;

// ---------- Delete ----------
async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) return;

    try {
        await dbFirestore.collection('materials').doc(id).delete();
        showToast('Material deleted', 'success');
        allMaterials = allMaterials.filter(m => m.id !== id);
        filterMaterials();
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Delete failed: ' + error.message, 'error');
    }
}
window.deleteMaterial = deleteMaterial;

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (editModal.style.display === 'flex') closeModal();
        if (viewModal.style.display === 'flex') closeViewModal();
    }
});

// ---------- Flying Particles Animation ----------
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];

function initParticles() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    
    const particleCount = 100;
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: Math.random() * 200, // depth
            size: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            speedZ: (Math.random() - 0.5) * 0.3,
            color: `rgba(67, 97, 238, ${Math.random() * 0.3 + 0.1})`
        });
    }
}

function updateParticles() {
    for (let p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.z += p.speedZ;
        
        // Wrap around edges with depth effect
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        if (p.z < 0) p.z = 200;
        if (p.z > 200) p.z = 0;
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, width, height);
    for (let p of particles) {
        // Size based on z (closer = bigger)
        const scale = 1 + (p.z / 200) * 2;
        const x = p.x;
        const y = p.y;
        ctx.beginPath();
        ctx.arc(x, y, p.size * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Add glow
        ctx.shadowColor = 'rgba(67, 97, 238, 0.5)';
        ctx.shadowBlur = 10;
    }
    ctx.shadowBlur = 0;
}

function animateParticles() {
    updateParticles();
    drawParticles();
    requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => {
    initParticles();
});

initParticles();
animateParticles();