// firebase/db.js

class DatabaseService {
    constructor() {
        this.db = window.firebaseDb;
        this.storage = window.firebaseStorage;
    }

    // ==================== USER MANAGEMENT ====================
    
    async getUser(userId) {
        try {
            const doc = await this.db.collection('users').doc(userId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error("Get user error:", error);
            return null;
        }
    }

    async updateUser(userId, data) {
        try {
            await this.db.collection('users').doc(userId).update(data);
            return { success: true };
        } catch (error) {
            console.error("Update user error:", error);
            return { success: false, error: error.message };
        }
    }

    async getAllStudents(page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            
            const snapshot = await this.db.collection('users')
                .where('role', '==', 'student')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            
            const students = [];
            snapshot.forEach(doc => {
                students.push({ id: doc.id, ...doc.data() });
            });
            
            // Get total count
            const countSnapshot = await this.db.collection('users')
                .where('role', '==', 'student')
                .count()
                .get();
            
            const total = countSnapshot.data().count;
            
            return {
                success: true,
                students,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
            
        } catch (error) {
            console.error("Get students error:", error);
            return { success: false, error: error.message };
        }
    }

    // ==================== STUDY MATERIALS ====================
    
    async uploadMaterial(materialData, file = null) {
        try {
            let fileUrl = '';
            
            // Upload file if provided
            if (file) {
                const storageRef = this.storage.ref();
                const fileRef = storageRef.child(`materials/${Date.now()}_${file.name}`);
                await fileRef.put(file);
                fileUrl = await fileRef.getDownloadURL();
            }
            
            // Save material metadata
            const materialRef = await this.db.collection('materials').add({
                ...materialData,
                fileUrl: fileUrl,
                uploadedBy: materialData.uploadedBy,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'published',
                downloads: 0,
                views: 0,
                rating: 0,
                ratingCount: 0
            });
            
            return { 
                success: true, 
                materialId: materialRef.id,
                fileUrl: fileUrl
            };
            
        } catch (error) {
            console.error("Upload material error:", error);
            return { success: false, error: error.message };
        }
    }

    async getMaterials(semester = null, subject = null, type = null, limit = 50) {
        try {
            let query = this.db.collection('materials')
                .where('status', '==', 'published');
            
            if (semester) {
                query = query.where('semester', '==', semester);
            }
            
            if (subject) {
                query = query.where('subject', '==', subject);
            }
            
            if (type) {
                query = query.where('type', '==', type);
            }
            
            const snapshot = await query
                .orderBy('uploadedAt', 'desc')
                .limit(limit)
                .get();
            
            const materials = [];
            snapshot.forEach(doc => {
                materials.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, materials };
            
        } catch (error) {
            console.error("Get materials error:", error);
            return { success: false, error: error.message };
        }
    }

    async incrementMaterialViews(materialId) {
        try {
            await this.db.collection('materials').doc(materialId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
            return { success: true };
        } catch (error) {
            console.error("Increment views error:", error);
            return { success: false, error: error.message };
        }
    }

    // ==================== TESTS & QUESTIONS ====================
    
    async createTest(testData) {
        try {
            const testRef = await this.db.collection('tests').add({
                ...testData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 100
            });
            
            return { success: true, testId: testRef.id };
            
        } catch (error) {
            console.error("Create test error:", error);
            return { success: false, error: error.message };
        }
    }

    async getTests(semester = null, type = null, activeOnly = true) {
        try {
            let query = this.db.collection('tests');
            
            if (activeOnly) {
                query = query.where('isActive', '==', true);
            }
            
            if (semester) {
                query = query.where('semester', '==', semester);
            }
            
            if (type) {
                query = query.where('type', '==', type);
            }
            
            const snapshot = await query
                .orderBy('createdAt', 'desc')
                .get();
            
            const tests = [];
            snapshot.forEach(doc => {
                tests.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, tests };
            
        } catch (error) {
            console.error("Get tests error:", error);
            return { success: false, error: error.message };
        }
    }

    async getTestById(testId) {
        try {
            const doc = await this.db.collection('tests').doc(testId).get();
            if (!doc.exists) {
                return { success: false, error: "Test not found" };
            }
            
            return { success: true, test: { id: doc.id, ...doc.data() } };
            
        } catch (error) {
            console.error("Get test by ID error:", error);
            return { success: false, error: error.message };
        }
    }

    async getTestQuestions(testId) {
        try {
            const testDoc = await this.db.collection('tests').doc(testId).get();
            if (!testDoc.exists) {
                return { success: false, error: "Test not found" };
            }
            
            const testData = testDoc.data();
            const questionIds = testData.questions || [];
            
            // Get all questions
            const questions = [];
            for (const qId of questionIds) {
                const qDoc = await this.db.collection('questions').doc(qId).get();
                if (qDoc.exists) {
                    questions.push({ id: qDoc.id, ...qDoc.data() });
                }
            }
            
            return { success: true, questions, test: testData };
            
        } catch (error) {
            console.error("Get test questions error:", error);
            return { success: false, error: error.message };
        }
    }

    async submitTestResult(resultData) {
        try {
            const resultRef = await this.db.collection('testResults').add({
                ...resultData,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                reviewed: false
            });
            
            // Update test statistics
            await this.updateTestStats(resultData.testId, resultData.score);
            
            // Update student progress
            await this.updateStudentProgress(resultData.studentId, resultData);
            
            return { success: true, resultId: resultRef.id };
            
        } catch (error) {
            console.error("Submit test result error:", error);
            return { success: false, error: error.message };
        }
    }

    // ==================== PROGRESS TRACKING ====================
    
    async getStudentProgress(studentId) {
        try {
            const doc = await this.db.collection('studentProgress').doc(studentId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (error) {
            console.error("Get student progress error:", error);
            return null;
        }
    }

    async updateStudentProgress(studentId, resultData) {
        try {
            const progressRef = this.db.collection('studentProgress').doc(studentId);
            
            await this.db.runTransaction(async (transaction) => {
                const progressDoc = await transaction.get(progressRef);
                
                if (progressDoc.exists) {
                    const progress = progressDoc.data();
                    
                    // Update progress
                    const newTestsTaken = progress.totalTestsTaken + 1;
                    const newTotalScore = (progress.averageScore * progress.totalTestsTaken) + resultData.score;
                    const newAverageScore = newTotalScore / newTestsTaken;
                    
                    transaction.update(progressRef, {
                        totalTestsTaken: newTestsTaken,
                        averageScore: newAverageScore,
                        lastActive: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // Update subject-wise progress
                    if (resultData.subject) {
                        const subjects = progress.subjectsCompleted || {};
                        subjects[resultData.subject] = subjects[resultData.subject] || { testsTaken: 0, averageScore: 0 };
                        
                        const subjectData = subjects[resultData.subject];
                        const newSubjectTests = subjectData.testsTaken + 1;
                        const newSubjectTotal = (subjectData.averageScore * subjectData.testsTaken) + resultData.score;
                        
                        subjects[resultData.subject] = {
                            testsTaken: newSubjectTests,
                            averageScore: newSubjectTotal / newSubjectTests,
                            lastAttempt: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        transaction.update(progressRef, {
                            subjectsCompleted: subjects
                        });
                    }
                }
            });
            
            return { success: true };
            
        } catch (error) {
            console.error("Update student progress error:", error);
            return { success: false, error: error.message };
        }
    }

    // ==================== ADMIN FUNCTIONS ====================
    
    async getAdminRequests(status = 'pending') {
        try {
            const snapshot = await this.db.collection('adminRequests')
                .where('status', '==', status)
                .orderBy('requestedAt', 'desc')
                .get();
            
            const requests = [];
            snapshot.forEach(doc => {
                requests.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, requests };
            
        } catch (error) {
            console.error("Get admin requests error:", error);
            return { success: false, error: error.message };
        }
    }

    async processAdminRequest(requestId, action, adminLevel = 'content', notes = '') {
        try {
            const updateData = {
                status: action === 'approve' ? 'approved' : 'rejected',
                reviewedBy: (await authService.getCurrentUser()).uid,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                notes: notes
            };
            
            if (action === 'approve') {
                updateData.adminLevel = adminLevel;
            }
            
            await this.db.collection('adminRequests').doc(requestId).update(updateData);
            
            return { success: true };
            
        } catch (error) {
            console.error("Process admin request error:", error);
            return { success: false, error: error.message };
        }
    }

    async getAnalytics(timeRange = 'month') {
        try {
            const now = new Date();
            let startDate = new Date();
            
            switch (timeRange) {
                case 'week':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'year':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    startDate.setMonth(now.getMonth() - 1);
            }
            
            // Get user statistics
            const usersSnapshot = await this.db.collection('users')
                .where('createdAt', '>=', startDate)
                .get();
            
            // Get test results
            const resultsSnapshot = await this.db.collection('testResults')
                .where('submittedAt', '>=', startDate)
                .get();
            
            // Get material uploads
            const materialsSnapshot = await this.db.collection('materials')
                .where('uploadedAt', '>=', startDate)
                .get();
            
            const analytics = {
                newUsers: usersSnapshot.size,
                totalTestsTaken: resultsSnapshot.size,
                newMaterials: materialsSnapshot.size,
                averageScore: 0,
                topSubjects: {}
            };
            
            // Calculate average score
            let totalScore = 0;
            resultsSnapshot.forEach(doc => {
                totalScore += doc.data().score || 0;
            });
            
            if (resultsSnapshot.size > 0) {
                analytics.averageScore = totalScore / resultsSnapshot.size;
            }
            
            return { success: true, analytics };
            
        } catch (error) {
            console.error("Get analytics error:", error);
            return { success: false, error: error.message };
        }
    }

    // ==================== HELPER FUNCTIONS ====================
    
    async updateTestStats(testId, score) {
        try {
            const testRef = this.db.collection('tests').doc(testId);
            
            await this.db.runTransaction(async (transaction) => {
                const testDoc = await transaction.get(testRef);
                
                if (testDoc.exists) {
                    const testData = testDoc.data();
                    const newAttempts = testData.totalAttempts + 1;
                    const newTotalScore = (testData.averageScore * testData.totalAttempts) + score;
                    const newAverage = newTotalScore / newAttempts;
                    
                    const updates = {
                        totalAttempts: newAttempts,
                        averageScore: newAverage
                    };
                    
                    // Update highest/lowest scores
                    if (score > testData.highestScore) {
                        updates.highestScore = score;
                    }
                    if (score < testData.lowestScore) {
                        updates.lowestScore = score;
                    }
                    
                    transaction.update(testRef, updates);
                }
            });
            
            return { success: true };
            
        } catch (error) {
            console.error("Update test stats error:", error);
            return { success: false, error: error.message };
        }
    }

    async searchMaterials(query) {
        try {
            // This is a simple search - in production, use Algolia or similar
            const snapshot = await this.db.collection('materials')
                .where('status', '==', 'published')
                .get();
            
            const results = [];
            const lowerQuery = query.toLowerCase();
            
            snapshot.forEach(doc => {
                const material = doc.data();
                const searchableText = `
                    ${material.title || ''} 
                    ${material.subject || ''} 
                    ${material.description || ''}
                    ${material.tags?.join(' ') || ''}
                `.toLowerCase();
                
                if (searchableText.includes(lowerQuery)) {
                    results.push({ id: doc.id, ...material });
                }
            });
            
            return { success: true, results };
            
        } catch (error) {
            console.error("Search materials error:", error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize and export
let dbService = null;

function initDatabaseService() {
    if (window.firebaseDb && window.firebaseStorage) {
        dbService = new DatabaseService();
        window.dbService = dbService;
        console.log("✅ Database Service initialized");
    } else {
        console.error("Firebase services not available");
    }
}

// Initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    setTimeout(initDatabaseService, 1000);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseService, initDatabaseService };
}