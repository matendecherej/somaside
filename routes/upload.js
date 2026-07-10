// routes/upload.js
// Handles image uploads → stores in Cloudinary → returns URL
// Requires: npm install multer cloudinary multer-storage-cloudinary

const express  = require('express')
const multer   = require('multer')
const { v2: cloudinary } = require('cloudinary')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── Configure Cloudinary ──────────────────────────────────────────────────────
// Add these to your .env file:
//   CLOUDINARY_CLOUD_NAME=your_cloud_name
//   CLOUDINARY_API_KEY=your_api_key
//   CLOUDINARY_API_SECRET=your_api_secret

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'somaside',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }]  // resize large images
  }
})

const upload = multer({ storage })

// ── POST /api/upload/image ────────────────────────────────────────────────────
router.post('/image', requireAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.json({ url: req.file.path })   // Cloudinary URL
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' })
  }
})
const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'somaside/pdfs',
    allowed_formats: ['pdf'],
    resource_type: 'raw'
  }
})

const uploadPdf = multer({ storage: pdfStorage })

// ── POST /api/upload/pdf ──────────────────────────────────────
router.post('/pdf', requireAuth, uploadPdf.single('pdf'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    res.json({ url: req.file.path })
  } catch (err) {
    res.status(500).json({ error: 'PDF upload failed' })
  }
})

module.exports = router
