require('dotenv').config()
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const path     = require('path')

const app  = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI

console.log('Mongo URI loaded:', !!MONGO_URI)

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))  // serves your HTML files
app.use('/images', express.static(path.join(__dirname, 'public/images')))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'))
app.use('/api/stories', require('./routes/stories_routes'))
app.use('/api/upload',  require('./routes/upload'))
app.use('/api/users',   require('./routes/users_routes')) // profile, follow, notice board

// ── Catch-all: send index.html for any non-API route ─────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// ── Connect to MongoDB then start server ──────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB')
    app.listen(PORT, () => {
      console.log(`🚀 Soma Side server running on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message)
    process.exit(1)
  })
  