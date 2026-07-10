// ============================================================
//  story.js — Single story page, with chapter navigation,
//  share button, and chapter-aware "resume where you left off"
// ============================================================

let currentChapterIdx = 0
let storyChapters     = []

async function initStory() {
  const params  = new URLSearchParams(window.location.search)
  const storyId = params.get('id')

  if (!storyId) {
    showError('No story ID found. <a href="home.html">Go back to stories →</a>')
    return
  }

  try {
    const [story, allStories] = await Promise.all([
      fetchStory(storyId),
      fetchStories()
    ])

    // Normalise chapters — fall back to legacy content field
    if (story.chapters && story.chapters.length) {
      storyChapters = story.chapters
    } else if (story.content) {
      storyChapters = [{ title: 'Chapter 1', content: story.content, order: 0 }]
    } else {
      storyChapters = [{ title: 'Chapter 1', content: '(No content)', order: 0 }]
    }

    renderStory(story)
    renderRelated(story, allStories)
  } catch (err) {
    showError('Story not found. <a href="home.html">Go back to stories →</a>')
    console.error(err)
  }
}

// ── Render story shell ────────────────────────────────────────
function renderStory(story) {
  const user          = getUser()
  const hasLiked      = user && story.likedBy?.some(id => id === user.id)
  const hasBookmarked = user && story.bookmarkedBy?.some(id => id === user.id)
  const genreClass    = story.genre.toLowerCase()
  const location      = [story.city, story.country].filter(Boolean).join(', ')

  const rawUrl  = story.coverImage?.trim() || ''
  const safeUrl = rawUrl.replace(/\s+/g, '%20')
  const coverStyle = safeUrl
    ? `background: url('${safeUrl}') center/cover no-repeat;`
    : `background: linear-gradient(135deg,#2e0a3f,#5f2090);`

  // Chapter dropdown options
  const chapterOptions = storyChapters.map((ch, i) =>
    `<option value="${i}">${ch.title ? `Ch.${i+1}: ${ch.title}` : `Chapter ${i+1}`}</option>`
  ).join('')

  const multiChapter = storyChapters.length > 1

  // Resume progress — chapter-aware
  const progress   = getReadingProgress(story._id)
  const showResume = progress && (progress.chapterIndex > 0 || progress.percent > 5)

  document.getElementById('storyContainer').innerHTML = `
    <div class="story-cover-banner" style="${coverStyle}">
      <div class="story-cover-inner">
        <span class="tag ${genreClass}">${story.genre}</span>
        <h1 class="story-main-title">${story.title}</h1>
        <div class="story-meta-row">
          <a href="profile.html?id=${story.authorId}" class="author-link">✍🏾 ${story.author}</a>
          ${location ? `<span>📍 ${location}</span>` : ''}
          <span>⏱ ${story.readTime}</span>
          <span>❤️ ${story.likes} likes</span>
          ${multiChapter ? `<span>📖 ${storyChapters.length} chapters</span>` : ''}
        </div>
      </div>
    </div>

    <div class="story-body-wrap">
      <div class="story-actions-top">
        <a href="home.html" class="back-btn">← Back to stories</a>
        <div class="story-action-btns">
          <button class="like-btn ${hasLiked ? 'liked' : ''}" id="likeBtn" data-id="${story._id}">
            <span id="likeIcon">${hasLiked ? '❤️' : '🤍'}</span>
            <span id="likeCount">${story.likes}</span>
          </button>
          <button class="bookmark-btn ${hasBookmarked ? 'active' : ''}" id="bookmarkBtn" data-id="${story._id}">
            ${hasBookmarked ? '🔖 Saved' : '📄 Save'}
          </button>
          <button class="reader-btn" id="readerModeBtn">📖 Reader</button>
          <button class="share-btn" id="shareBtn">🔗 Share</button>
        </div>
      </div>

      ${showResume ? `
        <div class="resume-banner" id="resumeBanner">
          <span>📖 Continue where you left off — Chapter ${progress.chapterIndex + 1}</span>
          <div class="resume-banner-actions">
            <button class="resume-btn" id="resumeBtn">Continue</button>
            <button class="resume-dismiss" id="dismissResumeBtn">✕</button>
          </div>
        </div>
      ` : ''}

      ${multiChapter ? `
        <div class="chapter-nav-top">
          <label for="chapterDropdown" class="chapter-nav-label">Jump to chapter</label>
          <select id="chapterDropdown" class="chapter-dropdown">${chapterOptions}</select>
        </div>
      ` : ''}

      <div id="chapterDisplay"></div>

      ${multiChapter ? `
        <div class="chapter-nav-bottom">
          <button class="chapter-prev-btn" id="chapterPrev" disabled>← Previous</button>
          <span class="chapter-counter" id="chapterCounter">1 / ${storyChapters.length}</span>
          <button class="chapter-next-btn" id="chapterNext" ${storyChapters.length <= 1 ? 'disabled' : ''}>Next →</button>
        </div>
      ` : ''}

      <div class="story-nav" id="storyNav"></div>
    </div>
  `

  renderChapter(0)

  if (typeof window.initReaderBtn === 'function') window.initReaderBtn()

  // Chapter dropdown
  document.getElementById('chapterDropdown')?.addEventListener('change', function() {
    renderChapter(+this.value)
  })

  // Prev / Next
  document.getElementById('chapterPrev')?.addEventListener('click', () => {
    if (currentChapterIdx > 0) renderChapter(currentChapterIdx - 1)
  })
  document.getElementById('chapterNext')?.addEventListener('click', () => {
    if (currentChapterIdx < storyChapters.length - 1) renderChapter(currentChapterIdx + 1)
  })

  // Like
  document.getElementById('likeBtn').addEventListener('click', async () => {
    if (!getToken()) { showAuthModal('login'); return }
    try {
      const { likes, liked } = await likeStory(story._id)
      document.getElementById('likeIcon').textContent  = liked ? '❤️' : '🤍'
      document.getElementById('likeCount').textContent = likes
      document.getElementById('likeBtn').classList.toggle('liked', liked)
    } catch (err) { console.error(err) }
  })

  // Bookmark
  document.getElementById('bookmarkBtn').addEventListener('click', async () => {
    if (!getToken()) { showAuthModal('login'); return }
    try {
      const { bookmarked } = await bookmarkStory(story._id)
      const btn = document.getElementById('bookmarkBtn')
      btn.textContent = bookmarked ? '🔖 Saved' : '📄 Save'
      btn.classList.toggle('active', bookmarked)
    } catch (err) { console.error(err) }
  })

  // Share
  document.getElementById('shareBtn').addEventListener('click', async () => {
    const shareData = {
      title: story.title,
      text: `Check out "${story.title}" on Soma Side`,
      url: window.location.href
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch (e) { /* user cancelled — no action needed */ }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href)
        const btn = document.getElementById('shareBtn')
        const original = btn.innerHTML
        btn.innerHTML = '✓ Copied!'
        setTimeout(() => { btn.innerHTML = original }, 2000)
      } catch (e) { console.error('Copy failed:', e) }
    }
  })

  // Resume prompt
  document.getElementById('resumeBtn')?.addEventListener('click', () => {
    renderChapter(progress.chapterIndex)
    setTimeout(() => {
      const maxScroll = document.body.scrollHeight - window.innerHeight
      window.scrollTo({ top: Math.round((progress.percent / 100) * maxScroll), behavior: 'smooth' })
    }, 300)
    document.getElementById('resumeBanner')?.remove()
  })
  document.getElementById('dismissResumeBtn')?.addEventListener('click', () => {
    document.getElementById('resumeBanner')?.remove()
  })

  document.title = `${story.title} | Soma Side`

  if (typeof trackReadingProgress === 'function') trackReadingProgress(story._id)
}

// ── Render a single chapter ───────────────────────────────────
function renderChapter(idx) {
  currentChapterIdx = idx
  const ch = storyChapters[idx]
  if (!ch) return

  const contentHtml = ch.content
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  const chapterHeading = storyChapters.length > 1
    ? `<div class="chapter-heading">
         <span class="chapter-label">Chapter ${idx + 1}</span>
         ${ch.title ? `<h2 class="chapter-title">${ch.title}</h2>` : ''}
       </div>`
    : ''

  document.getElementById('chapterDisplay').innerHTML =
    `<div class="story-text">${chapterHeading}${contentHtml}</div>`

  // Sync dropdown
  const dd = document.getElementById('chapterDropdown')
  if (dd) dd.value = idx

  // Sync prev/next
  const prev = document.getElementById('chapterPrev')
  const next = document.getElementById('chapterNext')
  const ctr  = document.getElementById('chapterCounter')
  if (prev) prev.disabled = idx === 0
  if (next) next.disabled = idx === storyChapters.length - 1
  if (ctr)  ctr.textContent = `${idx + 1} / ${storyChapters.length}`

  // Scroll to top of chapter
  document.getElementById('chapterDisplay')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Related stories ───────────────────────────────────────────
function renderRelated(current, allStories) {
  const related = allStories
    .filter(s => s._id !== current._id && s.genre === current.genre)
    .slice(0, 3)

  if (!related.length) return

  document.getElementById('relatedStories').innerHTML = `
    <h2 class="related-heading">More ${current.genre}s you might love</h2>
    <div class="related-grid">
      ${related.map(s => {
        const rawUrl     = s.coverImage?.trim() || ''
        const safeUrl    = rawUrl.replace(/\s+/g, '%20')
        const coverStyle = safeUrl
          ? `background: url('${safeUrl}') center/cover no-repeat;`
          : `background: linear-gradient(135deg,#3d1260,#7b2fbe);`
        return `
          <a href="story.html?id=${s._id}" class="related-card">
            <div class="related-cover" style="${coverStyle}"></div>
            <div class="related-info">
              <span class="tag ${s.genre.toLowerCase()}">${s.genre}</span>
              <h4>${s.title}</h4>
              <p>${s.author}</p>
            </div>
          </a>`
      }).join('')}
    </div>
  `
}

// ── Error state ───────────────────────────────────────────────
function showError(msg) {
  document.getElementById('storyContainer').innerHTML = `
    <div class="empty-state" style="padding:8rem 2rem;">
      <p style="font-size:1.1rem;">${msg}</p>
    </div>`
}