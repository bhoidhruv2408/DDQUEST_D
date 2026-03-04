// index.js

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import uploadRoutes from './routes/upload.js';

// ================= LOAD ENV =================
dotenv.config();

// ================= BASIC SETUP =================
const app = express();
const PORT = process.env.PORT || 5000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= FIREBASE ADMIN SETUP =================
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set in .env");
  } else {
    const fullPath = path.join(__dirname, serviceAccountPath);

    if (!fs.existsSync(fullPath)) {
      console.error("❌ serviceAccountKey.json not found at:", fullPath);
    } else {
      const serviceAccount = JSON.parse(
        fs.readFileSync(fullPath, 'utf-8')
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      const db = admin.firestore();
      app.locals.db = db;

      console.log("✅ Firebase Admin Initialized");
    }
  }
} catch (error) {
  console.error("❌ Firebase initialization failed:", error.message);
}

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= STATIC FILES =================

// Serve frontend files (index.html, admin, student, etc.)
app.use(express.static(path.join(__dirname)));

// Serve uploaded files (local fallback)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= API ROUTES =================
app.use('/api', uploadRoutes);

// ================= TEST ROUTE =================
app.get('/', (req, res) => {
  res.send("🚀 DDQUEST Backend Running Successfully");
});

// ================= 404 HANDLER =================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});