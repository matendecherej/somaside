// ============================================================
//  profile.js — Loads user profile, published & bookmarked stories,
//  notice board, and follow/share for own or public (?id=) profiles
// ============================================================

function getProfileIdFromQuery() {
  const params = new URLSearchParams(window.location.search)
  return params.get('id')
}

async function initProfile() {
  const queryId = getProfileIdFromQuery()
  const me      = getUser()
  const isOwn   = !queryId || (me && String(me.id) === String(queryId))

  if (isOwn) {
    if (!getToken()) { showNotLoggedIn(); return }
    await loadOwnProfile()
  } else {
    await loadPublicProfile(queryId)
  }
}

// ── Own profile ──────────────────────────────────────────────
async function loadOwnProfile() {
  try {
    const [user, myStories, bookmarked] = await Promise.all([
      fetchMe(),
      fetchMyStories(),
      fetchBookmarkedStories()
    ])

    renderIdentity(user, true)
    renderStats(user, myStories)
    renderStoryGrid('profileStoriesGrid', myStories, 'published')
    renderStoryGrid('bookmarkedGrid', bookmarked, 'bookmarked')
    initEditModal(user)
    initAvatarUpload()
    setupOwnActions(user)
    loadNoticeBoard(user.id, true)

  } catch (err) {
    console.error('Profile load error:', err.message)
    if (err.message.includes('401') || err.message.includes('Unauthorized')) {
      clearSession()
    }
    showNotLoggedIn()
  }
}

// ── Public profile ───────────────────────────────────────────
async function loadPublicProfile(userId) {
  try {
    const { user } = await getPublicProfile(userId)

    renderIdentity(user, false)
    renderPublicStats(user)
    setupPublicActions(user)
    hideOwnOnlyUI()
    loadNoticeBoard(userId, false)

    // Filter published stories by author until a dedicated
    // /api/stories/user/:id endpoint exists.
    const allStories = await fetchStories()
    const theirStories = allStories.filter(s => String(s.authorId) === String(userId))
    renderStoryGrid('profileStoriesGrid', theirStories, 'public-published')

    const publishedEl = document.getElementById('statPublished')
    const likesEl      = document.getElementById('statLikes')
    if (publishedEl) publishedEl.textContent = theirStories.length
    if (likesEl)      likesEl.textContent     = theirStories.reduce((sum, s) => sum + (s.likes || 0), 0)

  } catch (err) {
    console.error('Public profile load error:', err.message)
    showProfileNotFound()
  }
}

// ── Identity ──────────────────────────────────────────────────
function renderIdentity(user, isOwn) {
  const el = id => document.getElementById(id)

  if (el('profileName'))   el('profileName').textContent   = user.name || '—'
  if (el('profileHandle')) el('profileHandle').textContent = '@' + (user.name?.toLowerCase().replace(/\s+/g, '') || 'user')
  if (el('profileBio'))    el('profileBio').textContent    = user.bio || 'No bio yet.'
  if (el('profileJoined') && user.createdAt) {
    const date = new Date(user.createdAt)
    el('profileJoined').textContent = 'Joined ' + date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const avatarEl = el('avatarEl')
  if (avatarEl) {
    if (user.avatarUrl) {
      avatarEl.innerHTML = `<img src="${user.avatarUrl}" alt="${user.name}">`
    } else {
      const initials = user.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
      avatarEl.textContent  = initials
      avatarEl.style.cssText = 'font-size:2rem; font-family:Syne,sans-serif; font-weight:700;'
    }
  }

  const avatarUploadBtn = el('avatarUploadBtn')
  if (avatarUploadBtn) avatarUploadBtn.style.display = isOwn ? 'flex' : 'none'

  // Whole avatar is clickable: own profile opens the file picker,
  // public profile opens a lightbox of their photo (if they have one).
  const avatarRing = el('avatarRing')
  if (avatarRing) {
    avatarRing.style.cursor = (isOwn || user.avatarUrl) ? 'pointer' : 'default'
    avatarRing.onclick = (e) => {
      if (e.target.closest('#avatarUploadBtn')) return // let its own handler run
      if (isOwn) {
        el('avatarFileInput')?.click()
      } else if (user.avatarUrl) {
        openAvatarLightbox(user.avatarUrl, user.name)
      }
    }
  }
}

function openAvatarLightbox(url, name) {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:100000; background:rgba(10,0,20,0.88);
    backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center;
    cursor:pointer; animation:fadeUp 0.25s ease both; padding:2rem;
  `
  overlay.innerHTML = `<img src="${url}" alt="${name}" style="max-width:min(90vw,420px);max-height:80vh;border-radius:20px;box-shadow:0 30px 80px rgba(0,0,0,0.6);">`
  overlay.addEventListener('click', () => overlay.remove())
  document.body.appendChild(overlay)
}

// ── Avatar upload (own profile only) ──────────────────────────
function initAvatarUpload() {
  const btn   = document.getElementById('avatarUploadBtn')
  const input = document.getElementById('avatarFileInput')
  if (!btn || !input) return

  btn.addEventListener('click', () => input.click())

  input.addEventListener('change', async () => {
    const file = input.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB.')
      return
    }

    const avatarEl = document.getElementById('avatarEl')
    const prevHTML = avatarEl.innerHTML
    avatarEl.innerHTML = '<span style="font-size:1.1rem;">⏳</span>'

    try {
      const { url } = await uploadImage(file)
      await updateProfile({ avatarUrl: url })
      avatarEl.innerHTML = `<img src="${url}" alt="Avatar">`
    } catch (err) {
      avatarEl.innerHTML = prevHTML
      alert('Could not upload photo: ' + err.message)
    } finally {
      input.value = ''
    }
  })
}

// ── Stats ─────────────────────────────────────────────────────
function renderStats(user, myStories) {
  const totalLikes = myStories.reduce((sum, s) => sum + (s.likes || 0), 0)
  const el = id => document.getElementById(id)
  if (el('statPublished')) el('statPublished').textContent = myStories.length
  if (el('statLikes'))     el('statLikes').textContent     = totalLikes
  if (el('statFollowers')) el('statFollowers').textContent = (user.followers?.length ?? 0)
  if (el('statFollowing')) el('statFollowing').textContent = (user.following?.length ?? 0)
}

function renderPublicStats(user) {
  const el = id => document.getElementById(id)
  if (el('statFollowers')) el('statFollowers').textContent = user.followersCount ?? 0
  if (el('statFollowing')) el('statFollowing').textContent = user.followingCount ?? 0
}

// ── Own vs public action buttons ──────────────────────────────
function setupOwnActions(user) {
  const editBtn   = document.getElementById('editProfileBtn')
  const logoutBtn = document.getElementById('logoutBtn')
  const followBtn = document.getElementById('followBtn')
  const shareBtn  = document.getElementById('shareProfileBtn')

  if (editBtn)   editBtn.style.display   = 'inline-flex'
  if (logoutBtn) logoutBtn.style.display = 'inline-flex'
  if (followBtn) followBtn.style.display = 'none'
  if (shareBtn) {
    shareBtn.style.display = 'inline-flex'
    shareBtn.onclick = () => shareProfile(user.name, user.id)
  }
}

function setupPublicActions(user) {
  const editBtn   = document.getElementById('editProfileBtn')
  const logoutBtn = document.getElementById('logoutBtn')
  const followBtn = document.getElementById('followBtn')
  const shareBtn  = document.getElementById('shareProfileBtn')

  if (editBtn)   editBtn.style.display   = 'none'
  if (logoutBtn) logoutBtn.style.display = 'none'

  if (shareBtn) {
    shareBtn.style.display = 'inline-flex'
    shareBtn.onclick = () => shareProfile(user.name, user.id)
  }

  if (!followBtn) return
  followBtn.style.display = 'inline-flex'

  if (!getToken()) {
    followBtn.textContent = '+ Follow'
    followBtn.classList.remove('following')
    followBtn.onclick = () => showAuthModal('login')
    return
  }

  updateFollowBtnUI(followBtn, user.isFollowing)
  followBtn.onclick = async () => {
    followBtn.disabled = true
    try {
      const { following, followersCount } = await toggleFollow(user.id)
      updateFollowBtnUI(followBtn, following)
      const countEl = document.getElementById('statFollowers')
      if (countEl) countEl.textContent = followersCount
    } catch (err) {
      alert('Could not update follow status: ' + err.message)
    } finally {
      followBtn.disabled = false
    }
  }
}

function updateFollowBtnUI(btn, isFollowing) {
  btn.textContent = isFollowing ? '✓ Following' : '+ Follow'
  btn.classList.toggle('following', isFollowing)
}

function hideOwnOnlyUI() {
  const savedTabBtn = document.querySelector('.tab-btn[data-tab="bookmarked"]')
  if (savedTabBtn) savedTabBtn.style.display = 'none'

  const savedPanel = document.getElementById('tab-bookmarked')
  if (savedPanel) savedPanel.style.display = 'none'

  const publishedTabBtn = document.querySelector('.tab-btn[data-tab="published"]')
  if (publishedTabBtn) publishedTabBtn.textContent = '✦ Published Works'
}

function showProfileNotFound() {
  const content = document.querySelector('.profile-content')
  if (content) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>This writer's profile couldn't be found.</p>
        <a href="home.html">Browse stories →</a>
      </div>`
  }
  document.querySelector('.stats-strip')?.style.setProperty('display', 'none')
  document.querySelector('.profile-actions')?.style.setProperty('display', 'none')
  document.getElementById('noticeBoardSection')?.style.setProperty('display', 'none')
}

// ── Share ─────────────────────────────────────────────────────
async function shareProfile(name, userId) {
  const shareUrl = `${window.location.origin}/profile.html?id=${userId}`
  const shareData = {
    title: `${name} on Soma Side`,
    text:  `Check out ${name}'s stories on Soma Side — Africa's literary platform.`,
    url:   shareUrl
  }

  if (navigator.share) {
    try { await navigator.share(shareData) } catch (err) { /* user cancelled — fine */ }
    return
  }

  try {
    await navigator.clipboard.writeText(shareUrl)
    alert('Profile link copied to clipboard!')
  } catch (err) {
    prompt('Copy this link:', shareUrl)
  }
}

// ── Notice board ──────────────────────────────────────────────
async function loadNoticeBoard(userId, isOwn) {
  const section  = document.getElementById('noticeBoardSection')
  const composer = document.getElementById('noticeComposer')
  const nameEl   = document.getElementById('noticeBoardName')
  if (!section) return

  if (nameEl) {
    nameEl.textContent = isOwn ? 'you' : (document.getElementById('profileName')?.textContent || 'this writer')
  }
  if (composer) composer.style.display = isOwn ? 'block' : 'none'
  if (isOwn) initNoticeComposer()

  try {
    const notices = await getNotices(userId)
    renderNotices(notices, isOwn)
  } catch (err) {
    console.error('Could not load notices:', err.message)
    const list = document.getElementById('noticeList')
    if (list) list.innerHTML = `<p class="notice-empty">Could not load notices right now.</p>`
  }
}

function renderNotices(notices, isOwn) {
  const list = document.getElementById('noticeList')
  if (!list) return

  if (!notices.length) {
    list.innerHTML = `<p class="notice-empty">${isOwn ? "You haven't posted any updates yet." : 'No updates yet — check back soon.'}</p>`
    return
  }

  list.innerHTML = notices.map(n => noticeItemHTML(n, isOwn)).join('')
  wireNoticeDeletes(list)
}

function noticeItemHTML(notice, isOwn) {
  return `
    <div class="notice-item" data-id="${notice._id}">
      ${isOwn ? `<button class="notice-delete" data-id="${notice._id}" title="Delete">✕</button>` : ''}
      <p>${escapeHtml(notice.message)}</p>
      <span class="notice-time">${timeAgo(notice.createdAt)}</span>
    </div>`
}

function wireNoticeDeletes(scope) {
  scope.querySelectorAll('.notice-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this notice?')) return
      try {
        await deleteNotice(btn.dataset.id)
        btn.closest('.notice-item').remove()
        const list = document.getElementById('noticeList')
        if (list && !list.querySelector('.notice-item')) {
          list.innerHTML = `<p class="notice-empty">You haven't posted any updates yet.</p>`
        }
      } catch (err) {
        alert('Could not delete: ' + err.message)
      }
    })
  })
}

function initNoticeComposer() {
  const input     = document.getElementById('noticeInput')
  const postBtn   = document.getElementById('noticePostBtn')
  const charCount = document.getElementById('noticeCharCount')
  if (!input || !postBtn) return

  input.addEventListener('input', () => {
    if (charCount) charCount.textContent = 280 - input.value.length
  })

  postBtn.addEventListener('click', async () => {
    const message = input.value.trim()
    if (!message) return

    postBtn.disabled = true
    postBtn.textContent = 'Posting…'

    try {
      const notice = await postNotice(message)
      const list = document.getElementById('noticeList')
      const emptyMsg = list?.querySelector('.notice-empty')
      if (emptyMsg) emptyMsg.remove()
      list?.insertAdjacentHTML('afterbegin', noticeItemHTML(notice, true))
      if (list) wireNoticeDeletes(list)

      input.value = ''
      if (charCount) charCount.textContent = '280'
    } catch (err) {
      alert('Could not post: ' + err.message)
    } finally {
      postBtn.disabled = false
      postBtn.textContent = 'Post ✦'
    }
  })
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Story grids ───────────────────────────────────────────────
function renderStoryGrid(gridId, stories, type) {
  const grid = document.getElementById(gridId)
  if (!grid) return

  const editable = type === 'published' // only true on your own "My Works" tab

  if (!stories.length) {
    let msg = ''
    let link = ''
    if (type === 'published') {
      msg  = `You haven't published anything yet.`
      link = `<a href="upload.html">Write your first story →</a>`
    } else if (type === 'bookmarked') {
      msg  = `You haven't saved any stories yet.`
      link = `<a href="home.html">Browse stories →</a>`
    } else { // public-published
      msg = `This writer hasn't published anything yet.`
    }
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${type === 'bookmarked' ? '🔖' : '✍🏾'}</div>
        <p>${msg}</p>
        ${link}
      </div>`
    return
  }

  grid.innerHTML = stories.map(story => profileStoryCard(story, editable)).join('')

  grid.querySelectorAll('.profile-story-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.delete-btn') || e.target.closest('a')) return
      window.location.href = `story.html?id=${card.dataset.id}`
    })
  })

  if (editable) {
    grid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const id   = btn.dataset.id
        const card = btn.closest('.profile-story-card')
        if (!confirm('Delete this story? This cannot be undone.')) return
        try {
          await deleteStory(id)
          card.style.transition = 'opacity 0.3s, transform 0.3s'
          card.style.opacity    = '0'
          card.style.transform  = 'translateX(10px)'
          setTimeout(() => {
            card.remove()
            const countEl = document.getElementById('statPublished')
            if (countEl) countEl.textContent = parseInt(countEl.textContent) - 1
          }, 300)
        } catch (err) {
          alert('Could not delete story: ' + err.message)
        }
      })
    })
  }
}

// ── Story card ────────────────────────────────────────────────
function profileStoryCard(story, editable) {
  const genreClass = story.genre.toLowerCase()
  const coverStyle = story.coverImage
    ? `background-image:url('${story.coverImage}');background-size:cover;background-position:center;`
    : `background:linear-gradient(135deg,#3d1260,#7b2fbe);`
  const date = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  const deleteBtn = editable
    ? `<button class="delete-btn" data-id="${story._id}"
         style="position:absolute;top:0.65rem;right:0.65rem;
                background:rgba(220,60,60,0.12);border:1px solid rgba(220,60,60,0.3);
                color:#ff8f8f;border-radius:50px;padding:0.22rem 0.65rem;
                font-size:0.68rem;font-family:'Syne',sans-serif;font-weight:700;
                transition:background 0.2s;">🗑 Delete</button>
       <a href="upload.html?edit=${story._id}"
         style="position:absolute;top:0.65rem;right:5.5rem;
                background:rgba(232,184,75,0.1);border:1px solid rgba(232,184,75,0.3);
                color:var(--gold);border-radius:50px;padding:0.22rem 0.65rem;
                font-size:0.68rem;font-family:'Syne',sans-serif;font-weight:700;
                text-decoration:none;transition:background 0.2s;"
         onclick="event.stopPropagation()">✎ Edit</a>`
    : ''

  return `
    <article class="profile-story-card" data-id="${story._id}">
      <div class="psc-cover" style="${coverStyle}"></div>
      ${deleteBtn}
      <div class="psc-body">
        <span class="tag ${genreClass}">${story.genre}</span>
        <h4>${story.title}</h4>
        <p class="psc-meta">${date}</p>
        ${story.excerpt ? `<p class="psc-excerpt">${story.excerpt}</p>` : ''}
        <div class="psc-footer">
          <span class="psc-likes">❤️ ${story.likes} like${story.likes !== 1 ? 's' : ''}</span>
          <span class="psc-read">Read →</span>
        </div>
      </div>
    </article>`
}

// ── Edit Profile Modal (own profile only) ─────────────────────
function initEditModal(user) {
  const modal    = document.getElementById('editProfileModal')
  const closeBtn = document.getElementById('editModalClose')
  const saveBtn  = document.getElementById('editProfileSave')
  const errEl    = document.getElementById('editProfileError')
  const okEl     = document.getElementById('editProfileSuccess')

  if (!modal) return

  document.getElementById('editName').value = user.name || ''
  document.getElementById('editBio').value  = user.bio  || ''

  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    modal.style.display = 'flex'
    errEl.style.display = 'none'
    okEl.style.display  = 'none'
    document.getElementById('editCurrentPassword').value = ''
    document.getElementById('editNewPassword').value     = ''
  })

  closeBtn?.addEventListener('click', () => { modal.style.display = 'none' })
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none' })

  saveBtn?.addEventListener('click', async () => {
    errEl.style.display = 'none'
    okEl.style.display  = 'none'

    const name            = document.getElementById('editName').value.trim()
    const bio             = document.getElementById('editBio').value
    const currentPassword = document.getElementById('editCurrentPassword').value
    const newPassword     = document.getElementById('editNewPassword').value

    if (!name) {
      errEl.textContent   = 'Name cannot be empty.'
      errEl.style.display = 'block'
      return
    }

    saveBtn.textContent   = 'Saving…'
    saveBtn.style.opacity = '0.7'

    try {
      const payload = { name, bio }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword     = newPassword
      }

      const { user: updated } = await updateProfile(payload)

      const nameEl   = document.getElementById('profileName')
      const handleEl = document.getElementById('profileHandle')
      const bioEl    = document.getElementById('profileBio')
      const avatarEl = document.getElementById('avatarEl')

      if (nameEl)   nameEl.textContent   = updated.name
      if (handleEl) handleEl.textContent = '@' + updated.name.toLowerCase().replace(/\s+/g, '')
      if (bioEl)    bioEl.textContent    = updated.bio || 'No bio yet.'
      if (avatarEl && !updated.avatarUrl) {
        const initials = updated.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        avatarEl.textContent = initials
      }

      okEl.textContent   = '✓ Profile updated!'
      okEl.style.display = 'block'

      setTimeout(() => { modal.style.display = 'none' }, 1200)

    } catch (err) {
      errEl.textContent   = err.message
      errEl.style.display = 'block'
    } finally {
      saveBtn.textContent   = 'Save Changes'
      saveBtn.style.opacity = '1'
    }
  })
}

// ── Not logged in ─────────────────────────────────────────────
function showNotLoggedIn() {
  const heroContent = document.querySelector('.hero-content')
  if (heroContent) heroContent.style.opacity = '0.3'

  const statsStrip = document.querySelector('.stats-strip')
  if (statsStrip) statsStrip.style.display = 'none'

  const profileActions = document.querySelector('.profile-actions')
  if (profileActions) profileActions.style.display = 'none'

  const noticeBoard = document.getElementById('noticeBoardSection')
  if (noticeBoard) noticeBoard.style.display = 'none'

  const profileContent = document.querySelector('.profile-content')
  if (!profileContent) return

  profileContent.innerHTML = `
    <div style="text-align:center;padding:4rem 2rem;color:rgba(255,255,255,0.6);">
      <div style="font-size:3rem;margin-bottom:1.2rem;">👤</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;color:#fff;margin-bottom:0.8rem;">
        You're not logged in
      </h2>
      <p style="max-width:360px;margin:0 auto 2rem;line-height:1.7;font-size:0.95rem;">
        Create a free account to publish stories, bookmark favourites, and track your likes.
      </p>
      <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">
        <button onclick="showAuthModal('register')"
          style="padding:0.85rem 2rem;border-radius:50px;background:#e8b84b;color:#1e0130;
                 font-family:'Syne',sans-serif;font-weight:700;border:none;font-size:0.95rem;">
          Join free ✦
        </button>
        <button onclick="showAuthModal('login')"
          style="padding:0.85rem 2rem;border-radius:50px;border:1.5px solid rgba(255,255,255,0.2);
                 color:#fff;font-family:'Syne',sans-serif;font-weight:600;background:transparent;font-size:0.95rem;">
          Log in →
        </button>
      </div>
    </div>`
}