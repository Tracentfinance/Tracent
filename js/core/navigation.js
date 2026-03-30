/* ═══ Tracent Core: Navigation ═══
   Screen switching, tab management, nav control, mode routing,
   onboarding flow stubs, analysis runner with calibration status.
   
   Contains both early-load stubs and canonical implementations.
   Canonical versions from UI Controller supersede early stubs.
═══════════════════════════════════════════════ */

var STORAGE_KEY = 'tracent_v3';
(function(){
var _h = window.location.hostname;
// Allowed: production, all Cloudflare pages/workers, localhost variants, file://, Claude artifacts, any subdomain of tracent.app
var _ok = [
  "gettracent.app","tracent.app","localhost","127.0.0.1","","file",
  "claude.ai","anthropic","cloudflare","pages.dev","workers.dev",
  "github.io","netlify.app","vercel.app","webcontainer"
].some(function(x){
  return x === "" || _h === "" || _h === x || _h.indexOf(x) > -1;
});
// Also allow any local file or empty hostname (direct file open)
if (!_ok && _h !== "") {
  document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;text-align:center;padding:40px;"><div><div style="font-size:48px;margin-bottom:16px;">&#128274;</div><div style="font-size:18px;font-weight:700;color:#001F33;">Tracent</div><div style="color:#6B7C93;margin-top:8px;font-size:14px;">This application is not authorised to run on this domain.</div></div></div>';
}
})();

// [CONSOLIDATED] Early stubs removed — canonical showScreen is defined below.
// _showScreenEarly no longer needed since canonical and stubs are in same file.

function updateGreeting(name) {
  const n = name.trim();
  var _un = document.getElementById('user-name'); if(_un) _un.textContent = n || 'there';
}

// [CONSOLIDATED] Onboarding stubs — compat-bridge.js owns the canonical versions.
// Keep minimal safe fallbacks for any code that fires before compat-bridge loads.
function showStep(n) {}
function _0x0e42fc1() {}
function goBackFromStep3() { if (typeof v21BackPhase === 'function') v21BackPhase(); }
function nextStep(n) {
  if (n === 5) {
    if (typeof showScreen === 'function') showScreen('screen-analysis');
    if (typeof _0xf1a6af7 === 'function') _0xf1a6af7();
  }
}

function _0xf1a6af7() {
  const name = (document.getElementById('firstname').value || '').trim();
  const greet = document.getElementById('analysis-greeting');
  if (greet) greet.textContent = name ? `Calibrating your position, ${name}...` : 'Calibrating your position...';

  /* Calibration status text rotation — personality during wait */
  var statusTexts = ['Scanning your numbers…','Mapping your position…','Building your action plan…','Almost there…'];
  var statusEl = document.getElementById('analysis-status-text');
  var statusIdx = 0;
  var statusInterval = statusEl ? setInterval(function(){
    statusIdx++;
    if(statusIdx < statusTexts.length) statusEl.textContent = statusTexts[statusIdx];
    else clearInterval(statusInterval);
  }, 800) : null;

  const ring = document.getElementById('analysis-ring');
  const bar  = document.getElementById('analysis-progress-bar');
  const circumference = 201;

  const steps = ['as-1', 'as-2', 'as-3', 'as-4'];
  steps.forEach((id, i) => {
    const delay = i * 750 + 200;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.opacity = '1';
      el.style.color = 'var(--navy)';
      const icon = el.querySelector('span');
      if (icon) { icon.textContent = '✅'; }
      const badge = el.querySelector('div');
      if (badge) { badge.style.background = 'rgba(0,119,182,0.12)'; }
      // Advance ring & bar
      const pct = (i + 1) / steps.length;
      if (ring) ring.style.strokeDashoffset = circumference - (circumference * pct);
      if (bar)  bar.style.width = Math.round(pct * 100) + '%';
    }, delay);
  });
  setTimeout(() => {
    try {
      _0x82f61a0();
    } catch(e) {
      console.error('[Tracent] Engine error in _0xf1a6af7:', e);
      // Surface error on analysis screen — do not navigate to dashboard
      var greet = document.getElementById('analysis-greeting');
      if (greet) greet.textContent = 'Something went wrong — please try again.';
      var bar = document.getElementById('analysis-progress-bar');
      if (bar) { bar.style.width = '100%'; bar.style.background = 'var(--red)'; }
    }
  }, steps.length * 750 + 400);
}


/* ═══════════════════════════════════════════════════════════
   CANONICAL NAVIGATION — supersedes early-load stubs above.
   These are the real implementations loaded by UI Controller.
═══════════════════════════════════════════════════════════ */

// ── Screen router ─────────────────────────────────────────
function showScreen(id) {
  var _map = {
    'dashboard':  'screen-dashboard',
    'onboarding': 'screen-onboarding',
    'landing':    'screen-splash',
    'splash':     'screen-splash',
    'analysis':   'screen-analysis'
  };
  id = _map[id] || id;
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var scr = document.getElementById(id);
  if (scr) scr.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelectorAll('.screen input, .screen select, .screen textarea').forEach(function(el) {
    var p = el.closest('.screen');
    if (p && p.id === id) {
      el.removeAttribute('disabled');
    } else if (el.classList.contains('field-input') || el.type === 'range') {
      el.setAttribute('disabled', '');
    }
  });
  if (id === 'screen-splash' && typeof _0xbda85bb === 'function') _0xbda85bb();
  // Telemetry: screen view
  try { tracentEnterScreen(id); } catch(e) {}
}


// ── Dashboard show ────────────────────────────────────────
function showDashboard() {
  console.log('[DASH] showDashboard');
  var nav = document.getElementById('bottom-nav');
  if (nav) nav.style.display = 'flex';
  var fab = document.getElementById('feedback-fab');
  if (fab) fab.classList.add('show');
  try { switchTab('home'); } catch(e) { console.error('[DASH] showDashboard switchTab:', e); }
  try { setNav(document.getElementById('nav-home')); } catch(e) { console.error('[DASH] showDashboard setNav:', e); }
}

// ── Tab switching — core router only ─────────────────────
function switchTab(tab) {
  console.log('[DASH] switchTab', tab);
  window._lastTab = tab;
  try { tracentEnterScreen('tab:' + tab); } catch(e) {}
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById('tab-' + tab);
  if (panel) {
    panel.classList.add('active');
    panel.style.animation = 'none';
    panel.offsetHeight;
    panel.style.animation = '';
  } else {
    console.warn('[DASH] switchTab: no panel for tab-' + tab);
  }
  var header = document.getElementById('dash-header');
  if (header) {
    if (tab === 'home') {
      header.classList.remove('compact');
    } else {
      header.classList.add('compact');
      var score = typeof G !== 'undefined' && G && G.score ? G.score : null;
      if (score) {
        var mn = document.getElementById('mini-score-num');
        var ma = document.getElementById('mini-score-arc');
        if (mn) mn.textContent = score;
        if (ma) ma.style.strokeDashoffset = (75.4 - (score/100)*75.4).toFixed(1);
      }
    }
  }
  var dc = document.getElementById('dash-content');
  if (dc) dc.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  try { runTabRenderers(tab); } catch(e) { console.error('[DASH] runTabRenderers:', e); }
}

function runTabRenderers(tab) {
  if (tab === 'home')      { try { if (typeof _0x80e4d42  === 'function') _0x80e4d42();  } catch(e) { console.error('[DASH] home renderer:',     e); } }
  if (tab === 'simulator') { try { if (typeof _0x52c679f  === 'function') _0x52c679f();  } catch(e) { console.error('[DASH] simulator renderer:', e); } }
  if (tab === 'debtrank')  {
    // Re-evaluate BSE module visibility with debtIsActive=true so bse-debt-strategy-hidden
    // gets removed — it was added during home-tab BSE render when debt tab was not active.
    try { if (typeof window.bseApplyModuleVis === 'function') window.bseApplyModuleVis(); } catch(e) {}
    try {
      if (typeof _0x3e799ba === 'function') {
        _0x3e799ba();
      } else {
        if (typeof TracentRenderDebtExperience !== 'undefined' && typeof TracentRenderDebtExperience.render === 'function') {
          TracentRenderDebtExperience.render();
        }
      }
    } catch(e) {
      console.error('[DASH] debt renderer:', e);
      try {
        if (typeof TracentRenderDebtExperience !== 'undefined' && typeof TracentRenderDebtExperience.render === 'function') {
          TracentRenderDebtExperience.render();
        }
      } catch(e2) { console.error('[DASH] debtrank fallback also failed:', e2); }
    }
    // Apply experience-layer archetype adaptations after planner renders
    try { if (typeof TracentExperienceLayer !== 'undefined') TracentExperienceLayer.render(); } catch(e) {}
  }
  if (tab === 'progress')  {
    try { if (typeof _0x701dc98 === 'function') _0x701dc98(); } catch(e) { console.error('[DASH] progress renderer:', e); }
    // Update net worth tab CTA label based on whether data exists
    try {
      var _nwBtn = document.getElementById('nw-edit-btn');
      if (_nwBtn) {
        var _gp = window.G || {};
        var _hasData = (_gp.income > 0) || (_gp.ccDebt > 0) || (_gp.carDebt > 0) ||
                       (_gp.studentDebt > 0) || (_gp.otherDebt > 0) || (_gp.homeValue > 0);
        _nwBtn.textContent = _hasData ? 'Edit my numbers \u270F' : 'Add your numbers \u2192';
      }
    } catch(e) {}
  }
  if (tab === 'settings')  { try { if (typeof _0x47a7c11  === 'function') _0x47a7c11();  } catch(e) { console.error('[DASH] settings renderer:',  e); } }
  if (tab === 'recommend') {
    try { if (typeof renderGoalFocus === 'function') renderGoalFocus(); } catch(e) { console.error('[DASH] goalFocus:', e); }
    if (!window._aiLoaded && typeof G !== 'undefined' && G && G.income) {
      setTimeout(function() {
        try { if (typeof refreshAIAdvice === 'function') refreshAIAdvice(); } catch(e) { console.error('[DASH] aiAdvice:', e); }
      }, 80);
    }
  }
}

// ── Nav ───────────────────────────────────────────────────
function setNav(el) {
  if (!el) { console.warn('[DASH] setNav: null'); return; }
  document.querySelectorAll('.nav-item, .bse-nav-item').forEach(function(n) { n.classList.remove('active'); });
  el.classList.add('active');
  try {
    var icon = el.querySelector('.nav-icon');
    if (icon) {
      icon.style.transform = 'translateY(-3px) scale(1.15)';
      setTimeout(function() { icon.style.transform = ''; }, 200);
    }
  } catch(e) {}
}
function setNavByName(name) {
  var el = document.getElementById('nav-' + name);
  if (!el) { console.warn('[DASH] setNavByName: no nav-' + name); return; }
  setNav(el);
}

// ── V21 Mode rail ─────────────────────────────────────────
function v21SetMode(mode, btn) {
  console.log('[DASH] v21SetMode', mode);
  if (typeof G !== 'undefined') G.v21Mode = mode;
  try { tracentTrack('mode_switch', { mode: mode }); registerMeaningfulAction('mode_switch', { mode: mode }); } catch(e) {}
  document.querySelectorAll('.v21-mode-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var modeToTab = { today:'home', home:'home', debt:'debtrank', grow:'recommend', retire:'progress' };
  var modeToNav = { today:'home', home:'home', debt:'debt',     grow:'advice',    retire:'progress' };
  try { switchTab(modeToTab[mode] || 'home'); } catch(e) { console.error('[DASH] v21SetMode switchTab:', e); }
  try { setNavByName(modeToNav[mode] || 'home'); } catch(e) { console.error('[DASH] v21SetMode setNavByName:', e); }
  // Retire routes to the retirement subview — NOT career
  if (mode === 'retire') { try { showProgressSub('retirement'); } catch(e) { console.error('[DASH] retire sub:', e); } }
  // Grow/today/home: stay on home tab; strategy block handles differentiation
  if (mode === 'today') { try { v21SetDashboardContext('today'); } catch(e) {} }
  if (mode === 'home')  { try { v21SetDashboardContext('home');  } catch(e) {} }
  try { if (typeof G !== 'undefined' && G) v21RenderNBMCard(); } catch(e) {}
}

// ── Continue session ──────────────────────────────────────
function continueSession() {
  var hasSession = typeof G !== 'undefined' && G && G.income && G.housingType;
  if (!hasSession) { showScreen('screen-onboarding'); if (typeof _0x5e8006c==='function') _0x5e8006c(); return; }
  showScreen('screen-dashboard');
  var nav = document.getElementById('bottom-nav'); if (nav) nav.style.display='flex';
  if (typeof _0x36d6d96==='function') _0x36d6d96();
  setTimeout(function() { if (typeof v21RenderPostAnalysis==='function') v21RenderPostAnalysis(); }, 350);
}


// ── Window exports (canonical) ────────────────────────────
window.showScreen             = showScreen;
window.showDashboard          = showDashboard;
window.switchTab              = switchTab;
window.runTabRenderers        = runTabRenderers;
window.setNav                 = setNav;
window.setNavByName           = setNavByName;
window.v21SetMode             = v21SetMode;
window.continueSession        = continueSession;


/* ═══════════════════════════════════════════════════════════
   BSE NAV CONFIG APPLIER — extracted from core/bse.js
   BSE decides navStyle + builds the config array.
   This function applies that config to the nav DOM.
   Called by BSE._applyNav() via window.bseApplyNavConfig().
   Reads: items array [{id, label, show}]
═══════════════════════════════════════════════════════════ */
window.bseApplyNavConfig = function(items) {
  if (!items || !items.length) return;
  items.forEach(function(item) {
    var el = document.getElementById(item.id);
    if (!el) return;
    el.style.display = item.show ? '' : 'none';
    if (item.show && item.label) {
      var lbl = el.querySelector('.bse-nav-label') || el.querySelector('.nav-label');
      if (lbl) lbl.textContent = item.label;
    }
  });
};
