const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// HTTP function to accept file as base64 and upload to Storage server-side
exports.uploadFile = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });

  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/Bearer\s+(.*)/i);
  if (!match) return res.status(401).send({ error: 'Missing Authorization token' });

  const idToken = match[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { fileBase64, filePath, contentType } = req.body;
    if (!fileBase64 || !filePath) return res.status(400).send({ error: 'Missing file data' });

    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    const buffer = Buffer.from(fileBase64, 'base64');

    await file.save(buffer, {
      metadata: { contentType },
      resumable: false
    });

    // Create a signed URL (7 days)
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: expiresAt });

    return res.json({ url: signedUrl, uploadedBy: decoded.uid });
  } catch (err) {
    console.error('uploadFile error:', err);
    return res.status(500).send({ error: err.message || String(err) });
  }
});
