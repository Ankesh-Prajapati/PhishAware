document.addEventListener('pa:artifact-rendered', event => {
  if (event.detail.scenarioId !== 'login') return;
  const panel = document.querySelector('.login-window .p-5');
  if (!panel) return;
  const f = event.detail.variant.fields || {};
  const c = event.detail.variant.clues || {};
  panel.innerHTML = `<div class="ms-wordmark"><i class="bi ${f.brandIcon}"></i>${f.brandLabel}</div><h2>Sign in</h2><p class="small text-muted">Use your ${f.brandLabel} account.</p><form id="fakeLoginForm" autocomplete="off"><label class="visually-hidden" for="simulatedEmail">Email, phone, or Skype</label><input id="simulatedEmail" class="form-control ms-field mt-4" type="email" placeholder="Email, phone, or Skype" autocomplete="off"><label class="visually-hidden" for="simulatedPassword">Password</label><input id="simulatedPassword" class="form-control ms-field mt-3" type="password" placeholder="Password" autocomplete="new-password"><p class="small mt-3">No account? <span class="text-primary">Create one!</span></p><button class="ms-next" type="submit">Sign in</button></form><p class="small text-muted mt-3 clue" data-clue="${c.passwordNote}">${f.passwordNote}</p><div class="safe-form-note"><i class="bi bi-shield-lock me-1"></i>Training only: entered values are immediately cleared and never read or stored.</div>`;
  const clue = panel.querySelector('.clue');
  clue.setAttribute('tabindex', '0');
  clue.setAttribute('role', 'button');
  clue.setAttribute('aria-label', 'Reveal warning sign');
  const reveal = () => {
    if (clue.classList.contains('found')) return;
    clue.classList.add('found');
    clue.setAttribute('aria-pressed', 'true');
    PAToast(clue.dataset.clue);
  };
  clue.addEventListener('click', reveal);
  clue.addEventListener('keydown', keyEvent => {
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      keyEvent.preventDefault();
      reveal();
    }
  });
  panel.querySelector('form').addEventListener('submit', submitEvent => {
    submitEvent.preventDefault();
    panel.querySelectorAll('input').forEach(input => { input.value = ''; });
    PAToast('These credentials would have been stolen in a real phishing attack. Choose your answer below.');
  });
});
