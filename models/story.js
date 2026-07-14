// models/story.js
const mongoose = require('mongoose')

const ChapterSchema = new mongoose.Schema({
  title:   { type: String, default: '' },
  content: { type: String, required: true },
  order:   { type: Number, default: 0 }
}, { _id: false })

const StorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  country: { type: String, default: '' },
  city:    { type: String, default: '' },
  genre: {
    type: String,
    enum: ['Poem', 'Story', 'Song', 'Folklore', 'Romance', 'Fantasy'],
    required: true
  },
  genre: {
  type: String,
  enum: ['Poem', 'Story', 'Song', 'Folklore', 'Romance', 'Fantasy',
         'Thriller', 'Mystery', 'SciFi', 'Drama', 'Satire', 'Children'],
  required: true
},
rating: {
  type: String,
  enum: ['G', 'PG', 'PG-13', '16+', '18+'],
  default: 'G'
},
  excerpt:    { type: String, default: '' },
  chapters:   { type: [ChapterSchema], default: [] },
  content:    { type: String, default: '' },   // legacy field — kept for migration
  coverImage: { type: String, default: '' },
  likes:      { type: Number, default: 0 },
  likedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readTime:   { type: String, default: '2 min' },
  createdAt:  { type: Date, default: Date.now }
})

StorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password
    return ret
  }
})

module.exports = mongoose.model('Story', StorySchema)
