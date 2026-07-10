// ============================================================
//  auth-modal.js — Login / Register modal
//  Include this on every page. Call showAuthModal('login')
//  or showAuthModal('register') to open it.
// ============================================================

(function injectModal() {
  if (document.getElementById('authModal')) return

  const modal = document.createElement('div')
  modal.id = 'authModal'
  modal.style.cssText = `
    display:none; position:fixed; inset:0; z-index:99998;
    background:rgba(10,0,20,0.85); backdrop-filter:blur(8px);
    align-items:center; justify-content:center;
  `

  modal.innerHTML = `
    <div style="
      background:#2e0a3f; border:1px solid rgba(255,255,255,0.1);
      border-radius:24px; padding:2.5rem; width:100%; max-width:420px;
      margin:1rem; position:relative; box-shadow:0 30px 60px rgba(0,0,0,0.6);
    ">
      <button onclick="closeAuthModal()" style="
        position:absolute; top:1rem; right:1.2rem;
        background:none; border:none; color:rgba(255,255,255,0.45);
        font-size:1.4rem; line-height:1;
      ">✕</button>

      <!-- Tabs -->
      <div style="display:flex; gap:0.3rem; background:rgba(255,255,255,0.05);
                  border-radius:50px; padding:0.3rem; margin-bottom:1.8rem;">
        <button id="tabRegister" onclick="switchTab('register')" style="
          flex:1; padding:0.55rem; border-radius:50px; border:none;
          font-family:'Syne',sans-serif; font-weight:700; font-size:0.85rem;
          background:#e8b84b; color:#1e0130;
        ">Join free</button>
        <button id="tabLogin" onclick="switchTab('login')" style="
          flex:1; padding:0.55rem; border-radius:50px; border:none;
          font-family:'Syne',sans-serif; font-weight:700; font-size:0.85rem;
          background:transparent; color:rgba(255,255,255,0.5);
        ">Log in</button>
      </div>

      <!-- Feedback -->
      <div id="authFeedback" style="display:none; border-radius:10px; padding:0.75rem 1rem;
        font-size:0.88rem; margin-bottom:1.2rem;"></div>

      <!-- Register fields -->
      <div id="registerFields">
        <div style="margin-bottom:1.1rem;">
          <label style="display:block; font-family:'Syne',sans-serif; font-size:0.72rem;
                        font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                        color:rgba(255,255,255,0.45); margin-bottom:0.45rem;">Your name</label>
          <input id="authName" type="text" placeholder="How should readers know you?"
            style="width:100%; padding:0.85rem 1rem; border-radius:12px;
                   border:1.5px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05);
                   color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem;">
        </div>
      </div>

      <!-- Email -->
      <div style="margin-bottom:1.1rem;">
        <label style="display:block; font-family:'Syne',sans-serif; font-size:0.72rem;
                      font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                      color:rgba(255,255,255,0.45); margin-bottom:0.45rem;">Email</label>
        <input id="authEmail" type="email" placeholder="your@email.com"
          style="width:100%; padding:0.85rem 1rem; border-radius:12px;
                 border:1.5px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05);
                 color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem;">
      </div>

      <!-- Password -->
      <div style="margin-bottom:0.8rem;">
        <label style="display:block; font-family:'Syne',sans-serif; font-size:0.72rem;
                      font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
                      color:rgba(255,255,255,0.45); margin-bottom:0.45rem;">Password</label>
        <input id="authPassword" type="password" placeholder="Min. 6 characters"
          style="width:100%; padding:0.85rem 1rem; border-radius:12px;
                 border:1.5px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05);
                 color:#fff; font-family:'DM Sans',sans-serif; font-size:0.95rem;">
      </div>

      <!-- Forgot password link (login tab only) -->
      <div id="forgotLink" style="display:none; text-align:right; margin-bottom:1.2rem;">
        <a href="reset-password.html"
          style="font-family:'Syne',sans-serif; font-size:0.78rem; font-weight:700;
                 color:rgba(176,106,255,0.8); text-decoration:none;">
          Forgot password?
        </a>
      </div>

      <div id="forgotLinkSpacer" style="margin-bottom:1.2rem;"></div>

      <!-- Submit -->
      <button id="authSubmitBtn" onclick="submitAuth()" style="
        width:100%; padding:1rem; border-radius:50px;
        background:#e8b84b; color:#1e0130;
        font-family:'Syne',sans-serif; font-weight:800; font-size:1rem;
        border:none; transition:transform 0.2s, box-shadow 0.2s;
      ">Create account ✦</button>
    </div>
  `

  document.body.appendChild(modal)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAuthModal()
  })
})()

// ── Active tab ────────────────────────────────────────────────
let _activeTab = 'register'

function switchTab(tab) {
  _activeTab = tab
  const regFields  = document.getElementById('registerFields')
  const tabReg     = document.getElementById('tabRegister')
  const tabLog     = document.getElementById('tabLogin')
  const submitBtn  = document.getElementById('authSubmitBtn')
  const feedback   = document.getElementById('authFeedback')
  const forgotLink = document.getElementById('forgotLink')
  const spacer     = document.getElementById('forgotLinkSpacer')

  feedback.style.display = 'none'

  const activeStyle   = 'flex:1;padding:0.55rem;border-radius:50px;border:none;font-family:\'Syne\',sans-serif;font-weight:700;font-size:0.85rem;background:#e8b84b;color:#1e0130;'
  const inactiveStyle = 'flex:1;padding:0.55rem;border-radius:50px;border:none;font-family:\'Syne\',sans-serif;font-weight:700;font-size:0.85rem;background:transparent;color:rgba(255,255,255,0.5);'

  if (tab === 'register') {
    regFields.style.display  = 'block'
    forgotLink.style.display = 'none'
    spacer.style.display     = 'block'
    tabReg.style.cssText     = activeStyle
    tabLog.style.cssText     = inactiveStyle
    submitBtn.textContent    = 'Create account ✦'
  } else {
    regFields.style.display  = 'none'
    forgotLink.style.display = 'block'
    spacer.style.display     = 'none'
    tabReg.style.cssText     = inactiveStyle
    tabLog.style.cssText     = activeStyle
    submitBtn.textContent    = 'Log in →'
  }
}

function showAuthModal(tab = 'register') {
  const modal = document.getElementById('authModal')
  modal.style.display = 'flex'
  switchTab(tab)
  setTimeout(() => document.getElementById('authEmail')?.focus(), 100)
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none'
}

// ── API helpers ───────────────────────────────────────────────
async function register(name, email, password) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })

  const text = await res.text()
  if (!text) throw new Error(`Server returned empty response (status ${res.status})`)

  const data = JSON.parse(text)
  if (!res.ok) throw new Error(data.error || 'Registration failed')
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const text = await res.text()
  if (!text) throw new Error(`Server returned empty response (status ${res.status})`)

  const data = JSON.parse(text)
  if (!res.ok) throw new Error(data.error || 'Login failed')
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}
// ── Submit ────────────────────────────────────────────────────
async function submitAuth() {
  const btn      = document.getElementById('authSubmitBtn')
  const email    = document.getElementById('authEmail')?.value.trim()
  const password = document.getElementById('authPassword')?.value
  const name     = document.getElementById('authName')?.value.trim()

  btn.disabled    = true
  btn.textContent = 'Please wait…'

  try {
    if (_activeTab === 'register') {
      if (!name) throw new Error('Please enter your name.')
      await register(name, email, password)
    } else {
      await login(email, password)
    }

    showAuthFeedback('Welcome to Soma Side! 🌍', 'success')
    setTimeout(() => {
      closeAuthModal()
      window.location.reload()
    }, 1200)

  } catch (err) {
    showAuthFeedback(err.message, 'error')
    btn.disabled    = false
    btn.textContent = _activeTab === 'register' ? 'Create account ✦' : 'Log in →'
  }
}

function showAuthFeedback(msg, type) {
  const el = document.getElementById('authFeedback')
  el.textContent   = msg
  el.style.display = 'block'
  if (type === 'error') {
    el.style.cssText = 'display:block;border-radius:10px;padding:0.75rem 1rem;font-size:0.88rem;margin-bottom:1.2rem;background:rgba(220,60,60,0.12);color:#ff8f8f;border:1px solid rgba(220,60,60,0.25);'
  } else {
    el.style.cssText = 'display:block;border-radius:10px;padding:0.75rem 1rem;font-size:0.88rem;margin-bottom:1.2rem;background:rgba(100,220,160,0.1);color:#6adfb0;border:1px solid rgba(100,220,160,0.25);'
  }
}

// ── Fix cursor on modal elements ──────────────────────────────
const _origShow = showAuthModal
window.showAuthModal = function(tab) {
  _origShow(tab)
  setTimeout(() => {
    const cursor = document.getElementById('cursor')
    if (!cursor) return
    document.querySelectorAll('#authModal button, #authModal input, #authModal a').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expand'))
      el.addEventListener('mouseleave', () => cursor.classList.remove('expand'))
    })
  }, 50)
}