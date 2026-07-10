// ============================================================
//  drafts.js — Save, load, and clear story drafts
//  Strategy: localStorage always (instant), API if logged in (persistent across devices)
// ============================================================

const DRAFT_KEY = 'somaside_draft'
const AUTOSAVE_INTERVAL = 30000 // 30 seconds

let autosaveTimer = null
let lastSavedHash = ''

// ── Collect form values into a draft object ───────────────────
function collectDraft() {
  return {
    title:   document.getElementById('titleField')?.value   || '',
    author:  document.getElementById('authorField')?.value  || '',
    genre:   document.getElementById('genreInput')?.value   || '',
    excerpt: document.getElementById('excerptField')?.value || '',
    content: document.getElementById('contentField')?.value || '',
    savedAt: new Date().toISOString()
  }
}

// Simple hash to detect actual changes before saving
function draftHash(d) {
  return [d.title, d.author, d.genre, d.excerpt, d.content].join('|')
}

// ── Save draft ────────────────────────────────────────────────
async function saveDraft(silent = false) {
  const draft = collectDraft()

  // Don't save if nothing meaningful has been written
  if (!draft.title && !draft.content && !draft.excerpt) {
    if (!silent) showDraftStatus('Nothing to save yet.', 'warn')
    return
  }

  const hash = draftHash(draft)
  if (hash === lastSavedHash && silent) return // no change, skip silent autosave
  lastSavedHash = hash

  // 1. Always save to localStorage
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))

  // 2. If logged in, also save to API
  if (getToken()) {
    try {
      await apiRequest('/drafts', 'POST', draft)
    } catch (err) {
      // API save failed — localStorage backup is still intact, don't alarm user
      console.warn('Draft API save failed, localStorage backup saved:', err.message)
    }
  }

  if (!silent) showDraftStatus('Draft saved ✓', 'ok')
}

// ── Load draft ────────────────────────────────────────────────
async function loadDraft() {
  let draft = null

  // 1. Try API first if logged in (most up-to-date across devices)
  if (getToken()) {
    try {
      const remote = await apiRequest('/drafts', 'GET')
      if (remote && remote.title) draft = remote
    } catch (err) {
      console.warn('Could not fetch remote draft:', err.message)
    }
  }

  // 2. Fall back to localStorage
  if (!draft) {
    const local = localStorage.getItem(DRAFT_KEY)
    if (local) {
      try { draft = JSON.parse(local) } catch (_) {}
    }
  }

  return draft
}

// ── Restore draft into the form ───────────────────────────────
function applyDraftToForm(draft) {
  if (!draft) return

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || '' }
  set('titleField',   draft.title)
  set('authorField',  draft.author)
  set('excerptField', draft.excerpt)
  set('contentField', draft.content)

  // Restore genre pill
  if (draft.genre) {
    document.getElementById('genreInput').value = draft.genre
    document.querySelectorAll('.genre-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.genre === draft.genre)
    })
    // Update preview genre tag inline (no external function needed)
    const tag = document.getElementById('previewGenreTag')
    if (tag) {
      tag.textContent = draft.genre
      tag.className   = `preview-genre-tag ${draft.genre.toLowerCase()}`
    }
  }

  // Trigger preview updates
  triggerPreviewRefresh()

  // Update char counts
  const excerptEl = document.getElementById('excerptField')
  const countEl   = document.getElementById('excerptCount')
  if (excerptEl && countEl) {
    const len = excerptEl.value.length
    countEl.textContent = `${len} / 160`
    countEl.classList.toggle('warn', len > 140)
  }

  lastSavedHash = draftHash(draft)
}

// ── Clear draft ───────────────────────────────────────────────
async function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
  if (getToken()) {
    try { await apiRequest('/drafts', 'DELETE') } catch (_) {}
  }
}

// ── Auto-save loop ────────────────────────────────────────────
function startAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer) // prevent duplicate timers
  autosaveTimer = setInterval(() => saveDraft(true), AUTOSAVE_INTERVAL)
}

function stopAutosave() {
  if (autosaveTimer) clearInterval(autosaveTimer)
}

// ── Draft status indicator ────────────────────────────────────
function showDraftStatus(msg, type = 'ok') {
  const el = document.getElementById('draftStatus')
  if (!el) return
  el.textContent = msg
  el.className = 'draft-status ' + type
  el.style.opacity = '1'
  clearTimeout(el._hideTimer)
  el._hideTimer = setTimeout(() => { el.style.opacity = '0' }, 3000)
}

// ── Trigger live preview refresh ──────────────────────────────
function triggerPreviewRefresh() {
  ['titleField', 'excerptField', 'contentField', 'authorField'].forEach(id => {
    document.getElementById(id)?.dispatchEvent(new Event('input'))
  })
}
