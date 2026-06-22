document.addEventListener('pa:ready', renderReport);

function buildRecommendations(stats) {
  const items = [];
  const weakest = PA_SCENARIOS.map(item => ({ title: item.title, score: stats.s.attempts?.[item.id]?.score ?? null })).filter(item => item.score !== null).sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 80) items.push(['Priority', `Repeat ${weakest.title}`, `Current score is ${weakest.score}%. Focus on the evidence highlighted after each answer.`]);
  if (stats.completed < stats.total) items.push(['Coverage', 'Complete remaining simulations', `${stats.total - stats.completed} attack ${stats.total - stats.completed === 1 ? 'category remains' : 'categories remain'} unassessed.`]);
  if (stats.trainingDone < stats.trainingTotal) items.push(['Knowledge', 'Finish the training center', `${stats.trainingTotal - stats.trainingDone} short ${stats.trainingTotal - stats.trainingDone === 1 ? 'lesson remains' : 'lessons remain'}.`]);
  if (stats.incorrectDecisions > 0) items.push(['Behavior', 'Use independent verification', 'Open known bookmarks or call trusted numbers instead of using contact details in the message.']);
  items.push(['Response', 'Report suspicious content quickly', 'Early reporting helps security teams contain campaigns before other users respond.']);
  return items.slice(0, 4);
}

function renderReport() {
  const content = document.getElementById('appContent');
  const stats = PAStats();
  const certificateStatus = PACertificateEligibility();
  const history = stats.s.history || [];
  const accuracy = stats.totalAttempts ? Math.round(stats.correctDecisions / stats.totalAttempts * 100) : 0;
  const grade = stats.average >= 90 ? 'A' : stats.average >= 75 ? 'B' : stats.average >= 60 ? 'C' : stats.completed ? 'D' : '-';
  const reportId = `PA-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${String(stats.totalAttempts).padStart(3, '0')}`;
  const riskClass = stats.riskRating.toLowerCase();
  const metrics = [
    ['bi-bullseye', 'Decision accuracy', `${accuracy}%`, `${stats.correctDecisions} correct of ${stats.totalAttempts}`],
    ['bi-graph-up-arrow', 'Assessment score', `${stats.average}%`, `Grade ${grade}`],
    ['bi-ui-checks-grid', 'Scenario coverage', `${stats.completed}/${stats.total}`, `${stats.progress}% overall progress`],
    ['bi-shield-exclamation', 'Residual risk', `${stats.risk}/100`, `${stats.riskRating} risk`]
  ];
  const recommendations = buildRecommendations(stats);

  content.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4 no-print"><div><div class="page-eyebrow">Assessment report</div><h1 class="page-title">Phishing resilience report</h1><p class="text-muted mb-0">Executive summary, evidence, and prioritized improvement plan.</p></div><div class="d-flex gap-2"><button class="btn btn-soft" id="resetBtn"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset data</button><button class="btn btn-primary" id="pdfBtn"><i class="bi bi-file-earmark-pdf me-1"></i>Download PDF</button></div></div>
  <section id="reportArea"><header class="card report-cover p-4 p-lg-5 mb-4"><div class="row align-items-end g-4"><div class="col-lg"><div class="report-kicker">PhishAware / Individual Assessment</div><h2 class="display-6 fw-bold mt-2 mb-3">Phishing Resilience<br>Assessment</h2><div class="report-meta"><span><i class="bi bi-calendar3 me-1"></i>${new Date().toLocaleDateString()}</span><span><i class="bi bi-fingerprint me-1"></i>${reportId}</span><span><i class="bi bi-database-lock me-1"></i>Browser-local data</span></div></div><div class="col-lg-auto text-lg-end"><div class="risk-status ${riskClass}"><i class="bi bi-shield-fill-check"></i>${stats.riskRating} residual risk</div><div class="display-4 fw-bold mt-3">${stats.average}%</div><div class="text-white-50">Overall assessment score</div></div></div></header>
  <div class="card p-4 mb-4 ${certificateStatus.eligible || certificateStatus.certificate ? 'border-success' : ''}"><div class="d-flex flex-wrap align-items-center gap-3"><div class="scenario-icon"><i class="bi ${certificateStatus.eligible || certificateStatus.certificate ? 'bi-award-fill' : 'bi-lock-fill'}"></i></div><div class="flex-grow-1"><div class="page-eyebrow">Completion certificate</div><h2 class="h5 mb-1">${certificateStatus.certificate ? 'Your certificate has been issued' : certificateStatus.eligible ? 'Certificate unlocked' : `${certificateStatus.completedCount}/${certificateStatus.total} simulations complete`}</h2><p class="small text-muted mb-0">${certificateStatus.certificate ? `Issued to ${certificateStatus.certificate.recipientName} with a score of ${certificateStatus.certificate.score}%.` : certificateStatus.eligible ? `All assessments complete with ${certificateStatus.overallScore}%. Add the recipient name to issue the certificate.` : `Complete every simulation and achieve an overall score of at least ${certificateStatus.threshold}%. Current completed-category average: ${certificateStatus.overallScore}%.`}</p></div><a href="certificate.html" class="btn ${certificateStatus.eligible || certificateStatus.certificate ? 'btn-primary' : 'btn-soft'}">${certificateStatus.certificate ? 'View certificate' : certificateStatus.eligible ? 'Issue certificate' : 'View requirements'} <i class="bi bi-arrow-right ms-1"></i></a></div></div>
  <div class="row g-3 mb-4">${metrics.map(item => `<div class="col-sm-6 col-xl-3"><div class="card metric-card h-100"><div class="d-flex justify-content-between"><div><div class="small text-muted">${item[1]}</div><div class="metric-value mt-2">${item[2]}</div><div class="small text-muted mt-1">${item[3]}</div></div><div class="metric-icon"><i class="bi ${item[0]}"></i></div></div></div></div>`).join('')}</div>
  <div class="row g-4 mb-4"><div class="col-lg-5"><div class="card p-4 h-100"><div class="report-section-title"><h2>Security posture</h2><span class="badge badge-soft">Risk model</span></div><div class="chart-wrap"><canvas id="riskChart"></canvas></div><p class="small text-muted mb-0">Residual risk combines answer accuracy, scenario scores, and completed training. It is a learning indicator, not a formal organizational risk rating.</p></div></div><div class="col-lg-7"><div class="card p-4 h-100"><div class="report-section-title"><h2>Performance by threat</h2><span class="small text-muted">Latest completed score</span></div><div class="chart-wrap"><canvas id="performanceChart"></canvas></div></div></div></div>
  <div class="card p-4 mb-4"><div class="report-section-title"><h2>Scenario assessment</h2><span class="small text-muted">${stats.completed} of ${stats.total} assessed</span></div><div class="table-responsive"><table class="table report-table"><thead><tr><th>Threat category</th><th>Status</th><th>Current score</th><th>Best score</th><th>Answers</th><th>Last activity</th></tr></thead><tbody>${PA_SCENARIOS.map(item => { const attempt = stats.s.attempts?.[item.id]; const score = attempt?.score ?? 0; return `<tr><td><div class="d-flex align-items-center gap-2"><div class="scenario-icon" style="width:34px;height:34px;border-radius:10px"><i class="bi ${item.icon}"></i></div><strong>${item.title}</strong></div></td><td><span class="badge ${attempt ? 'text-bg-success' : 'text-bg-secondary'}">${attempt ? 'Assessed' : 'Pending'}</span></td><td><div class="report-scorebar"><div class="d-flex justify-content-between small"><span>${attempt ? `${score}%` : '-'}</span></div><div class="progress mt-1"><div class="progress-bar" style="width:${score}%"></div></div></div></td><td>${attempt ? `${attempt.bestScore ?? score}%` : '-'}</td><td>${attempt?.attemptCount || 0}</td><td class="small text-muted">${attempt ? new Date(attempt.completedAt).toLocaleDateString() : '-'}</td></tr>`; }).join('')}</tbody></table></div></div>
  <div class="card p-4 mb-4 insight-card"><div class="report-section-title"><h2>Prioritized action plan</h2><span class="badge badge-soft">Next steps</span></div><div class="row g-3">${recommendations.map((item, index) => `<div class="col-md-6"><div class="p-3 bg-body-tertiary rounded-3 h-100"><div class="d-flex align-items-center gap-2"><span class="badge badge-soft">${String(index + 1).padStart(2, '0')}</span><span class="small text-uppercase text-muted fw-semibold">${item[0]}</span></div><h3 class="h6 mt-3 mb-1">${item[1]}</h3><p class="small text-muted mb-0">${item[2]}</p></div></div>`).join('')}</div></div>
  <div class="card p-4 mb-4"><div class="report-section-title"><h2>Decision evidence</h2><span class="small text-muted">Most recent 20 answers</span></div>${history.length ? `<div class="table-responsive"><table class="table report-table"><thead><tr><th>Timestamp</th><th>Scenario / question</th><th>Selected response</th><th>Response time</th><th>Outcome</th></tr></thead><tbody>${history.slice(0, 20).map(item => `<tr><td class="small text-muted text-nowrap">${new Date(item.completedAt).toLocaleString()}</td><td><strong>${item.scenarioTitle}</strong><div class="small text-muted">${item.questionText || item.questionId}</div></td><td class="small">${item.action}</td><td class="small text-nowrap">${item.responseSeconds ? `${item.responseSeconds}s` : '-'}</td><td><span class="badge ${item.correct ? 'text-bg-success' : 'text-bg-danger'}">${item.correct ? 'Correct' : 'Incorrect'}</span><div class="small text-muted mt-1">${item.points} pts</div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state text-muted"><i class="bi bi-clipboard-data fs-2"></i><p class="mt-2">Complete a simulation to create assessment evidence.</p></div>'}</div>
  <footer class="report-footer"><span>PhishAware Security Awareness Lab</span><span>${reportId} / Confidential training record</span></footer></section>`;

  renderCharts(stats);
  document.getElementById('resetBtn').addEventListener('click', () => { if (confirm('Reset all simulation scores, lessons, and decision history?')) PAStore.reset(); });
  document.getElementById('pdfBtn').addEventListener('click', () => exportPdf(stats, accuracy, reportId, recommendations));
}

function renderCharts(stats) {
  const muted = getComputedStyle(document.body).getPropertyValue('--pa-muted');
  new Chart(document.getElementById('riskChart'), {
    type: 'doughnut',
    data: { labels: ['Resilience', 'Residual risk'], datasets: [{ data: [100 - stats.risk, stats.risk], backgroundColor: ['#25c2a0', '#f59e0b'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: muted } } } }
  });
  new Chart(document.getElementById('performanceChart'), {
    type: 'bar',
    data: {
      labels: PA_SCENARIOS.map(item => item.title.replace(' / BEC', '')),
      datasets: [{
        label: 'Score',
        data: PA_SCENARIOS.map(item => stats.s.attempts?.[item.id]?.score || 0),
        backgroundColor: PA_SCENARIOS.map(item => (stats.s.attempts?.[item.id]?.score || 0) >= 80 ? '#25c2a0' : '#6558f5'),
        borderRadius: 7
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { color: muted }, grid: { color: 'rgba(128,128,128,.12)' } }, x: { ticks: { color: muted }, grid: { display: false } } }, plugins: { legend: { display: false } } }
  });
}

function exportPdf(stats, accuracy, reportId, recommendations) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFillColor(24, 31, 66); doc.rect(0, 0, 210, 48, 'F');
  doc.setTextColor(199, 210, 254); doc.setFontSize(9); doc.text('PHISHAWARE / INDIVIDUAL ASSESSMENT', 14, 15);
  doc.setTextColor(255); doc.setFontSize(24); doc.text('Phishing Resilience Report', 14, 29);
  doc.setFontSize(9); doc.text(`${reportId}  |  ${new Date().toLocaleString()}  |  Browser-local data`, 14, 40);
  doc.setTextColor(30); doc.setFontSize(15); doc.text('Executive Summary', 14, 62);
  doc.setFontSize(11); doc.text(`Assessment score: ${stats.average}%`, 14, 74); doc.text(`Decision accuracy: ${accuracy}%`, 76, 74); doc.text(`Residual risk: ${stats.riskRating} (${stats.risk}/100)`, 135, 74);
  doc.setFontSize(9); doc.setTextColor(90); doc.text(`Coverage: ${stats.completed}/${stats.total} scenarios  |  Answers: ${stats.totalAttempts}  |  Correct: ${stats.correctDecisions}  |  Incorrect: ${stats.incorrectDecisions}`, 14, 84);
  doc.setTextColor(30); doc.setFontSize(14); doc.text('Scenario Performance', 14, 101);
  let y = 112;
  PA_SCENARIOS.forEach(item => { const attempt = stats.s.attempts?.[item.id]; doc.setFontSize(9); doc.setTextColor(40); doc.text(item.title, 16, y); doc.setTextColor(attempt ? 20 : 130); doc.text(attempt ? `${attempt.score}% current / ${attempt.bestScore ?? attempt.score}% best / ${attempt.attemptCount || 0} answers` : 'Not assessed', 95, y); y += 9; });
  y += 5; doc.setTextColor(30); doc.setFontSize(14); doc.text('Prioritized Action Plan', 14, y); y += 11;
  recommendations.forEach((item, index) => { doc.setFontSize(9); doc.setTextColor(40); doc.text(`${index + 1}. ${item[1]}`, 16, y); y += 5; doc.setTextColor(100); const lines = doc.splitTextToSize(item[2], 175); doc.text(lines, 20, y); y += lines.length * 5 + 4; });
  doc.setDrawColor(220); doc.line(14, 276, 196, 276); doc.setFontSize(7); doc.setTextColor(110); doc.text('This educational score is not a formal organizational risk assessment. No learning data was transmitted.', 14, 283); doc.text(reportId, 180, 290);
  doc.save(`phishaware-assessment-${new Date().toISOString().slice(0, 10)}.pdf`);
  PAToast('Professional assessment PDF downloaded.');
}
