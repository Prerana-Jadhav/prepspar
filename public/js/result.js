(async function loadResults() {
  const res = await fetch('/performance-analysis');
  const payload = await res.json();

  document.getElementById('wait-box').style.display = 'none';
  document.getElementById('result-shell').style.display = 'block';

  renderSummary(payload.data);
  renderQuestions(payload.data, payload.q_list);
})();

function renderSummary(results) {
  const attempted = results.filter((r) => r.stext && r.stext.trim().length > 0);
  const avgScore = attempted.length
    ? Math.round(attempted.reduce((sum, r) => sum + Number(r.percentage || 0), 0) / attempted.length)
    : 0;
  const avgLength = attempted.length
    ? Math.round(attempted.reduce((sum, r) => sum + r.stext.length, 0) / attempted.length)
    : 0;
  const attemptRate = Math.round((attempted.length / results.length) * 100);

  const cards = [
    ['Accuracy', avgScore],
    ['Answer Depth', Math.min(100, Math.round((avgLength / 500) * 100))],
    ['Questions Attempted', attemptRate],
  ];

  const grid = document.getElementById('score-grid');
  grid.innerHTML = cards
    .map(
      ([label, value]) => `
      <div class="score-card">
        <h2>${label}</h2>
        <div class="score-ring" style="--pct:${value}"><span>${value}%</span></div>
      </div>`
    )
    .join('');
}

function renderQuestions(results, questions) {
  const list = document.getElementById('qa-list');
  list.innerHTML = results
    .map(
      (r, i) => `
      <div class="qa-card">
        <span class="qa-score">${r.percentage}%</span>
        <h3>Q${i + 1}. ${questions[i]}</h3>
        <div class="qa-block">
          <div class="label">Your Answer</div>
          <p>${r.stext ? escapeHtml(r.stext) : '<em>No answer recorded</em>'}</p>
        </div>
        <div class="qa-block">
          <div class="label">Model Answer</div>
          <p>${escapeHtml(r.ftext)}</p>
        </div>
        <div class="qa-feedback">${escapeHtml(r.feedback || '')}</div>
      </div>`
    )
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
