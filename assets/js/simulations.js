document.addEventListener('pa:ready', () => {
  const content = document.getElementById('appContent');
  const state = PAStore.get();
  const catalog = shuffle([
    ...PA_SCENARIOS,
    { id: 'credential-harvesting', title: 'Credential Harvesting', icon: 'bi-person-lock', page: 'fake-login.html', difficulty: 'Intermediate', summary: 'Spot forms designed to capture usernames, passwords, and verification codes.', progressId: 'login' },
    { id: 'delivery-scam', title: 'Fake Delivery Scam', icon: 'bi-box-seam', page: 'smishing.html', difficulty: 'Beginner', summary: 'Recognize parcel alerts that use urgency, short links, and unexpected fees.', progressId: 'smishing' }
  ]);
  content.innerHTML = `<div class="mb-4"><div class="page-eyebrow">Practice safely</div><h1 class="page-title">Choose a simulation</h1><p class="text-muted">Eight attack categories, six focused interactive labs, and immediate educational feedback.</p></div><div class="row g-4">${catalog.map(item => {
    const progressId = item.progressId || item.id;
    const attempt = state.attempts?.[progressId];
    const session = state.sessions?.[progressId];
    const inProgress = session && session.phase !== 'complete';
    return `<div class="col-md-6 col-xl-4"><article class="card scenario-card p-4"><div class="d-flex justify-content-between align-items-start"><div class="scenario-icon"><i class="bi ${item.icon}"></i></div><span class="badge badge-soft">${inProgress ? `Question ${session.index + 1}/${session.questionOrder.length}` : item.difficulty}</span></div><h2 class="h5 mt-4">${item.title}</h2><p class="text-muted flex-grow-1">${item.summary}</p><div class="d-flex justify-content-between align-items-center mt-2"><span class="small ${inProgress || attempt ? 'text-success' : 'text-muted'}"><i class="bi ${inProgress ? 'bi-play-circle-fill' : attempt ? 'bi-check-circle-fill' : 'bi-circle'} me-1"></i>${inProgress ? 'Saved in progress' : attempt ? `Best ${attempt.bestScore ?? attempt.score}%` : 'Not attempted'}</span><a href="${item.page}" class="btn btn-sm ${inProgress || attempt ? 'btn-soft' : 'btn-primary'}">${inProgress ? 'Resume' : attempt ? 'Review' : 'Start'} <i class="bi bi-arrow-right ms-1"></i></a></div></article></div>`;
  }).join('')}</div>`;
});

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}
