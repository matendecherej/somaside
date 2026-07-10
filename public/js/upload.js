// ============================================================
//  js/upload.js — Write & publish / edit form
// ============================================================

// ── Detect edit mode ──────────────────────────────────────────
const EDIT_ID = new URLSearchParams(window.location.search).get('edit')

// ── Init ──────────────────────────────────────────────────────
function initUpload() {
  initCharCount()
  initGenreSelect()
  initRatingSelect()
  initImagePreview()
  initChapters()
  initPreview()
  initFormSubmit()
  initPdfUpload()
  if (EDIT_ID) loadStoryForEdit(EDIT_ID)
}

// ── Character count for excerpt ───────────────────────────────
function initCharCount() {
  const excerpt = document.getElementById('excerptField')
  const counter = document.getElementById('excerptCount')
  if (!excerpt || !counter) return
  const MAX = 160
  excerpt.addEventListener('input', () => {
    const len = excerpt.value.length
    counter.textContent = `${len} / ${MAX}`
    counter.style.color = len > MAX ? '#e05050' : '#888'
    if (len > MAX) excerpt.value = excerpt.value.slice(0, MAX)
  })
}

// ── Genre pill selector ───────────────────────────────────────
function initGenreSelect() {
  const pills       = document.querySelectorAll('.genre-pill:not(.rating-pill)')
  const hiddenInput = document.getElementById('genreInput')
  if (!pills.length || !hiddenInput) return
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      hiddenInput.value = pill.dataset.genre
      const tag = document.getElementById('previewGenreTag')
      if (tag) {
        tag.textContent = pill.dataset.genre
        tag.className   = `preview-genre-tag ${pill.dataset.genre.toLowerCase()}`
      }
    })
  })
}

// ── Rating pill selector ──────────────────────────────────────
function initRatingSelect() {
  const pills      = document.querySelectorAll('.rating-pill')
  const hiddenInput = document.getElementById('ratingInput')
  if (!pills.length || !hiddenInput) return

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      hiddenInput.value = pill.dataset.rating

      const tag = document.getElementById('previewRatingTag')
      if (tag) tag.textContent = pill.dataset.rating
    })
  })
}

// ── Cover image preview ───────────────────────────────────────
function initImagePreview() {
  document.getElementById('coverImageInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url   = URL.createObjectURL(file)
    const cover = document.getElementById('previewCoverEl')
    if (cover) { cover.src = url; cover.style.display = 'block' }
  })
}

// ══════════════════════════════════════════════════════════════
//  CHAPTERS
// ══════════════════════════════════════════════════════════════

let chapters = [{ title: '', content: '' }]

function initChapters() {
  renderChapterList()
  document.getElementById('addChapterBtn')?.addEventListener('click', () => {
    chapters.push({ title: '', content: '' })
    renderChapterList()
    const items = document.querySelectorAll('.chapter-item')
    items[items.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function renderChapterList() {
  const container = document.getElementById('chaptersContainer')
  if (!container) return

  container.innerHTML = chapters.map((ch, i) => `
    <div class="chapter-item" data-index="${i}">
      <div class="chapter-header">
        <span class="chapter-badge">Chapter ${i + 1}</span>
        ${chapters.length > 1
          ? `<button type="button" class="chapter-remove-btn" data-index="${i}" aria-label="Remove chapter">✕</button>`
          : ''}
      </div>
      <div class="form-group" style="margin-bottom:0.8rem;">
        <label>Chapter title <span style="opacity:0.45;font-weight:400;text-transform:none;">(optional)</span></label>
        <input type="text" class="chapter-title-input" data-index="${i}"
          placeholder="e.g. The Beginning"
          value="${escHtml(ch.title)}" autocomplete="off">
      </div>
      <div class="form-group" style="margin-bottom:0;">
        <label>Content</label>
        <textarea class="chapter-content-input" data-index="${i}"
          placeholder="Write chapter ${i + 1} here…"
          style="min-height:260px;">${escHtml(ch.content)}</textarea>
      </div>
    </div>
  `).join('')

  container.querySelectorAll('.chapter-title-input').forEach(input => {
    input.addEventListener('input', () => {
      chapters[+input.dataset.index].title = input.value
      refreshChapterPreview()
    })
  })
  container.querySelectorAll('.chapter-content-input').forEach(textarea => {
    textarea.addEventListener('input', () => {
      chapters[+textarea.dataset.index].content = textarea.value
      refreshChapterPreview()
    })
  })
  container.querySelectorAll('.chapter-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chapters.splice(+btn.dataset.index, 1)
      if (previewChapterIdx >= chapters.length) previewChapterIdx = chapters.length - 1
      renderChapterList()
      refreshChapterPreview()
    })
  })

  refreshChapterPreview()
}

// ── Live preview ──────────────────────────────────────────────
let previewChapterIdx = 0

function initPreview() {
  document.getElementById('titleField')?.addEventListener('input', e => {
    const v = e.target.value || 'Your title appears here'
    const t = document.getElementById('previewTitle')
    const c = document.getElementById('previewCoverTitle')
    if (t) t.textContent = v
    if (c) c.textContent = e.target.value || 'Your title…'
  })
  document.getElementById('excerptField')?.addEventListener('input', e => {
    const p = document.getElementById('previewExcerpt')
    if (p) p.textContent = e.target.value || 'Your excerpt will appear here…'
  })
  document.getElementById('authorField')?.addEventListener('input', e => {
    const p = document.getElementById('previewAuthor')
    if (p) p.textContent = `by ${e.target.value || 'You'}`
  })
}

function refreshChapterPreview() {
  const sel = document.getElementById('previewChapterSelect')
  if (sel) {
    const prev = sel.value
    sel.innerHTML = chapters.map((ch, i) =>
      `<option value="${i}">${ch.title ? `Chapter ${i+1}: ${ch.title}` : `Chapter ${i+1}`}</option>`
    ).join('')
    sel.value = Math.min(+prev || 0, chapters.length - 1)
    previewChapterIdx = +sel.value
  }
  renderPreviewChapter()
}

function renderPreviewChapter() {
  const ch   = chapters[previewChapterIdx]
  const body = document.getElementById('previewContent')
  if (!body || !ch) return

  const chTitle = ch.title
    ? `<p style="font-family:'Syne',sans-serif;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem;">Chapter ${previewChapterIdx+1}: ${ch.title}</p>`
    : `<p style="font-family:'Syne',sans-serif;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem;">Chapter ${previewChapterIdx+1}</p>`

  if (!ch.content.trim()) {
    body.innerHTML = chTitle + `<p style="color:var(--muted-lt);font-style:italic;">Chapter content will appear here…</p>`
    return
  }
  body.innerHTML = chTitle + ch.content.trim()
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// ── Load story for editing ────────────────────────────────────
async function loadStoryForEdit(id) {
  try {
    const story = await fetchStory(id)

    const user = getUser()
    if (!user || story.authorId !== user.id) {
      showFormFeedback('You can only edit your own stories.', 'error')
      return
    }

    // Switch UI to edit mode
    const heading = document.querySelector('.page-header h1')
    if (heading) heading.innerHTML = 'Edit Your <em>Story</em>'
    const btn = document.querySelector('.submit-btn')
    if (btn) btn.textContent = 'Save Changes ✦'
    const cardLabel = document.querySelector('.card-label')
    if (cardLabel) cardLabel.childNodes[0].textContent = 'Edit & Update '

    // Fill meta fields
    document.getElementById('titleField').value   = story.title   || ''
    document.getElementById('authorField').value  = story.author  || ''
    document.getElementById('excerptField').value = story.excerpt || ''

    // Restore genre pill
    const genrePill = document.querySelector(`.genre-pill[data-genre="${story.genre}"]`)
    if (genrePill) {
      document.querySelectorAll('.genre-pill:not(.rating-pill)').forEach(p => p.classList.remove('active'))
      genrePill.classList.add('active')
      document.getElementById('genreInput').value = story.genre
      const tag = document.getElementById('previewGenreTag')
      if (tag) { tag.textContent = story.genre; tag.className = `preview-genre-tag ${story.genre.toLowerCase()}` }
    }

    // Restore rating pill
    const rating = story.rating || 'G'
    document.getElementById('ratingInput').value = rating
    document.querySelectorAll('.rating-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.rating === rating)
    })
    const ratingTag = document.getElementById('previewRatingTag')
    if (ratingTag) ratingTag.textContent = rating

    // Restore chapters
    if (story.chapters && story.chapters.length) {
      chapters = story.chapters.map(c => ({ title: c.title || '', content: c.content || '' }))
    } else if (story.content) {
      chapters = [{ title: 'Chapter 1', content: story.content }]
    }
    renderChapterList()

    // Restore cover image
    if (story.coverImage) {
      const cover = document.getElementById('previewCoverEl')
      if (cover) { cover.src = story.coverImage; cover.style.display = 'block' }
      const previewImg  = document.getElementById('coverPreviewEl')
      const previewWrap = document.getElementById('coverPreviewWrap')
      const uploadUI    = document.getElementById('coverUploadUI')
      if (previewImg && previewWrap && uploadUI) {
        previewImg.src = story.coverImage
        previewWrap.style.display = 'block'
        uploadUI.style.display    = 'none'
      }
    }

    // Trigger preview refresh
    ;['titleField','authorField','excerptField'].forEach(id => {
      document.getElementById(id)?.dispatchEvent(new Event('input'))
    })

    showFormFeedback(`Editing "${story.title}" — make your changes and save.`, 'success')

  } catch (err) {
    showFormFeedback('Could not load story for editing: ' + err.message, 'error')
  }
}

// ── Form submit (create or update) ───────────────────────────
function initFormSubmit() {
  const form = document.getElementById('uploadForm')
  if (!form) return

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!getToken()) {
      showFormFeedback('Please log in before publishing.', 'error')
      return
    }

    const title   = document.getElementById('titleField')?.value.trim()
    const author  = document.getElementById('authorField')?.value.trim()
    const genre   = document.getElementById('genreInput')?.value
    const excerpt = document.getElementById('excerptField')?.value.trim()
    const rating  = document.getElementById('ratingInput')?.value || 'G'

    const errors = []
    if (!title)   errors.push('Title is required.')
    if (!author)  errors.push('Author name is required.')
    if (!genre)   errors.push('Please select a genre.')
    if (!excerpt) errors.push('Excerpt is required.')

    const filledChapters = chapters.filter(c => c.content.trim().length >= 10)
    if (!filledChapters.length)
      errors.push('At least one chapter needs content (min 10 characters).')

    if (errors.length) {
      showFormFeedback(errors.join(' '), 'error')
      return
    }

    const submitBtn = form.querySelector('.submit-btn')
    submitBtn.disabled    = true
    submitBtn.textContent = EDIT_ID ? 'Saving…' : 'Publishing…'

    try {
      // Upload cover image if a new one was selected
      let coverImage
      const imageFile = document.getElementById('coverImageInput')?.files[0]
      if (imageFile) {
        showFormFeedback('Uploading cover image…', 'success')
        const result = await uploadImage(imageFile)
        coverImage = result.url
      }

      const orderedChapters = filledChapters.map((c, i) => ({
        title:   c.title.trim(),
        content: c.content.trim(),
        order:   i
      }))

      const payload = {
        title, author, genre, excerpt, rating,
        chapters: orderedChapters,
        readTime: estimateReadTime(orderedChapters.map(c => c.content).join(' ')),
        country: '', city: ''
      }
      if (coverImage !== undefined) payload.coverImage = coverImage

      if (EDIT_ID) {
        await updateStory(EDIT_ID, payload)
        showFormFeedback('Story updated! Redirecting…', 'success')
      } else {
        await publishStory(payload)
        showFormFeedback('Story published! Redirecting to feed…', 'success')
      }

      setTimeout(() => { window.location.href = 'home.html' }, 1800)

    } catch (err) {
      showFormFeedback(err.message || 'Something went wrong.', 'error')
      submitBtn.disabled    = false
      submitBtn.textContent = EDIT_ID ? 'Save Changes ✦' : 'Publish to Soma Side ✦'
    }
  })
}

// ── PDF Upload ────────────────────────────────────────────────
function initPdfUpload() {
  const input     = document.getElementById('pdfUploadInput')
  const ui        = document.getElementById('pdfUploadUI')
  const selectedW = document.getElementById('pdfSelectedWrap')
  const fileName  = document.getElementById('pdfFileName')
  const removeBtn = document.getElementById('pdfRemoveBtn')
  if (!input) return

  input.addEventListener('change', async () => {
    const file = input.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      showFormFeedback('PDF must be under 10MB.', 'error')
      input.value = ''
      return
    }

    fileName.textContent    = file.name
    ui.style.display        = 'none'
    selectedW.style.display = 'flex'

    showFormFeedback('Reading PDF…', 'success')
    try {
      const text = await extractPdfText(file)
      if (text.trim()) {
        chapters[0] = { title: 'Chapter 1', content: text.trim() }
        renderChapterList()
        showFormFeedback('PDF imported into Chapter 1 — review and edit before publishing.', 'success')
      } else {
        showFormFeedback('Could not extract text from PDF. Try copying the content manually.', 'error')
      }
    } catch (err) {
      showFormFeedback('PDF read failed: ' + err.message, 'error')
    }
  })

  removeBtn?.addEventListener('click', () => {
    input.value             = ''
    ui.style.display        = 'flex'
    selectedW.style.display = 'none'
    fileName.textContent    = ''
  })
}

async function extractPdfText(file) {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script   = document.createElement('script')
      script.src     = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      script.onload  = resolve
      script.onerror = reject
      document.head.appendChild(script)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf         = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText      = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText     += content.items.map(item => item.str).join(' ') + '\n\n'
  }

  return fullText
}

// ── Helpers ───────────────────────────────────────────────────
function estimateReadTime(text) {
  const words = text.trim().split(/\s+/).length
  return `${Math.max(1, Math.ceil(words / 200))} min`
}

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function showFormFeedback(message, type) {
  let banner = document.getElementById('formFeedback')
  if (!banner) {
    banner = document.createElement('div')
    banner.id = 'formFeedback'
    document.getElementById('uploadForm').prepend(banner)
  }
  banner.textContent   = message
  banner.className     = `form-feedback ${type}`
  banner.style.display = 'block'
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
