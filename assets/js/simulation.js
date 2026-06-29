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
    let sessionAnchor;
    let questionAnchor;
    let timerInterval;
    let saveCounter = 0;
    const content = document.getElementById('appContent');
    const initialAverage = calculateAverage(state.scores);
    content.innerHTML = `<div class="simulation-stage"><div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3"><div><div class="page-eyebrow">Interactive simulation</div><h1 class="page-title">${scenario.title}</h1><p class="text-muted mb-0">Three different examples are shown in randomized order. Read each one carefully - faster correct decisions earn a small bonus.</p></div><div class="text-end"><span class="badge badge-soft">${scenario.difficulty}</span><div class="small text-muted mt-2">Running score: <strong id="runningScore">${initialAverage}%</strong></div></div></div><div class="simulation-timer mb-3 d-none" id="timerBar"><span><i class="bi bi-stopwatch"></i>Total <strong id="sessionTimer">00:00</strong></span><span><i class="bi bi-hourglass-split"></i>Question <strong id="questionTimer">00:00</strong></span><span class="timer-hint">Speed bonus: 20 points within 10 seconds</span></div><div id="artifactStage"></div><div class="card p-4 mt-4" id="questionCard"></div></div>`;

    function beginSimulation() {
      document.getElementById('timerBar').classList.remove('d-none');
      sessionAnchor = performance.now();
      questionAnchor = sessionAnchor;
      renderQuestion();
      if (state.phase === 'feedback') restoreFeedback();
      startTimer();
      if (resumable) PAToast(`Resumed ${scenario.title} at question ${state.index + 1}.`);
    }

    function renderStartGate() {
      const card = document.getElementById('questionCard');
      card.innerHTML = `<div class="text-center py-4"><i class="bi bi-stopwatch fs-1 text-primary mb-3 d-block"></i><h2 class="h5">${resumable ? 'Ready to continue?' : 'Ready to begin?'}</h2><p class="text-muted mb-4 mx-auto" style="max-width:32rem">${resumable ? `You left off on example ${state.index + 1} of ${questions.length}.` : `${questions.length} examples, one question each.`} The timer starts the moment you click below, so take whatever time you need to read this page first.</p><button type="button" class="btn btn-primary px-4" id="startSimBtn"><i class="bi bi-play-fill me-1"></i>${resumable ? 'Resume simulation' : 'Start simulation'}</button></div>`;
      document.getElementById('startSimBtn').addEventListener('click', beginSimulation, { once: true });
    }

    if (state.phase === 'complete') showCompletion();
    else renderStartGate();

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
      document.getElementById('artifactStage').innerHTML = renderArtifact(question._artifactType || scenarioId, question);
      bindClues();
      document.dispatchEvent(new CustomEvent('pa:artifact-rendered', { detail: { scenarioId: question._artifactType || scenarioId, variant: question } }));
      const card = document.getElementById('questionCard');
      const completed = state.phase === 'feedback' ? state.index + 1 : state.index;
      card.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><span class="page-eyebrow">Example ${state.index + 1} of ${questions.length}</span><span class="small text-muted">${Math.round((completed / questions.length) * 100)}% complete</span></div><div class="progress mb-4" aria-label="Question progress"><div class="progress-bar" style="width:${(completed / questions.length) * 100}%"></div></div><h2 class="h5 mb-3">${question.question}</h2><div id="options">${question.options.map((option, index) => `<button type="button" class="option-btn" data-option="${index}"><span class="badge rounded-pill badge-soft me-2">${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div><div id="feedback" class="d-none" aria-live="polite"></div>`;
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
    document.querySelectorAll('.clue').forEach(element => {
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      if (!element.hasAttribute('aria-label')) element.setAttribute('aria-label', 'Reveal warning sign');
      const reveal = () => {
        if (element.classList.contains('found')) return;
        element.classList.add('found');
        element.setAttribute('aria-pressed', 'true');
        PAToast(element.dataset.clue);
      };
      element.addEventListener('click', reveal);
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          reveal();
        }
      });
    });
  }

  function renderArtifact(scenarioId, variant) {
    const f = variant.fields || {};
    const c = variant.clues || {};
    const clue = (content, text) => `<span class="clue" data-clue="${text}">${content}</span>`;
    const initials = name => (name || '').split(' ').filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase();
    const safety = '<div class="training-safety"><i class="bi bi-shield-check"></i><span><strong>Training simulation</strong> - no links, codes, or credentials leave this browser.</span></div>';

    if (scenarioId === 'email') return `${safety}<div class="gmail-window"><div class="gmail-header"><div class="gmail-brand"><span class="gmail-m">M</span><strong>Mail</strong></div><div class="gmail-search"><i class="bi bi-search"></i><span>Search mail</span></div><i class="bi bi-gear"></i><span class="gmail-avatar">AP</span></div><div class="gmail-layout"><aside class="gmail-nav"><button type="button"><i class="bi bi-pencil"></i> Compose</button><span class="active"><i class="bi bi-inbox-fill"></i> Inbox <b>4</b></span><span><i class="bi bi-star"></i> Starred</span><span><i class="bi bi-clock"></i> Snoozed</span><span><i class="bi bi-send"></i> Sent</span></aside><section class="gmail-message"><div class="gmail-actions"><i class="bi bi-arrow-left"></i><i class="bi bi-archive"></i><i class="bi bi-exclamation-octagon"></i><i class="bi bi-trash"></i></div><div class="d-flex justify-content-between gap-3"><h2>${clue(f.subject, c.subject)}</h2><span class="small text-muted text-nowrap">${f.time}</span></div><div class="gmail-sender"><span class="sender-avatar">${(f.senderName || '?').charAt(0)}</span><div><strong>${f.senderName}</strong> <span class="text-muted">&lt;${clue(f.senderEmail, c.senderEmail)}&gt;</span><div class="small text-muted">to me <i class="bi bi-caret-down-fill"></i></div></div></div><div class="gmail-body"><p>${clue(f.greeting, c.greeting)},</p><p>${f.body}</p><button type="button" class="mail-cta clue" data-clue="${c.cta}">${f.cta}</button><p class="mail-destination">${f.linkPreview}</p><p>Regards,<br>${f.senderName}</p><hr><p class="small text-muted">This mailbox is not monitored. Please do not reply.</p></div></section></div></div>`;

    if (scenarioId === 'login') {
      const urlIcon = f.urlSecure ? 'bi-lock-fill' : 'bi-exclamation-triangle-fill';
      return `${safety}<div class="login-window"><div class="browser-tabs"><div class="browser-dots"><span></span><span></span><span></span></div><div class="browser-tab"><i class="bi bi-window"></i> ${clue(f.tabTitle, c.tabTitle)} <i class="bi bi-x"></i></div></div><div class="browser-controls"><i class="bi bi-arrow-left"></i><i class="bi bi-arrow-clockwise"></i><div class="address-pill"><i class="bi ${urlIcon} me-2"></i>${clue(f.urlText, c.url)}</div><i class="bi bi-star"></i></div><div class="ms-login-stage"><div class="p-5 text-start ms-login-card"><div class="ms-wordmark"><i class="bi ${f.brandIcon}"></i> ${f.brandLabel}</div><h2>Sign in</h2><div class="fake-input mt-4">Email, phone, or Skype</div><button type="button" class="ms-next">Next</button><p class="small mt-3">No account? <span class="text-primary">Create one!</span></p><p class="small text-muted clue" data-clue="${c.passwordNote}">${f.passwordNote}</p></div><div class="ms-footer"><span>Terms of use</span><span>Privacy &amp; cookies</span><span>...</span></div></div></div>`;
    }

    if (scenarioId === 'qr') return `${safety}<div class="qr-scene"><div class="parking-poster"><div class="parking-logo"><i class="bi ${f.posterIcon}"></i> ${clue(f.posterTitle, c.branding)}</div><div class="parking-zone">${f.zone}</div><h2>${f.heading}</h2><p>${f.instruction}</p><div class="qr-sticker clue" data-clue="${c.sticker}"><i class="bi bi-qr-code"></i><span>${f.stickerLabel}</span></div><p class="clue urgency-copy" data-clue="${c.urgency}">${f.urgencyText}</p></div><div class="scan-preview"><div class="phone-notch"></div><i class="bi bi-compass fs-2"></i><div class="small text-muted mt-3">Open this link?</div><strong class="clue" data-clue="${c.domain}">${f.fakeDomain}</strong><div class="d-flex gap-2 mt-4"><button type="button">Cancel</button><button type="button" class="open">Open</button></div></div></div>`;

    if (scenarioId === 'smishing') {
      const feeHtml = f.fee ? clue(f.fee, c.fee) : 'a fee';
      const body = (f.messageHtml || '').replace('{fee}', feeHtml).replace('{deadline}', clue(f.deadline, c.deadline));
      return `${safety}<div class="phone-frame sms-phone"><div class="phone-status"><strong>9:41</strong><span><i class="bi bi-reception-4"></i> <i class="bi bi-wifi"></i> <i class="bi bi-battery-full"></i></span></div><div class="sms-contact"><i class="bi bi-chevron-left"></i><span class="contact-circle"><i class="bi ${f.contactIcon}"></i></span><strong>${f.contactName}</strong><small class="clue" data-clue="${c.contact}">Unknown sender</small></div><div class="sms-date">${f.dateLabel}</div><div class="message-bubble"><p>${body}</p><span class="clue sms-link" data-clue="${c.link}">${f.link}</span></div><div class="sms-input">Text Message <i class="bi bi-arrow-up-circle-fill"></i></div></div>`;
    }

    if (scenarioId === 'social') {
      const codeHtml = clue(f.code, c.code);
      const feeHtml = clue(f.fee, c.fee);
      const body = (f.bodyHtml || '').replace('{code}', codeHtml).replace('{fee}', feeHtml);
      return `${safety}<div class="social-phone"><div class="social-top"><strong>Social</strong><div><i class="bi bi-heart"></i><i class="bi bi-send"></i></div></div><div class="social-account"><span class="social-avatar"><i class="bi bi-person-circle"></i></span><div><strong>${f.handle}</strong><div class="small clue" data-clue="${c.age}">${f.age} &middot; ${f.followers}</div></div><i class="bi bi-three-dots ms-auto"></i></div><div class="social-visual"><i class="bi ${f.visualIcon}"></i><strong class="clue" data-clue="${c.prize}">${f.prizeLabel}</strong><span>${f.prizeSub}</span></div><div class="social-actions"><i class="bi bi-heart"></i><i class="bi bi-chat"></i><i class="bi bi-send"></i><i class="bi bi-bookmark ms-auto"></i></div><div class="social-copy"><strong>${f.handle}</strong> ${body}</div><button type="button" class="social-claim">Claim now</button></div>`;
    }

    if (scenarioId === 'bec') {
      const secrecyHtml = f.secrecyLine ? `${clue(f.secrecyLine, c.secrecy)} ` : '';
      return `${safety}<div class="outlook-window"><div class="outlook-bar"><span class="outlook-app"><i class="bi bi-grid-3x3-gap-fill"></i> Outlook</span><div class="outlook-search"><i class="bi bi-search"></i> Search</div><span><i class="bi bi-camera-video"></i> Meet Now</span><i class="bi bi-gear"></i></div><div class="outlook-body"><aside><button type="button"><i class="bi bi-envelope-plus"></i> New mail</button><strong>Favorites</strong><span><i class="bi bi-inbox-fill"></i> Inbox <b>2</b></span><span><i class="bi bi-send"></i> Sent Items</span><span><i class="bi bi-file-earmark"></i> Drafts</span></aside><section class="outlook-message"><div class="outlook-actions"><span><i class="bi bi-reply"></i> Reply</span><span><i class="bi bi-arrow-90deg-right"></i> Forward</span><span><i class="bi bi-trash"></i> Delete</span><span><i class="bi bi-flag"></i> Report</span></div><h2>${f.subject}</h2><div class="outlook-sender"><span class="sender-avatar executive">${initials(f.execName)}</span><div><strong>${f.execName} - ${f.execTitle}</strong><div class="small">${clue(f.execEmail, c.email)}</div><div class="small text-muted">To: Accounts Payable</div></div></div><div class="outlook-copy"><p>Hi,</p><p>I need you to ${clue(f.ask, c.ask)} - <strong>${f.amount}</strong>.</p><p>${secrecyHtml}${clue(f.urgencyLine, c.urgency)}</p><p>Regards,<br>${f.execName}<br><small>${f.signoff}</small></p></div></section></div></div>`;
    }

    if (scenarioId === 'mfa-fatigue') {
      const count = f.pushCount || 4;
      const pushes = Array.from({ length: count }, (_, i) => i).map(i => {
        const isTop = i === count - 1;
        const locationHtml = isTop ? clue(f.location, c.location) : f.location;
        const timeHtml = isTop ? clue('Now', c.repeat) : `${(count - i) * 6}s ago`;
        return `<div class="mfa-push ${isTop ? 'mfa-push-top' : ''}"><span class="mfa-push-icon"><i class="bi bi-shield-lock-fill"></i></span><div class="mfa-push-body"><strong>Approve sign-in?</strong><span>${locationHtml}</span></div><span class="mfa-push-time">${timeHtml}</span></div>`;
      }).join('');
      return `${safety}<div class="mfa-phone phone-frame"><div class="phone-status"><strong>9:41</strong><span><i class="bi bi-reception-4"></i> <i class="bi bi-wifi"></i> <i class="bi bi-battery-full"></i></span></div><div class="mfa-lockscreen"><div class="mfa-clock">${f.time}</div><div class="mfa-date">${f.day}</div><div class="mfa-stack">${pushes}</div></div><div class="mfa-chat"><div class="mfa-chat-bubble"><span class="mfa-chat-avatar"><i class="bi bi-headset"></i></span><p><strong>${f.callerLabel}</strong>: ${clue(f.callerLine, c.callerLine)}</p></div><p class="small text-muted clue" data-clue="${c.noAttempt}">You did not attempt to sign in at this time</p></div></div>`;
    }

    if (scenarioId === 'upi-fraud') {
      const isCall = !!f.callerLabel;
      const transcript = [
        f.line1 ? `<p class="clue" data-clue="${c.knowsDetail}">${f.line1}</p>` : '',
        f.line2 ? `<p class="clue" data-clue="${c.otpAsk}">${f.line2}</p>` : ''
      ].join('');
      const amountDisplay = f.collectAmount || 'Approval request';
      return `${safety}<div class="upi-phone phone-frame"><div class="phone-status"><strong>9:41</strong><span><i class="bi bi-reception-4"></i> <i class="bi bi-wifi"></i> <i class="bi bi-battery-full"></i></span></div><div class="call-screen"><div class="call-avatar"><i class="bi ${isCall ? 'bi-bank2' : 'bi-chat-dots'}"></i></div><div class="call-name">${isCall ? f.callerLabel : 'Unknown sender'}</div><div class="call-number">${isCall ? f.callerNumber : 'SMS message'}</div><div class="call-status">${isCall ? 'Incoming call &middot; 02:14' : 'Received just now'}</div><div class="call-transcript">${transcript}</div>${isCall ? '<div class="call-actions"><span class="call-decline"><i class="bi bi-telephone-x-fill"></i></span><span class="call-accept"><i class="bi bi-telephone-fill"></i></span></div>' : ''}</div><div class="upi-card"><div class="upi-card-head"><i class="bi bi-arrow-down-circle-fill"></i><div><strong>${f.collectLabel}</strong><span class="small text-muted">${f.collectFrom}</span></div></div><div class="upi-amount clue" data-clue="${c.collect}">${amountDisplay}</div><p class="small clue" data-clue="${c.urgency}">${f.urgencyNote}</p><div class="upi-pin-row">${'\u25cf\u25cf\u25cf\u25cf'.split('').map(() => '<span></span>').join('')}</div><div class="upi-actions"><button type="button">Decline</button><button type="button" class="upi-approve">Enter UPI PIN</button></div></div></div>`;
    }

    if (scenarioId === 'oauth-consent') return `${safety}<div class="login-window"><div class="browser-tabs"><div class="browser-dots"><span></span><span></span><span></span></div><div class="browser-tab"><i class="bi bi-shield-check"></i> Sign in to continue <i class="bi bi-x"></i></div></div><div class="browser-controls"><i class="bi bi-arrow-left"></i><i class="bi bi-arrow-clockwise"></i><div class="address-pill"><i class="bi bi-lock-fill me-2"></i>https://login.microsoftonline.com/oauth2/consent</div><i class="bi bi-star"></i></div><div class="consent-stage"><div class="consent-card"><div class="consent-app"><span class="consent-app-icon"><i class="bi ${f.appIcon}"></i></span><div><strong>${f.appName}</strong><div class="small"><span class="clue" data-clue="${c.publisher}">${f.publisherNote}</span></div></div></div><p class="small text-muted">This app would like to:</p><ul class="consent-scopes"><li><i class="bi bi-check2"></i> <span class="clue" data-clue="${c.scopeMail}">${f.scopeMail}</span></li><li><i class="bi bi-check2"></i> <span class="clue" data-clue="${c.scopeContacts}">${f.scopeContacts}</span></li><li><i class="bi bi-check2"></i> ${f.scopeOther1}</li><li><i class="bi bi-check2"></i> ${f.scopeOther2}</li></ul><p class="small text-muted clue" data-clue="${c.source}">${f.sourceNote}</p><div class="consent-actions"><button type="button">Cancel</button><button type="button" class="consent-accept">Accept</button></div></div></div></div>`;

    if (scenarioId === 'job-offer') return `${safety}<div class="job-chat"><div class="job-chat-header"><i class="bi ${f.platformIcon}"></i><div><strong>${f.contactName}</strong><span>${f.contactSubtitle}</span></div><span class="job-chat-platform">${f.platform}</span></div><div class="job-chat-body"><div class="job-chat-bubble clue" data-clue="${c.platform}"><i class="bi bi-exclamation-circle"></i> Unsolicited message - you did not apply for this</div><div class="job-chat-bubble"><strong class="clue" data-clue="${c.salary}">${f.salaryClaim}</strong></div><div class="job-chat-bubble">${f.taskAsk}</div><div class="job-chat-bubble job-chat-highlight clue" data-clue="${c.ask}">${f.feeAsk}</div><div class="job-chat-bubble job-chat-pressure clue" data-clue="${c.pressure}">${f.pressureLine}</div></div></div>`;

    if (scenarioId === 'malicious-extension') return `${safety}<div class="login-window"><div class="browser-tabs"><div class="browser-dots"><span></span><span></span><span></span></div><div class="browser-tab"><i class="bi bi-puzzle"></i> Add extension <i class="bi bi-x"></i></div></div><div class="browser-controls"><i class="bi bi-arrow-left"></i><i class="bi bi-arrow-clockwise"></i><div class="address-pill"><i class="bi bi-exclamation-triangle-fill me-2"></i>chromewebstore.google.com/detail/...</div><i class="bi bi-star"></i></div><div class="consent-stage"><div class="consent-card"><div class="consent-app"><span class="consent-app-icon"><i class="bi ${f.extensionIcon}"></i></span><div><strong>${f.extensionName}</strong><div class="small"><span class="clue" data-clue="${c.publisher}">${f.publisherNote}</span></div></div></div><p class="small text-muted">Add "${f.extensionName}"? It can:</p><ul class="consent-scopes"><li><i class="bi bi-check2"></i> <span class="clue" data-clue="${c.permission1}">${f.permission1}</span></li><li><i class="bi bi-check2"></i> <span class="clue" data-clue="${c.permission2}">${f.permission2}</span></li><li><i class="bi bi-check2"></i> ${f.permission3}</li><li><i class="bi bi-check2"></i> ${f.permission4}</li></ul><p class="small text-muted clue" data-clue="${c.source}">${f.sourceNote}</p><div class="consent-actions"><button type="button">Cancel</button><button type="button" class="consent-accept">Add extension</button></div></div></div></div>`;

    if (scenarioId === 'vishing') return `${safety}<div class="upi-phone phone-frame"><div class="phone-status"><strong>9:41</strong><span><i class="bi bi-reception-4"></i> <i class="bi bi-wifi"></i> <i class="bi bi-battery-full"></i></span></div><div class="call-screen"><div class="call-avatar"><i class="bi bi-mic-fill"></i></div><div class="call-name clue" data-clue="${c.identity}">${f.callerLabel}</div><div class="call-number">${f.callerNumber}</div><div class="call-status">Incoming call &middot; 01:38</div><div class="call-transcript"><p>${f.line1}</p><p class="clue" data-clue="${c.ask}">${f.line2}</p></div><div class="call-actions"><span class="call-decline"><i class="bi bi-telephone-x-fill"></i></span><span class="call-accept"><i class="bi bi-telephone-fill"></i></span></div></div><div class="upi-card"><p class="small clue" data-clue="${c.pressure}">${f.pressureLine}</p><p class="small text-muted">${f.askLine}</p><p class="small text-muted clue" data-clue="${c.unsolicited}">This call was not something you initiated</p></div></div>`;

    return `${safety}<div class="empty-state text-muted"><i class="bi bi-shield-exclamation fs-2"></i><p class="mt-2 mb-0">No artifact is configured for this scenario.</p></div>`;
  }

})();
