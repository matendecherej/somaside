// ============================================================
//  drafts.js — Save, load, and clear story drafts
//  Strategy: localStorage only (no backend /drafts endpoint exists)
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

  // Save to localStorage (only storage mechanism — no backend /drafts route exists)
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))

  if (!silent) showDraftStatus('Draft saved ✓', 'ok')
}

// ── Load draft ────────────────────────────────────────────────
async function loadDraft() {
  const local = localStorage.getItem(DRAFT_KEY)
  if (!local) return null

  try {
    return JSON.parse(local)
  } catch (_) {
    return null
  }
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