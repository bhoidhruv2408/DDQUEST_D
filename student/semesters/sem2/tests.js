// tests.js – Semester 2 Tests

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let studentData = null;
let allTests = [];

const testsGrid = document.getElementById('testsGrid');

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

document.addEventListener('DOMContentLoaded', function() {
    initSpaceParticles();
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    updateGreeting();
    checkAuthState();
});

function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../../../auth/login-student.html';
            return;
        }
        currentUser = user;
        try {
            await loadStudentData(user.uid);
            await loadTests();
            await updateLastActive();
            startOnlineStatusUpdater();
        } catch (error) {
            console.error('Error loading data:', error);
            showToast('Failed to load tests.', 'error');
        }
    });
}

async function loadStudentData(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        studentData = userDoc.data();
        document.getElementById('userName').textContent = studentData.fullName || 'Student';
    } else {
        document.getElementById('userName').textContent = 'Student';
    }
}

async function loadTests() {
    if (!studentData) return;
    testsGrid.innerHTML = '<div class="loader"></div>';
    try {
        const snapshot = await db.collection('tests')
            .where('semester', '==', 2)
            .orderBy('createdAt', 'desc')
            .get();
        allTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (allTests.length === 0) {
            testsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No tests found</h3>
                    <p>Check back later for semester 2 tests.</p>
                </div>
            `;
            return;
        }
        renderTests(allTests);
    } catch (error) {
        console.error('Error loading tests:', error);
        if (error.code === 'failed-precondition') {
            const match = error.message.match(/https:[^\s]+/);
            const indexUrl = match ? match[0] : '#';
            testsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>Index required</h3>
                    <p>Click <a href="${indexUrl}" target="_blank">here</a> to create the missing index, then refresh.</p>
                </div>
            `;
        } else {
            testsGrid.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Failed to load tests</h3><p>${error.message}</p></div>`;
        }
    }
}

function renderTests(tests) {
    let html = '';
    tests.forEach(test => {
        const date = test.createdAt ? formatDate(test.createdAt) : 'Recently';
        const questions = test.questions ? test.questions.length : (test.questionCount || 0);
        const duration = test.duration || 60;
        html += `
            <div class="test-card" data-id="${test.id}">
                <div class="test-icon"><i class="fas fa-clipboard-list"></i></div>
                <h3 class="test-title">${test.title || 'Untitled Test'}</h3>
                <p class="test-description">${test.description || 'No description available.'}</p>
                <div class="test-meta">
                    <span><i class="fas fa-clock"></i> ${duration} mins</span>
                    <span><i class="fas fa-question-circle"></i> ${questions} questions</span>
                </div>
                <a href="../../tests/take-test.html?id=${test.id}" class="test-link">
                    <i class="fas fa-play"></i> Take Test
                </a>
            </div>
        `;
    });
    testsGrid.innerHTML = html;
}

// Online status, time, logout, particles, etc. (same as before)
// (Include all the same helper functions from the sem1 tests.js)