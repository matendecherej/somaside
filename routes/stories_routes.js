// routes/stories.js
const express     = require('express')
const Story       = require('../models/story')
const User        = require('../models/user')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// ── GET /api/stories ──────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter  = req.query.genre ? { genre: req.query.genre } : {}
    const stories = await Story.find(filter).sort({ createdAt: -1 })
    res.json(stories)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stories' })
  }
})

// ── GET /api/stories/user/mine ────────────────────────────────
router.get('/user/mine', requireAuth, async (req, res) => {
  try {
    const stories = await Story.find({ authorId: req.user._id }).sort({ createdAt: -1 })
    res.json(stories)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch your stories' })
  }
})

// ── GET /api/stories/user/bookmarked ─────────────────────────
router.get('/user/bookmarked', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('bookmarks')
    res.json(user.bookmarks)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch bookmarks' })
  }
})

// ── GET /api/stories/:id ──────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ error: 'Story not found' })
    res.json(story)
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch story' })
  }
})

// ── POST /api/stories ─────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, genre, excerpt, chapters, coverImage, readTime, country, city, rating } = req.body

    if (!chapters || !chapters.length)
      return res.status(400).json({ error: 'At least one chapter is required' })

    // Derive content string from chapters for legacy compatibility
    const content = chapters.map(c => c.content).join('\n\n')

    const story = await Story.create({
      title, genre, excerpt, chapters, content, coverImage, readTime,
      country: country || '', city: city || '',
      rating: rating || 'G',
      author:   req.user.name,
      authorId: req.user._id
    })

    res.status(201).json({ message: '✅ Story published!', story })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/stories/:id ──────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story)
      return res.status(404).json({ error: 'Story not found' })
    if (story.authorId?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your story' })

    const { title, genre, excerpt, chapters, coverImage, country, city } = req.body

    if (title)    story.title    = title
    if (genre)    story.genre    = genre
    if (excerpt !== undefined)    story.excerpt   = excerpt
    if (coverImage !== undefined) story.coverImage = coverImage
    if (country !== undefined)    story.country    = country
    if (city !== undefined)       story.city       = city
    if (rating !== undefined) story.rating = rating

    if (chapters && chapters.length) {
      story.chapters = chapters
      story.content  = chapters.map(c => c.content).join('\n\n')
      story.readTime = estimateReadTime(story.content)
    }

    await story.save()
    res.json({ message: '✅ Story updated!', story })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── DELETE /api/stories/:id ───────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ error: 'Story not found' })
    if (story.authorId?.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your story' })
    await story.deleteOne()
    res.json({ message: 'Story deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Could not delete story' })
  }
})

// ── POST /api/stories/:id/like ────────────────────────────────
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
    if (!story) return res.status(404).json({ error: 'Story not found' })

    const userId = req.user._id.toString()
    const idx    = story.likedBy.map(id => id.toString()).indexOf(userId)

    if (idx === -1) {
      story.likedBy.push(req.user._id)
      story.likes = (story.likes || 0) + 1
    } else {
      story.likedBy.splice(idx, 1)
      story.likes = Math.max(0, (story.likes || 1) - 1)
    }

    await story.save()
    res.json({ likes: story.likes, liked: idx === -1 })
  } catch (err) {
    res.status(500).json({ error: 'Could not like story' })
  }
})

// ── POST /api/stories/:id/bookmark ───────────────────────────
router.post('/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const user    = await User.findById(req.user._id)
    const storyId = req.params.id
    const idx     = user.bookmarks.map(id => id.toString()).indexOf(storyId)

    if (idx === -1) user.bookmarks.push(storyId)
    else            user.bookmarks.splice(idx, 1)

    await user.save()
    res.json({ bookmarked: idx === -1 })
  } catch (err) {
    res.status(500).json({ error: 'Could not bookmark story' })
  }
})

// ── Helper ────────────────────────────────────────────────────
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length
  const mins  = Math.max(1, Math.ceil(words / 200))
  return `${mins} min`
}

module.exports = router
