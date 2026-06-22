(function () {
  'use strict';
  const KEY = 'phishAwareStateV2';
  const LEGACY_KEY = 'phishAwareStateV1';
  const VERSION = 2;
  const MAX_HISTORY = 100;

  const fresh = () => ({
    version: VERSION,
    profile: { startedAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() },
    attempts: {}, history: [], training: {}, sessions: {}, certificate: null
  });
  const id = () => window.crypto?.randomUUID?.() || `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const trainingDone = value => value === true || value?.completed === true;

  function normalize(raw) {
    const base = fresh();
    if (!raw || typeof raw !== 'object') return base;
    const history = Array.isArray(raw.history) ? raw.history : Array.isArray(raw.activity) ? raw.activity
      .filter(item => item?.type === 'simulation')
      .map(item => ({ attemptId: id(), scenarioId: item.id, scenarioTitle: item.id, category: item.id, action: 'legacy-attempt', correct: Number(item.score) >= 60, points: Number(item.score) || 0, completedAt: item.date })) : [];
    return {
      version: VERSION,
      profile: { ...base.profile, ...(raw.profile || {}), startedAt: raw.startedAt || raw.profile?.startedAt || base.profile.startedAt },
      attempts: raw.attempts && typeof raw.attempts === 'object' ? raw.attempts : {},
      history: history.slice(0, MAX_HISTORY),
      training: raw.training && typeof raw.training === 'object' ? raw.training : {},
      sessions: raw.sessions && typeof raw.sessions === 'object' ? raw.sessions : {},
      certificate: raw.certificate && typeof raw.certificate === 'object' ? raw.certificate : null
    };
  }

  function saveState(state) {
    const value = normalize(state);
    value.profile.lastActiveAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(value)); }
    catch (error) { console.warn('Progress could not be saved.', error); }
    window.dispatchEvent(new CustomEvent('pa:state', { detail: value }));
    return value;
  }

  function getState() {
    try {
      const current = localStorage.getItem(KEY);
      if (current) return normalize(JSON.parse(current));
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) return saveState(normalize(JSON.parse(legacy)));
    } catch (error) { console.warn('Saved progress could not be read.', error); }
    return fresh();
  }

  function recordResult(input) {
    if (!input?.scenarioId) throw new TypeError('scenarioId is required');
    const state = getState();
    const points = Math.max(0, Math.min(100, Math.round(Number(input.points ?? input.score) || 0)));
    const record = { attemptId: id(), scenarioId: String(input.scenarioId), scenarioTitle: String(input.scenarioTitle || input.scenarioId), questionId: String(input.questionId || 'general'), questionText: String(input.questionText || ''), category: String(input.category || input.scenarioId), action: String(input.action || 'decision'), correct: Boolean(input.correct), points, responseSeconds: Math.max(0, Number(input.responseSeconds) || 0), cluesFound: Math.max(0, Number(input.cluesFound) || 0), completedAt: new Date().toISOString() };
    state.history.unshift(record);
    state.history = state.history.slice(0, MAX_HISTORY);
    const previous = state.attempts[record.scenarioId];
    state.attempts[record.scenarioId] = { score: points, bestScore: Math.max(points, Number(previous?.bestScore ?? previous?.score) || 0), correct: record.correct, action: record.action, cluesFound: record.cluesFound, completedAt: record.completedAt, attemptCount: (Number(previous?.attemptCount) || 0) + 1 };
    saveState(state);
    return record;
  }

  function setTrainingComplete(trainingId, complete = true) {
    if (!trainingId) throw new TypeError('training id is required');
    const state = getState();
    if (complete) state.training[trainingId] = { completed: true, completedAt: new Date().toISOString() };
    else delete state.training[trainingId];
    saveState(state);
  }

  function setScenarioScore(scenarioId, score) {
    if (!scenarioId) throw new TypeError('scenarioId is required');
    const state = getState();
    const previous = state.attempts[scenarioId] || {};
    const value = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    state.attempts[scenarioId] = { ...previous, score: value, bestScore: Math.max(value, Number(previous.bestScore) || 0), completedAt: new Date().toISOString() };
    saveState(state);
    return state.attempts[scenarioId];
  }

  function getSession(scenarioId) {
    const session = getState().sessions[scenarioId];
    return session ? JSON.parse(JSON.stringify(session)) : null;
  }

  function saveSession(scenarioId, session) {
    if (!scenarioId || !session) throw new TypeError('scenarioId and session are required');
    const state = getState();
    state.sessions[scenarioId] = { ...session, updatedAt: new Date().toISOString() };
    saveState(state);
    return state.sessions[scenarioId];
  }

  function clearSession(scenarioId) {
    const state = getState();
    delete state.sessions[scenarioId];
    saveState(state);
  }

  function issueCertificate(recipientName, score) {
    const name = String(recipientName || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (name.length < 2) throw new TypeError('A valid recipient name is required');
    const state = getState();
    const issuedAt = new Date().toISOString();
    const suffix = id().replace(/[^a-zA-Z0-9]/g, '').slice(-12).toUpperCase().padStart(12, '0');
    state.certificate = {
      certificateId: `PA-${issuedAt.slice(0, 4)}-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}-${suffix.slice(8, 12)}`,
      recipientName: name,
      score: Math.max(0, Math.min(100, Math.round(Number(score) || 0))),
      courseCode: `PAA-${issuedAt.slice(0, 4)}-V1`,
      issuedAt,
      issuer: 'PhishAware Training Platform'
    };
    saveState(state);
    return state.certificate;
  }

  function getSummary({ scenarioTotal = 6, trainingTotal = 6 } = {}) {
    const state = getState();
    const totalAttempts = state.history.length;
    const correctDecisions = state.history.filter(item => item.correct).length;
    const incorrectDecisions = totalAttempts - correctDecisions;
    const completedScenarios = Object.keys(state.attempts).length;
    const trainingCompleted = Object.values(state.training).filter(trainingDone).length;
    const scores = Object.values(state.attempts).map(item => Number(item.bestScore ?? item.score) || 0);
    const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
    const progress = Math.min(100, Math.round(((completedScenarios + trainingCompleted) / Math.max(1, scenarioTotal + trainingTotal)) * 100));
    const decisionRate = totalAttempts ? correctDecisions / totalAttempts : 0;
    const resilience = averageScore * .6 + decisionRate * 100 * .25 + trainingCompleted / Math.max(1, trainingTotal) * 100 * .15;
    const riskScore = Math.max(0, Math.min(100, Math.round(100 - resilience)));
    return { state, totalAttempts, correctDecisions, incorrectDecisions, completedScenarios, trainingCompleted, averageScore, progress, riskScore, riskRating: riskScore < 25 ? 'Low' : riskScore < 55 ? 'Medium' : 'High', points: state.history.reduce((sum, item) => sum + item.points, 0) };
  }

  function reset() { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); window.dispatchEvent(new CustomEvent('pa:state')); }
  const exportData = () => JSON.parse(JSON.stringify(getState()));
  window.PGStorage = Object.freeze({ key: KEY, schemaVersion: VERSION, getState, saveState, recordResult, setScenarioScore, getSession, saveSession, clearSession, issueCertificate, setTrainingComplete, isTrainingComplete: trainingDone, getSummary, reset, exportData });
})();
