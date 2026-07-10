// models/user.js
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  bio: {
    type: String,
    default: '',
    maxlength: 300
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story'
  }],
  // ── Followers / following (added for profile social features) ──
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

module.exports = mongoose.model('User', UserSchema)