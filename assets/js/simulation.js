(function () {
  'use strict';
  document.addEventListener('pa:ready', initializeSimulation);

  function initializeSimulation() {
    const scenarioId = document.body.dataset.scenario;
    const scenario = PA_SCENARIOS.find(item => item.id === scenarioId);
    const bank = PA_QUESTION_BANK?.[scenarioId] || [];
    if (!scenario || !bank.length) return;

    const saved = PGStorage.getSession(scenarioId);
    const bankIds = new Set(bank.map(question => question.id));
    const resumable = saved && Array.isArray(saved.questionOrder) && saved.questionOrder.length === bank.length && saved.questionOrder.every(id => bankIds.has(id));
    const state = resumable ? saved : {
      scenarioId,
      questionOrder: shuffle(bank.map(question => question.id)),
      index: 0,
      scores: [],
      answers: [],
      phase: 'question',
      elapsedMs: 0,
      questionElapsedMs: 0,
      startedAt: new Date().toISOString()
    };
    state.scores ||= [];
    state.answers ||= [];
    state.phase ||= 'question';
    const questions = state.questionOrder.map(id => bank.find(question => question.id === id));
    let sessionAnchor = performance.now();
    let questionAnchor = sessionAnchor;
    let timerInterval;
    let saveCounter = 0;
    const content = document.getElementById('appContent');
    const initialAverage = calculateAverage(state.scores);
    content.innerHTML = `<div class="simulation-stage"><div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"><div><div class="page-eyebrow">Interactive simulation</div><h1 class="page-title">${scenario.title}</h1><p class="text-muted mb-0">Question order is randomized. Faster correct decisions earn a small bonus.</p></div><div class="text-end"><span class="badge badge-soft">${scenario.difficulty}</span><div class="small text-muted mt-2">Running score: <strong id="runningScore">${initialAverage}%</strong></div></div></div><div class="simulation-timer mb-3"><span><i class="bi bi-stopwatch"></i>Total <strong id="sessionTimer">00:00</strong></span><span><i class="bi bi-hourglass-split"></i>Question <strong id="questionTimer">00:00</strong></span><span class="timer-hint">Speed bonus: 20 points within 10 seconds</span></div>${renderArtifact(scenarioId)}<div class="card p-4 mt-4" id="questionCard"></div></div>`;

    bindClues();
    if (state.phase === 'complete') showCompletion();
    else {
      renderQuestion();
      if (state.phase === 'feedback') restoreFeedback();
      startTimer();
      if (resumable) PAToast(`Resumed ${scenario.title} at question ${state.index + 1}.`);
    }

    function shuffle(items) {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
      }
      return result;
    }

    function calculateAverage(scores) {
      return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    }

    function checkpoint() {
      if (state.phase === 'complete') return;
      const now = performance.now();
      state.elapsedMs += now - sessionAnchor;
      if (state.phase === 'question') state.questionElapsedMs += now - questionAnchor;
      sessionAnchor = now;
      questionAnchor = now;
      PGStorage.saveSession(scenarioId, state);
    }

    function startTimer() {
      updateTimerDisplay();
      timerInterval = window.setInterval(() => {
        updateTimerDisplay();
        saveCounter += 1;
        if (saveCounter >= 5) { saveCounter = 0; checkpoint(); }
      }, 1000);
      window.addEventListener('pagehide', checkpoint, { once: true });
      document.addEventListener('visibilitychange', () => { if (document.hidden) checkpoint(); });
    }

    function updateTimerDisplay() {
      const now = performance.now();
      const total = state.elapsedMs + (now - sessionAnchor);
      const questionTime = state.questionElapsedMs + (state.phase === 'question' ? now - questionAnchor : 0);
      const totalElement = document.getElementById('sessionTimer');
      const questionElement = document.getElementById('questionTimer');
      if (totalElement) totalElement.textContent = formatTime(total);
      if (questionElement) questionElement.textContent = formatTime(questionTime);
    }

    function formatTime(milliseconds) {
      const seconds = Math.max(0, Math.floor(milliseconds / 1000));
      return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    function speedBonus(seconds) {
      if (seconds <= 10) return 20;
      if (seconds <= 20) return 15;
      if (seconds <= 30) return 10;
      if (seconds <= 45) return 5;
      return 0;
    }

    function renderQuestion() {
      const question = questions[state.index];
      const card = document.getElementById('questionCard');
      const completed = state.phase === 'feedback' ? state.index + 1 : state.index;
      card.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><span class="page-eyebrow">Question ${state.index + 1} of ${questions.length}</span><span class="small text-muted">${Math.round((completed / questions.length) * 100)}% complete</span></div><div class="progress mb-4" aria-label="Question progress"><div class="progress-bar" style="width:${(completed / questions.length) * 100}%"></div></div><h2 class="h5 mb-3">${question.question}</h2><div id="options">${question.options.map((option, index) => `<button type="button" class="option-btn" data-option="${index}"><span class="badge rounded-pill badge-soft me-2">${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div><div id="feedback" class="d-none" aria-live="polite"></div>`;
      card.querySelectorAll('.option-btn').forEach(button => button.addEventListener('click', () => answerQuestion(Number(button.dataset.option))));
    }

    function answerQuestion(selectedIndex) {
      if (state.phase !== 'question') return;
      checkpoint();
      const question = questions[state.index];
      const correct = selectedIndex === question.answer;
      const responseSeconds = Math.max(1, Math.round(state.questionElapsedMs / 1000));
      const bonus = correct ? speedBonus(responseSeconds) : 0;
      const points = correct ? 80 + bonus : 0;
      state.scores.push(points);
      state.answers.push({ questionId: question.id, selectedIndex, correct, points, responseSeconds });
      state.phase = 'feedback';
      state.selectedIndex = selectedIndex;
      state.lastCorrect = correct;
      state.lastPoints = points;
      state.lastBonus = bonus;
      state.lastResponseSeconds = responseSeconds;
      const average = calculateAverage(state.scores);

      PGStorage.recordResult({
        scenarioId,
        scenarioTitle: scenario.title,
        questionId: question.id,
        questionText: question.question,
        category: scenarioId,
        action: question.options[selectedIndex],
        correct,
        points,
        responseSeconds,
        cluesFound: document.querySelectorAll('.clue.found').length
      });
      PGStorage.setScenarioScore(scenarioId, average);
      PGStorage.saveSession(scenarioId, state);
      document.getElementById('runningScore').textContent = `${average}%`;
      displayFeedback();
      PAToast(`Answer saved locally. Running score: ${average}%.`);
    }

    function restoreFeedback() {
      document.getElementById('runningScore').textContent = `${calculateAverage(state.scores)}%`;
      displayFeedback();
    }

    function displayFeedback() {
      const question = questions[state.index];
      document.querySelectorAll('.option-btn').forEach((button, index) => {
        button.disabled = true;
        if (index === question.answer) button.classList.add('correct');
        else if (index === state.selectedIndex) button.classList.add('wrong');
      });
      const average = calculateAverage(state.scores);
      const feedback = document.getElementById('feedback');
      feedback.className = 'feedback-box mt-3';
      feedback.innerHTML = `<div class="fw-bold ${state.lastCorrect ? 'text-success' : 'text-danger'}"><i class="bi ${state.lastCorrect ? 'bi-check-circle' : 'bi-x-circle'} me-2"></i>${state.lastCorrect ? 'Correct decision' : 'Review this decision'}</div><p class="mb-2 mt-2">${question.explanation}</p><div class="answer-metrics mb-3"><span><i class="bi bi-stopwatch"></i>${state.lastResponseSeconds}s response</span><span><i class="bi bi-lightning-charge"></i>+${state.lastBonus || 0} speed bonus</span><span><i class="bi bi-award"></i>${state.lastPoints} points</span></div><div class="small text-muted mb-3">Running score: ${average}%</div><button type="button" class="btn btn-primary btn-sm" id="nextQuestion">${state.index + 1 < questions.length ? 'Next question' : 'Finish simulation'} <i class="bi bi-arrow-right ms-1"></i></button>`;
      document.getElementById('nextQuestion').addEventListener('click', nextQuestion);
    }

    function nextQuestion() {
      checkpoint();
      if (state.index + 1 < questions.length) {
        state.index += 1;
        state.phase = 'question';
        state.questionElapsedMs = 0;
        delete state.selectedIndex;
        delete state.lastCorrect;
        delete state.lastPoints;
        delete state.lastBonus;
        delete state.lastResponseSeconds;
        sessionAnchor = performance.now();
        questionAnchor = sessionAnchor;
        PGStorage.saveSession(scenarioId, state);
        renderQuestion();
        document.getElementById('questionCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      showCompletion();
    }

    function showCompletion() {
      if (state.phase !== 'complete') checkpoint();
      state.phase = 'complete';
      const average = calculateAverage(state.scores);
      const correctCount = state.answers.filter(answer => answer.correct).length;
      PGStorage.setScenarioScore(scenarioId, average);
      PGStorage.saveSession(scenarioId, state);
      window.clearInterval(timerInterval);
      document.getElementById('questionCard').innerHTML = `<div class="text-center py-4"><div class="scenario-icon mx-auto"><i class="bi bi-trophy"></i></div><div class="page-eyebrow mt-3">Simulation complete</div><h2 class="h3 mt-2">You scored ${average}%</h2><p class="text-muted">${correctCount} of ${questions.length} answers were correct in ${formatTime(state.elapsedMs)}. Question order and response times were saved locally.</p><div class="d-flex flex-wrap justify-content-center gap-2 mt-4"><a href="simulations.html" class="btn btn-soft">All simulations</a><button type="button" class="btn btn-soft" id="retrySimulation">New randomized attempt</button><a href="report.html" class="btn btn-primary">View updated report</a></div></div>`;
      document.getElementById('retrySimulation').addEventListener('click', () => { PGStorage.clearSession(scenarioId); location.reload(); });
      PAToast(`Simulation complete. Final score: ${average}%.`);
    }
  }

  function bindClues() {
    document.querySelectorAll('.clue').forEach(element => element.addEventListener('click', () => {
      if (element.classList.contains('found')) return;
      element.classList.add('found');
      PAToast(element.dataset.clue);
    }));
  }

  function renderArtifact(id) {
    const scenario = PA_SCENARIOS.find(item => item.id === id);
    const clue = (content, text) => `<span class="clue" data-clue="${text}">${content}</span>`;
    const safety = '<div class="training-safety"><i class="bi bi-shield-check"></i><span><strong>Training simulation</strong> - no links, codes, or credentials leave this browser.</span></div>';
    if (id === 'email') return `${safety}<div class="gmail-window"><div class="gmail-header"><div class="gmail-brand"><span class="gmail-m">M</span><strong>Mail</strong></div><div class="gmail-search"><i class="bi bi-search"></i><span>Search mail</span></div><i class="bi bi-gear"></i><span class="gmail-avatar">AP</span></div><div class="gmail-layout"><aside class="gmail-nav"><button type="button"><i class="bi bi-pencil"></i> Compose</button><span class="active"><i class="bi bi-inbox-fill"></i> Inbox <b>4</b></span><span><i class="bi bi-star"></i> Starred</span><span><i class="bi bi-clock"></i> Snoozed</span><span><i class="bi bi-send"></i> Sent</span></aside><section class="gmail-message"><div class="gmail-actions"><i class="bi bi-arrow-left"></i><i class="bi bi-archive"></i><i class="bi bi-exclamation-octagon"></i><i class="bi bi-trash"></i></div><div class="d-flex justify-content-between gap-3"><h2>${clue('URGENT: Your Microsoft 365 password expires today', scenario.clues[0])}</h2><span class="small text-muted text-nowrap">10:42 AM</span></div><div class="gmail-sender"><span class="sender-avatar">M</span><div><strong>Microsoft Security</strong> <span class="text-muted">&lt;${clue('security@micros0ft-alerts.example', scenario.clues[1])}&gt;</span><div class="small text-muted">to me <i class="bi bi-caret-down-fill"></i></div></div></div><div class="gmail-body"><p>${clue('Dear valued user', scenario.clues[3])},</p><p>Your Microsoft 365 password will expire in <strong>30 minutes</strong>. To prevent interruption to Teams, Outlook, and OneDrive, confirm your account now.</p><button type="button" class="mail-cta clue" data-clue="${scenario.clues[2]}">Keep my account active</button><p class="mail-destination">Link preview: https://account-check.example/verify</p><p>Microsoft 365 Account Team</p><hr><p class="small text-muted">This mailbox is not monitored. Please do not reply.</p></div></section></div></div>`;
    if (id === 'login') return `${safety}<div class="login-window"><div class="browser-tabs"><div class="browser-dots"><span></span><span></span><span></span></div><div class="browser-tab"><i class="bi bi-microsoft"></i> Sign in to your account <i class="bi bi-x"></i></div></div><div class="browser-controls"><i class="bi bi-arrow-left"></i><i class="bi bi-arrow-clockwise"></i><div class="address-pill">${clue('<i class="bi bi-sliders me-2"></i>https://accounts-micros0ft-security.example', scenario.clues[0])}</div><i class="bi bi-star"></i></div><div class="ms-login-stage"><div class="p-5 text-start ms-login-card"><div class="ms-wordmark"><i class="bi bi-microsoft"></i> Microsoft</div><h2>Sign in</h2><div class="fake-input mt-4">Email, phone, or Skype</div><button type="button" class="ms-next">Next</button><p class="small mt-3">No account? <span class="text-primary">Create one!</span></p><p class="small text-muted clue" data-clue="${scenario.clues[2]}">Password manager has no saved login for this domain</p></div><div class="ms-footer"><span>Terms of use</span><span>Privacy & cookies</span><span>...</span></div></div></div>`;
    if (id === 'qr') return `${safety}<div class="qr-scene"><div class="parking-poster"><div class="parking-logo"><i class="bi bi-p-square-fill"></i> CITY PARK</div><div class="parking-zone">ZONE 4812</div><h2>Pay for parking</h2><p>Scan the code to start your session</p><div class="qr-sticker clue" data-clue="${scenario.clues[0]}"><i class="bi bi-qr-code"></i><span>NEW RATE</span></div><p class="clue urgency-copy" data-clue="${scenario.clues[1]}">Payment required immediately to avoid a penalty</p></div><div class="scan-preview"><div class="phone-notch"></div><i class="bi bi-compass fs-2"></i><div class="small text-muted mt-3">Open this link?</div><strong class="clue" data-clue="${scenario.clues[3]}">quick-park-pay.example</strong><div class="d-flex gap-2 mt-4"><button type="button">Cancel</button><button type="button" class="open">Open</button></div></div></div>`;
    if (id === 'smishing') return `${safety}<div class="phone-frame sms-phone"><div class="phone-status"><strong>9:41</strong><span><i class="bi bi-reception-4"></i> <i class="bi bi-wifi"></i> <i class="bi bi-battery-full"></i></span></div><div class="sms-contact"><i class="bi bi-chevron-left"></i><span class="contact-circle"><i class="bi bi-truck"></i></span><strong>Delivery Updates</strong><small class="clue" data-clue="${scenario.clues[0]}">Unknown sender</small></div><div class="sms-date">Today 10:18 AM</div><div class="message-bubble"><p>Your parcel <strong>#PKG-88421</strong> could not be delivered. A <span class="clue" data-clue="${scenario.clues[2]}">INR 18.50 redelivery fee</span> is required <span class="clue" data-clue="${scenario.clues[3]}">before 6 PM today</span>.</p><span class="clue sms-link" data-clue="${scenario.clues[1]}">bit.ly/parcel-redelivery</span></div><div class="sms-input">Text Message <i class="bi bi-arrow-up-circle-fill"></i></div></div>`;
    if (id === 'social') return `${safety}<div class="social-phone"><div class="social-top"><strong>Social</strong><div><i class="bi bi-heart"></i><i class="bi bi-send"></i></div></div><div class="social-account"><span class="social-avatar"><i class="bi bi-gift"></i></span><div><strong>@globalbrand_prizes</strong><div class="small clue" data-clue="${scenario.clues[0]}">Joined this month &middot; 12 followers</div></div><i class="bi bi-three-dots ms-auto"></i></div><div class="social-visual"><i class="bi bi-gift-fill"></i><strong>YOU WON!</strong><span>Creator Reward 2026</span></div><div class="social-actions"><i class="bi bi-heart"></i><i class="bi bi-chat"></i><i class="bi bi-send"></i><i class="bi bi-bookmark ms-auto"></i></div><div class="social-copy"><strong>@globalbrand_prizes</strong> Congratulations! To verify your identity, send the <span class="clue" data-clue="${scenario.clues[2]}">six-digit code we texted</span>. An <span class="clue" data-clue="${scenario.clues[3]}">INR 499 release fee</span> confirms delivery.</div><button type="button" class="social-claim">Claim reward</button></div>`;
    return `${safety}<div class="outlook-window"><div class="outlook-bar"><span class="outlook-app"><i class="bi bi-grid-3x3-gap-fill"></i> Outlook</span><div class="outlook-search"><i class="bi bi-search"></i> Search</div><span><i class="bi bi-camera-video"></i> Meet Now</span><i class="bi bi-gear"></i></div><div class="outlook-body"><aside><button type="button"><i class="bi bi-envelope-plus"></i> New mail</button><strong>Favorites</strong><span><i class="bi bi-inbox-fill"></i> Inbox <b>2</b></span><span><i class="bi bi-send"></i> Sent Items</span><span><i class="bi bi-file-earmark"></i> Drafts</span></aside><section class="outlook-message"><div class="outlook-actions"><span><i class="bi bi-reply"></i> Reply</span><span><i class="bi bi-arrow-90deg-right"></i> Forward</span><span><i class="bi bi-trash"></i> Delete</span><span><i class="bi bi-flag"></i> Report</span></div><h2>Confidential acquisition payment</h2><div class="outlook-sender"><span class="sender-avatar executive">AM</span><div><strong>Arjun Mehta - Chief Executive Officer</strong><div class="small">${clue('arjun.mehta@northstar-holdlngs.example', scenario.clues[3])}</div><div class="small text-muted">To: Accounts Payable</div></div></div><div class="outlook-copy"><p>Hi,</p><p>I am finalizing a confidential acquisition and need you to send <strong>INR 8,40,000</strong> to the attached <span class="clue" data-clue="${scenario.clues[2]}">new beneficiary account</span>.</p><p><span class="clue" data-clue="${scenario.clues[0]}">Do not discuss this with anyone</span>. Complete it <span class="clue" data-clue="${scenario.clues[1]}">before the normal approval meeting</span>. I am unavailable by phone.</p><p>Regards,<br>Arjun<br><small>Sent from my phone</small></p></div></section></div></div>`;
  }
})();
