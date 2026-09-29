// Shared toast + modal helpers, available on every page via partials/head.ejs

function showToast(message, type = 'success') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    document.body.appendChild(host);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'uil-check-circle' : type === 'error' ? 'uil-times-circle' : 'uil-info-circle';
  toast.innerHTML = `<i class="uil ${icon}"></i><span>${message}</span>`;
  host.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Shows a modal popup with an OK button and a close (×) icon.
 * options: { title, message, type: 'success'|'error'|'info', onClose }
 */
function showPopup(options) {
  const { title, message, type = 'info', onClose } = options;
  let overlay = document.getElementById('popup-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'popup-overlay';
  overlay.className = 'popup-overlay visible';

  const icon = type === 'success' ? 'uil-check-circle' : type === 'error' ? 'uil-times-circle' : 'uil-info-circle';

  overlay.innerHTML = `
    <div class="popup-card">
      <div class="popup-header">
        <h3>${title || ''}</h3>
        <button class="popup-close" aria-label="Close" type="button"><i class="uil uil-times"></i></button>
      </div>
      <div class="popup-body">
        <i class="uil ${icon} popup-icon popup-icon-${type}"></i>
        <p>${message || ''}</p>
      </div>
      <div class="popup-footer">
        <button class="btn btn-primary popup-ok" type="button">OK</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
    if (typeof onClose === 'function') onClose();
  }

  overlay.querySelector('.popup-close').addEventListener('click', close);
  overlay.querySelector('.popup-ok').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

/**
 * Shows a confirmation popup with Cancel/Confirm buttons.
 * options: { title, message, confirmLabel, onConfirm }
 */
function showConfirm(options) {
  const { title, message, confirmLabel = 'Confirm', onConfirm } = options;
  let overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.className = 'popup-overlay visible';

  overlay.innerHTML = `
    <div class="popup-card">
      <div class="popup-header">
        <h3>${title || ''}</h3>
        <button class="popup-close" aria-label="Close" type="button"><i class="uil uil-times"></i></button>
      </div>
      <div class="popup-body">
        <p>${message || ''}</p>
      </div>
      <div class="popup-footer">
        <button class="btn btn-outline confirm-cancel" type="button">Cancel</button>
        <button class="btn btn-primary confirm-ok" type="button" style="background:var(--danger);">${confirmLabel}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    overlay.classList.remove('visible');
    setTimeout(() => overlay.remove(), 200);
  }

  overlay.querySelector('.popup-close').addEventListener('click', close);
  overlay.querySelector('.confirm-cancel').addEventListener('click', close);
  overlay.querySelector('.confirm-ok').addEventListener('click', () => {
    close();
    if (typeof onConfirm === 'function') onConfirm();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}
