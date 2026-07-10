// routes/users_routes.js
const express = require('express')
const jwt     = require('jsonwebtoken')
const User    = require('../models/user')
const Notice  = require('../models/notice')
const { requireAuth, JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

// ── Optional auth ────────────────────────────────────────────
// Attaches req.userId if a valid token is present, but never blocks
// the request. Used on public routes that behave slightly differently
// for a logged-in viewer (e.g. "isFollowing").
function optionalAuth(req, res, next) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET)
      req.userId = decoded.id
    } catch (err) {
      // invalid/expired token — treat as anonymous, don't error out
    }
  }
  next()
}

// ── GET /api/users/:id ── public profile card ──────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetToken -resetTokenExpiry')

    if (!user) return res.status(404).json({ error: 'User not found' })

    res.json({
      user: {
        id:             user._id,
        name:           user.name,
        bio:            user.bio,
        avatarUrl:      user.avatarUrl,
        createdAt:      user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing:    req.userId ? user.followers.some(f => f.toString() === req.userId) : false,
        isSelf:         req.userId ? req.userId === req.params.id : false
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/users/:id/follow ── toggle follow/unfollow ────────
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id
    const myId     = String(req.user.id || req.user._id)

    if (targetId === myId)
      return res.status(400).json({ error: "You can't follow yourself" })

    const target = await User.findById(targetId)
    const me     = await User.findById(myId)
    if (!target || !me) return res.status(404).json({ error: 'User not found' })

    const alreadyFollowing = target.followers.some(f => f.toString() === myId)

    if (alreadyFollowing) {
      target.followers = target.followers.filter(f => f.toString() !== myId)
      me.following     = me.following.filter(f => f.toString() !== targetId)
    } else {
      target.followers.push(myId)
      me.following.push(targetId)
    }

    await target.save()
    await me.save()

    res.json({
      following:      !alreadyFollowing,
      followersCount: target.followers.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/users/:id/notices ── public notice board (read) ────
router.get('/:id/notices', async (req, res) => {
  try {
    const notices = await Notice.find({ author: req.params.id }).sort({ createdAt: -1 })
    res.json(notices)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/users/notices ── post a notice (own board only) ───
router.post('/notices', requireAuth, async (req, res) => {
  try {
    const { message } = req.body
    if (!message || !message.trim())
      return res.status(400).json({ error: 'Notice message cannot be empty' })

    const notice = await Notice.create({
      author:  req.user.id || req.user._id,
      message: message.trim().slice(0, 500)
    })

    res.status(201).json(notice)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /api/users/notices/:noticeId ── remove own notice ────
router.delete('/notices/:noticeId', requireAuth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.noticeId)
    if (!notice) return res.status(404).json({ error: 'Notice not found' })

    const myId = String(req.user.id || req.user._id)
    if (notice.author.toString() !== myId)
      return res.status(403).json({ error: 'Not authorized to delete this notice' })

    await notice.deleteOne()
    res.json({ message: 'Notice deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
