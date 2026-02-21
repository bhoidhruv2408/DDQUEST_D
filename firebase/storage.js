// firebase/storage.js

class StorageService {
    constructor() {
        this.storage = window.firebaseStorage;
    }

    async uploadFile(file, path = 'uploads/') {
        try {
            if (!file) {
                return { success: false, error: "No file provided" };
            }
            
            // Generate unique filename
            const timestamp = Date.now();
            const extension = file.name.split('.').pop();
            const filename = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
            const filePath = `${path}${filename}`;
            
            // Create storage reference
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(filePath);
            
            // Upload file
            const uploadTask = fileRef.put(file);
            
            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        // Progress tracking (optional)
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload is ${progress}% done`);
                    },
                    (error) => {
                        reject({ success: false, error: error.message });
                    },
                    async () => {
                        // Upload complete
                        const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                        
                        resolve({
                            success: true,
                            url: downloadURL,
                            path: filePath,
                            filename: filename,
                            size: file.size,
                            type: file.type
                        });
                    }
                );
            });
            
        } catch (error) {
            console.error("Upload file error:", error);
            return { success: false, error: error.message };
        }
    }

    async deleteFile(filePath) {
        try {
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(filePath);
            
            await fileRef.delete();
            return { success: true };
            
        } catch (error) {
            console.error("Delete file error:", error);
            return { success: false, error: error.message };
        }
    }

    async getFileUrl(filePath) {
        try {
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(filePath);
            
            const url = await fileRef.getDownloadURL();
            return { success: true, url };
            
        } catch (error) {
            console.error("Get file URL error:", error);
            return { success: false, error: error.message };
        }
    }

    // Upload study material (PDF, images, etc.)
    async uploadStudyMaterial(file, metadata = {}) {
        try {
            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'image/jpeg', 
                'image/png',
                'image/gif',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
            
            if (!allowedTypes.includes(file.type)) {
                return { 
                    success: false, 
                    error: "File type not allowed. Allowed: PDF, Images, DOC, TXT" 
                };
            }
            
            // Check file size (max 20MB)
            const maxSize = 20 * 1024 * 1024; // 20MB
            if (file.size > maxSize) {
                return { success: false, error: "File size exceeds 20MB limit" };
            }
            
            // Upload to materials folder
            const result = await this.uploadFile(file, 'materials/');
            
            if (result.success) {
                // Save metadata to Firestore via dbService
                if (window.dbService) {
                    const materialData = {
                        ...metadata,
                        fileUrl: result.url,
                        filename: result.filename,
                        fileSize: result.size,
                        fileType: file.type,
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // We'll let the caller save to Firestore
                    return {
                        ...result,
                        materialData: materialData
                    };
                }
            }
            
            return result;
            
        } catch (error) {
            console.error("Upload study material error:", error);
            return { success: false, error: error.message };
        }
    }

    // Upload profile picture
    async uploadProfilePicture(file, userId) {
        try {
            // Validate image
            if (!file.type.startsWith('image/')) {
                return { success: false, error: "Only image files allowed" };
            }
            
            // Check size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                return { success: false, error: "Image size exceeds 5MB limit" };
            }
            
            // Resize image if needed (basic client-side resize)
            const resizedImage = await this.resizeImage(file, 500, 500);
            
            // Upload to profile-pictures folder
            const result = await this.uploadFile(resizedImage, `profile-pictures/${userId}/`);
            
            return result;
            
        } catch (error) {
            console.error("Upload profile picture error:", error);
            return { success: false, error: error.message };
        }
    }

    // Resize image for profile pictures
    async resizeImage(file, maxWidth, maxHeight) {
        return new Promise((resolve) => {
            // If file is small enough, return as is
            if (file.size < 1024 * 1024) { // 1MB
                resolve(file);
                return;
            }
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        const resizedFile = new File([blob], file.name, {
                            type: file.type,
                            lastModified: Date.now()
                        });
                        resolve(resizedFile);
                    }, file.type);
                };
            };
        });
    }

    // Get file metadata
    async getFileMetadata(filePath) {
        try {
            const storageRef = this.storage.ref();
            const fileRef = storageRef.child(filePath);
            
            const metadata = await fileRef.getMetadata();
            return { success: true, metadata };
            
        } catch (error) {
            console.error("Get file metadata error:", error);
            return { success: false, error: error.message };
        }
    }

    // List files in a folder
    async listFiles(folderPath) {
        try {
            const storageRef = this.storage.ref();
            const folderRef = storageRef.child(folderPath);
            
            const result = await folderRef.listAll();
            const files = [];
            
            // Get file URLs
            for (const item of result.items) {
                const url = await item.getDownloadURL();
                const metadata = await item.getMetadata();
                
                files.push({
                    name: item.name,
                    url: url,
                    path: item.fullPath,
                    size: metadata.size,
                    type: metadata.contentType,
                    updated: metadata.updated
                });
            }
            
            return { success: true, files };
            
        } catch (error) {
            console.error("List files error:", error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize and export
let storageService = null;

function initStorageService() {
    if (window.firebaseStorage) {
        storageService = new StorageService();
        window.storageService = storageService;
        console.log("✅ Storage Service initialized");
    } else {
        console.error("Firebase Storage not available");
    }
}

// Initialize when Firebase is ready
if (typeof firebase !== 'undefined') {
    setTimeout(initStorageService, 1000);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageService, initStorageService };
}