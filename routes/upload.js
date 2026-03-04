import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cloudinary from '../config/cloudinary.js';
import { db } from '../config/firebase.js';

const router = express.Router();

// ---------- Setup ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer disk storage (local temp files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images and documents are allowed'));
  }
});

// ---------- Helper: Upload to Cloudinary and clean up ----------
// Now accepts a `resourceType` parameter to override 'auto'
async function uploadToCloudinary(filePath, resourceType = 'auto', options = {}) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'ddquest/uploads',
      resource_type: resourceType,  // Use the passed resource type
      ...options
    });
    // Delete local file after successful upload
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    // Keep local file if Cloudinary fails (fallback)
    console.error('Cloudinary upload failed:', error.message);
    return null;
  }
}

// ---------- Helper: Construct correct Cloudinary URL ----------
// Fixed to avoid adding .undefined when format is missing
function getCloudinaryUrl(cloudinaryResult) {
  if (!cloudinaryResult) return null;
  const { resource_type, version, public_id, format } = cloudinaryResult;
  const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/${resource_type}/upload/v${version}/${public_id}`;
  // Only add extension if format exists and is not empty
  return format ? `${baseUrl}.${format}` : baseUrl;
}

// ---------- 1. SINGLE FILE UPLOAD ----------
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { title, description, category, tags, uploadedBy } = req.body;
    if (!title || !category) {
      return res.status(400).json({ success: false, error: 'Title and category are required' });
    }

    // Determine resource type based on MIME type
    const isImage = req.file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';  // Force 'raw' for non‑images

    // Upload to Cloudinary with explicit resource type and public access
    const cloudinaryResult = await uploadToCloudinary(req.file.path, resourceType, {
      public_id: `file-${Date.now()}`,
      type: 'upload',  // 👈 Forces public access
      tags: tags ? tags.split(',').map(t => t.trim()) : []
    });

    // Determine final URL (Cloudinary or local fallback)
    let fileUrl, cloudinaryUrl;
    if (cloudinaryResult) {
      // Use manually constructed URL to ensure correct resource type
      cloudinaryUrl = getCloudinaryUrl(cloudinaryResult);
      fileUrl = cloudinaryUrl;
    } else {
      fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      cloudinaryUrl = null;
    }

    // Prepare Firestore document
    const fileData = {
      title: title || req.file.originalname,
      description: description || '',
      category: category || 'uncategorized',
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      uploadedBy: uploadedBy || 'anonymous',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      fileUrl,
      cloudinaryPublicId: cloudinaryResult?.public_id || null,
      cloudinaryUrl,
      resourceType: cloudinaryResult?.resource_type || null,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore (collection 'uploads')
    const docRef = await db.collection('uploads').add(fileData);
    console.log('✅ Stored in Firestore with ID:', docRef.id);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: { id: docRef.id, ...fileData }
    });

  } catch (error) {
    console.error('Upload error:', error);
    // Clean up local file if it still exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- 2. MULTIPLE FILE UPLOAD (up to 10) ----------
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const { category, tags, uploadedBy } = req.body;
    const results = [];

    for (const file of req.files) {
      // Determine resource type based on MIME type
      const isImage = file.mimetype.startsWith('image/');
      const resourceType = isImage ? 'image' : 'raw';

      const cloudinaryResult = await uploadToCloudinary(file.path, resourceType, {
        public_id: `file-${Date.now()}-${Math.random()}`,
        type: 'upload',  // 👈 Forces public access
        tags: tags ? tags.split(',').map(t => t.trim()) : []
      });

      let fileUrl, cloudinaryUrl;
      if (cloudinaryResult) {
        cloudinaryUrl = getCloudinaryUrl(cloudinaryResult);
        fileUrl = cloudinaryUrl;
      } else {
        fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        cloudinaryUrl = null;
      }

      const fileData = {
        title: file.originalname,
        category: category || 'uncategorized',
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        uploadedBy: uploadedBy || 'anonymous',
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        fileUrl,
        cloudinaryPublicId: cloudinaryResult?.public_id || null,
        cloudinaryUrl,
        resourceType: cloudinaryResult?.resource_type || null,
        uploadedAt: new Date().toISOString(),
      };

      const docRef = await db.collection('uploads').add(fileData);
      results.push({ id: docRef.id, ...fileData });
    }

    res.status(201).json({
      success: true,
      message: `${results.length} files uploaded`,
      data: results
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    // Clean up any remaining local files
    if (req.files) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- 3. DELETE FILE (from Cloudinary and Firestore) ----------
router.delete('/upload/:id', async (req, res) => {
  try {
    const docRef = db.collection('uploads').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    const data = doc.data();

    // Delete from Cloudinary if public_id exists
    if (data.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(data.cloudinaryPublicId);
        console.log('✅ Deleted from Cloudinary');
      } catch (cloudErr) {
        console.error('Cloudinary deletion error:', cloudErr);
        // Continue with Firestore deletion anyway
      }
    }

    // Delete Firestore document
    await docRef.delete();
    res.json({ success: true, message: 'File deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- 4. GET ALL MATERIALS (for admin edit page) ----------
router.get('/materials', async (req, res) => {
  try {
    const snapshot = await db.collection('uploads')
      .orderBy('uploadedAt', 'desc')
      .get();

    const materials = [];
    snapshot.forEach(doc => {
      materials.push({ id: doc.id, ...doc.data() });
    });

    res.json({ success: true, data: materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;