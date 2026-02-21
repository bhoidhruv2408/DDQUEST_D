// approve-admin.js – Complete Working Version (No Cloud Functions)

// ==================== CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    databaseURL: "https://ddquest-614ea-default-rtdb.firebaseio.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.firebasestorage.app",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e",
    measurementId: "G-1CRQVW0WF9"
};

// EmailJS Configuration
const EMAILJS_PUBLIC_KEY = "Yco7tV0mY_3qMfaoe";
const EMAILJS_SERVICE_ID = "DDQUEST_D";
const EMAILJS_TEMPLATE_ID = "template_t3w5qnf";

// Global variables
let app, auth, db;
let currentUser = null;
let currentAdminData = null;
let requests = [];
let filteredRequests = [];
let selectedRequests = new Set();
let currentPage = 1;
const pageSize = 10;
let totalPages = 1;
let currentRequestId = null;

// Firestore unsubscribe function
let unsubscribeRequests = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();

    emailjs.init(EMAILJS_PUBLIC_KEY);

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            showLoading('Verifying admin privileges...');
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) throw new Error('User not found');

                const userData = userDoc.data();
                if (userData.role !== 'super_admin') {
                    showToast('Access denied. Super admin only.', 'error');
                    setTimeout(() => window.location.href = '../../auth/login-admin.html', 2000);
                    return;
                }

                currentUser = user;
                currentAdminData = userData;
                document.getElementById('adminInfo').innerHTML = `<i class="fas fa-user-shield"></i> ${userData.fullName || userData.name || user.email}`;
                document.getElementById('mainContainer').style.display = 'block';
                hideLoading();

                // Start real-time listener
                startRealtimeListener();
            } catch (error) {
                console.error('Auth error:', error);
                showToast('Authentication failed: ' + error.message, 'error');
                setTimeout(redirectToLogin, 2000);
            }
        } else {
            redirectToLogin();
        }
    });
});

function redirectToLogin() {
    window.location.href = '../../auth/login-admin.html';
}

// ==================== REAL-TIME FIRESTORE LISTENER ====================
function startRealtimeListener() {
    if (unsubscribeRequests) unsubscribeRequests();

    unsubscribeRequests = db.collection('adminRequests')
        .orderBy('submittedAt', 'desc')
        .onSnapshot((snapshot) => {
            requests = snapshot.docs.map(doc => {
                const data = doc.data();
                let submittedAt = data.submittedAt?.toDate() || data.approvalDate ? new Date(data.approvalDate) : new Date();
                return {
                    id: doc.id,
                    ...data,
                    submittedAt
                };
            });

            applyFilters();
            showToast('Requests updated', 'info', 'Live Update', 2000);
        }, (error) => {
            console.error('Listener error:', error);
            showToast('Real-time connection lost. Refresh page.', 'error');
        });
}

// ==================== LOADING & TOAST ====================
function showLoading(text = 'Loading...', subtext = 'Please wait') {
    document.getElementById('loadingText').innerText = text;
    document.getElementById('loadingSubtext').innerText = subtext;
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showToast(message, type = 'info', title = '', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toastId = 'toast-' + Date.now();
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.id = toastId;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas fa-${icons[type]}"></i></div>
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

// ==================== FILTERING ====================
function applyFilters() {
    const level = document.getElementById('filterLevel').value;
    const priority = document.getElementById('filterPriority').value;
    const experience = document.getElementById('filterExperience').value;
    const days = parseInt(document.getElementById('filterDays').value);

    filteredRequests = requests.filter(req => {
        if (level !== 'all' && req.adminLevel !== level) return false;
        if (priority !== 'all' && req.priority !== priority) return false;
        if (experience !== 'all' && req.experience !== experience) return false;
        if (!isNaN(days)) {
            const diffDays = Math.floor((new Date() - req.submittedAt) / (1000 * 60 * 60 * 24));
            if (diffDays > days) return false;
        }
        return true;
    });

    updateStats();
    currentPage = 1;
    renderTable();
}

function clearFilters() {
    document.getElementById('filterLevel').value = 'all';
    document.getElementById('filterPriority').value = 'all';
    document.getElementById('filterExperience').value = 'all';
    document.getElementById('filterDays').value = 'all';
    applyFilters();
}

// ==================== STATS ====================
function updateStats() {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const total = requests.length;
    const rate = total ? ((approved / total) * 100).toFixed(1) : 0;

    document.getElementById('pendingCount').innerText = pending;
    document.getElementById('approvedCount').innerText = approved;
    document.getElementById('rejectedCount').innerText = rejected;
    document.getElementById('totalCount').innerText = total;
    document.getElementById('approvalRate').innerText = rate + '%';
    document.getElementById('requestsCount').innerText = filteredRequests.length;
}

// ==================== RENDER TABLE ====================
function renderTable() {
    const tbody = document.getElementById('requestsBody');
    const paginationDiv = document.getElementById('pagination');
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageData = filteredRequests.slice(start, end);
    totalPages = Math.ceil(filteredRequests.length / pageSize);

    if (filteredRequests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">
            <i class="fas fa-inbox"></i><h3>No requests found</h3>
        </td></tr>`;
        paginationDiv.style.display = 'none';
        return;
    }

    let html = '';
    pageData.forEach(req => {
        const pendingDays = Math.floor((new Date() - req.submittedAt) / (1000 * 60 * 60 * 24)) || 0;
        const statusClass = `status-badge status-${req.status || 'pending'}`;
        const selected = selectedRequests.has(req.id) ? 'checked' : '';

        html += `<tr>
            <td><input type="checkbox" class="row-checkbox" value="${req.id}" ${selected} onchange="toggleSelect('${req.id}', this)"></td>
            <td>${req.id.slice(0, 6)}...</td>
            <td><strong>${req.fullName || 'N/A'}</strong><br><small>${req.email}</small></td>
            <td>${req.college || ''}<br><small>${req.department || ''}</small></td>
            <td><span class="status-badge" style="background:rgba(67,97,238,0.2); color:#a5b4fc;">${req.adminLevel || 'admin'}</span></td>
            <td><span class="status-badge" style="background:rgba(245,158,11,0.2); color:#fcd34d;">${req.priority || 'medium'}</span></td>
            <td>${req.experience || 'N/A'}</td>
            <td>${pendingDays}d</td>
            <td><span class="${statusClass}">${req.status || 'pending'}</span></td>
            <td>
                <button class="action-btn view" onclick="viewRequest('${req.id}')" title="View"><i class="fas fa-eye"></i></button>
                ${(!req.status || req.status === 'pending') ? `
                <button class="action-btn approve" onclick="openApprovalModal('${req.id}')" title="Approve"><i class="fas fa-check"></i></button>
                <button class="action-btn reject" onclick="openRejectionModal('${req.id}')" title="Reject"><i class="fas fa-times"></i></button>
                ` : ''}
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;

    paginationDiv.style.display = 'flex';
    document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;

    updateSelectedCount();
}

function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
    }
}

// ==================== SELECTION ====================
function toggleSelect(id, checkbox) {
    if (checkbox.checked) selectedRequests.add(id);
    else selectedRequests.delete(id);
    updateSelectedCount();
    document.getElementById('selectAll').checked = (selectedRequests.size === filteredRequests.length);
}

function toggleSelectAll(checkbox) {
    if (checkbox.checked) {
        filteredRequests.forEach(r => selectedRequests.add(r.id));
    } else {
        selectedRequests.clear();
    }
    renderTable();
}

function updateSelectedCount() {
    document.getElementById('selectedCount').innerText = `${selectedRequests.size} selected`;
}

// ==================== VIEW DETAILS ====================
function viewRequest(id) {
    const req = requests.find(r => r.id === id);
    if (!req) return;

    const details = `
        <div style="padding: 10px;">
            <p><strong>Request ID:</strong> ${req.id}</p>
            <p><strong>Full Name:</strong> ${req.fullName || 'N/A'}</p>
            <p><strong>Email:</strong> ${req.email}</p>
            <p><strong>College:</strong> ${req.college || 'N/A'}</p>
            <p><strong>Department:</strong> ${req.department || 'N/A'}</p>
            <p><strong>Designation:</strong> ${req.designation || 'N/A'}</p>
            <p><strong>Admin Level:</strong> ${req.adminLevel}</p>
            <p><strong>Priority:</strong> ${req.priority || 'normal'}</p>
            <p><strong>Experience:</strong> ${req.experience || 'N/A'}</p>
            <p><strong>Phone:</strong> ${req.phone || 'N/A'}</p>
            <p><strong>Reason:</strong> ${req.reason || 'N/A'}</p>
            <p><strong>Subjects:</strong> ${req.subjects || 'N/A'}</p>
            <p><strong>Status:</strong> ${req.status || 'pending'}</p>
            <p><strong>Submitted:</strong> ${req.submittedAt.toLocaleString()}</p>
            ${req.notes ? `<p><strong>Notes:</strong> ${req.notes}</p>` : ''}
            ${req.rejectionReason ? `<p><strong>Rejection Reason:</strong> ${req.rejectionReason}</p>` : ''}
        </div>
    `;
    document.getElementById('requestFullDetails').innerHTML = details;
    document.getElementById('viewModal').style.display = 'flex';
}

function closeViewModal() {
    document.getElementById('viewModal').style.display = 'none';
}

// ==================== APPROVAL ====================
function openApprovalModal(id) {
    currentRequestId = id;
    const req = requests.find(r => r.id === id);
    document.getElementById('approvalDetails').innerHTML = `
        <div style="padding: 10px;">
            <p><strong>${req.fullName}</strong> (${req.email})</p>
            <p>Requested: ${req.adminLevel} level</p>
            <p>College: ${req.college}</p>
        </div>
    `;
    document.getElementById('approvalModal').style.display = 'flex';
}

function closeApprovalModal() {
    document.getElementById('approvalModal').style.display = 'none';
    document.getElementById('approvalNotes').value = '';
    currentRequestId = null;
}

async function approveSelectedRequest() {
    if (!currentRequestId) return;
    const notes = document.getElementById('approvalNotes').value;
    await processApproval(currentRequestId, notes);
    closeApprovalModal();
}

// ==================== PROCESS APPROVAL (CLIENT-SIDE ONLY) ====================
async function processApproval(requestId, notes = '') {
    showLoading('Approving request...', 'Creating user account');
    try {
        const req = requests.find(r => r.id === requestId);
        if (!req) throw new Error('Request not found');

        // Generate random password
        const password = generateRandomPassword(12);
        console.log(`Generated password for ${req.email}: ${password}`);

        // IMPORTANT: Store current admin email to re-login later
        const adminEmail = currentUser.email;
        const adminPassword = prompt("Please enter your super admin password to continue:", "");
        
        if (!adminPassword) {
            throw new Error('Admin password required to approve');
        }

        // Create user in Firebase Auth (this will log out the current admin)
        const userCred = await auth.createUserWithEmailAndPassword(req.email, password);
        
        // Store user in Firestore
        await db.collection('users').doc(userCred.user.uid).set({
            email: req.email,
            fullName: req.fullName,
            name: req.fullName,
            role: req.adminLevel || 'admin',
            college: req.college || '',
            department: req.department || '',
            phone: req.phone || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.uid || 'system',
            status: 'active',
            isAdmin: true,
            uid: userCred.user.uid
        });

        // Update admin request
        await db.collection('adminRequests').doc(requestId).update({
            status: 'approved',
            approvedBy: currentUser?.uid || 'system',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            notes: notes || '',
            userId: userCred.user.uid,
            generatedPassword: password // Store for reference (optional)
        });

        // Send email via EmailJS
        const emailSent = await sendApprovalEmail(req.email, req.fullName, password, req.adminLevel);

        // CRITICAL: Log back in as super admin
        await auth.signInWithEmailAndPassword(adminEmail, adminPassword);
        
        // Refresh current user reference
        currentUser = auth.currentUser;

        if (emailSent) {
            showToast(`✅ Admin approved. Credentials sent to ${req.email}`, 'success');
        } else {
            showToast(`⚠️ User created but email failed. Password: ${password}. Share manually.`, 'warning', 'Action Required', 15000);
        }

        selectedRequests.delete(requestId);

    } catch (error) {
        console.error('Approval error:', error);
        
        // Handle specific errors
        if (error.code === 'auth/email-already-in-use') {
            showToast('❌ Email already exists. This user may already have an account.', 'error');
        } else {
            showToast('❌ Approval failed: ' + error.message, 'error');
        }
        
        // Try to re-login as admin if we got logged out
        try {
            if (currentUser?.email) {
                const adminPassword = prompt("Session expired. Please enter your super admin password to continue:", "");
                if (adminPassword) {
                    await auth.signInWithEmailAndPassword(currentUser.email, adminPassword);
                    currentUser = auth.currentUser;
                }
            }
        } catch (loginError) {
            console.error('Re-login failed:', loginError);
            showToast('Please refresh and login again', 'error');
            setTimeout(() => window.location.reload(), 2000);
        }
    } finally {
        hideLoading();
    }
}

// ==================== EMAIL FUNCTION ====================
async function sendApprovalEmail(email, name, password, role) {
    try {
        const templateParams = {
            to_email: email,
            to_name: name,
            password: password,
            role: role || 'Admin',
            login_link: 'https://ddquest-614ea.web.app/auth/login-admin.html',
            from_name: 'DDQuest Super Admin',
            reply_to: 'admin@ddquest.com'
        };

        const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        console.log('Email sent:', response);
        return response.status === 200;
    } catch (error) {
        console.error('EmailJS error:', error);
        return false;
    }
}

// ==================== PASSWORD GENERATOR ====================
function generateRandomPassword(length = 12) {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%&*';
    
    let allChars = uppercase + lowercase + numbers + special;
    let password = '';
    
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// ==================== REJECTION ====================
function openRejectionModal(id) {
    currentRequestId = id;
    const req = requests.find(r => r.id === id);
    document.getElementById('rejectionDetails').innerHTML = `
        <div style="padding: 10px;">
            <p><strong>${req.fullName}</strong> (${req.email})</p>
        </div>
    `;
    document.getElementById('rejectionModal').style.display = 'flex';
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
    currentRequestId = null;
}

async function rejectSelectedRequest() {
    if (!currentRequestId) return;
    const reason = document.getElementById('rejectionReason').value;
    if (!reason.trim()) {
        showToast('Please provide a reason for rejection', 'warning');
        return;
    }
    await processRejection(currentRequestId, reason);
    closeRejectionModal();
}

async function processRejection(requestId, reason) {
    showLoading('Rejecting request...');
    try {
        await db.collection('adminRequests').doc(requestId).update({
            status: 'rejected',
            rejectedBy: currentUser.uid,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectionReason: reason
        });

        showToast('Request rejected', 'info');
        selectedRequests.delete(requestId);
    } catch (error) {
        console.error('Rejection error:', error);
        showToast('Rejection failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== BULK ACTIONS ====================
function openBulkModal() {
    if (selectedRequests.size === 0) {
        showToast('No requests selected', 'warning');
        return;
    }
    document.getElementById('bulkSelectedCount').innerText = selectedRequests.size;
    document.getElementById('bulkModal').style.display = 'flex';
    updateBulkActionButton();
}

function closeBulkModal() {
    document.getElementById('bulkModal').style.display = 'none';
    document.getElementById('bulkNotes').value = '';
    document.getElementById('bulkReason').value = '';
}

function updateBulkActionButton() {
    const action = document.querySelector('input[name="bulkAction"]:checked').value;
    const btn = document.getElementById('bulkActionBtn');
    if (action === 'approve') {
        btn.className = 'btn-approve';
        btn.innerHTML = '<i class="fas fa-check"></i> Approve Selected';
        document.getElementById('bulkNotesSection').style.display = 'block';
        document.getElementById('bulkReasonSection').style.display = 'none';
    } else {
        btn.className = 'btn-reject';
        btn.innerHTML = '<i class="fas fa-times"></i> Reject Selected';
        document.getElementById('bulkNotesSection').style.display = 'none';
        document.getElementById('bulkReasonSection').style.display = 'block';
    }
}

async function processBulkAction() {
    const action = document.querySelector('input[name="bulkAction"]:checked').value;
    const notes = document.getElementById('bulkNotes').value;
    const reason = document.getElementById('bulkReason').value;

    if (action === 'reject' && !reason.trim()) {
        showToast('Please provide a rejection reason', 'warning');
        return;
    }

    showLoading(`Processing ${selectedRequests.size} requests...`);
    let success = 0, fail = 0;

    for (const id of selectedRequests) {
        try {
            if (action === 'approve') {
                await processApproval(id, notes);
            } else {
                await processRejection(id, reason);
            }
            success++;
        } catch (error) {
            console.error(`Bulk action error on ${id}:`, error);
            fail++;
        }
    }

    hideLoading();
    showToast(`Bulk action completed: ${success} succeeded, ${fail} failed`, fail ? 'warning' : 'success');
    selectedRequests.clear();
    closeBulkModal();
}

// ==================== EXPORT ====================
function exportRequests() {
    if (filteredRequests.length === 0) {
        showToast('No requests to export', 'warning');
        return;
    }

    const data = filteredRequests.map(req => ({
        ID: req.id,
        Name: req.fullName,
        Email: req.email,
        College: req.college || '',
        Department: req.department || '',
        AdminLevel: req.adminLevel,
        Priority: req.priority,
        Experience: req.experience,
        Status: req.status || 'pending',
        Submitted: req.submittedAt.toLocaleDateString()
    }));

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
        Object.values(row).map(v => `"${v}"`).join(',')
    ).join('\n');
    const csv = headers + '\n' + rows;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_requests_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export started', 'success');
}

// ==================== LOGOUT ====================
function logoutAdmin() {
    if (unsubscribeRequests) unsubscribeRequests();
    auth.signOut().then(() => {
        window.location.href = '../../auth/login-admin.html';
    });
}

// ==================== GLOBAL FUNCTIONS ====================
window.applyFilters = applyFilters;
window.clearFilters = clearFilters;
window.openBulkModal = openBulkModal;
window.closeBulkModal = closeBulkModal;
window.updateBulkActionButton = updateBulkActionButton;
window.processBulkAction = processBulkAction;
window.exportRequests = exportRequests;
window.toggleSelectAll = toggleSelectAll;
window.toggleSelect = toggleSelect;
window.viewRequest = viewRequest;
window.closeViewModal = closeViewModal;
window.openApprovalModal = openApprovalModal;
window.closeApprovalModal = closeApprovalModal;
window.approveSelectedRequest = approveSelectedRequest;
window.openRejectionModal = openRejectionModal;
window.closeRejectionModal = closeRejectionModal;
window.rejectSelectedRequest = rejectSelectedRequest;
window.changePage = changePage;
window.logoutAdmin = logoutAdmin;