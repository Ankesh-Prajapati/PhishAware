document.addEventListener('pa:ready', () => {
  const panel = document.querySelector('.login-window .p-5');
  if (!panel) return;
  panel.innerHTML = `<div class="ms-wordmark"><i class="bi bi-microsoft"></i>Microsoft</div><h2>Sign in</h2><p class="small text-muted">Use your Microsoft account.</p><form id="fakeLoginForm" autocomplete="off"><label class="visually-hidden" for="simulatedEmail">Email, phone, or Skype</label><input id="simulatedEmail" class="form-control ms-field mt-4" type="email" placeholder="Email, phone, or Skype" autocomplete="off"><label class="visually-hidden" for="simulatedPassword">Password</label><input id="simulatedPassword" class="form-control ms-field mt-3" type="password" placeholder="Password" autocomplete="new-password"><p class="small mt-3">No account? <span class="text-primary">Create one!</span></p><button class="ms-next" type="submit">Sign in</button></form><p class="small text-muted mt-3 clue" data-clue="Password manager would not recognize this domain">Password manager has no saved login for this domain</p><div class="safe-form-note"><i class="bi bi-shield-lock me-1"></i>Training only: entered values are immediately cleared and never read or stored.</div>`;
  panel.querySelector('.clue').addEventListener('click', event => {
    event.currentTarget.classList.add('found');
    PAToast(event.currentTarget.dataset.clue);
  });
  panel.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    panel.querySelectorAll('input').forEach(input => { input.value = ''; });
    document.querySelector('[data-option="0"]').click();
    PAToast('These credentials would have been stolen in a real phishing attack.');
  });
});
