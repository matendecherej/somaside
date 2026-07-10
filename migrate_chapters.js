// migrate_chapters.js
// Run ONCE: node migrate_chapters.js
// Wraps every story that has content but no chapters into a single Chapter 1

require('dotenv').config()
const mongoose = require('mongoose')
const Story    = require('./models/story')

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://somaside:somaside2025@somaside.eykleb2.mongodb.net/somaside?appName=somaside'

async function migrate() {
  await mongoose.connect(MONGO_URI)
  console.log('✅ Connected to MongoDB')

  const stories = await Story.find({
    $or: [
      { chapters: { $exists: false } },
      { chapters: { $size: 0 } }
    ]
  })

  console.log(`📚 Found ${stories.length} stories to migrate`)

  let migrated = 0
  for (const story of stories) {
    if (!story.content) continue
    story.chapters = [{
      title:   'Chapter 1',
      content: story.content,
      order:   0
    }]
    await story.save()
    migrated++
    console.log(`  ✓ Migrated: "${story.title}"`)
  }

  console.log(`\n✅ Done — ${migrated} stories migrated`)
  mongoose.connection.close()
}

migrate().catch(err => {
  console.error('❌ Migration error:', err)
  process.exit(1)
})
