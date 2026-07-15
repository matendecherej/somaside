// fix-seed-images.js
// One-off script: updates ONLY the coverImage field on the original 7 seed
// stories (matched by title), pointing them from localhost to the live domain.
// Does NOT touch any other stories in the database.
// Run once: node fix-seed-images.js

require('dotenv').config()
const mongoose = require('mongoose')
const Story    = require('./models/story')

const MONGO_URI = process.env.MONGO_URI
const LIVE_DOMAIN = 'https://somaside-6ycm.onrender.com'

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env — check your .env file exists and has this variable.')
  process.exit(1)
}

const updates = [
  { title: 'Harmattan Daughter',       coverImage: `${LIVE_DOMAIN}/images/six.jpg` },
  { title: "The Fisherman's Oath",     coverImage: `${LIVE_DOMAIN}/images/two.jpg` },
  { title: 'Mtoto wa Pwani',           coverImage: `${LIVE_DOMAIN}/images/five.jpg` },
  { title: 'The Colour of Silence',    coverImage: `${LIVE_DOMAIN}/images/one.jpg` },
  { title: "Aunty Bisi's Recipe",      coverImage: `${LIVE_DOMAIN}/images/three.jpg` },
  { title: 'Jua Kali',                 coverImage: `${LIVE_DOMAIN}/images/four.jpg` },
  { title: 'What the Baobab Knows',    coverImage: `${LIVE_DOMAIN}/images/three.jpg` },
]

async function fixImages() {
  try {
    await mongoose.connect(MONGO_URI)
    console.log('✅ Connected to MongoDB')

    let updatedCount = 0
    for (const { title, coverImage } of updates) {
      const result = await Story.updateOne({ title }, { $set: { coverImage } })
      if (result.matchedCount > 0) {
        console.log(`✔ Updated "${title}"`)
        updatedCount++
      } else {
        console.log(`⚠ No story found with title "${title}" — skipped`)
      }
    }

    console.log(`\n🌍 Done — ${updatedCount}/${updates.length} seed stories updated.`)
    mongoose.connection.close()
  } catch (err) {
    console.error('❌ Update error:', err)
  }
}

fixImages()