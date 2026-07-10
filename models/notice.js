const mongoose = require('mongoose')

const noticeSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  }
}, { timestamps: true })

module.exports = mongoose.model('Notice', noticeSchema)