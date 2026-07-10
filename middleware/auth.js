// middleware/auth.js
// Protects routes that require a logged-in user.
// Usage: router.get('/protected', requireAuth, handler)

const jwt  = require('jsonwebtoken')
const User = require('../models/user')

const JWT_SECRET = process.env.JWT_SECRET || 'somaside_secret_key'

async function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) return res.status(401).json({ error: 'User not found' })
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = { requireAuth, JWT_SECRET }
