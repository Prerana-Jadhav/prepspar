function switchTab(name) {
  document.querySelectorAll('.auth-tabs button').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach((form) => form.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.getElementById(`${name}-form`).classList.add('active');
}

function setBusy(buttonId, busy) {
  const btn = document.getElementById(buttonId);
  btn.disabled = busy;
  btn.querySelector('.btn-label').textContent = busy ? 'Please wait…' : (buttonId === 'login-btn' ? 'Log In' : 'Create Account');
}

function showStatus(elId, message, type) {
  const el = document.getElementById(elId);
  el.textContent = message;
  el.className = `status-msg ${type}`;
  if (typeof showToast === 'function') showToast(message, type === 'error' ? 'error' : 'success');
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  icon.className = isHidden ? 'uil uil-eye-slash' : 'uil uil-eye';
  btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) return;

  setBusy('login-btn', true);
  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pass }),
    });
    const data = await res.json();
    if (data.result) {
      showStatus('login-status', 'Login successful — redirecting…', 'success');
      window.location.href = '/dashboard';
    } else {
      showStatus('login-status', data.message || 'Invalid email or password', 'error');
      setBusy('login-btn', false);
    }
  } catch (err) {
    showStatus('login-status', 'Something went wrong. Please try again.', 'error');
    setBusy('login-btn', false);
  }
}

async function signup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!name || !email || !pass) return;

  setBusy('signup-btn', true);
  try {
    const res = await fetch('/sign-up', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, pass }),
    });
    const data = await res.json();
    if (data.result) {
      showStatus('signup-status', 'Account created — you can log in now.', 'success');
      setTimeout(() => switchTab('login'), 1200);
    } else {
      showStatus('signup-status', data.message || 'Could not create account', 'error');
    }
  } catch (err) {
    showStatus('signup-status', 'Something went wrong. Please try again.', 'error');
  } finally {
    setBusy('signup-btn', false);
  }
}
