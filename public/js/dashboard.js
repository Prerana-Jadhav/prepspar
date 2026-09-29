let selectedFile = null;

const input = document.getElementById('resume-input');
const uploadBox = document.getElementById('upload-box');
const submitBtn = document.getElementById('submit-btn');
const chipWrap = document.getElementById('file-chip-wrap');
const statusEl = document.getElementById('upload-status');
const errorEl = document.getElementById('upload-error');

input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  renderChip(file.name);
  submitBtn.disabled = false;
  errorEl.textContent = '';

  showToast('Resume uploaded!', 'success');
  showPopup({ title: 'Resume Uploaded', message: `"${file.name}" uploaded successfully!!\nClick "Analyze Resume" to continue.`, type: 'success' });
});

function renderChip(name) {
  chipWrap.innerHTML = '';
  const chip = document.createElement('div');
  chip.className = 'file-chip';
  chip.innerHTML = `<span class="name">${name}</span><span class="remove">&times;</span>`;
  chip.querySelector('.remove').addEventListener('click', () => {
    selectedFile = null;
    input.value = '';
    chipWrap.innerHTML = '';
    submitBtn.disabled = true;
  });
  chipWrap.appendChild(chip);
}

async function uploadResume() {
  if (!selectedFile) return;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Analyzing…';
  statusEl.textContent = 'Reading your resume…';
  errorEl.textContent = '';

  const formData = new FormData();
  formData.append('file', selectedFile, selectedFile.name);

  const readingTimer = setTimeout(() => {
    statusEl.textContent = 'Generating tailored questions…';
  }, 1200);

  try {
    const res = await fetch('/resume-recognize', { method: 'POST', body: formData });
    const data = await res.json();
    clearTimeout(readingTimer);
    statusEl.textContent = '';
    submitBtn.textContent = 'Analyze Resume';

    if (!res.ok) {
      const message = data.error || 'Could not process resume. Please try again.';
      errorEl.textContent = message;
      submitBtn.disabled = false;
      showToast('Resume upload failed!', 'error');
      showPopup({ title: 'Upload Failed', message, type: 'error' });
      return;
    }

    document.getElementById('role-tag').textContent = data.role || 'Software Engineer';
    const chipsEl = document.getElementById('skill-chips');
    chipsEl.innerHTML = '';
    (data.data || []).forEach((skill) => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip';
      chip.textContent = skill.toUpperCase();
      chipsEl.appendChild(chip);
    });
    if ((data.data || []).length === 0) {
      chipsEl.innerHTML = '<span class="skill-chip">General Software Development</span>';
    }

    document.getElementById('skill-section').classList.add('visible');
    document.getElementById('skill-section').scrollIntoView({ behavior: 'smooth' });

    showToast('Resume analyzed successfully!', 'success');
  } catch (err) {
    clearTimeout(readingTimer);
    statusEl.textContent = '';
    submitBtn.textContent = 'Analyze Resume';
    submitBtn.disabled = false;
    const message = 'Network error — please try again.';
    errorEl.textContent = message;
    showToast('Resume upload failed!', 'error');
    showPopup({ title: 'Upload Failed', message, type: 'error' });
  }
}

function goToInterview() {
  document.getElementById('continue-btn').textContent = 'Please wait…';
  window.location.href = '/interview';
}
