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
function confirmNewAnalysis()  { openModal('confirm-analysis-sheet'); }
function startFreshAnalysis()  {
  closeModal('confirm-analysis-sheet');
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

// ── Window exports ────────────────────────────────────────
window.openModal              = openModal;
window.closeModal             = closeModal;
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
window.doSignOut              = doSignOut;
window.v21ShowToast           = v21ShowToast;


/* Note: Premium depth gate overrides (openSalaryNegotiation, openWhatIf, openScenarios)
   are applied by app.js which loads AFTER this file. This ensures the base modal functions
   exist here first, then app.js wraps them with markDepthAttempt() tracking. */
