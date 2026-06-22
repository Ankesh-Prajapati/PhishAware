document.addEventListener('pa:ready', () => {
  const content = document.getElementById('appContent');
  const stats = PAStats();
  const state = stats.s;
  const recent = (state.history || []).slice(0, 5);
  const metrics = [
    ['bi-trophy', 'Points earned', stats.points],
    ['bi-check2-circle', 'Simulations', `${stats.completed}/${stats.total}`],
    ['bi-shield-exclamation', 'Risk level', stats.riskRating],
    ['bi-bar-chart', 'Overall progress', `${stats.progress}%`]
  ];
  content.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4"><div><div class="page-eyebrow">Overview</div><h1 class="page-title">Security awareness dashboard</h1><p class="text-muted mb-0">Build safer habits through short, realistic phishing simulations.</p></div><a href="simulations.html" class="btn btn-primary"><i class="bi bi-play-fill me-2"></i>Start a simulation</a></div>
  <div class="row g-3 mb-4">${metrics.map(item => `<div class="col-6 col-xl-3"><div class="card metric-card"><div class="d-flex justify-content-between"><div><div class="text-muted small">${item[1]}</div><div class="metric-value mt-2">${item[2]}</div></div><div class="metric-icon"><i class="bi ${item[0]}"></i></div></div></div></div>`).join('')}</div>
  <div class="row g-4"><div class="col-xl-8"><div class="card p-4 h-100"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Performance by simulation</h2><span class="badge badge-soft">Best score</span></div><div class="chart-wrap"><canvas id="performanceChart"></canvas></div></div></div><div class="col-xl-4"><div class="card p-4 h-100"><h2 class="h5 mb-3">Completion</h2><div class="chart-wrap"><canvas id="completionChart"></canvas></div></div></div>
  <div class="col-lg-7"><div class="card p-4"><div class="d-flex justify-content-between mb-3"><h2 class="h5 mb-0">Continue learning</h2><a href="simulations.html" class="small">View all</a></div>${PA_SCENARIOS.slice(0, 3).map(item => { const attempt = state.attempts?.[item.id]; return `<div class="d-flex align-items-center gap-3 py-3 border-bottom"><div class="scenario-icon"><i class="bi ${item.icon}"></i></div><div class="flex-grow-1"><div class="fw-semibold">${item.title}</div><div class="small text-muted">${attempt ? `Best score ${attempt.bestScore ?? attempt.score}%` : item.summary}</div></div><a class="btn btn-sm ${attempt ? 'btn-soft' : 'btn-primary'}" href="${item.page}">${attempt ? 'Retry' : 'Start'}</a></div>`; }).join('')}</div></div>
  <div class="col-lg-5"><div class="card p-4"><h2 class="h5 mb-3">Recent activity</h2>${recent.length ? recent.map(item => `<div class="d-flex gap-3 py-2"><i class="bi bi-lightning-charge text-primary"></i><div><div class="small fw-semibold">${item.scenarioTitle || 'Simulation completed'}</div><div class="small text-muted">${new Date(item.completedAt).toLocaleDateString()} &middot; ${item.points}% &middot; ${item.correct ? 'Correct' : 'Review'}</div></div></div>`).join('') : '<div class="empty-state text-muted"><i class="bi bi-clock-history fs-2"></i><p class="mt-2 mb-0">Your completed attempts will appear here.</p></div>'}</div></div></div>`;
  renderCharts(stats);
});

function renderCharts(stats) {
  const muted = getComputedStyle(document.body).getPropertyValue('--pa-muted');
  new Chart(document.getElementById('performanceChart'), { type: 'bar', data: { labels: PA_SCENARIOS.map(item => item.title.replace(' / BEC', '')), datasets: [{ label: 'Score', data: PA_SCENARIOS.map(item => stats.s.attempts?.[item.id]?.bestScore ?? stats.s.attempts?.[item.id]?.score ?? 0), backgroundColor: '#6558f5', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(128,128,128,.12)' }, ticks: { color: muted } }, x: { grid: { display: false }, ticks: { color: muted } } }, plugins: { legend: { display: false } } } });
  new Chart(document.getElementById('completionChart'), { type: 'doughnut', data: { labels: ['Completed', 'Remaining'], datasets: [{ data: [stats.completed, stats.total - stats.completed], backgroundColor: ['#25c2a0', '#e4e7ec'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { position: 'bottom', labels: { color: muted } } } } });
}
