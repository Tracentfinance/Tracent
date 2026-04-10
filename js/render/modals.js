/* ═══ Tracent Render: Modals ═══
   Modal open/close orchestration, score breakdown, paywall,
   salary negotiation, scenarios, feedback, legal, sign-in/out, toast.
   
   Depends on: core/navigation.js (showScreen, switchTab)
   Loaded before: engine/compat-bridge.js
═══════════════════════════════════════════════ */

// ── Modal system ─────────────────────────────────────────
function openModal(id) {
  var m = document.getElementById(id);
  if (!m) { console.warn('[MODAL] openModal: no element #' + id); return; }
  m.style.display = 'flex';
  requestAnimationFrame(function() { m.classList.add('open'); });
  try {
    window.TRACENT_TELEMETRY.modalState[id] = { openedAt: Date.now(), completed: false };
    tracentTrack('modal_opened', { modalId: id });
  } catch(e) {}
}
function closeModal(id) {
  var m = document.getElementById(id);
  if (!m) return;
  m.classList.remove('open');
  setTimeout(function() { m.style.display = 'none'; }, 380);
  try {
    var ms = window.TRACENT_TELEMETRY.modalState[id];
    var dwell = ms ? Date.now() - ms.openedAt : 0;
    var wasCompleted = ms && ms.completed;
    if (wasCompleted) {
      tracentTrack('modal_completed', { modalId: id, dwellMs: dwell });
    } else {
      tracentTrack('modal_abandoned', { modalId: id, dwellMs: dwell });
      pbfdeState.modalAbandons = (pbfdeState.modalAbandons || 0) + 1;
    }
    delete window.TRACENT_TELEMETRY.modalState[id];
  } catch(e) {}
}


// ── Sign-in / sign-out ────────────────────────────────────
// openLoginPlaceholder: splash "Log in" CTA — auth hook point.
// Replace body with real Supabase / auth provider flow when backend is ready.
function openLoginPlaceholder() { openModal('signin-overlay'); }
function openSignInSheet()  { openModal('signin-overlay'); }
function closeSignInSheet() { closeModal('signin-overlay'); }
function openSignup()       { openSignInSheet(); }
function closeSignup()      { closeSignInSheet(); }
function hideSignOutSheet() { var el = document.getElementById('signout-sheet-overlay'); if (el) el.style.display = 'none'; }
function showSignOutSheet() { var el = document.getElementById('signout-sheet-overlay'); if (el) el.style.display = 'flex'; }
function doSignOut()        { try { localStorage.removeItem(typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'tracent_v3'); } catch(e) {} location.reload(); }

// ── Modals ────────────────────────────────────────────────
function openScoreBreakdown()  { openModal('score-breakdown-overlay'); }
function closeScoreBreakdown() { closeModal('score-breakdown-overlay'); }
function openScenarios()       {
  var modal = document.getElementById('scenario-modal');
  if (!modal) return;
  if (typeof G !== 'undefined' && G.housingType !== 'owner' && G.housingType !== 'cashout') { return; }
  openModal('scenario-modal');
}
function closeScenarios()      { closeModal('scenario-modal'); }
function openWhatIf()          { openModal('whatif-modal'); }
function closePaywall()        {
  var o = document.getElementById('paywall-overlay');
  if (o) { o.classList.remove('open'); setTimeout(function() { o.style.display = 'none'; }, 380); }
}
// ── Settings edit sheet ───────────────────────────────────
// Completely separate from onboarding. Reads G, opens a modal,
// writes back to G and hidden engine inputs on save, then reruns.
function openSettingsEdit(section) {
  var g = (typeof G !== 'undefined' && G.income) ? G : (window.G || {});
  function _prefill(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== '') el.value = val;
  }
  function _fmtInput(n) { return n ? Math.round(n).toLocaleString('en-US') : ''; }
  _prefill('se-income',       _fmtInput(g.income));
  _prefill('se-takehome',     _fmtInput(g.takeHome));
  _prefill('se-savings',      _fmtInput(g.savingsAmt || g.depositSaved));
  _prefill('se-home-value',   _fmtInput(g.homeValue));
  _prefill('se-cc-debt',      _fmtInput(g.ccDebt));
  _prefill('se-car-debt',     _fmtInput(g.carDebt));
  _prefill('se-student-debt', _fmtInput(g.studentDebt));
  _prefill('se-other-debt',   _fmtInput(g.otherDebt));
  // Career fields
  _prefill('se-job-title', g.jobTitle || '');
  var _seStateEl = document.getElementById('se-state');
  if (_seStateEl && g.state) _seStateEl.value = g.state;
  // Rates — only prefill if explicitly stored (not default)
  if (g.ccRate      && g.ccRate      !== 21)  _prefill('se-cc-rate',      g.ccRate);
  if (g.carRate     && g.carRate     !== 7.5) _prefill('se-car-rate',     g.carRate);
  if (g.studentRate && g.studentRate !== 5.5) _prefill('se-student-rate', g.studentRate);
  if (g.otherRate   && g.otherRate   !== 9.0) _prefill('se-other-rate',   g.otherRate);
  // Credit score
  var creditEl = document.getElementById('se-credit');
  if (creditEl && g.credit) creditEl.value = g.credit;
  var efEl = document.getElementById('se-emergency');
  if (efEl && g.emergency) efEl.value = g.emergency;
  openModal('settings-edit-sheet');
  // Scroll to section anchor if requested (e.g. 'assets' → savings field, 'debt' → debt section)
  if (section) {
    var _sectionMap = { career: 'se-career-section', assets: 'se-assets-section', networth: 'se-assets-section', debt: 'se-cc-debt', apr: 'se-apr-section', emergency: 'se-emergency' };
    var _anchorId = _sectionMap[section] || 'se-income';
    setTimeout(function() {
      var _anchor = document.getElementById(_anchorId);
      var _sheet  = document.querySelector('#settings-edit-sheet .modal-sheet');
      if (_anchor && _sheet) {
        _sheet.scrollTop = Math.max(0, _anchor.offsetTop - 24);
      }
    }, 80); // after modal open transition
  }
  // Apply experience layer BSE adaptation to modal state
  if (typeof TracentExperienceLayer !== 'undefined' && typeof TracentExperienceLayer.applySettingsModal === 'function') {
    try { TracentExperienceLayer.applySettingsModal(); } catch(e) {}
  }
}

function saveSettingsEdit() {
  function _num(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(String(el.value || '').replace(/[^0-9.]/g, '')) || 0;
  }
  function _str(id) {
    var el = document.getElementById(id); return el ? (el.value || '') : '';
  }
  function _setInput(id, val) {
    var el = document.getElementById(id);
    if (el !== null) el.value = val;
  }

  var income      = _num('se-income');
  var takeHome    = _num('se-takehome');
  var savings     = _num('se-savings');
  var homeValue   = _num('se-home-value');
  var ccDebt      = _num('se-cc-debt');
  var carDebt     = _num('se-car-debt');
  var studentDebt = _num('se-student-debt');
  var otherDebt   = _num('se-other-debt');
  var emergency   = _str('se-emergency');
  var jobTitle    = _str('se-job-title');
  var stateInput  = _str('se-state');
  // Rates — 0 means "not entered", keep existing default
  var ccRateInput      = _num('se-cc-rate');
  var carRateInput     = _num('se-car-rate');
  var studentRateInput = _num('se-student-rate');
  var otherRateInput   = _num('se-other-rate');
  var creditInput      = _str('se-credit');

  // Derive minimum payments from balances (same logic as bridge)
  var carPmt     = carDebt     > 0 ? Math.round(carDebt / 60)                          : 0;
  var stuPmt     = studentDebt > 0 ? Math.max(Math.round(studentDebt / 120), 100)      : 0;
  var othPmt     = otherDebt   > 0 ? Math.max(Math.round(otherDebt / 60), 50)          : 0;

  // Write to G
  var _g = (typeof G !== 'undefined') ? G : (window.G || {});
  if (income      > 0)  { _g.income      = income;      window.G && (window.G.income      = income); }
  if (takeHome    > 0)  { _g.takeHome    = takeHome;    window.G && (window.G.takeHome    = takeHome); }
  _g.savingsAmt  = savings;   window.G && (window.G.savingsAmt  = savings);
  if (homeValue   > 0)  { _g.homeValue   = homeValue;   window.G && (window.G.homeValue   = homeValue); }
  _g.ccDebt      = ccDebt;      window.G && (window.G.ccDebt      = ccDebt);
  _g.carDebt     = carDebt;     window.G && (window.G.carDebt     = carDebt);
  _g.carPayment  = carPmt;      window.G && (window.G.carPayment  = carPmt);
  _g.studentDebt = studentDebt; window.G && (window.G.studentDebt = studentDebt);
  _g.otherDebt   = otherDebt;   window.G && (window.G.otherDebt   = otherDebt);
  if (emergency)              { _g.emergency = emergency; window.G && (window.G.emergency = emergency); }
  // Write rates to G — only if user entered a value
  var anyRateProvided = false;
  if (ccRateInput      > 0) { _g.ccRate      = ccRateInput;      window.G && (window.G.ccRate      = ccRateInput);      anyRateProvided = true; }
  if (carRateInput     > 0) { _g.carRate     = carRateInput;     window.G && (window.G.carRate     = carRateInput);     anyRateProvided = true; }
  if (studentRateInput > 0) { _g.studentRate = studentRateInput; window.G && (window.G.studentRate = studentRateInput); anyRateProvided = true; }
  if (otherRateInput   > 0) { _g.otherRate   = otherRateInput;   window.G && (window.G.otherRate   = otherRateInput);   anyRateProvided = true; }
  if (anyRateProvided) { _g.ratesAreDefault = false; window.G && (window.G.ratesAreDefault = false); }
  // Credit score
  if (creditInput) {
    _g.credit = creditInput; window.G && (window.G.credit = creditInput);
    if (typeof selectedCredit !== 'undefined') { try { selectedCredit = creditInput; } catch(e) {} }
  }

  // Write to hidden engine inputs so legacy-calculations.js reads correct values
  if (income   > 0) _setInput('income',          income);
  if (takeHome > 0) _setInput('takehome',         takeHome);
  _setInput('cc-debt',         ccDebt);
  _setInput('cc-rate',         _g.ccRate || 21);
  _setInput('car-debt',        carDebt);
  _setInput('car-payment',     carPmt);
  _setInput('student-debt',    studentDebt);
  _setInput('student-payment', stuPmt);
  _setInput('other-debt',      otherDebt);
  _setInput('other-payment',   othPmt);
  var efEl = document.getElementById('emergency');
  if (efEl && emergency) efEl.value = emergency;
  // Assets — write to housing-path DOM inputs so recompute reads the saved values.
  // Bug fix: renter path reads #renter-savings, buying path reads #deposit-saved,
  // owner path reads #home-value. Without these writes they revert to 0 on recompute.
  _setInput('renter-savings', savings);
  _setInput('deposit-saved',  savings);
  if (homeValue > 0) _setInput('home-value', homeValue);
  // Career — write job title and state to engine DOM inputs
  if (jobTitle) {
    _g.jobTitle = jobTitle; window.G && (window.G.jobTitle = jobTitle);
    _setInput('job-title', jobTitle);
  }
  if (stateInput) {
    _g.state = stateInput; window.G && (window.G.state = stateInput);
    var _stEl = document.getElementById('state');
    if (_stEl) _stEl.value = stateInput;
    _setInput('work-state', stateInput);
  }

  // Close sheet and rerun engine — stays on dashboard, switches to home tab
  closeModal('settings-edit-sheet');
  if (typeof window.recomputeAll === 'function') {
    try { window.recomputeAll(); } catch(e) { console.error('[SE] recompute error:', e); }
  } else if (typeof window.computeAndShow === 'function') {
    try { window.computeAndShow(); } catch(e) { console.error('[SE] recompute error:', e); }
  } else if (typeof _0xf1a6af7 === 'function') {
    try { _0xf1a6af7(); } catch(e) { console.error('[SE] recompute error:', e); }
  }
  if (typeof window.renderAll === 'function') {
    try { window.renderAll(); } catch(e) {}
  }
  // Persist inputs to Supabase
  if (typeof TracentSupabase !== 'undefined' && TracentSupabase.isConfigured()) {
    try { TracentSupabase.saveProfile(); } catch(e) {}
  }
}

// ── Grow: financial structure editor ─────────────────────
// Inline form in Grow tab — writes to the same G fields as saveSettingsEdit(),
// no second data model. Assets, liabilities, and employer match all flow
// through computeAndShow() the same way as settings saves.

function toggleGrowStructure() {
  var body    = document.getElementById('grow-fs-body');
  var chevron = document.getElementById('grow-fs-chevron');
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  if (!isOpen) {
    // Pre-fill from current G values before expanding
    var g = (typeof G !== 'undefined' && G.income) ? G : (window.G || {});
    function _pf(id, val) {
      var el = document.getElementById(id);
      if (el && val !== undefined && val !== null && val !== '') el.value = val;
    }
    _pf('ge-savings',      g.savingsAmt   ? Math.round(g.savingsAmt).toLocaleString('en-US')   : '');
    _pf('ge-home-value',   g.homeValue    ? Math.round(g.homeValue).toLocaleString('en-US')    : '');
    _pf('ge-mortgage',     g.balance      ? Math.round(g.balance).toLocaleString('en-US')      : '');
    _pf('ge-cc-debt',      g.ccDebt       ? Math.round(g.ccDebt).toLocaleString('en-US')       : '');
    _pf('ge-car-debt',     g.carDebt      ? Math.round(g.carDebt).toLocaleString('en-US')      : '');
    _pf('ge-student-debt', g.studentDebt  ? Math.round(g.studentDebt).toLocaleString('en-US')  : '');
    _pf('ge-other-debt',   g.otherDebt    ? Math.round(g.otherDebt).toLocaleString('en-US')    : '');
    var rmEl = document.getElementById('ge-ret-match');
    if (rmEl && g.retMatch) rmEl.value = g.retMatch;
    body.style.display = 'block';
    if (chevron) chevron.innerHTML = '&#9660;';
  } else {
    body.style.display = 'none';
    if (chevron) chevron.innerHTML = '&#9658;';
  }
}

function saveGrowStructure() {
  function _num(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(String(el.value || '').replace(/[^0-9.]/g, '')) || 0;
  }
  function _str(id) { var el = document.getElementById(id); return el ? (el.value || '') : ''; }
  function _setInput(id, val) { var el = document.getElementById(id); if (el !== null) el.value = val; }

  var savings     = _num('ge-savings');
  var homeValue   = _num('ge-home-value');
  var mortgage    = _num('ge-mortgage');
  var ccDebt      = _num('ge-cc-debt');
  var carDebt     = _num('ge-car-debt');
  var studentDebt = _num('ge-student-debt');
  var otherDebt   = _num('ge-other-debt');
  var retMatch    = _str('ge-ret-match');

  var _g = (typeof G !== 'undefined') ? G : (window.G || {});

  // Assets
  _g.savingsAmt  = savings;   window.G && (window.G.savingsAmt  = savings);
  if (homeValue > 0) { _g.homeValue = homeValue; window.G && (window.G.homeValue = homeValue); }
  if (mortgage  >= 0) { _g.balance  = mortgage;  window.G && (window.G.balance  = mortgage); }

  // Liabilities — same write path as saveSettingsEdit()
  _g.ccDebt      = ccDebt;      window.G && (window.G.ccDebt      = ccDebt);
  _g.carDebt     = carDebt;     window.G && (window.G.carDebt     = carDebt);
  _g.studentDebt = studentDebt; window.G && (window.G.studentDebt = studentDebt);
  _g.otherDebt   = otherDebt;   window.G && (window.G.otherDebt   = otherDebt);
  var carPmt = carDebt     > 0 ? Math.round(carDebt / 60)                     : 0;
  var stuPmt = studentDebt > 0 ? Math.max(Math.round(studentDebt / 120), 100) : 0;
  var othPmt = otherDebt   > 0 ? Math.max(Math.round(otherDebt / 60), 50)     : 0;
  _g.carPayment = carPmt; window.G && (window.G.carPayment = carPmt);

  // Investments / capacity
  if (retMatch) { _g.retMatch = retMatch; window.G && (window.G.retMatch = retMatch); }

  // Sync hidden engine inputs (legacy-calculations.js reads these)
  _setInput('cc-debt',         ccDebt);
  _setInput('cc-rate',         _g.ccRate || 21);
  _setInput('car-debt',        carDebt);
  _setInput('car-payment',     carPmt);
  _setInput('student-debt',    studentDebt);
  _setInput('student-payment', stuPmt);
  _setInput('other-debt',      otherDebt);
  _setInput('other-payment',   othPmt);

  // Collapse form
  var body    = document.getElementById('grow-fs-body');
  var chevron = document.getElementById('grow-fs-chevron');
  if (body)    body.style.display = 'none';
  if (chevron) chevron.innerHTML = '&#9658;';

  // Recompute — identical call chain to saveSettingsEdit()
  if (typeof window.computeAndShow === 'function') {
    try { window.computeAndShow(); } catch(e) { console.error('[GS] recompute:', e); }
  } else if (typeof _0xf1a6af7 === 'function') {
    try { _0xf1a6af7(); } catch(e) { console.error('[GS] recompute:', e); }
  }
  if (typeof v21ShowToast === 'function') v21ShowToast('Financial structure updated \u2713');
}

function confirmNewAnalysis()  { openModal('confirm-analysis-sheet'); }
function startFreshAnalysis()  {
  // Mark modal completed BEFORE closing so telemetry shows modal_completed, not modal_abandoned
  try {
    var _ms = window.TRACENT_TELEMETRY && window.TRACENT_TELEMETRY.modalState['confirm-analysis-sheet'];
    if (_ms) _ms.completed = true;
  } catch(e) {}
  closeModal('confirm-analysis-sheet');
  var _g = (typeof G !== 'undefined') ? G : (window.G || {});
  // Retirement-mode users always go to refine — never back to onboarding age/intent phases.
  var hasSession = !!(_g.income) || !!(_g.isRetirementMode);
  if (hasSession) {
    window._v21_settingsMode = true;
    showScreen('screen-onboarding');
    if (typeof v21BuildRefinePhase === 'function') {
      v21BuildRefinePhase();
      if (typeof _v21_prefillRefineForm === 'function') _v21_prefillRefineForm();
    } else {
      console.warn('[SFA] v21BuildRefinePhase NOT FOUND — check script load order');
    }
    return;
  }
  window._v21_settingsMode = false;
  if (typeof G !== 'undefined') { G = { _scoreHistory: G._scoreHistory || [] }; }
  showScreen('screen-onboarding');
  startOnboarding();
}

// ── Salary negotiation ────────────────────────────────────
function openSalaryNegotiation() {
  if (typeof G !== 'undefined' && G.income) {
    var hasEdge = window._tracentPlus;
    var paywallEl = document.getElementById('sn-paywall');
    var formEl    = document.getElementById('sn-form');
    if (paywallEl) paywallEl.style.display = hasEdge ? 'none'  : 'block';
    if (formEl)    formEl.style.display    = hasEdge ? 'block' : 'none';
  }
  openModal('salary-negotiate-overlay');
}
function closeSalaryNegotiation() { closeModal('salary-negotiate-overlay'); }

// ── Feedback ─────────────────────────────────────────────
var _fbType = 'idea';
function openFeedback() {
  _fbType = 'idea';
  var ideaEl = document.getElementById('fbt-idea');
  var bugEl  = document.getElementById('fbt-bug');
  var loveEl = document.getElementById('fbt-love');
  if (ideaEl) ideaEl.className = 'tag sky active';
  if (bugEl)  bugEl.className  = 'tag navy';
  if (loveEl) loveEl.className = 'tag navy';
  var textEl = document.getElementById('feedback-text');
  if (textEl) textEl.value = '';
  openModal('feedback-modal');
}
function closeFeedback() { closeModal('feedback-modal'); }
function selectFeedbackType(type, el) {
  _fbType = type;
  document.querySelectorAll('#feedback-modal .tag').forEach(function(t) { t.className = 'tag navy'; });
  if (el) el.className = 'tag sky';
  var placeholders = { idea:'e.g. It would be really useful if Tracent could…', bug:'e.g. The rate simulator didn’t update when I changed…', love:'e.g. The thing that surprised me most was…' };
  var textEl = document.getElementById('feedback-text');
  if (textEl) textEl.placeholder = placeholders[type] || 'Tell us what you think…';
}
function submitFeedback() {
  var textEl = document.getElementById('feedback-text');
  var text = (textEl && textEl.value) ? textEl.value.trim() : '';
  if (!text) { if (textEl) { textEl.style.borderColor='var(--red)'; textEl.focus(); setTimeout(function(){textEl.style.borderColor='';},2000); } return; }
  var entry = { id:Date.now(), ts:new Date().toISOString(), type:_fbType, message:text,
    score:(typeof G!=='undefined'&&G.score)?G.score:null,
    housingType:(typeof G!=='undefined'&&G.housingType)?G.housingType:null };
  try { var prev=JSON.parse(localStorage.getItem('tracent_feedback')||'[]'); prev.push(entry); localStorage.setItem('tracent_feedback',JSON.stringify(prev)); } catch(e) {}
  console.log('[Tracent feedback]', entry);
  closeFeedback();
  if (typeof v21ShowToast === 'function') v21ShowToast('Feedback sent – thank you ❤');
}

// ── Legal modal ───────────────────────────────────────────
var _legalContent = {
  terms: {
    title: "Terms of Use",
    html: [
      "<h3 style='font-family:var(--font-display);font-size:17px;color:var(--navy);margin-bottom:12px;'>Tracent Terms of Use</h3>",
      "<p style='margin-bottom:10px;'><strong>Last updated: March 2026</strong></p>",
      "<p style='margin-bottom:14px;'>Tracent is an educational financial planning tool. By using this application, you agree to the following terms.</p>",
      "<p style='margin-bottom:10px;'><strong>Educational Purpose Only.</strong> All scores, projections, recommendations, and analysis provided by Tracent are for informational and educational purposes only. Nothing in this application constitutes financial, investment, tax, or legal advice. Always consult a qualified professional before making financial decisions.</p>",
      "<p style='margin-bottom:10px;'><strong>No Guarantees.</strong> Tracent does not guarantee the accuracy of any information. Financial calculations are estimates only. Actual results may vary.</p>",
      "<p style='margin-bottom:10px;'><strong>Your Data.</strong> Your financial data is processed locally on your device. AI features route anonymised data through a secure server-side proxy. No direct browser-to-provider AI calls are made.</p>",
      "<p style='margin-bottom:10px;'><strong>AI-Generated Content.</strong> AI recommendations are starting points for your own research. Not professional financial advice.</p>",
      "<p style='margin-bottom:10px;'><strong>No Warranty.</strong> This application is provided as-is. Tracent LLC disclaims all liability.</p>",
      "<p style='margin-bottom:10px;'><strong>Contact.</strong> Questions? Email support@tracent.app</p>"
    ].join("")
  },
  privacy: {
    title: "Privacy Policy",
    html: [
      "<h3 style='font-family:var(--font-display);font-size:17px;color:var(--navy);margin-bottom:12px;'>Privacy Policy</h3>",
      "<p style='margin-bottom:10px;'><strong>Last updated: March 2026</strong></p>",
      "<p style='margin-bottom:14px;'>Your privacy matters.</p>",
      "<p style='margin-bottom:10px;'><strong>Local Storage.</strong> Your financial inputs are stored locally on your device. This data never leaves your device unless you use an AI-powered feature.</p>",
      "<p style='margin-bottom:10px;'><strong>AI Features.</strong> When you request AI-generated recommendations, a summary of your financial profile is routed through Tracent secure server-side proxy. Your browser makes no direct calls to external AI APIs.</p>",
      "<p style='margin-bottom:10px;'><strong>No Advertising.</strong> Tracent does not sell your data to advertisers. We do not display third-party ads.</p>",
      "<p style='margin-bottom:10px;'><strong>Analytics.</strong> We may collect anonymous, aggregated usage data to improve the product.</p>",
      "<p style='margin-bottom:10px;'><strong>Data Deletion.</strong> Delete all locally stored data at any time using Settings > Reset in the app.</p>",
      "<p style='margin-bottom:10px;'><strong>Contact.</strong> Privacy questions: privacy@tracent.app</p>"
    ].join("")
  }
};
function openLegalModal(tab) {
  tab = tab || 'terms';
  var overlay = document.getElementById('legal-modal-overlay');
  if (!overlay) return;
  switchLegalTab(tab);
  overlay.style.display = 'flex';
  requestAnimationFrame(function() { overlay.classList.add('open'); });
}
function closeLegalModal() {
  var overlay = document.getElementById('legal-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(function() { overlay.style.display = 'none'; }, 380);
}
function switchLegalTab(tab) {
  var body  = document.getElementById('legal-modal-body');
  var title = document.getElementById('legal-modal-title');
  var tabT  = document.getElementById('legal-tab-terms');
  var tabP  = document.getElementById('legal-tab-privacy');
  var content = _legalContent[tab] || _legalContent.terms;
  if (body)  body.innerHTML     = content.html;
  if (title) title.textContent  = content.title;
  if (tabT) { tabT.style.borderBottomColor = tab==='terms'   ? 'var(--teal)':'transparent'; tabT.style.color = tab==='terms'   ? 'var(--teal)':'var(--gray-4)'; }
  if (tabP) { tabP.style.borderBottomColor = tab==='privacy' ? 'var(--teal)':'transparent'; tabP.style.color = tab==='privacy' ? 'var(--teal)':'var(--gray-4)'; }
}

// ── Rate alert & settings helpers ────────────────────────
function saveAlertEmail() {
  var input = document.getElementById('settings-email-input');
  if (!input || !input.value.trim()) return;
  if (typeof G !== 'undefined') G.userEmail = input.value.trim();
  if (typeof _0x36940e3 === 'function') _0x36940e3();
  if (typeof v21ShowToast === 'function') v21ShowToast('Email saved ✓');
}
function resetAlertEmail() {
  var input = document.getElementById('settings-email-input');
  if (input) input.value = '';
  if (typeof G !== 'undefined') G.userEmail = '';
  if (typeof _0x36940e3 === 'function') _0x36940e3();
}


// ── Restored: Scenario helpers ────────────────────────────
function unlockPremium() {
  window._tracentPlus = true;
  closePaywall();
  var stripe = window._stripeMonthlyLink || 'YOUR_MONTHLY_LINK';
  if (stripe !== 'YOUR_MONTHLY_LINK') window.open(stripe, '_blank');
  if (typeof v21ShowToast === 'function') v21ShowToast('Edge unlocked ✓');
}
function openTierComparison() { openSignInSheet(); }

function openScoreMethodology() { if (typeof v21ShowToast==='function') v21ShowToast('Score methodology: Coming soon'); }

// ══════════════════════════════════════════════════════════

// ── Toast notification ─────────────────────────────────────
function v21ShowToast(msg, duration) {
  duration = duration || 3000;
  var existing = document.getElementById('v21-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'v21-toast';
  toast.textContent = msg;
  toast.style.cssText = [
    'position:fixed',
    'bottom:' + (typeof window !== 'undefined' ? 'calc(env(safe-area-inset-bottom,0px) + 90px)' : '90px'),
    'left:50%',
    'transform:translateX(-50%) translateY(12px)',
    'background:var(--navy)',
    'color:var(--white)',
    'padding:12px 20px',
    'border-radius:var(--r-pill)',
    'font-family:var(--font-body)',
    'font-size:13px',
    'font-weight:600',
    'box-shadow:var(--shadow-lg)',
    'z-index:9999',
    'opacity:0',
    'transition:opacity 0.25s,transform 0.25s var(--spring)',
    'max-width:320px',
    'text-align:center',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(toast);
  requestAnimationFrame(function() {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
  }, duration);
}

// ── Logout ────────────────────────────────────────────────
function tracentLogout() {
  // 1. Clear all scoped localStorage keys — do not use .clear() to preserve unrelated keys
  var _keys = [
    'tracent_v3', 'tracent_v2', 'tracent_v1',
    'tracent_bse_mem', 'tracent_pbfde',
    'tracent_dashboard_seen_count'
  ];
  _keys.forEach(function(k) { try { localStorage.removeItem(k); } catch(e) {} });

  // 2. Zero out window.G safely — wipe all properties, leave object intact
  try {
    var _wg = window.G;
    if (_wg && typeof _wg === 'object') {
      Object.keys(_wg).forEach(function(k) { try { delete _wg[k]; } catch(e) {} });
    }
    window.G = {};
  } catch(e) { window.G = {}; }

  // 3. Reset file-scoped G if accessible (legacy-calculations.js)
  try { if (typeof G !== 'undefined' && G !== window.G) { Object.keys(G).forEach(function(k) { try { delete G[k]; } catch(e) {} }); } } catch(e) {}

  // 4. Mark BSE as uninitialized so it recomputes cleanly next session
  try { if (window.BSE) { window.BSE.initialized = false; window.BSE.archetype = 'stable_confident'; } } catch(e) {}

  // 5. Reset pbfdeState
  try { if (window.pbfdeState && typeof window.pbfdeState === 'object') {
    Object.keys(window.pbfdeState).forEach(function(k) { try { delete window.pbfdeState[k]; } catch(e) {} });
  }} catch(e) {}

  // 6. Hide dashboard nav + return to splash
  try {
    var nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = 'none';
  } catch(e) {}
  try {
    if (typeof showScreen === 'function') showScreen('screen-splash');
    else if (typeof startOnboarding === 'function') startOnboarding();
    else location.reload();
  } catch(e) { location.reload(); }
}

// ── Window exports ────────────────────────────────────────
window.openModal              = openModal;
window.closeModal             = closeModal;
window.openLoginPlaceholder   = openLoginPlaceholder;
window.openSignInSheet        = openSignInSheet;
window.closeSignInSheet       = closeSignInSheet;
window.openSignup             = openSignup;
window.closeSignup            = closeSignup;
window.openFeedback           = openFeedback;
window.closeFeedback          = closeFeedback;
window.selectFeedbackType     = selectFeedbackType;
window.submitFeedback         = submitFeedback;
window.openLegalModal         = openLegalModal;
window.closeLegalModal        = closeLegalModal;
window.switchLegalTab         = switchLegalTab;
window.openScoreBreakdown     = openScoreBreakdown;
window.closeScoreBreakdown    = closeScoreBreakdown;
window.openScenarios          = openScenarios;
window.closeScenarios         = closeScenarios;
window.closePaywall           = closePaywall;
window.unlockPremium          = unlockPremium;
window.openWhatIf             = openWhatIf;
window.openSettingsEdit       = openSettingsEdit;
window.saveSettingsEdit       = saveSettingsEdit;
window.toggleGrowStructure    = toggleGrowStructure;
window.saveGrowStructure      = saveGrowStructure;
window.confirmNewAnalysis     = confirmNewAnalysis;
window.startFreshAnalysis     = startFreshAnalysis;
window.openSalaryNegotiation  = openSalaryNegotiation;
window.closeSalaryNegotiation = closeSalaryNegotiation;
window.openTierComparison     = openTierComparison;
window.openScoreMethodology   = openScoreMethodology;
window.saveAlertEmail         = saveAlertEmail;
window.resetAlertEmail        = resetAlertEmail;
window.showSignOutSheet       = showSignOutSheet;
window.hideSignOutSheet       = hideSignOutSheet;
window.tracentLogout          = tracentLogout;
window.doSignOut              = doSignOut;
window.v21ShowToast           = v21ShowToast;


/* Note: Premium depth gate overrides (openSalaryNegotiation, openWhatIf, openScenarios)
   are applied by app.js which loads AFTER this file. This ensures the base modal functions
   exist here first, then app.js wraps them with markDepthAttempt() tracking. */
