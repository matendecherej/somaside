// ============================================================
//  api.js — Central API helper for Soma Side
//  Handles session storage, auth headers, and all API calls
//  EXCEPT login/register, which live in auth-modal.js
// ============================================================

const API = '/api'

// ── Session helpers ──────────────────────────────────────────
function getToken() {
  return localStorage.getItem('token')
}

function getUser() {
  const raw = localStorage.getItem('user')
  return raw ? JSON.parse(raw) : null
}

function saveSession(token, user) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

function clearSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  }
}

// ── Generic response handler ─────────────────────────────────
async function handleResponse(res) {
  const text = await res.text()
  if (!text) throw new Error(`Server returned empty response (status ${res.status})`)
  const data = JSON.parse(text)
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ── Profile ───────────────────────────────────────────────────
async function updateProfile(fields) {
  const res = await fetch(`${API}/auth/update`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(fields)
  })
  const data = await handleResponse(res)
  if (data.user) {
    const current = getUser()
    saveSession(getToken(), { ...current, ...data.user })
  }
  return data
}

async function getCurrentUser() {
  const res = await fetch(`${API}/auth/me`, {
    method: 'GET',
    headers: authHeaders()
  })
  const data = await handleResponse(res)
  return data.user
}

// ── Public profile / follow ────────────────────────────────────
async function getPublicProfile(userId) {
  const headers = getToken() ? authHeaders() : { 'Content-Type': 'application/json' }
  const res = await fetch(`${API}/users/${userId}`, { method: 'GET', headers })
  return handleResponse(res)
}

async function toggleFollow(userId) {
  const res = await fetch(`${API}/users/${userId}/follow`, {
    method: 'POST',
    headers: authHeaders()
  })
  return handleResponse(res)
}

// ── Notice board ────────────────────────────────────────────────
async function getNotices(userId) {
  const res = await fetch(`${API}/users/${userId}/notices`, { method: 'GET' })
  return handleResponse(res)
}

async function postNotice(message) {
  const res = await fetch(`${API}/users/notices`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message })
  })
  return handleResponse(res)
}

async function deleteNotice(noticeId) {
  const res = await fetch(`${API}/users/notices/${noticeId}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return handleResponse(res)
}

// ── Stories ───────────────────────────────────────────────────
async function getStories(genre) {
  const url = genre ? `${API}/stories?genre=${encodeURIComponent(genre)}` : `${API}/stories`
  const res = await fetch(url, { method: 'GET' })
  return handleResponse(res)
}

async function getStory(id) {
  const res = await fetch(`${API}/stories/${id}`, { method: 'GET' })
  return handleResponse(res)
}

async function getMyStories() {
  const res = await fetch(`${API}/stories/user/mine`, {
    method: 'GET',
    headers: authHeaders()
  })
  return handleResponse(res)
}

async function getBookmarkedStories() {
  const res = await fetch(`${API}/stories/user/bookmarked`, {
    method: 'GET',
    headers: authHeaders()
  })
  return handleResponse(res)
}

async function createStory(storyData) {
  const res = await fetch(`${API}/stories`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(storyData)
  })
  return handleResponse(res)
}

async function updateStory(id, storyData) {
  const res = await fetch(`${API}/stories/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(storyData)
  })
  return handleResponse(res)
}

async function deleteStory(id) {
  const res = await fetch(`${API}/stories/${id}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  return handleResponse(res)
}

async function toggleLike(id) {
  const res = await fetch(`${API}/stories/${id}/like`, {
    method: 'POST',
    headers: authHeaders()
  })
  return handleResponse(res)
}

async function toggleBookmark(id) {
  const res = await fetch(`${API}/stories/${id}/bookmark`, {
    method: 'POST',
    headers: authHeaders()
  })
  return handleResponse(res)
}

// ── Upload ────────────────────────────────────────────────────
async function uploadImage(file) {
  const formData = new FormData()
  formData.append('image', file)

  const res = await fetch(`${API}/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`
      // NOTE: no Content-Type — browser sets the multipart boundary automatically
    },
    body: formData
  })
  return handleResponse(res)
}

// ── Generic request helper (used by drafts.js) ────────────────
async function apiRequest(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: authHeaders()
  }
  if (body) options.body = JSON.stringify(body)
  const res = await fetch(`${API}${path}`, options)
  return handleResponse(res)
}

async function uploadPdf(file) {
  const formData = new FormData()
  formData.append('pdf', file)

  const res = await fetch(`${API}/upload/pdf`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${getToken()}` },
    body: formData
  })
  return handleResponse(res)
}

// ── Aliases for home.js & profile.js compatibility ────────────
const fetchStories           = getStories
const fetchMe                = getCurrentUser
const fetchMyStories         = getMyStories
const fetchBookmarkedStories = getBookmarkedStories
const likeStory              = toggleLike
const bookmarkStory          = toggleBookmark
const publishStory           = createStory
const fetchStory              = getStory

// ── Reading progress (chapter-aware) ───────────────────────────
function saveReadingProgress(storyId, chapterIndex, percent) {
  localStorage.setItem(`progress_${storyId}`, JSON.stringify({ chapterIndex, percent, savedAt: Date.now() }))
}

function getReadingProgress(storyId) {
  const raw = localStorage.getItem(`progress_${storyId}`)
  return raw ? JSON.parse(raw) : null
}
