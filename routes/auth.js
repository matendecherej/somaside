// routes/auth.js
const express     = require('express')
const jwt         = require('jsonwebtoken')
const crypto      = require('crypto')
const nodemailer  = require('nodemailer')
const User        = require('../models/user')
const { requireAuth, JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

// ── Email transporter ─────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

// ── POST /api/auth/register ───────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields are required' })

    const existing = await User.findOne({ email })
    if (existing)
      return res.status(400).json({ error: 'Email already in use' })

    const user  = await User.create({ name, email, password })
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' })

    const user = await User.findOne({ email })
    if (!user)
      return res.status(400).json({ error: 'Invalid email or password' })

    const match = await user.comparePassword(password)
    if (!match)
      return res.status(400).json({ error: 'Invalid email or password' })

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user })
})

// ── PUT /api/auth/update ──────────────────────────────────────
router.put('/update', requireAuth, async (req, res) => {
  try {
    const { name, bio, avatarUrl, currentPassword, newPassword } = req.body

    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    // Update name
    if (name && name.trim()) user.name = name.trim()

    // Update bio (allow empty string to clear it)
    if (bio !== undefined) user.bio = bio.slice(0, 300)

    // Update avatar
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl

    // Update password if provided
    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Current password is required to set a new one' })
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'New password must be at least 6 characters' })
      const match = await user.comparePassword(currentPassword)
      if (!match)
        return res.status(400).json({ error: 'Current password is incorrect' })
      user.password = newPassword // pre-save hook will hash it
    }

    await user.save()

    // Update stored session data
    const updatedUser = { id: user._id, name: user.name, email: user.email, bio: user.bio, avatarUrl: user.avatarUrl }

    res.json({ message: 'Profile updated', user: updatedUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email })
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    const token  = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 60 * 60 * 1000)

    user.resetToken       = token
    user.resetTokenExpiry = expiry
    await user.save()

    const resetUrl = `http://localhost:3000/reset-password.html?token=${token}`

    const transporter = createTransporter()
    await transporter.sendMail({
      from:    `"Soma Side" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: 'Reset your Soma Side password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#1e0130;color:#fff;border-radius:16px;">
          <h2 style="font-family:Georgia,serif;color:#e8b84b;margin-bottom:0.5rem;">Soma Side</h2>
          <p style="color:rgba(255,255,255,0.7);margin-bottom:1.5rem;">African Literature Platform</p>
          <h3 style="margin-bottom:1rem;">Reset your password</h3>
          <p style="color:rgba(255,255,255,0.75);line-height:1.7;margin-bottom:1.5rem;">
            Hi ${user.name}, we received a request to reset your password.
            Click the button below to choose a new one.
          </p>
          <a href="${resetUrl}"
            style="display:inline-block;padding:0.85rem 2rem;background:#e8b84b;color:#1e0130;
                   border-radius:50px;font-weight:700;text-decoration:none;font-size:1rem;">
            Reset Password →
          </a>
          <p style="color:rgba(255,255,255,0.4);font-size:0.8rem;margin-top:1.5rem;line-height:1.6;">
            This link expires in 1 hour. If you didn't request this, ignore this email —
            your password won't change.
          </p>
        </div>
      `
    })

    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Could not send reset email. Try again later.' })
  }
})

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password)
      return res.status(400).json({ error: 'Token and new password are required' })

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const user = await User.findOne({
      resetToken:       token,
      resetTokenExpiry: { $gt: new Date() }
    })

    if (!user)
      return res.status(400).json({ error: 'Reset link is invalid or has expired' })

    user.password         = password
    user.resetToken       = null
    user.resetTokenExpiry = null
    await user.save()

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
