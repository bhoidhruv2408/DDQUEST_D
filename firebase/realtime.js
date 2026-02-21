// firebase/realtime.js

class RealtimeService {
    constructor() {
        this.db = window.firebaseDb;
        this.listeners = new Map();
    }

    // ==================== STUDENT PROGRESS ====================
    
    listenToStudentProgress(studentId, callback) {
        try {
            const docRef = this.db.collection('studentProgress').doc(studentId);
            
            const unsubscribe = docRef.onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                } else {
                    callback(null);
                }
            }, (error) => {
                console.error("Progress listener error:", error);
                callback(null, error);
            });
            
            // Store for cleanup
            this.listeners.set(`progress_${studentId}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Listen to progress error:", error);
            return null;
        }
    }

    // ==================== NEW MATERIALS ====================
    
    listenToNewMaterials(semester = null, callback) {
        try {
            let query = this.db.collection('materials')
                .where('status', '==', 'published')
                .orderBy('uploadedAt', 'desc')
                .limit(20);
            
            if (semester) {
                query = query.where('semester', '==', semester);
            }
            
            const unsubscribe = query.onSnapshot((snapshot) => {
                const materials = [];
                snapshot.forEach(doc => {
                    materials.push({ id: doc.id, ...doc.data() });
                });
                callback(materials);
            }, (error) => {
                console.error("Materials listener error:", error);
                callback([], error);
            });
            
            this.listeners.set(`materials_${semester || 'all'}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Listen to materials error:", error);
            return null;
        }
    }

    // ==================== TEST RESULTS ====================
    
    listenToTestResults(studentId, testId = null, callback) {
        try {
            let query = this.db.collection('testResults')
                .where('studentId', '==', studentId)
                .orderBy('submittedAt', 'desc')
                .limit(20);
            
            if (testId) {
                query = query.where('testId', '==', testId);
            }
            
            const unsubscribe = query.onSnapshot((snapshot) => {
                const results = [];
                snapshot.forEach(doc => {
                    results.push({ id: doc.id, ...doc.data() });
                });
                callback(results);
            });
            
            this.listeners.set(`results_${studentId}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Test results listener error:", error);
            return null;
        }
    }

    // ==================== ADMIN REQUESTS ====================
    
    listenToAdminRequests(status = 'pending', callback) {
        try {
            const unsubscribe = this.db.collection('adminRequests')
                .where('status', '==', status)
                .orderBy('requestedAt', 'desc')
                .onSnapshot((snapshot) => {
                    const requests = [];
                    snapshot.forEach(doc => {
                        requests.push({ id: doc.id, ...doc.data() });
                    });
                    callback(requests);
                });
            
            this.listeners.set(`adminRequests_${status}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Admin requests listener error:", error);
            return null;
        }
    }

    // ==================== REAL-TIME USER STATUS ====================
    
    listenToUserStatus(userId, callback) {
        try {
            const userRef = this.db.collection('users').doc(userId);
            
            const unsubscribe = userRef.onSnapshot((doc) => {
                if (doc.exists) {
                    callback({ id: doc.id, ...doc.data() });
                }
            });
            
            this.listeners.set(`user_${userId}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("User status listener error:", error);
            return null;
        }
    }

    // ==================== LIVE TEST PARTICIPANTS ====================
    
    listenToLiveTestParticipants(testId, callback) {
        try {
            const participantsRef = this.db.collection('liveTests').doc(testId)
                .collection('participants');
            
            const unsubscribe = participantsRef.onSnapshot((snapshot) => {
                const participants = [];
                snapshot.forEach(doc => {
                    participants.push({ id: doc.id, ...doc.data() });
                });
                callback(participants);
            });
            
            this.listeners.set(`participants_${testId}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Live test participants error:", error);
            return null;
        }
    }

    // ==================== NOTIFICATIONS ====================
    
    listenToNotifications(userId, callback) {
        try {
            const unsubscribe = this.db.collection('notifications')
                .where('userId', '==', userId)
                .where('read', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    const notifications = [];
                    snapshot.forEach(doc => {
                        notifications.push({ id: doc.id, ...doc.data() });
                    });
                    callback(notifications);
                });
            
            this.listeners.set(`notifications_${userId}`, unsubscribe);
            
            return unsubscribe;
            
        } catch (error) {
            console.error("Notifications listener error:", error);
            return null;
        }
    }

    // ==================== CLEANUP ====================
    
    unsubscribeAll() {
        this.listeners.forEach((unsubscribe, key) => {
            unsubscribe();
            console.log(`Unsubscribed: ${key}`);
        });
        this.listeners.clear();
    }

    unsubscribe(key) {
        if (this.listeners.has(key)) {
            this.listeners.get(key)();
            this.listeners.delete(key);
            return true;
        }
        return false;
    }
}

// Initialize and export
let realtimeService = null;

function initRealtimeService() {
    if (window.firebaseDb) {
        realtimeService = new RealtimeService();
        window.realtimeService = realtimeService;
        console.log("✅ Realtime Service initialized");
    } else {
        console.error("Firebase Firestore not available");
    }
}

// Initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    setTimeout(initRealtimeService, 1500);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RealtimeService, initRealtimeService };
}