// ============================================
// FIREBASE INITIALIZATION (same config as dashboard)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCRWujKbVhlEpvygCBObMfkb7tp96Kiu4w",
    authDomain: "ddquest-614ea.firebaseapp.com",
    databaseURL: "https://ddquest-614ea-default-rtdb.firebaseio.com",
    projectId: "ddquest-614ea",
    storageBucket: "ddquest-614ea.appspot.com",
    messagingSenderId: "602140742747",
    appId: "1:602140742747:web:1cbd274462578fde845b7e",
    measurementId: "G-1CRQVW0WF9"
};

// Initialize Firebase (if not already initialized)
let firebaseApp, firestoreDb, firebaseAuth;
try {
    firebaseApp = firebase.app();
} catch {
    firebaseApp = firebase.initializeApp(firebaseConfig);
}
firebaseAuth = firebase.auth();
firestoreDb = firebase.firestore();

// ============================================
// GLOBAL VARIABLES
// ============================================
let questions = []; // Array to hold question objects
let currentUser = null;
let adminData = null;

// ============================================
// AUTH STATE (protect page)
// ============================================
firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Check if admin
        try {
            const userDoc = await firestoreDb.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                adminData = userDoc.data();
                if (adminData.role !== 'admin' && adminData.role !== 'super_admin') {
                    window.location.href = '../../auth/login-admin.html';
                } else {
                    // Load admin name
                    document.getElementById('adminName').textContent = adminData.name || adminData.email || 'Admin';
                }
            } else {
                window.location.href = '../../auth/login-admin.html';
            }
        } catch (error) {
            console.error("Auth check failed:", error);
            window.location.href = '../../auth/login-admin.html';
        }
    } else {
        window.location.href = '../../auth/login-admin.html';
    }
});

// ============================================
// UTILITY FUNCTIONS (toast, etc.)
// ============================================
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
    return toastId;
}

// ============================================
// HANDLE JSON UPLOAD
// ============================================
function handleJSONUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const json = JSON.parse(e.target.result);
            let newQuestions = [];
            
            // Support both direct array and { questions: [...] } format
            if (Array.isArray(json)) {
                newQuestions = json;
            } else if (json.questions && Array.isArray(json.questions)) {
                newQuestions = json.questions;
            } else {
                throw new Error("JSON must contain an array of questions or a 'questions' array.");
            }
            
            // Validate each question
            newQuestions.forEach((q, idx) => {
                if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4 || q.correct === undefined) {
                    throw new Error(`Question ${idx+1} is missing required fields (question, options[4], correct).`);
                }
            });
            
            // Add to questions array
            questions.push(...newQuestions);
            renderQuestions();
            document.getElementById('uploadStatus').className = 'upload-status success';
            document.getElementById('uploadStatus').textContent = `✅ Successfully added ${newQuestions.length} questions.`;
            showToast(`${newQuestions.length} questions loaded from JSON.`, 'success');
        } catch (error) {
            document.getElementById('uploadStatus').className = 'upload-status error';
            document.getElementById('uploadStatus').textContent = `❌ Error: ${error.message}`;
            showToast('Invalid JSON file.', 'error');
        }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
}

// ============================================
// ADD MANUAL QUESTION
// ============================================
function addManualQuestion() {
    const question = document.getElementById('manualQuestion').value.trim();
    const optA = document.getElementById('optA').value.trim();
    const optB = document.getElementById('optB').value.trim();
    const optC = document.getElementById('optC').value.trim();
    const optD = document.getElementById('optD').value.trim();
    const correct = parseInt(document.getElementById('correctOption').value);
    const explanation = document.getElementById('explanation').value.trim();

    if (!question) {
        showToast('Please enter a question.', 'warning');
        return;
    }
    if (!optA || !optB || !optC || !optD) {
        showToast('All four options are required.', 'warning');
        return;
    }

    const newQuestion = {
        question,
        options: [optA, optB, optC, optD],
        correct,
        explanation: explanation || ''
    };

    questions.push(newQuestion);
    renderQuestions();
    
    // Clear form
    document.getElementById('manualQuestion').value = '';
    document.getElementById('optA').value = '';
    document.getElementById('optB').value = '';
    document.getElementById('optC').value = '';
    document.getElementById('optD').value = '';
    document.getElementById('correctOption').value = '0';
    document.getElementById('explanation').value = '';
    
    showToast('Question added.', 'success');
}

// ============================================
// RENDER QUESTIONS LIST
// ============================================
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    const countSpan = document.getElementById('questionCount');
    countSpan.textContent = questions.length;

    if (questions.length === 0) {
        container.innerHTML = `
            <div class="empty-state" id="emptyQuestions">
                <i class="fas fa-question-circle"></i>
                <p>No questions added yet. Upload a JSON file or add manually.</p>
            </div>
        `;
        return;
    }

    let html = '';
    questions.forEach((q, index) => {
        const correctLetter = String.fromCharCode(65 + q.correct); // A, B, C, D
        html += `
            <div class="question-card" data-index="${index}">
                <div class="question-header">
                    <span class="question-number">Question ${index + 1}</span>
                    <div class="question-actions">
                        <button class="btn-icon" onclick="editQuestion(${index})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteQuestion(${index})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="question-text">${escapeHTML(q.question)}</div>
                <div class="options-list">
                    ${q.options.map((opt, optIdx) => `
                        <div class="option-item ${optIdx === q.correct ? 'correct' : ''}">
                            <span class="option-prefix">${String.fromCharCode(65 + optIdx)}.</span>
                            <span>${escapeHTML(opt)}</span>
                            ${optIdx === q.correct ? '<i class="fas fa-check-circle" style="color: var(--success); margin-left: auto;"></i>' : ''}
                        </div>
                    `).join('')}
                </div>
                ${q.explanation ? `<div class="explanation"><i class="fas fa-info-circle"></i> ${escapeHTML(q.explanation)}</div>` : ''}
            </div>
        `;
    });
    container.innerHTML = html;
}

// Simple escape to prevent XSS
function escapeHTML(str) {
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// ============================================
// EDIT / DELETE QUESTIONS
// ============================================
function deleteQuestion(index) {
    if (confirm('Delete this question?')) {
        questions.splice(index, 1);
        renderQuestions();
        showToast('Question deleted.', 'info');
    }
}

function editQuestion(index) {
    const q = questions[index];
    // Populate manual form with question data
    document.getElementById('manualQuestion').value = q.question;
    document.getElementById('optA').value = q.options[0] || '';
    document.getElementById('optB').value = q.options[1] || '';
    document.getElementById('optC').value = q.options[2] || '';
    document.getElementById('optD').value = q.options[3] || '';
    document.getElementById('correctOption').value = q.correct;
    document.getElementById('explanation').value = q.explanation || '';
    
    // Remove old question after editing? Better to replace on save.
    // We'll remove it and then user can add edited version.
    if (confirm('Edit this question. After editing, click "Add to List" to save changes. The original will be removed.')) {
        questions.splice(index, 1);
        renderQuestions();
    }
}

function clearAllQuestions() {
    if (questions.length > 0 && confirm('Clear all questions?')) {
        questions = [];
        renderQuestions();
        showToast('All questions cleared.', 'info');
    }
}

// ============================================
// PUBLISH TEST TO FIRESTORE
// ============================================
async function publishTest() {
    const title = document.getElementById('testTitle').value.trim();
    const duration = parseInt(document.getElementById('testDuration').value) || 120;
    const description = document.getElementById('testDescription').value.trim();

    if (!title) {
        showToast('Please enter a test title.', 'warning');
        return;
    }
    if (questions.length === 0) {
        showToast('Add at least one question before publishing.', 'warning');
        return;
    }

    // Prepare test object
    const testData = {
        title,
        description,
        duration,
        questions: questions.map(q => ({
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation || ''
        })),
        semester: 6,               // Fixed for DDCET
        type: 'ddcet',
        marking: {
            correct: 2,
            wrong: -0.5,
            unattempt: 0
        },
        publishedAt: firebase.firestore.FieldValue.serverTimestamp(),
        publishedBy: currentUser?.uid || null,
        isActive: true
    };

    try {
        const publishBtn = document.getElementById('publishBtn');
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';

        // Save to Firestore
        const docRef = await firestoreDb.collection('ddcet_tests').add(testData);
        
        showToast(`Test "${title}" published successfully! ID: ${docRef.id}`, 'success');
        publishBtn.disabled = false;
        publishBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Test';
        
        // Optionally clear form or keep for another test
        if (confirm('Clear form and start a new test?')) {
            document.getElementById('testTitle').value = '';
            document.getElementById('testDescription').value = '';
            questions = [];
            renderQuestions();
        }
    } catch (error) {
        console.error('Publish error:', error);
        showToast('Failed to publish test: ' + error.message, 'error');
        document.getElementById('publishBtn').disabled = false;
        document.getElementById('publishBtn').innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Publish Test';
    }
}

// ============================================
// SIDEBAR TOGGLE (reused from dashboard)
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    const mainContent = document.getElementById('mainContent');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('sidebar-collapsed');
        });
    }
});

// Make functions global for onclick handlers
window.handleJSONUpload = handleJSONUpload;
window.addManualQuestion = addManualQuestion;
window.deleteQuestion = deleteQuestion;
window.editQuestion = editQuestion;
window.clearAllQuestions = clearAllQuestions;
window.publishTest = publishTest;