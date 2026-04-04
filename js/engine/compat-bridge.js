/* ═══ Tracent Engine: Compatibility Bridge ═══
   V21 behavioral phases, bridge to legacy engine, onboarding orchestration,
   post-analysis wiring, PBFDE state, telemetry.
   
   Navigation, modals, progress subtabs, and debt UI have been
   extracted to their own modules. This file is now a true bridge.
   
   Depends on: core/navigation.js, render/modals.js
═══════════════════════════════════════════════ */

// ── Onboarding ────────────────────────────────────────────
// ── Onboarding ────────────────────────────────────────────
var currentStep = 1;
var housingType = null;
// true when refine form is opened from Settings ("Update my numbers"), not from onboarding.
// Controls whether the debt block shows full individual balance fields.
window._v21_settingsMode = false;

function startOnboarding() {
  currentStep = 1; housingType = null;
  try {
    window.TRACENT_TELEMETRY.flowState.onboardingStarted = true;
    tracentTrack('onboarding_started');
    tracentEnterScreen('onboarding:intent');
  } catch(e) {}
  if (typeof _v21OnbStart   !== 'undefined') _v21OnbStart   = Date.now();
  if (typeof _v21TapTimes   !== 'undefined') _v21TapTimes   = [];
  if (typeof _v21PhaseStack !== 'undefined') _v21PhaseStack = ['intent'];
  if (typeof G !== 'undefined') {
    G.primaryIntent = null; G.financialResilienceSignal = null;
    G.scoreEstimated = false; G.scoreFinal = false;
  }
  document.querySelectorAll('#v21-legacy-inputs input, #v21-legacy-inputs select, #v21-legacy-inputs textarea').forEach(function(el) { el.removeAttribute('disabled'); });
  showScreen('screen-onboarding');
  if (typeof v21SetPhase === 'function') v21SetPhase('intent');
  window.scrollTo({ top:0, behavior:'instant' });
}
window.startOnboarding          = startOnboarding;
window._tracent_startOnboarding = startOnboarding;

function goToStep(n)   { console.log('[V21] goToStep no-op'); }
function onbBack()     { if (typeof v21BackPhase === 'function') v21BackPhase(); else showScreen('screen-splash'); }
function onbNext(step) { console.log('[V21] onbNext no-op'); }
function onbSubmit()   { if (typeof v21FinishOnboarding === 'function') v21FinishOnboarding(); }

// ── Housing selection (null-safe) ─────────────────────────
window.selectHousing = function(type) {
  housingType = type;
  document.querySelectorAll('.housing-card').forEach(function(c) {
    c.style.borderColor = 'var(--gray-2)'; c.style.background = 'white';
  });
  var hc = document.getElementById('hc-' + type);
  if (hc) { hc.style.borderColor = 'var(--teal)'; hc.style.background = 'var(--teal-dim)'; }
  var btn = document.getElementById('btn-housing-next');
  if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
};


// ── Misc onboarding/input helpers ─────────────────────────
// ── Credit select ─────────────────────────────────────────
// selectedCredit declared as `let` in engine block — do not redeclare
window.selectCredit     = function(val) { selectedCredit = val; };
window.selectCreditPill = function(el) {
  document.querySelectorAll('.credit-pill').forEach(function(p) { p.classList.remove('selected'); });
  el.classList.add('selected');
};

// ── Misc onboarding helpers ───────────────────────────────
function onb_estimateTax() { if (typeof estimateTakeHome === 'function') estimateTakeHome(); }
window.forceEstimateTakeHome = function() {
  onb_estimateTax();
  if (typeof updateStateHomePriceHints === 'function') updateStateHomePriceHints();
};


// ── Compute wrapper ───────────────────────────────────────
var _computeWrapped = false;
function wrapCompute() {
  if (_computeWrapped || typeof _0x82f61a0 === 'undefined') return;
  _computeWrapped = true;
  var orig = _0x82f61a0;
  _0x82f61a0 = function() {
    var computeOk = false;
    try { orig.apply(this, arguments); computeOk = true; }
    catch(e) {
      console.error('[Tracent] Compute error:', e);
      var greet = document.getElementById('analysis-greeting');
      if (greet) greet.textContent = 'Something went wrong — please try again.';
      var bar = document.getElementById('analysis-progress-bar');
      if (bar) { bar.style.width='100%'; bar.style.background='var(--red)'; }
      setTimeout(function() {
        var inner = document.querySelector('.analysis-inner');
        if (inner && !inner.querySelector('.step4-error-div')) {
          var d = document.createElement('div'); d.className='step4-error-div'; d.style.cssText='margin-top:24px;text-align:center;';
          d.innerHTML='<div style="font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:16px;line-height:1.6;">Analysis could not complete.<br>Your inputs are saved — tap below to retry.</div><button onclick="startFreshAnalysis()" style="background:var(--sky);border:none;border-radius:var(--r-pill);padding:14px 28px;font-family:var(--font-body);font-size:14px;font-weight:700;color:var(--white);cursor:pointer;">Reset and retry</button>';
          inner.appendChild(d);
        }
      }, 800);
      return;
    }
    if (computeOk) {
      try {
        window.TRACENT_TELEMETRY.flowState.dashboardEntered = true;
        tracentTrack('onboarding_dashboard_entered');
        tracentEnterScreen('dashboard');
      } catch(e) {}
      try { window.showScreen('screen-dashboard'); } catch(e) {}
      var nav = document.getElementById('bottom-nav'); if (nav) nav.style.display='flex';
      try {
        // Mark G.scoreFinal before dispatching so any listener can check it
        if (typeof G !== 'undefined' && G) { G.scoreFinal = true; G.scoreEstimated = false; G.lastComputedAt = Date.now(); }
        document.dispatchEvent(new CustomEvent('tracent:scoreComputed',{detail:{score:(typeof G!=='undefined'&&G?G.score:null),estimated:false,final:true}}));
        // Persist inputs on onboarding completion
        if (typeof TracentSupabase !== 'undefined' && TracentSupabase.isConfigured()) { try { TracentSupabase.saveProfile(); } catch(e) {} }
      } catch(e) {}
      try { window.switchTab('home'); }     catch(e) {}
      try { window.setNavByName('home'); }  catch(e) {}
      setTimeout(function() {
        try { if (typeof renderGoalFocus==='function') renderGoalFocus(); } catch(e) {}
        try { if (typeof updateStateHomePriceHints==='function') updateStateHomePriceHints(); } catch(e) {}
      }, 200);
    }
  };
  window._0x82f61a0 = _0x82f61a0;
  window.computeAndShow = _0x82f61a0;
}


// ── Window exports (bridge-only) ──────────────────────────
window.startOnboarding        = startOnboarding;
window._tracent_startOnboarding = startOnboarding;
window.goToStep               = goToStep;
window.onbBack                = onbBack;
window.onbNext                = onbNext;
window.onbSubmit              = onbSubmit;
window.haptic                 = typeof haptic !== 'undefined' ? haptic : function(){};
window.wrapCompute            = wrapCompute;

// ── Boot sequence ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Ensure startOnboarding alias
  window._tracent_startOnboarding = window.startOnboarding;

  // Telemetry: attach scroll tracking to dashboard content
  setTimeout(function() {
    try {
      attachScrollTracking(document.getElementById('dash-content'), 'dash-content');
      attachScrollTracking(document.getElementById('onboarding-scroll'), 'onboarding');
    } catch(e) {}
  }, 500);

  // Suppress iOS keyboard toolbar on hidden screens
  setTimeout(function() {
    document.querySelectorAll('.screen:not(.active) input, .screen:not(.active) select, .screen:not(.active) textarea').forEach(function(el) {
      if (el.classList.contains('field-input') || el.type === 'range' || el.tagName === 'SELECT') {
        el.setAttribute('disabled', '');
      }
    });
  }, 0);

  // Load saved state — return value true means a stored session was found in localStorage
  var _bootLoaded = typeof _0xf0f2b75 === 'function' && _0xf0f2b75();

  // Guard: returning users with a stored session bypass splash.
  // #splash-returning is an empty stub — there is no "Continue" path for returning users.
  // Without this guard, splash stays active and intercepts all dashboard clicks.
  // Use _bootLoaded (not G.score) — users who onboarded but never scored would have score=0
  // and get stuck on splash with no path forward.
  var _bootHasSession = _bootLoaded && typeof G !== 'undefined' && G && G.income && G.housingType;
  if (_bootHasSession) {
    if (typeof continueSession === 'function') continueSession();
  } else {
    showScreen('screen-splash');
    if (typeof _0xbda85bb === 'function') _0xbda85bb();
  }

  // Wrap compute after engine is ready
  setTimeout(wrapCompute, 100);
});


/* ── Extended Features: Salary, Benchmarking, Gamification, What-If ── */
// strict mode removed — caused SyntaxError in browser eval contexts

/* ── V21 State Extensions ──────────────────────────────── */
// Extend the existing G object after it's declared by the engine
document.addEventListener('DOMContentLoaded', function() {
  if (typeof G !== 'undefined') {
    G.primaryIntent           = G.primaryIntent           || null;
    G.financialResilienceSignal = G.financialResilienceSignal || null;
    G.scoreEstimated          = G.scoreEstimated          || false;
    G.scoreFinal              = G.scoreFinal              || false;
    G.scoreRangeMin           = G.scoreRangeMin           || null;
    G.scoreRangeMax           = G.scoreRangeMax           || null;
    G.archetype               = G.archetype               || null;
    G.lastScoreDrivers        = G.lastScoreDrivers        || [];
    G.profileCompleteness     = G.profileCompleteness     || 0;
    G.v21Mode                 = G.v21Mode                 || 'today';
    G.v21CheckinFlags         = G.v21CheckinFlags         || {};
    G.v21LifeEvent            = G.v21LifeEvent            || null;
  }
});

/* ── V21 Onboarding Timing ─────────────────────────────── */

// ── V21 Phase Flow + Rendering ─────────────────────────────
var _v21OnbStart    = Date.now();
var _v21TapTimes    = [];
var _v21PhaseStack  = ['intent'];
var _v21CheckinData = {};

/* ── PHASE NAVIGATION ──────────────────────────────────── */
function v21SetPhase(phase) {
  // Activate the target phase
  document.querySelectorAll('.v21-phase').forEach(function(el) {
    el.classList.remove('active');
  });
  var target = document.getElementById('v21-phase-' + phase);
  if (target) target.classList.add('active');

  // Progress bar & label
  var phaseMap = { intent:1, signal:2, age:3, range:4, refine:5 };
  var total    = 5;
  var n = phaseMap[phase] || 1;
  var fill = document.getElementById('onb-progress');
  if (fill) fill.style.width = (n / total * 100) + '%';
  var lbl  = document.getElementById('onb-step-label');
  if (lbl) lbl.textContent = 'Step ' + n + ' of ' + total;

  // Back button
  var back = document.getElementById('onb-back-btn');
  if (back) back.style.display = n > 1 ? 'flex' : 'none';

  // Track stack for back navigation
  if (_v21PhaseStack[_v21PhaseStack.length - 1] !== phase) {
    _v21PhaseStack.push(phase);
  }

  // Scroll to top
  var scroll = document.getElementById('onboarding-scroll');
  if (scroll) scroll.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function v21BackPhase() {
  if (_v21PhaseStack.length < 2) {
    if (typeof showScreen === 'function') showScreen('screen-splash');
    return;
  }
  _v21PhaseStack.pop();
  v21SetPhase(_v21PhaseStack[_v21PhaseStack.length - 1]);
}

/* ── PHASE 1: INTENT ───────────────────────────────────── */
function v21SelectIntent(intent, el) {
  _v21TapTimes.push(Date.now() - _v21OnbStart);

  // Visual selection
  document.querySelectorAll('#v21-phase-intent .v21-choice').forEach(function(c) {
    c.classList.remove('selected');
  });
  if (el) el.classList.add('selected');

  // Store in G
  if (typeof G !== 'undefined') {
    G.primaryIntent = intent;
    // Map to existing goal system
    var intentToGoal = {
      stable:  'build_savings',
      debt:    'pay_off_debt',
      home:    'buy_home',
      grow:    'invest_more',
      retire:  'retire_early'
    };
    G.goal = intentToGoal[intent] || 'build_savings';
    // Sync to legacy hidden input
    var goalEl = document.getElementById('goal');
    if (goalEl) goalEl.value = G.goal;
  }

  // Auto-advance after brief highlight
  try {
    window.TRACENT_TELEMETRY.flowState.intentComplete = true;
    registerMeaningfulAction('onboarding_intent_selected', { intent: intent });
    tracentEnterScreen('onboarding:signal');
  } catch(e) {}
  setTimeout(function() { v21SetPhase('signal'); }, 200);
}

/* ── PHASE 2: SIGNAL ───────────────────────────────────── */
function v21SelectSignal(signal, el) {
  _v21TapTimes.push(Date.now() - _v21OnbStart);

  document.querySelectorAll('#v21-phase-signal .v21-choice').forEach(function(c) {
    c.classList.remove('selected');
  });
  if (el) el.classList.add('selected');

  if (typeof G !== 'undefined') G.financialResilienceSignal = signal;

  // Compute range, then show preview
  try {
    window.TRACENT_TELEMETRY.flowState.resilienceComplete = true;
    registerMeaningfulAction('onboarding_resilience_answered', { signal: signal });
    tracentEnterScreen('onboarding:preview');
  } catch(e) {}
  setTimeout(function() { v21SetPhase('age'); }, 200);
}

/* ── PHASE 2b: AGE RANGE ───────────────────────────────── */
function v21SelectAgeRange(range, el) {
  _v21TapTimes.push(Date.now() - _v21OnbStart);

  document.querySelectorAll('#v21-phase-age .v21-choice').forEach(function(c) {
    c.classList.remove('selected');
  });
  if (el) el.classList.add('selected');

  // ageRange is authoritative for retirement mode: '55_64' → pre_retirement, '65plus' → in_retirement.
  // BSE._compute() reads G.ageRange and routes archetype accordingly — no explicit retire intent needed.
  if (typeof G !== 'undefined') {
    G.ageRange = range;
    // Align goal/intent for retirement age bands so the entire intent→goal→NBM chain is coherent.
    // Only set if the user hasn't already chosen a more specific intent during this session.
    if ((range === '55_64' || range === '65plus') && !G.primaryIntent) {
      G.primaryIntent = 'retire';
      G.goal = 'retire_early';
      var goalEl = document.getElementById('goal');
      if (goalEl) goalEl.value = 'retire_early';
    }
  }

  try {
    registerMeaningfulAction('onboarding_age_range_selected', { range: range });
  } catch(e) {}

  v21ComputeRange();
  setTimeout(function() { v21SetPhase('range'); }, 200);
}

/* ── PHASE 3: SCORE RANGE COMPUTATION ─────────────────── */
var _v21BandMeta = {
  fragile:     { label: '🔴  Fragile',     color: '#EF4444', min: 0,  max: 39  },
  exposed:     { label: '🟡  Exposed',     color: '#F59E0B', min: 40, max: 54  },
  stabilizing: { label: '🔵  Stabilizing', color: '#00A8E8', min: 55, max: 69  },
  advancing:   { label: '🟢  Advancing',   color: '#10B981', min: 70, max: 84  },
  compounding: { label: '⬡  Compounding', color: '#8B5CF6', min: 85, max: 100 }
};

function v21BandForScore(score) {
  if (score <= 39) return _v21BandMeta.fragile;
  if (score <= 54) return _v21BandMeta.exposed;
  if (score <= 69) return _v21BandMeta.stabilizing;
  if (score <= 84) return _v21BandMeta.advancing;
  return _v21BandMeta.compounding;
}

function v21ComputeRange() {
  // Compute internal score estimates (kept for G state & downstream use)
  var intent = (typeof G !== 'undefined' && G.primaryIntent) || 'stable';
  var signal = (typeof G !== 'undefined' && G.financialResilienceSignal) || 'somewhat';

  var baseMap = { stable:58, debt:52, home:57, grow:64, retire:60 };
  var signalShift = {
    completely: +12, very_well: +7, somewhat: +2,
    very_little: -6, not_at_all: -12
  };

  var center = (baseMap[intent] || 58) + (signalShift[signal] || 0);
  var spread = 6;
  if (signal === 'somewhat')   spread = 7;
  if (signal === 'not_at_all' || signal === 'completely') spread = 5;

  var rMin = Math.max(0,   center - Math.floor(spread / 2));
  var rMax = Math.min(100, center + Math.ceil(spread / 2));
  var mid  = Math.round((rMin + rMax) / 2);

  if (typeof G !== 'undefined') {
    // PREVIEW ONLY — do not write G.score; that is reserved for the real weighted engine
    G.previewScoreRangeMin = rMin;
    G.previewScoreRangeMax = rMax;
    G.previewScoreMid      = mid;
    // Keep legacy compat fields for any downstream that still reads them (score breakdown modal)
    G.scoreRangeMin  = rMin;
    G.scoreRangeMax  = rMax;
    G.scoreEstimated = true;
    G.scoreFinal     = false;
    // Explicitly do NOT assign G.score here — that is set only by _0xb70f5a4 (real engine)
    // delete G.score is too aggressive if user is returning to onboarding; null it instead
    if (G.scoreFinal !== true) delete G.score;
  }

  // Update hidden compat stubs (so any engine that still reads these IDs is safe)
  var rangeEl  = document.getElementById('v21-range-num');
  var bandEl   = document.getElementById('v21-band-pill');
  var diagEl   = document.getElementById('v21-diag-text');
  var nextEl   = document.getElementById('v21-next-move-text');
  var futureEl = document.getElementById('v21-future-text');
  var band = v21BandForScore(mid);
  if (rangeEl) rangeEl.textContent = rMin + '–' + rMax;
  if (bandEl) { bandEl.textContent = band.label; }
  if (diagEl)   diagEl.textContent   = v21DiagnosisFor(intent, signal);
  if (nextEl)   nextEl.textContent   = v21NextMoveFor(intent);
  if (futureEl) futureEl.textContent = v21FutureFor(intent, signal);

  // Build the Position Preview instead of showing score range
  v21BuildPositionPreview(intent, signal);

  // Fire scoreComputed (still useful for downstream listeners)
  document.dispatchEvent(new CustomEvent('tracent:scoreComputed', {
    detail: { score: mid, min: rMin, max: rMax, estimated: true, final: false }
  }));
}

/* ── Position Preview builder ──────────────────────────── */
function v21BuildPositionPreview(intent, signal) {
  var heroLabel = document.getElementById('v21-preview-hero-label');
  var heroValue = document.getElementById('v21-preview-hero-value');
  var heroDesc  = document.getElementById('v21-preview-hero-desc');
  var helpingEl = document.getElementById('v21-preview-helping-text');
  var holdingEl = document.getElementById('v21-preview-holding-text');

  if (!heroValue) return;

  var preview = v21PreviewForIntent(intent, signal);

  if (heroLabel) heroLabel.textContent = preview.heroLabel;
  if (heroValue) heroValue.textContent = preview.heroValue;
  if (heroDesc)  heroDesc.textContent  = preview.heroDesc;
  if (helpingEl) helpingEl.textContent = preview.helping;
  if (holdingEl) holdingEl.textContent = preview.holding;

  // Premium stagger reveal
  var hero  = document.getElementById('v21-preview-hero');
  var cards = document.querySelector('.v21-preview-cards');
  if (hero) {
    hero.classList.remove('is-visible');
    void hero.offsetWidth;
    setTimeout(function() { hero.classList.add('is-visible'); }, 60);
  }
  if (cards) {
    cards.classList.remove('is-visible');
    void cards.offsetWidth;
    setTimeout(function() { cards.classList.add('is-visible'); }, 200);
  }
  // Telemetry: watch for CTA ignore on preview screen
  try { watchCtaIgnore('preview_cta', 6000); tracentTrack('onboarding_preview_seen'); window.TRACENT_TELEMETRY.flowState.previewSeen = true; } catch(e) {}
}

function v21PreviewForIntent(intent, signal) {
  // Signal → resilience level string
  var resMap = {
    completely: 'strong', very_well: 'solid', somewhat: 'moderate',
    very_little: 'stretched', not_at_all: 'critical'
  };
  var res = resMap[signal] || 'moderate';

  var previews = {
    stable: {
      heroLabel: 'Monthly breathing room',
      heroValue: res === 'strong' || res === 'solid' ? 'Est. $400–$700/mo'
                 : res === 'moderate' ? 'Est. $150–$350/mo'
                 : 'Under $100/mo',
      heroDesc: 'After essentials, debt and housing — based on your signals so far.',
      helping:  res === 'strong' || res === 'solid'
        ? 'You can absorb unexpected costs — that buys real options.'
        : 'You\'re tracking your situation — that\'s the first lever.',
      holding:  res === 'stretched' || res === 'critical'
        ? 'Limited cash buffer means surprises hit harder than they should.'
        : 'Uncertainty around the exact cash flow number is reducing your confidence.'
    },
    debt: {
      heroLabel: 'Estimated path to debt freedom',
      heroValue: res === 'strong' || res === 'solid' ? 'Est. 18–28 months'
                 : res === 'moderate' ? 'Est. 30–48 months'
                 : 'Est. 4–7 years',
      heroDesc: 'Based on typical income-to-debt ratios for your resilience signal.',
      helping:  'You\'re aware of the pressure — that\'s already ahead of most people.',
      holding:  res === 'stretched' || res === 'critical'
        ? 'High-cost debt is consuming income that could be building your position.'
        : 'Without a ranked payoff order, effort gets spread instead of concentrated.'
    },
    home: {
      heroLabel: 'Likely affordability range',
      heroValue: res === 'strong' || res === 'solid' ? 'Est. $380k–$520k'
                 : res === 'moderate' ? 'Est. $240k–$360k'
                 : 'Building toward a range',
      heroDesc: 'A rough band based on your resilience signal. Refinement sharpens this.',
      helping:  'You\'re planning ahead — most buyers wait too long to run the numbers.',
      holding:  res === 'stretched' || res === 'critical'
        ? 'A limited buffer makes lenders cautious and reduces your deposit rate.'
        : 'Deposit gap and timing clarity are the two things Tracent can sharpen for you.'
    },
    grow: {
      heroLabel: 'Investable surplus signal',
      heroValue: res === 'strong' || res === 'solid' ? 'Est. $300–$600/mo available'
                 : res === 'moderate' ? 'Est. $80–$200/mo available'
                 : 'Freeing up space first',
      heroDesc: 'After obligations — before optimising where it goes.',
      helping:  res === 'strong' || res === 'solid'
        ? 'You likely have consistent surplus — consistency compounds faster than size.'
        : 'Even small consistent amounts compound significantly over time.',
      holding:  res === 'stretched' || res === 'critical'
        ? 'Tight cash flow is the first thing to fix before optimising growth.'
        : 'Without a clear surplus number, it\'s hard to know what\'s actually available to deploy.'
    },
    retire: {
      heroLabel: 'Retirement trajectory signal',
      heroValue: res === 'strong' || res === 'solid' ? 'On track toward 60s'
                 : res === 'moderate' ? 'Pointing toward early 70s'
                 : 'Gap needs attention',
      heroDesc: 'Based on contribution strength relative to your resilience signal.',
      helping:  'You\'re engaging with retirement now — compounding rewards early attention.',
      holding:  res === 'stretched' || res === 'critical'
        ? 'Short-term pressure is competing with long-term contribution capacity.'
        : 'Refinement will show whether your current pace is on track or needs one adjustment.'
    }
  };

  return previews[intent] || previews.stable;
}

function v21DiagnosisFor(intent, signal) {
  if (signal === 'not_at_all' || signal === 'very_little') {
    return 'Short-term resilience is the main thing holding back your financial position right now.';
  }
  var map = {
    stable:  'You have some foundation, but resilience is still doing a lot of the heavy lifting.',
    debt:    'Debt pressure is a visible drag on what your income can actually do for you.',
    home:    'You have the beginnings of readiness, but the system needs a sharper picture before calling timing.',
    grow:    'You likely have some foundation, but efficiency and direction matter more than complexity right now.',
    retire:  'Consistency in contributions matters more than timing perfection at this stage.'
  };
  return map[intent] || 'You have some real footing, but a few variables are doing most of the work.';
}

function v21NextMoveFor(intent) {
  var map = {
    stable:  'Build clarity around your monthly cushion before optimising anything else.',
    debt:    'Surface the highest-pressure balance and create your first ranked payoff move.',
    home:    'Estimate your deposit gap and affordability comfort zone with real numbers.',
    grow:    'Tighten cash flow and free up money that can compound consistently.',
    retire:  'Confirm your retirement contribution baseline before trying to accelerate it.'
  };
  return map[intent] || 'Build clarity around your monthly cushion before optimising anything else.';
}

function v21FutureFor(intent, signal) {
  if (signal === 'completely' || signal === 'very_well') {
    return 'Your resilience foundation means the system can focus on efficiency and growth, not just stability.';
  }
  var map = {
    stable:  'A stronger cash buffer could push you into a much safer band faster than most people expect.',
    debt:    'Reducing the most expensive debt first should move the range more than spreading effort equally.',
    home:    'A clearer savings path and affordability signal can rapidly improve home-readiness confidence.',
    grow:    'A few focused moves could shift you from maintaining to compounding.',
    retire:  'Consistency matters more than perfection — better inputs often reveal a stronger path than it first appears.'
  };
  return map[intent] || 'A few strong moves could push you into the advancing band.';
}

/* ── PHASE 4: ARCHETYPE INFERENCE & ADAPTIVE REFINE ───── */
function v21BuildRefinePhase() {
  try {
    window.TRACENT_TELEMETRY.flowState.previewSeen = true;
    registerMeaningfulAction('onboarding_refinement_started');
    tracentEnterScreen('onboarding:refine');
    clearCtaIgnore('preview_cta');
  } catch(e) {}

  var elapsed   = (Date.now() - _v21OnbStart) / 1000;
  var signal    = (typeof G !== 'undefined' && G.financialResilienceSignal) || 'somewhat';
  var intent    = (typeof G !== 'undefined' && G.primaryIntent) || 'stable';
  var archetype = 'stabilizer';

  if (elapsed < 6 && signal !== 'not_at_all')                    archetype = 'explorer';
  else if (elapsed < 10)                                          archetype = 'optimizer';
  else if (signal === 'not_at_all' || signal === 'very_little')  archetype = 'avoider';
  else                                                            archetype = 'stabilizer';

  if (typeof G !== 'undefined') G.archetype = archetype;

  var badge = document.getElementById('v21-archetype-badge');
  var badgeMap = {
    explorer:  '\u26a1 Quick path \u2014 just a few real numbers',
    optimizer: '\ud83d\udcca Structured path \u2014 real inputs, real results',
    stabilizer:'\ud83d\udee0\ufe0f Guided path \u2014 tell us the key numbers',
    avoider:   '\ud83e\udd1d Gentle path \u2014 share what feels comfortable'
  };
  if (badge) badge.textContent = badgeMap[archetype] || 'Real inputs path';

  var titleMap = {
    stable:  ['A few real numbers', 'Five inputs move your score from estimated to grounded.'],
    debt:    ["Let's see the actual pressure", 'Real debt and income numbers unlock a credible payoff plan.'],
    home:    ['Build your readiness picture', 'Real numbers on income, savings, and debt give you an honest answer.'],
    grow:    ['What does your surplus actually look like?', 'Real income and spending inputs ground every growth recommendation.'],
    retire:  ['Show Tracent your real baseline', 'Income, contributions, and debt load are all it needs to start.']
  };
  var titlePair = titleMap[intent] || titleMap.stable;
  var tEl = document.getElementById('v21-refine-title');
  var sEl = document.getElementById('v21-refine-sub');
  if (tEl) tEl.textContent = titlePair[0];
  if (sEl) sEl.textContent = titlePair[1];

  var formEl = document.getElementById('v21-refine-form');
  if (!formEl) { v21SetPhase('refine'); return; }

  // ── State selector options ───────────────────────────────────────
  var stateData = [['NY','New York'],['CA','California'],['TX','Texas'],['FL','Florida'],
    ['WA','Washington'],['MA','Massachusetts'],['IL','Illinois'],['CO','Colorado'],
    ['NJ','New Jersey'],['CT','Connecticut'],['GA','Georgia'],['NC','North Carolina'],
    ['VA','Virginia'],['AZ','Arizona'],['PA','Pennsylvania'],['OH','Ohio'],
    ['MN','Minnesota'],['OR','Oregon'],['MI','Michigan'],['TN','Tennessee'],
    ['MO','Missouri'],['WI','Wisconsin'],['IN','Indiana'],['NV','Nevada'],
    ['LA','Louisiana'],['UT','Utah'],['KY','Kentucky'],['OK','Oklahoma'],
    ['SC','South Carolina'],['AL','Alabama'],['AR','Arkansas'],['DE','Delaware'],
    ['HI','Hawaii'],['ID','Idaho'],['IA','Iowa'],['KS','Kansas'],['ME','Maine'],
    ['MT','Montana'],['NE','Nebraska'],['NH','New Hampshire'],['NM','New Mexico'],
    ['ND','North Dakota'],['RI','Rhode Island'],['SD','South Dakota'],['VT','Vermont'],
    ['WV','West Virginia'],['WY','Wyoming'],['DC','Washington DC'],['AK','Alaska']];
  var stateHtml = stateData.map(function(p){
    return '<option value="' + p[0] + '"' + (p[0]==='NY'?' selected':'') + '>' + p[1] + '</option>';
  }).join('');

  // ── DOM builders ─────────────────────────────────────────────────
  function _field(label, inner, hint) {
    return '<div class="field-group">'
      + '<label class="field-label">' + label + '</label>'
      + inner
      + (hint ? '<div class="field-hint">' + hint + '</div>' : '')
      + '</div>';
  }
  function _money(id, ph, label, hint) {
    return _field(label,
      '<div class="field-prefix-wrap"><span class="field-prefix-sign">$</span>'
      + '<input type="text" inputmode="decimal" id="' + id + '" class="field-input" placeholder="' + ph + '" autocomplete="off"></div>',
      hint);
  }
  function _sel(id, label, opts, hint) {
    return _field(label, '<select id="' + id + '" class="field-input">' + opts + '</select>', hint);
  }
  function _row2(a, b) { return '<div class="v21-field-grid">' + a + b + '</div>'; }

  var _efOpts = '<option value="0" selected>None yet</option>'
    + '<option value="1">Under 1 month</option>'
    + '<option value="3">1\u20133 months</option>'
    + '<option value="6">4\u20136 months</option>'
    + '<option value="9">6+ months</option>';

  var _creditOpts = '<option value="excellent">Excellent (720+)</option>'
    + '<option value="good">Good (680\u2013719)</option>'
    + '<option value="fair" selected>Fair (640\u2013679)</option>'
    + '<option value="below">Below average (580\u2013639)</option>'
    + '<option value="poor">Building (&lt;580)</option>';

  var _retireOpts = '<option value="none" selected>Not contributing yet</option>'
    + '<option value="irregular">Occasionally</option>'
    + '<option value="consistent">Consistent \u2014 below employer match</option>'
    + '<option value="maxed">Capturing full employer match</option>';

  // ── Name + state row (shared) ────────────────────────────────────
  var out = _row2(
    _field('First name (optional)', '<input type="text" id="v21r-name" class="field-input" placeholder="Alex" autocorrect="off" autocapitalize="words">'),
    _sel('v21r-state', 'State', stateHtml)
  );

  // ── Intent-specific fields ───────────────────────────────────────
  if (intent === 'debt') {
    out += _row2(
      _money('v21r-income',  '72,000', 'Annual income', 'Before tax'),
      _money('v21r-takehome','4,800',  'Monthly take-home', 'After tax \u2014 or leave blank to estimate')
    );
    if (window._v21_settingsMode) {
      // Settings edit: full individual debt balances so the planner has real data
      out += _row2(
        _money('v21r-cc-debt',      '0', 'Credit card balance',  'Total revolving balance'),
        _money('v21r-car-debt',     '0', 'Car loan balance',     'Outstanding principal')
      );
      out += _row2(
        _money('v21r-student-debt', '0', 'Student loan balance', 'Federal + private combined'),
        _money('v21r-other-debt',   '0', 'Other debt',           'Personal loans, medical, other')
      );
    } else {
      // Onboarding: keep it light \u2014 just CC debt and a lump monthly payment figure
      out += _row2(
        _money('v21r-cc-debt', '0', 'Credit card balance', 'Total revolving balance'),
        _money('v21r-monthly-debt-payments', '0', 'Other monthly debt payments', 'Car, student, and other loans combined')
      );
      out += '<div class="field-hint" style="margin-top:-8px;margin-bottom:4px;">You can add car loans, student loans, and other debts individually in Settings after setup.</div>';
    }
    out += _sel('v21r-emergency', 'Emergency fund', _efOpts, 'Build this before accelerating payoff');

  } else if (intent === 'home') {
    // Annual income · take-home · target price · saved cash · monthly debts · credit band
    out += _row2(
      _money('v21r-income',  '72,000', 'Annual income', 'Before tax'),
      _money('v21r-takehome','4,800',  'Monthly take-home', 'After tax \u2014 or leave blank to estimate')
    );
    out += _row2(
      _money('v21r-home-price',    '400,000', 'Target home price', 'Your rough budget'),
      _money('v21r-deposit-saved', '0',       'Cash saved for purchase', 'Down payment + closing costs')
    );
    out += _row2(
      _money('v21r-monthly-debt-payments', '0', 'Monthly debt payments', 'Affects mortgage eligibility'),
      _sel('v21r-credit-band', 'Credit band', _creditOpts, 'Affects the rate you\u2019ll qualify for')
    );

  } else if (intent === 'grow') {
    // Annual income · take-home · fixed spending · savings amount · emergency fund
    out += _row2(
      _money('v21r-income',  '72,000', 'Annual income', 'Before tax'),
      _money('v21r-takehome','4,800',  'Monthly take-home', 'After tax \u2014 or leave blank to estimate')
    );
    out += _row2(
      _money('v21r-expenses',       '900', 'Monthly fixed spending', 'Non-housing obligations'),
      _money('v21r-savings-amount', '0',   'Current savings / investments', 'All liquid and invested assets')
    );
    out += _sel('v21r-emergency', 'Emergency fund', _efOpts, 'Needs to be solid before growth is safe');

  } else if (intent === 'retire') {
    // Annual income · take-home · contribution status · emergency fund · debt payments
    out += _row2(
      _money('v21r-income',  '72,000', 'Annual income', 'Before tax'),
      _money('v21r-takehome','4,800',  'Monthly take-home', 'After tax \u2014 or leave blank to estimate')
    );
    out += _sel('v21r-retire', 'Retirement contributions', _retireOpts,
      'Where you stand on capturing compounding today');
    out += _row2(
      _sel('v21r-emergency', 'Emergency fund', _efOpts),
      _money('v21r-monthly-debt-payments', '0', 'Monthly non-housing debt',
        'Payments competing with retirement contributions')
    );

  } else {
    // stable / default: income · take-home · fixed spending · card debt · emergency fund
    out += _row2(
      _money('v21r-income',  '72,000', 'Annual income', 'Before tax'),
      _money('v21r-takehome','4,800',  'Monthly take-home', 'After tax \u2014 or leave blank to estimate')
    );
    out += _row2(
      _money('v21r-expenses','900', 'Monthly fixed spending', 'Rent or mortgage not included'),
      _money('v21r-cc-debt', '0',   'Credit card / revolving debt', 'Total outstanding balance')
    );
    out += _sel('v21r-emergency', 'Emergency fund', _efOpts,
      'How many months of spending you could cover');
  }

  formEl.innerHTML = out;
  v21SetPhase('refine');
}

/* ── PREFILL REFINE FORM FROM EXISTING G ──────────────── */
// Called by startFreshAnalysis() when user has an existing session.
// Writes current G values back into the v21r-* fields so the user
// sees their numbers and can edit them without re-entering everything.
function _v21_prefillRefineForm() {
  var g = (typeof G !== 'undefined' && G.income) ? G : (window.G || {});
  function _setField(id, val) {
    var el = document.getElementById(id);
    if (!el || val === undefined || val === null) return;
    el.value = val;
  }
  if (g.income)        _setField('v21r-income',       Math.round(g.income));
  if (g.takeHome)      _setField('v21r-takehome',      Math.round(g.takeHome));
  if (g.ccDebt)        _setField('v21r-cc-debt',       Math.round(g.ccDebt));
  if (g.carDebt)       _setField('v21r-car-debt',      Math.round(g.carDebt));
  if (g.studentDebt)   _setField('v21r-student-debt',  Math.round(g.studentDebt));
  if (g.otherDebt)     _setField('v21r-other-debt',    Math.round(g.otherDebt));
  if (g.emergency)     _setField('v21r-emergency',     g.emergency);
}
window._v21_prefillRefineForm = _v21_prefillRefineForm;

/* ── PHASE 4 FINISH: BRIDGE TO ENGINE ─────────────────── */
function v21FinishOnboarding() {
  console.log('[STEP4] entered v21FinishOnboarding');
  window._v21_settingsMode = false; // always reset after save
  try {
    window.TRACENT_TELEMETRY.flowState.refinementComplete = true;
    registerMeaningfulAction('onboarding_refinement_completed');
    tracentEnterScreen('analysis');
    clearCtaIgnore('refine_cta');
  } catch(e) {}

  // Stage 1: Bridge refine form → legacy hidden inputs
  try {
    console.log('[STEP4] calling v21BridgeToEngine');
    v21BridgeToEngine();
    console.log('[STEP4] v21BridgeToEngine OK, housingType=', typeof housingType !== 'undefined' ? housingType : 'undef');
  } catch(e) {
    console.error('[STEP4 CRASH] v21BridgeToEngine threw:', e);
    // Set safe fallback so compute doesn't crash
    if (typeof housingType !== 'undefined' && !housingType) housingType = 'renting';
  }

  // Stage 2: Mark score state
  if (typeof G !== 'undefined') {
    G.scoreEstimated      = false;
    G.scoreFinal          = true;
    // profileCompleteness is now computed from real inputs in v21BridgeToEngine
    // Only set a floor if bridge didn't produce a value
    if (!G.profileCompleteness || G.profileCompleteness < 25) G.profileCompleteness = 40;
    try { G.lastScoreDrivers = v21ComputeDrivers(); } catch(e) { G.lastScoreDrivers = []; }
  }

  // Stage 3: Show analysis screen
  console.log('[STEP4] showing screen-analysis');
  if (typeof showScreen === 'function') showScreen('screen-analysis');

  // Stage 4: Fire engine (scoreComputed is dispatched by wrapCompute on success)
  console.log('[STEP4] firing analysis engine');
  if (typeof _0xf1a6af7 === 'function') {
    try { _0xf1a6af7(); } catch(e) {
      console.error('[STEP4 CRASH] _0xf1a6af7 threw:', e);
      var _greet = document.getElementById('analysis-greeting');
      if (_greet) _greet.textContent = 'Something went wrong — please try again.';
    }
  } else if (typeof _0x82f61a0 === 'function') {
    setTimeout(function() {
      try { _0x82f61a0(); } catch(e) {
        console.error('[STEP4 CRASH] _0x82f61a0 threw:', e);
        var _greet = document.getElementById('analysis-greeting');
        if (_greet) _greet.textContent = 'Something went wrong — please try again.';
      }
    }, 3200);
  }
}

function v21BridgeToEngine() {
  function setVal(id, val) {
    var el = document.getElementById(id);
    if (el && val !== null && val !== undefined) el.value = val;
  }
  function getNum(id) {
    var el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(String(el.value || '').replace(/[^0-9.]/g,'')) || 0;
  }
  function getStr(id) {
    var el = document.getElementById(id);
    return el ? (el.value || '') : '';
  }

  var intent  = (typeof G !== 'undefined' && G.primaryIntent) || 'stable';
  var signal  = (typeof G !== 'undefined' && G.financialResilienceSignal) || 'somewhat';
  var archetype = (typeof G !== 'undefined' && G.archetype) || 'stabilizer';

  // ── Inferred fields tracking ─────────────────────────────────────
  if (typeof G !== 'undefined') G._inferredFields = [];
  function markInferred(label) {
    if (typeof G !== 'undefined') G._inferredFields.push(label);
  }
  function markReal(label) {
    // no-op — real inputs don't need tracking, absence of inferred == real
  }

  // ── 1. Name ──────────────────────────────────────────────────────
  var nameVal = getStr('v21r-name').trim();
  setVal('firstname', nameVal);
  if (typeof G !== 'undefined') G.firstname = nameVal || '';

  // ── 2. State ─────────────────────────────────────────────────────
  var stateVal = getStr('v21r-state') || 'NY';
  if (stateVal === 'Other') stateVal = 'TX';
  setVal('state', stateVal);
  if (typeof G !== 'undefined') G.state = stateVal;

  // ── 3. Income ────────────────────────────────────────────────────
  var incomeVal = getNum('v21r-income');
  if (incomeVal > 0) {
    setVal('income', incomeVal);
    if (typeof G !== 'undefined') G.income = incomeVal;
    markReal('income');
  } else {
    setVal('income', '');
    if (typeof G !== 'undefined') G.income = 0;
    markInferred('income (not provided)');
  }

  // ── 4. Take-home monthly ─────────────────────────────────────────
  var takeHomeVal = getNum('v21r-takehome');
  if (takeHomeVal > 100 && (incomeVal <= 0 || takeHomeVal < incomeVal)) {
    setVal('takehome', takeHomeVal);
    if (typeof G !== 'undefined') G.takeHome = takeHomeVal;
    markReal('take-home');
  } else {
    // Leave blank — engine will estimate from income + state tax
    setVal('takehome', '');
    markInferred('take-home (estimated from income)');
  }

  // ── 5. Intent-specific real inputs ───────────────────────────────
  var intentToGoal = { stable:'build_savings', debt:'pay_off_debt', home:'buy_home',
                       grow:'invest_more', retire:'retire_early' };
  setVal('goal', intentToGoal[intent] || 'build_savings');

  if (intent === 'stable') {
    // Expenses
    var expVal = getNum('v21r-expenses');
    if (expVal > 0) { setVal('expenses', expVal); markReal('expenses'); }
    else { setVal('expenses', '900'); markInferred('expenses (default $900)'); }

    // CC debt — real number, not inferred from band
    var ccVal = getNum('v21r-cc-debt');
    setVal('cc-debt', ccVal); setVal('cc-rate', '21');
    if (ccVal > 0) markReal('cc-debt');
    else markInferred('cc-debt (entered as zero)');

    // Emergency
    var efVal = getStr('v21r-emergency') || '0';
    setVal('emergency', efVal);
    if (typeof G !== 'undefined') G.emergency = efVal;
    if (efVal !== '0') markReal('emergency-fund');
    else markInferred('emergency-fund (none reported)');

    // Housing default for stable intent
    setVal('rent-amount', '1500');
    if (typeof selectHousing === 'function') selectHousing('renting');
    else if (typeof housingType !== 'undefined') housingType = 'renting';
    markInferred('housing (default renting)');

    // Defaults for unused fields
    setVal('car-debt', '0'); setVal('car-payment', '0');
    setVal('other-debt', '0'); setVal('other-payment', '0');
    setVal('student-debt', '0'); setVal('student-payment', '0');

  } else if (intent === 'debt') {
    // CC debt — always a real field in both onboarding and settings
    var ccVal2 = getNum('v21r-cc-debt');
    setVal('cc-debt', ccVal2); setVal('cc-rate', '21');
    if (ccVal2 > 0) markReal('cc-debt');
    else markInferred('cc-debt (entered as zero)');

    if (window._v21_settingsMode) {
      // Settings: individual real balance fields — no estimation
      var carDebtVal = getNum('v21r-car-debt');
      setVal('car-debt', carDebtVal);
      setVal('car-payment', carDebtVal > 0 ? Math.round(carDebtVal / 60) : '0');
      if (carDebtVal > 0) markReal('car-debt'); else markInferred('car-debt (zero)');

      var stuDebtVal = getNum('v21r-student-debt');
      setVal('student-debt', stuDebtVal);
      setVal('student-payment', stuDebtVal > 0 ? Math.max(Math.round(stuDebtVal / 120), 100) : '0');
      if (stuDebtVal > 0) markReal('student-debt'); else markInferred('student-debt (zero)');

      var othDebtVal = getNum('v21r-other-debt');
      setVal('other-debt', othDebtVal);
      setVal('other-payment', othDebtVal > 0 ? Math.max(Math.round(othDebtVal / 60), 50) : '0');
      if (othDebtVal > 0) markReal('other-debt'); else markInferred('other-debt (zero)');
    } else {
      // Onboarding: lumped monthly payments → car-payment proxy for cash flow only.
      // Do NOT fabricate a debt balance from payments.
      var totalPmts = getNum('v21r-monthly-debt-payments');
      setVal('car-payment', totalPmts > 0 ? totalPmts : '0');
      setVal('car-debt', '0');
      setVal('student-debt', '0'); setVal('student-payment', '0');
      setVal('other-debt', '0');   setVal('other-payment', '0');
      if (totalPmts > 0) markReal('monthly-debt-payments');
      else markInferred('debt-payments (none entered)');
    }

    // Emergency
    var efVal2 = getStr('v21r-emergency') || '0';
    setVal('emergency', efVal2);
    if (typeof G !== 'undefined') G.emergency = efVal2;
    if (efVal2 !== '0') markReal('emergency-fund');
    else markInferred('emergency-fund (none reported)');

    // Expenses default
    setVal('expenses', '900'); markInferred('expenses (default)');

    // Housing default
    setVal('rent-amount', '1500');
    if (typeof selectHousing === 'function') selectHousing('renting');
    else if (typeof housingType !== 'undefined') housingType = 'renting';
    markInferred('housing (default renting)');

  } else if (intent === 'home') {
    // Target home price
    var hpVal = getNum('v21r-home-price');
    if (hpVal > 0) {
      setVal('home-price', hpVal); setVal('renter-target-price', hpVal);
      if (typeof G !== 'undefined') G.homePrice = hpVal; G.targetHomePrice = hpVal;
      markReal('home-price');
    } else {
      setVal('home-price', '400000'); setVal('renter-target-price', '400000');
      markInferred('home-price (default $400k)');
    }

    // Deposit saved
    var dpVal = getNum('v21r-deposit-saved');
    setVal('deposit-saved', dpVal); setVal('renter-savings', dpVal);
    if (typeof G !== 'undefined') G.depositSaved = dpVal;
    if (dpVal > 0) markReal('deposit-saved');
    else markInferred('deposit-saved (none entered)');

    // Monthly debt payments
    var pmtsHome = getNum('v21r-monthly-debt-payments');
    setVal('car-payment', pmtsHome);
    if (pmtsHome > 0) { setVal('car-debt', Math.round(pmtsHome * 24)); markReal('monthly-debt-payments'); }
    else { setVal('car-debt', '0'); }

    // Credit band — real, not inferred from signal
    var creditBand = getStr('v21r-credit-band') || 'fair';
    if (typeof selectedCredit !== 'undefined') selectedCredit = creditBand;
    if (getStr('v21r-credit-band')) markReal('credit-band');
    else markInferred('credit-band (default fair)');

    // Housing type: renting (buying)
    setVal('current-rent', '1500');
    if (typeof selectHousing === 'function') selectHousing('buying');
    else if (typeof housingType !== 'undefined') housingType = 'buying';

    // Defaults
    setVal('emergency', '3'); setVal('expenses', '900');
    setVal('cc-debt', '0'); setVal('cc-rate', '21');
    setVal('other-debt', '0'); setVal('other-payment', '0');
    setVal('student-debt', '0'); setVal('student-payment', '0');
    markInferred('expenses (default)'); markInferred('emergency-fund (default 3 mo)');

  } else if (intent === 'grow') {
    // Expenses
    var expGrow = getNum('v21r-expenses');
    if (expGrow > 0) { setVal('expenses', expGrow); markReal('expenses'); }
    else { setVal('expenses', '900'); markInferred('expenses (default)'); }

    // Savings amount — maps to renter-savings for net worth calc
    var savAmt = getNum('v21r-savings-amount');
    setVal('renter-savings', savAmt);
    if (typeof G !== 'undefined') G.savingsAmt = savAmt;
    if (savAmt > 0) markReal('savings-amount');
    else markInferred('savings (entered as zero)');

    // Emergency
    var efGrow = getStr('v21r-emergency') || '3';
    setVal('emergency', efGrow);
    if (typeof G !== 'undefined') G.emergency = efGrow;
    if (efGrow !== '0') markReal('emergency-fund');
    else markInferred('emergency-fund (none reported)');

    // Housing default
    setVal('rent-amount', '1500');
    if (typeof selectHousing === 'function') selectHousing('renting');
    else if (typeof housingType !== 'undefined') housingType = 'renting';
    markInferred('housing (default renting)');

    setVal('cc-debt', '0'); setVal('cc-rate', '21');
    setVal('car-debt', '0'); setVal('car-payment', '0');
    setVal('other-debt', '0'); setVal('other-payment', '0');
    setVal('student-debt', '0'); setVal('student-payment', '0');

  } else if (intent === 'retire') {
    // Retirement contributions
    var retireVal = getStr('v21r-retire') || 'none';
    var retMap = { none:'none', irregular:'partial', consistent:'partial', maxed:'full' };
    setVal('retirement-match', retMap[retireVal] || 'none');
    if (typeof G !== 'undefined') G.retMatch = retMap[retireVal] || 'none';
    if (getStr('v21r-retire')) markReal('retirement-contributions');
    else markInferred('retirement-contributions (default none)');

    // Emergency
    var efRetire = getStr('v21r-emergency') || '0';
    setVal('emergency', efRetire);
    if (typeof G !== 'undefined') G.emergency = efRetire;
    if (efRetire !== '0') markReal('emergency-fund');
    else markInferred('emergency-fund (none reported)');

    // Monthly debt payments
    var pmtsRetire = getNum('v21r-monthly-debt-payments');
    setVal('car-payment', pmtsRetire);
    if (pmtsRetire > 0) { setVal('car-debt', Math.round(pmtsRetire * 24)); markReal('monthly-debt-payments'); }
    else { setVal('car-debt', '0'); }

    // Defaults
    setVal('expenses', '900'); setVal('rent-amount', '1500');
    setVal('cc-debt', '0'); setVal('cc-rate', '21');
    setVal('other-debt', '0'); setVal('other-payment', '0');
    setVal('student-debt', '0'); setVal('student-payment', '0');
    if (typeof selectHousing === 'function') selectHousing('renting');
    else if (typeof housingType !== 'undefined') housingType = 'renting';
    markInferred('expenses (default)'); markInferred('housing (default renting)');

  } else {
    // Fallback: stable path
    var expFb = getNum('v21r-expenses');
    setVal('expenses', expFb > 0 ? expFb : '900');
    var ccFb = getNum('v21r-cc-debt');
    setVal('cc-debt', ccFb); setVal('cc-rate', '21');
    var efFb = getStr('v21r-emergency') || '0';
    setVal('emergency', efFb);
    setVal('rent-amount', '1500');
    if (typeof selectHousing === 'function') selectHousing('renting');
    else if (typeof housingType !== 'undefined') housingType = 'renting';
    setVal('car-debt', '0'); setVal('car-payment', '0');
    setVal('other-debt', '0'); setVal('other-payment', '0');
    setVal('student-debt', '0'); setVal('student-payment', '0');
    markInferred('housing (default renting)');
  }

  // ── 6. Credit — only infer from signal if no credit answer given ──
  // Home intent already set credit from real input above.
  if (intent !== 'home') {
    var sigToCredit = {
      completely: 'excellent', very_well: 'good', somewhat: 'fair',
      very_little: 'below', not_at_all: 'poor'
    };
    var inferredCredit = sigToCredit[signal] || 'fair';
    if (typeof selectedCredit !== 'undefined') selectedCredit = inferredCredit;
    markInferred('credit (inferred from resilience signal: ' + signal + ')');
  }

  // ── 7. Profile completeness — real fields only ────────────────────
  var realCount = 0;
  if (getNum('v21r-income') > 0)                 realCount++;
  if (getNum('v21r-takehome') > 0)               realCount++;
  if (getNum('v21r-expenses') > 0)               realCount++;
  if (getNum('v21r-cc-debt') >= 0 && document.getElementById('v21r-cc-debt')) realCount++;
  if (getNum('v21r-monthly-debt-payments') >= 0 && document.getElementById('v21r-monthly-debt-payments')) realCount++;
  if (getNum('v21r-home-price') > 0)             realCount++;
  if (getNum('v21r-deposit-saved') >= 0 && document.getElementById('v21r-deposit-saved')) realCount++;
  if (getStr('v21r-emergency') && getStr('v21r-emergency') !== '0') realCount++;
  if (getStr('v21r-credit-band'))                realCount++;
  if (getStr('v21r-retire'))                     realCount++;
  if (getNum('v21r-savings-amount') >= 0 && document.getElementById('v21r-savings-amount')) realCount++;

  var completeness = Math.round(Math.min(100, 40 + realCount * 8));
  if (typeof G !== 'undefined') G.profileCompleteness = completeness;

  // ── 8. Enable all legacy inputs so engine can read them ──────────
  document.querySelectorAll('#v21-legacy-inputs input, #v21-legacy-inputs select, #v21-legacy-inputs textarea').forEach(function(el) {
    el.removeAttribute('disabled');
  });
}

function v21ComputeDrivers() {
  var intent  = (typeof G !== 'undefined' && G.primaryIntent) || 'stable';
  var signal  = (typeof G !== 'undefined' && G.financialResilienceSignal) || 'somewhat';
  var drivers = [];
  if (signal === 'completely' || signal === 'very_well') {
    drivers.push({ text: '+4 resilience strength', type: 'positive' });
  } else if (signal === 'not_at_all' || signal === 'very_little') {
    drivers.push({ text: '-3 resilience pressure', type: 'negative' });
  } else {
    drivers.push({ text: '± resilience being built', type: 'neutral' });
  }
  if (intent === 'debt')    drivers.push({ text: '-2 debt pressure flagged', type: 'negative' });
  if (intent === 'home')    drivers.push({ text: '+2 home readiness tracked', type: 'positive' });
  if (intent === 'retire')  drivers.push({ text: '+2 retirement clarity', type: 'positive' });
  if (intent === 'grow')    drivers.push({ text: '+1 growth orientation', type: 'positive' });
  drivers.push({ text: '+1 first profile complete', type: 'positive' });
  return drivers;
}

/* ── SCORE BAND DISPLAY ────────────────────────────────── */
function v21UpdateScoreBand(score, animated) {
  var band = v21BandForScore(score);

  // Update score ring glow class
  var glowEl = document.getElementById('score-ring-glow');
  if (glowEl) {
    glowEl.className = 'score-ring-glow';
    var bandKey = score <= 39 ? 'fragile' : score <= 54 ? 'exposed' : score <= 69 ? 'stabilizing' : score <= 84 ? 'advancing' : 'compounding';
    glowEl.classList.add('band-' + bandKey + '-glow');
  }

  // Update score ring arc colour
  var arcEl = document.getElementById('score-ring-arc');
  if (arcEl) arcEl.style.stroke = band.color;

  // Update score badge text
  var badgeEl = document.getElementById('score-badge');
  if (badgeEl) {
    var bandLabels = { 0:'FRAGILE', 40:'EXPOSED', 55:'STABILIZING', 70:'ADVANCING', 85:'COMPOUNDING' };
    var key = score <= 39 ? 0 : score <= 54 ? 40 : score <= 69 ? 55 : score <= 84 ? 70 : 85;
    var labelMap = { 0:'FRAGILE', 40:'EXPOSED', 55:'STABILIZING', 70:'ADVANCING', 85:'COMPOUNDING' };
    badgeEl.textContent = labelMap[key];
  }

  // Update score title text
  var titleEl = document.getElementById('score-title');
  var titleMap = {
    fragile:     'Financial position is fragile',
    exposed:     'Exposed to shocks — building',
    stabilizing: 'Building real stability',
    advancing:   'Moving beyond the basics',
    compounding: 'Momentum is compounding'
  };
  var bandKey2 = score <= 39 ? 'fragile' : score <= 54 ? 'exposed' : score <= 69 ? 'stabilizing' : score <= 84 ? 'advancing' : 'compounding';
  if (titleEl) titleEl.textContent = titleMap[bandKey2];
}

/* ── DRIVER STRIP (why your score moved) ──────────────── */
function v21RenderDriverStrip() {
  var strip = document.getElementById('v21-driver-strip');
  if (!strip) return;
  var drivers = (typeof G !== 'undefined' && G.lastScoreDrivers) || [];
  if (!drivers.length) { strip.style.display = 'none'; return; }
  strip.innerHTML = drivers.map(function(d) {
    return '<div class="v21-driver-chip ' + (d.type || 'neutral') + '">' + d.text + '</div>';
  }).join('');
  strip.style.display = 'flex';
}

/* ── MODE RAIL ─────────────────────────────────────────── */
// v21SetMode defined in UI controller block
// v21SetMode defined in UI controller

/* ── NEXT BEST MOVE CARD (V21 ENHANCED) ───────────────── */
var _v21MoveIndex = 0;

function v21RenderNBMCard() {
  var card = document.getElementById('v21-nbm-card');
  // Require a final score (set by the real engine) before showing NBM
  if (!card || typeof G === 'undefined' || !G.score || !G.scoreFinal) return;

  var moves = v21GetRankedMoves();
  var idx   = Math.min(_v21MoveIndex, moves.length - 1);
  var move  = moves[idx] || moves[0];

  var tEl   = document.getElementById('v21-nbm-title');
  var dEl   = document.getElementById('v21-nbm-desc');
  var iEl   = document.getElementById('v21-nbm-impact');
  var cEl   = document.getElementById('v21-nbm-cash');
  var tEl2  = document.getElementById('v21-nbm-time');

  if (tEl)  tEl.textContent  = move.title;
  if (dEl)  dEl.textContent  = move.why + ' ' + move.action;
  if (iEl)  iEl.textContent  = move.scoreImpact > 0 ? '+' + move.scoreImpact : move.scoreImpact;
  if (cEl)  cEl.textContent  = move.cashImpact  || '—';
  if (tEl2) tEl2.textContent = move.timeToStart || '—';

  // Show/hide easier button
  var easierBtn = document.getElementById('v21-nbm-easier-btn');
  if (easierBtn) easierBtn.style.display = moves.length > 1 ? 'inline-flex' : 'none';

  card.style.display = 'block';
  // Telemetry: NBM shown
  try { tracentTrack('nbm_shown', { moveTitle: (typeof tEl !== 'undefined' && tEl ? tEl.textContent : '') }); pbfdeState.nbmViewCount++; } catch(e) {}
  // Premium: glow pulse on each NBM update
  try { tracentPulseNBM(); } catch(e) {}
}

function v21ShowNextMove(direction) {
  try { tracentTrack('nbm_clicked', { action: 'shift', direction: direction || 1 }); registerMeaningfulAction('nbm_clicked'); } catch(e) {}
  var moves = v21GetRankedMoves();
  _v21MoveIndex = Math.min(Math.max(0, _v21MoveIndex + (direction || 1)), moves.length - 1);
  v21RenderNBMCard();
}

function v21GetRankedMoves() {
  if (typeof G === 'undefined') return [];
  var intent = G.primaryIntent || 'stable';
  var signal = G.financialResilienceSignal || 'somewhat';
  var score  = G.score || 55;
  var dti    = G.dti   || 0;
  var fcf    = G.fcf   || 0;
  var cc     = G.ccDebt || 0;
  var ef     = parseInt(G.emergency || '0');

  var allMoves = [];

  // Emergency fund — always first if missing
  if (ef === 0) {
    allMoves.push({
      title:       'Build a 1-month cash buffer target',
      why:         'No emergency savings detected — this is the fastest resilience improvement.',
      action:      'Set a target amount and automate $50–100/mo to a separate savings account.',
      scoreImpact: 7, cashImpact: 'Low cost', timeToStart: 'Today', priority: 10, confidence: 'high'
    });
  } else if (ef < 3) {
    allMoves.push({
      title:       'Grow emergency fund to 3 months',
      why:         'Under 3 months of expenses leaves you exposed to shocks.',
      action:      'Redirect extra cash to savings before debt payoff — resilience first.',
      scoreImpact: 5, cashImpact: 'Varies', timeToStart: 'This week', priority: 8, confidence: 'high'
    });
  }

  // CC debt
  if (cc > 2000) {
    allMoves.push({
      title:       'Attack the highest-rate credit balance',
      why:         '$' + Math.round(cc).toLocaleString() + ' in credit card debt is costing real money every month in interest.',
      action:      'Pay the minimum on everything else. Put every spare dollar at this balance first.',
      scoreImpact: 6, cashImpact: '+$' + Math.round(cc * 0.20 / 12) + '/mo saved', timeToStart: 'This month', priority: 9, confidence: 'high'
    });
  }

  // DTI
  if (dti > 43) {
    allMoves.push({
      title:       'Reduce debt load to get DTI under 43%',
      why:         'Your DTI of ' + dti + '% is above lender thresholds — limiting borrowing power.',
      action:      'Focus on the debt with the highest payment relative to its balance.',
      scoreImpact: 5, cashImpact: 'Frees payments', timeToStart: '1–2 months', priority: 7, confidence: 'high'
    });
  }

  // Intent-specific moves
  var intentMoves = {
    home: {
      title:       'Calculate your real deposit gap',
      why:         'Home readiness starts with a real number — not an estimate.',
      action:      'Open the Home tab and run your deposit and affordability numbers.',
      scoreImpact: 3, cashImpact: 'Planning only', timeToStart: 'Today', priority: 6, confidence: 'medium'
    },
    retire: {
      title:       'Confirm your retirement contribution baseline',
      why:         'You can\'t improve what you haven\'t measured.',
      action:      'Check your current contribution rate and employer match in your HR portal.',
      scoreImpact: 4, cashImpact: 'Free money', timeToStart: 'This week', priority: 7, confidence: 'high'
    },
    debt: {
      title:       'Rank all debts by interest rate',
      why:         'The avalanche method saves the most money — but only if you know the order.',
      action:      'Go to the Debt tab — your ranked payoff plan is there.',
      scoreImpact: 4, cashImpact: 'Saves interest', timeToStart: 'Today', priority: 7, confidence: 'high'
    },
    grow: {
      title:       'Free up $' + Math.max(50, Math.round((fcf || 200) * 0.2)) + '/mo to invest',
      why:         'Compound growth needs a consistent input — even small amounts work if regular.',
      action:      'Review your largest recurring expense. Redirect what you save to an index fund.',
      scoreImpact: 3, cashImpact: 'Varies', timeToStart: '2 weeks', priority: 5, confidence: 'medium'
    },
    stable: {
      title:       'Set a monthly budget target',
      why:         'Stability without a target is just luck. A plan makes it intentional.',
      action:      'Write down your take-home, fixed costs, and what\'s left. That\'s your starting budget.',
      scoreImpact: 3, cashImpact: 'Planning only', timeToStart: 'Today', priority: 5, confidence: 'high'
    }
  };
  var im = intentMoves[intent];
  if (im) allMoves.push(im);

  // Score-specific nudge
  if (score >= 70) {
    allMoves.push({
      title:       'Start contributing to long-term investments',
      why:         'Your financial foundation is solid enough to start compounding.',
      action:      'Open or top up a low-cost index fund investment account.',
      scoreImpact: 2, cashImpact: 'Varies', timeToStart: 'This month', priority: 3, confidence: 'medium'
    });
  }

  // Sort by priority descending
  allMoves.sort(function(a, b) { return b.priority - a.priority; });

  return allMoves.length ? allMoves : [{
    title: 'Keep reviewing your position monthly',
    why:   'Your score is solid — small consistent improvements compound over time.',
    action:'Check in weekly and update your numbers when anything changes.',
    scoreImpact: 1, cashImpact: 'Steady', timeToStart: 'Weekly', priority: 1, confidence: 'high'
  }];
}

/* ── DASHBOARD POST-ANALYSIS RENDER ───────────────────── */
// Called after tracent:scoreComputed fires with final=true
document.addEventListener('tracent:scoreComputed', function(e) {
  var detail = e.detail || {};
  // Guard: only fire post-analysis render on a confirmed final (non-estimated) score
  // Preview-phase dispatches carry { estimated:true, final:false } — they must NOT
  // trigger the dashboard render.
  if (detail.final === true && detail.estimated !== true) {
    v21RenderPostAnalysis();
  }
});

function v21RenderPostAnalysis() {
  // Only run after the real weighted engine has finished — not during preview
  if (typeof G === 'undefined' || !G.score || !G.scoreFinal) return;

  // Update score band display
  v21UpdateScoreBand(G.score, true);

  // Show "Your Tracent Score" eyebrow on first reveal
  var eyebrow = document.getElementById('v21-score-reveal-eyebrow');
  if (eyebrow) eyebrow.style.display = 'block';

  // Count-up score number for premium feel
  try {
    var scoreNumEl = document.querySelector('.score-ring-num, #score-number, .score-number');
    if (scoreNumEl && G.score) tracentCountNumber(scoreNumEl, 0, G.score, 420);
  } catch(e) {}

  // Premium: score hero reveal choreography
  try { tracentRevealScoreHero({ haptic: true }); } catch(e) {}

  // Render driver strip
  v21RenderDriverStrip();

  // Render V21 NBM card
  _v21MoveIndex = 0;
  v21RenderNBMCard();

  // Show retention card — only when data is complete enough (READY state)
  var retCard = document.getElementById('v21-retention-card');
  var _retComp = typeof G !== 'undefined' ? Number(G.profileCompleteness || 0) : 0;
  if (retCard) retCard.style.display = _retComp >= 60 ? 'block' : 'none';

  // Show premium teaser only after repeat use (deferred trust pattern)
  // shouldShowPremium() defined in the board-pass IIFE; hide by default until ready
  if (!window._tracentPlus) {
    var premCard = document.getElementById('v21-premium-teaser');
    if (premCard) {
      var showIt = (typeof window.shouldShowPremium === 'function')
        ? window.shouldShowPremium()
        : false; // default-hide until the board-pass function is loaded
      premCard.style.display = showIt ? 'block' : 'none';
    }
  }

  // Populate monthly review card with live data
  v21BuildMonthlyReviewData();

  // Highlight active mode based on intent
  var intent = G.primaryIntent || 'stable';
  var intentToMode = { home:'home', debt:'debt', grow:'grow', retire:'retire' };
  var activeMode   = intentToMode[intent] || 'today';
  document.querySelectorAll('.v21-mode-btn').forEach(function(b) { b.classList.remove('active'); });
  var activeBtn = document.getElementById('mode-btn-' + activeMode);
  if (activeBtn) activeBtn.classList.add('active');
}

function v21BuildMonthlyReviewData() {
  if (typeof G === 'undefined') return;
  var score = G.score || 0;

  // ── Deterministic delta: use stored previous score if available ──
  // G._scoreHistory is an array of {score, ts} entries written on each analysis run.
  // If no history yet, delta is 0 (first analysis — no comparison point).
  var prev  = null;
  var delta = 0;
  var deltaLabel = 'First analysis — no comparison yet';

  if (G._scoreHistory && G._scoreHistory.length >= 2) {
    var last    = G._scoreHistory[G._scoreHistory.length - 1];
    var prev2   = G._scoreHistory[G._scoreHistory.length - 2];
    prev  = prev2.score;
    delta = last.score - prev;
    var daysAgo = Math.round((Date.now() - new Date(prev2.ts).getTime()) / 86400000);
    deltaLabel  = (delta >= 0 ? '+' : '') + delta + ' points vs ' + daysAgo + ' day' + (daysAgo === 1 ? '' : 's') + ' ago';
  } else if (G._scoreHistory && G._scoreHistory.length === 1) {
    deltaLabel = 'First recorded score — check in next month to see movement';
  }

  // Biggest win and drag from real score drivers
  var drivers = G.lastScoreDrivers || [];
  var wins    = drivers.filter(function(d) { return d.type === 'positive'; });
  var drags   = drivers.filter(function(d) { return d.type === 'negative'; });

  var revScore = document.getElementById('v21-rev-score');
  var revDelta = document.getElementById('v21-rev-delta');
  var revWin   = document.getElementById('v21-rev-win');
  var revDrag  = document.getElementById('v21-rev-drag');
  var revRec   = document.getElementById('v21-rev-rec');
  var revComm  = document.getElementById('v21-rev-commitment');

  if (revScore) revScore.textContent = score + '/100 · ' + v21BandForScore(score).label.replace(/[⬤●🔴🟡🔵🟢⬡]\s*/,'');
  if (revDelta) {
    revDelta.textContent = deltaLabel;
    revDelta.className = 'v21-review-val ' + (delta > 0 ? 'v21-review-win' : delta < 0 ? 'v21-review-drag' : '');
  }
  if (revWin)  revWin.textContent  = wins.length  ? wins[0].text  : 'Completed your profile';
  if (revDrag) revDrag.textContent = drags.length ? drags[0].text : 'Maintain current habits';

  var moves = v21GetRankedMoves();
  if (revRec)  revRec.textContent  = moves.length ? moves[0].title : 'Keep reviewing monthly';
  if (revComm) {
    var name = (G.firstname ? G.firstname + ', your' : 'Your');
    revComm.textContent = name + ' commitment this month: ' +
      (moves.length ? moves[0].action : 'Stay consistent and check in weekly.');
  }
}

/* ── RETENTION LAYER ACTIONS ───────────────────────────── */
function v21OpenCheckin()       { openModal('v21-checkin-overlay'); }
function v21OpenMonthlyReview() {
  // Premium: stagger reveal review rows after sheet opens
  setTimeout(function() { try { tracentRevealMonthlyReview(); } catch(e) {} }, 80);
  v21BuildMonthlyReviewData();
  openModal('v21-review-overlay');
}
function v21OpenLifeEvents()    { openModal('v21-events-overlay'); }

function v21CheckinFlag(btn, flagKey) {
  // Toggle yes/no styling
  var row = btn.parentElement;
  row.querySelectorAll('.v21-yn-btn').forEach(function(b) {
    b.classList.remove('yes','no');
  });
  var isYes = flagKey.endsWith('_yes');
  btn.classList.add(isYes ? 'yes' : 'no');
  _v21CheckinData[flagKey] = isYes;
}

function v21SaveCheckin() {
  // Record checkin timestamp
  var hasChanges = Object.values(_v21CheckinData).some(function(v) { return v === true; });
  if (hasChanges) {
    // Store in G for persistence
    if (typeof G !== 'undefined') {
      G.v21CheckinFlags    = _v21CheckinData;
      G.v21LastCheckin     = new Date().toISOString();
      // If any "yes" flags, suggest updating full profile
      var needsUpdate = _v21CheckinData.income_yes || _v21CheckinData.debt_yes || _v21CheckinData.savings_yes;
      if (needsUpdate && typeof _0x36940e3 === 'function') _0x36940e3();
    }
    // Show confirmation toast
    v21ShowToast('Check-in saved ✓ — numbers updated');
  }
  _v21CheckinData = {};
  closeModal('v21-checkin-overlay');
}

function v21TriggerLifeEvent(eventType, btn) {
  // Highlight selection
  document.querySelectorAll('.v21-life-event-btn').forEach(function(b) {
    b.style.borderColor = ''; b.style.background = '';
  });
  if (btn) { btn.style.borderColor = 'var(--sky)'; btn.style.background = 'var(--sky-dim)'; }

  // Update G.lifeEvent and sync to engine
  if (typeof G !== 'undefined') G.v21LifeEvent = eventType;
  var legacyEl = document.getElementById('life-event');
  if (legacyEl) legacyEl.value = eventType;

  // Apply life-event weighting adjustments
  var eventMessages = {
    new_job:     'New job logged. Score and roadmap will update when you re-run your analysis.',
    raise:       'Raise logged. Update your income and re-run your analysis to see the full impact.',
    move:        'Moving logged. Housing costs and readiness will adjust.',
    bonus:       'Bonus noted. Consider directing it at your top-priority goal.',
    new_baby:    'New baby logged. Expense estimates updated. Resilience priority raised.',
    job_loss:    'Job loss noted. Emergency fund becomes the highest priority.',
    divorce:     'Separation noted. Financial picture will need a full re-run.',
    health:      'Medical event noted. Resilience and emergency fund weighting increased.',
    inheritance: 'Inheritance noted. This is an opportunity to accelerate your roadmap significantly.',
    bereavement: 'Logged. Take your time — Tracent will be here when you\'re ready to update.'
  };

  v21ShowToast(eventMessages[eventType] || 'Life event logged.');
  setTimeout(function() { closeModal('v21-events-overlay'); }, 1800);
}

/* ── TOAST NOTIFICATIONS ───────────────────────────────── */

// ── V21 overrides + exports ────────────────────────────────
window.startOnboarding = function() {
  // Reset V21 state
  _v21OnbStart   = Date.now();
  _v21TapTimes   = [];
  _v21PhaseStack = ['intent'];
  _v21MoveIndex  = 0;
  if (typeof G !== 'undefined') {
    G.primaryIntent            = null;
    G.financialResilienceSignal = null;
    G.scoreEstimated           = false;
    G.scoreFinal               = false;
  }

  // Show the onboarding screen
  if (typeof showScreen === 'function') showScreen('screen-onboarding');

  // Activate intent phase
  v21SetPhase('intent');

  // Enable all legacy inputs so they're readable
  document.querySelectorAll('#v21-legacy-inputs input, #v21-legacy-inputs select, #v21-legacy-inputs textarea').forEach(function(el) {
    el.removeAttribute('disabled');
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'instant' });
};
window._tracent_startOnboarding = window.startOnboarding;

/* ── HOOK INTO EXISTING showDashboard ───────────────────
   After engine analysis completes, run V21 post-render.
─────────────────────────────────────────────────────────*/
var _origShowDashboard = window.showDashboard;
window.showDashboard = function() {
  if (typeof _origShowDashboard === 'function') _origShowDashboard();
  // Fire V21 post-analysis render after a tick (engine data must be settled)
  setTimeout(v21RenderPostAnalysis, 120);
};

/* ── HOOK INTO EXISTING continueSession ─────────────────
   Returning users also get V21 dashboard enhancements.
─────────────────────────────────────────────────────────*/
var _origContinueSession = window.continueSession;
window.continueSession = function() {
  if (typeof _origContinueSession === 'function') _origContinueSession();
  setTimeout(v21RenderPostAnalysis, 350);
};

/* ── EXPOSE V21 GLOBALS ────────────────────────────────── */
window.v21SelectIntent       = v21SelectIntent;
window.v21SelectSignal       = v21SelectSignal;
window.v21SelectAgeRange     = v21SelectAgeRange;
window.v21ComputeRange        = v21ComputeRange;
window.v21BuildPositionPreview = v21BuildPositionPreview;
window.v21PreviewForIntent     = v21PreviewForIntent;
window.v21BuildRefinePhase   = v21BuildRefinePhase;
window.v21FinishOnboarding   = v21FinishOnboarding;
window.v21BridgeToEngine     = v21BridgeToEngine;
window.v21BackPhase          = v21BackPhase;
window.v21SetMode            = v21SetMode;
window.v21RenderNBMCard      = v21RenderNBMCard;
window.v21ShowNextMove       = v21ShowNextMove;
window.v21OpenCheckin        = v21OpenCheckin;
window.v21OpenMonthlyReview  = v21OpenMonthlyReview;
window.v21OpenLifeEvents     = v21OpenLifeEvents;
window.v21CheckinFlag        = v21CheckinFlag;
window.v21SaveCheckin        = v21SaveCheckin;
window.v21TriggerLifeEvent   = v21TriggerLifeEvent;
// v21ShowToast → exported by render/modals.js
window.v21RenderPostAnalysis = v21RenderPostAnalysis;
window.v21BandForScore       = v21BandForScore;


/* ═══════════════════════════════════════════════════════════════════
   TRACENT TELEMETRY LAYER
   Non-destructive instrumentation. No external deps. No backend.
   Plugs into existing app flow via safe wrappers.
   All hooks are wrapped in try/catch — app stability first.
═══════════════════════════════════════════════════════════════════ */


// ── PBFDE State + Telemetry ────────────────────────────────
// ── 1. PBFDE State — persisted, version-gated ──────────────────────
var pbfdeState = (function() {
  try {
    var s = JSON.parse(localStorage.getItem('tracent_pbfde') || 'null');
    if (s && s.version === 1) {
      // Merge any missing telemetry fields added post-persist
      if (!s.screenDwell)      s.screenDwell      = {};
      if (!s.firstActionDelay) s.firstActionDelay = {};
      if (!s.nbmClickCount)    s.nbmClickCount    = 0;
      if (!s.nbmIgnoreCount)   s.nbmIgnoreCount   = 0;
      if (!s.ignoredCtas)      s.ignoredCtas      = 0;
      if (!s.modalAbandons)    s.modalAbandons     = 0;
      if (!s.repeatedTapCount) s.repeatedTapCount  = 0;
      if (!s.flowAbandons)     s.flowAbandons      = 0;
      return s;
    }
  } catch(e) {}

  return {
    version: 1,

    // ── session + behavioral tracking
    sessionStart:    Date.now(),
    actionsTaken:    0,
    hesitationCount: 0,
    commitmentRate:  0,
    nbmViewCount:    0,
    nbmClickCount:   0,
    nbmIgnoreCount:  0,
    streak:          0,
    lastCommitTs:    0,
    lastNbmViewTs:   0,

    // ── telemetry-specific counters (used by telemetry hooks above)
    screenDwell:       {},
    firstActionDelay:  {},
    ignoredCtas:       0,
    modalAbandons:     0,
    repeatedTapCount:  0,
    flowAbandons:      0,

    // ── aha / learning
    ahaFired:    false,
    ahaHistory:  [],

    // ── stage engine
    stage: 'observe',  // observe | insight | action | habit

    // ── psych model
    psych: {
      confidence:    'unknown',
      anxiety:       'unknown',
      avoidance:     false,
      decisionSpeed: null
    },

    // ── routing / adaptive state
    activeModule: null,

    // ── cached outputs
    behavioralScore: 0,
    lastNBM:         null,
    lastReason:      null,
    lastChips:       null
  };
})();
window.pbfdeState = pbfdeState;

// ── 1b. Persist ────────────────────────────────────────────────────
function pbfdePersist() {
  try {
    localStorage.setItem('tracent_pbfde', JSON.stringify(pbfdeState));
  } catch(e) {}
}
window.pbfdePersist = pbfdePersist;

// ── 1c. Behavioral score ───────────────────────────────────────────
function pbfdeComputeScore() {
  var actions     = pbfdeState.actionsTaken    || 0;
  var hesitations = pbfdeState.hesitationCount || 0;
  var score       = (actions * 2) - hesitations + 1;
  pbfdeState.behavioralScore = Math.max(0, score);
  return pbfdeState.behavioralScore;
}
window.pbfdeComputeScore = pbfdeComputeScore;

// ── 1d. Canonical behavioral tracker ──────────────────────────────
function pbfdeTrack(event, data) {
  try {
    data = data || {};
    pbfdeComputeScore();

    var payload = {
      event:            event,
      data:             data,
      stage:            pbfdeState.stage,
      behavioral_score: pbfdeState.behavioralScore || 0,
      timestamp:        new Date().toISOString()
    };
    console.log('[PBFDE Track]', payload);

    // ── counter updates
    if (event !== 'session_start') {
      pbfdeState.actionsTaken = (pbfdeState.actionsTaken || 0) + 1;
    }
    if (event === 'nbm_shown')    { pbfdeState.nbmViewCount++;  pbfdeState.lastNbmViewTs = Date.now(); }
    if (event === 'nbm_clicked')  pbfdeState.nbmClickCount++;
    if (event === 'nbm_ignored')  pbfdeState.nbmIgnoreCount++;
    if (event === 'cta_ignored')  pbfdeState.ignoredCtas++;
    if (event === 'modal_abandoned') pbfdeState.modalAbandons++;
    if (event === 'flow_abandoned')  pbfdeState.flowAbandons++;
    if (event === 'repeated_tap_detected') pbfdeState.repeatedTapCount++;
    if (event === 'hesitation_detected')   pbfdeState.hesitationCount++;

    // ── commitment rate
    var views = pbfdeState.nbmViewCount || 1;
    pbfdeState.commitmentRate = Math.round((pbfdeState.nbmClickCount / views) * 100) / 100;

    pbfdePersist();
  } catch(e) {}
}
window.pbfdeTrack = pbfdeTrack;

// ── 1e. PBFDE Module ───────────────────────────────────────────────
var PBFDE = (function() {

  function inferPsychology(input) {
    try {
      var decisionTime = (input && input.decisionTime != null) ? input.decisionTime : null;
      if (decisionTime !== null) {
        pbfdeState.psych.decisionSpeed = decisionTime;
        if (decisionTime < 3)      pbfdeState.psych.confidence = 'high';
        else if (decisionTime < 8) pbfdeState.psych.confidence = 'medium';
        else                       pbfdeState.psych.confidence = 'low';
      }
      var hCount = pbfdeState.hesitationCount || 0;
      if (hCount > 3)      pbfdeState.psych.anxiety = 'high';
      else if (hCount > 1) pbfdeState.psych.anxiety = 'medium';
      else                 pbfdeState.psych.anxiety = 'low';

      var nbmV = pbfdeState.nbmViewCount  || 0;
      var acts = pbfdeState.actionsTaken  || 0;
      pbfdeState.psych.avoidance = (nbmV > 3 && acts === 0);
    } catch(e) {}
  }

  function resolveStage() {
    try {
      var actions = pbfdeState.actionsTaken  || 0;
      var commits = pbfdeState.commitmentRate || 0;
      if (actions < 2)      pbfdeState.stage = 'observe';
      else if (actions < 5) pbfdeState.stage = 'insight';
      else if (commits < 0.5) pbfdeState.stage = 'action';
      else                    pbfdeState.stage = 'habit';
    } catch(e) {}
  }

  function selectActiveModule() {
    try {
      if (typeof G !== 'undefined' && G) {
        var intent = G.primaryIntent || G.goal || null;
        var map = { stable:'today', debt:'debt', home:'home', grow:'grow', retire:'retire' };
        pbfdeState.activeModule = map[intent] || 'today';
      } else {
        pbfdeState.activeModule = 'today';
      }
    } catch(e) {}
  }

  function maybeAha() {
    try {
      if (pbfdeState.ahaFired) return;
      if ((pbfdeState.actionsTaken || 0) >= 3) {
        pbfdeState.ahaFired = true;
        pbfdeState.ahaHistory.push({ ts: Date.now(), reason: 'engaged_three_times' });
        pbfdeTrack('aha_moment', { reason: 'engaged_three_times' });
      }
    } catch(e) {}
  }

  function init(input) {
    try {
      inferPsychology(input || {});
      resolveStage();
      selectActiveModule();
      maybeAha();
      pbfdePersist();
    } catch(e) {}
  }

  function update(event, data) {
    try {
      pbfdeTrack(event, data || {});
      inferPsychology({});
      resolveStage();
      selectActiveModule();
      maybeAha();
      pbfdePersist();
    } catch(e) {}
  }

  function getState() {
    try { return JSON.parse(JSON.stringify(pbfdeState)); } catch(e) { return {}; }
  }

  return { init: init, update: update, getState: getState };
})();
window.PBFDE = PBFDE;

// ── 1f. Wire to tracent:scoreComputed ─────────────────────────────
document.addEventListener('tracent:scoreComputed', function(e) {
  try {
    setTimeout(function() {
      var elapsed = (Date.now() - pbfdeState.sessionStart) / 1000;
      PBFDE.init({ decisionTime: elapsed > 30 ? 10 : elapsed });

      var goal = (typeof G !== 'undefined' && G)
        ? (G.primaryIntent || G.goal || null)
        : null;

      pbfdeTrack('session_start', { goal: goal });

      if (typeof G !== 'undefined' && G) {
        pbfdeTrack('goal_selected', {
          goal:  G.primaryIntent || G.goal || null,
          score: G.score || 0
        });
      }
    }, 400);
  } catch(e) {}
});

// ── 2. Canonical Telemetry State ──────────────────────────────────
window.TRACENT_TELEMETRY = {
  sessionId: (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)),
  currentScreen:      null,
  screenEnteredAt:    {},
  firstActionAt:      {},
  screenActionCount:  {},
  lastActionTs:       0,
  tapHistory:         {},
  modalState:         {},
  events:             [],
  flowState: {
    onboardingStarted:    false,
    intentComplete:       false,
    resilienceComplete:   false,
    previewSeen:          false,
    refinementComplete:   false,
    dashboardEntered:     false
  }
};

// ── 3. Core tracker ───────────────────────────────────────────────
function tracentTrack(event, data) {
  try {
    data = data || {};
    var payload = {
      event:     event,
      data:      data,
      ts:        Date.now(),
      sessionId: window.TRACENT_TELEMETRY.sessionId,
      screen:    window.TRACENT_TELEMETRY.currentScreen
    };
    window.TRACENT_TELEMETRY.events.push(payload);
    try { pbfdeTrack(event, data); } catch(e) {}
    if (window.TRACENT_DEBUG_TELEMETRY) {
      console.log('[Tracent Telemetry]', payload);
    }
  } catch(e) {}
}
window.tracentTrack = tracentTrack;

// ── 4. Screen view + dwell ────────────────────────────────────────
function tracentEnterScreen(screenId) {
  try {
    var now = Date.now();
    var T = window.TRACENT_TELEMETRY;
    if (T.currentScreen) {
      var prev = T.currentScreen;
      var enteredAt = T.screenEnteredAt[prev];
      if (enteredAt) {
        var dwell = now - enteredAt;
        tracentTrack('screen_dwell', { screenId: prev, dwellMs: dwell });
        pbfdeState.screenDwell[prev] = dwell;
      }
    }
    T.currentScreen = screenId;
    T.screenEnteredAt[screenId] = now;
    T.firstActionAt[screenId]   = null;
    T.screenActionCount[screenId] = 0;
    tracentTrack('screen_view', { screenId: screenId });
    startHesitationWatch(screenId);
  } catch(e) {}
}
window.tracentEnterScreen = tracentEnterScreen;

// ── 5. Hesitation detection ───────────────────────────────────────
var _hesitationTimers = {};
var HESITATION_MS = 2500;

function startHesitationWatch(screenId) {
  try {
    clearHesitationWatch(screenId);
    _hesitationTimers[screenId] = setTimeout(function() {
      pbfdeState.hesitationCount = (pbfdeState.hesitationCount || 0) + 1;
      tracentTrack('hesitation_detected', { screenId: screenId, idleMs: HESITATION_MS });
    }, HESITATION_MS);
  } catch(e) {}
}
function clearHesitationWatch(screenId) {
  try {
    if (_hesitationTimers[screenId]) {
      clearTimeout(_hesitationTimers[screenId]);
      delete _hesitationTimers[screenId];
    }
  } catch(e) {}
}

// ── 6. Meaningful action helper ───────────────────────────────────
function registerMeaningfulAction(action, data) {
  try {
    data = data || {};
    var T = window.TRACENT_TELEMETRY;
    var screenId = T.currentScreen;
    var now = Date.now();
    if (screenId) {
      if (!T.firstActionAt[screenId]) {
        T.firstActionAt[screenId] = now;
        var enteredAt = T.screenEnteredAt[screenId];
        if (enteredAt) {
          var delay = now - enteredAt;
          tracentTrack('first_action_delay', { screenId: screenId, delayMs: delay });
          pbfdeState.firstActionDelay[screenId] = delay;
        }
      }
      T.screenActionCount[screenId] = (T.screenActionCount[screenId] || 0) + 1;
      clearHesitationWatch(screenId);
      startHesitationWatch(screenId);
    }
    T.lastActionTs = now;
    tracentTrack(action, data);
  } catch(e) {}
}
window.registerMeaningfulAction = registerMeaningfulAction;

// ── 7. Repeated tap detection ─────────────────────────────────────
function trackTapTarget(targetName) {
  try {
    var T = window.TRACENT_TELEMETRY;
    var now = Date.now();
    var key = (T.currentScreen || 'unknown') + ':' + targetName;
    var arr = T.tapHistory[key] || [];
    arr = arr.filter(function(ts) { return now - ts < 1200; });
    arr.push(now);
    T.tapHistory[key] = arr;
    if (arr.length >= 3) {
      tracentTrack('repeated_tap_detected', {
        targetName: targetName,
        taps: arr.length,
        windowMs: 1200
      });
    }
  } catch(e) {}
}
window.trackTapTarget = trackTapTarget;

// ── 8. Scroll indecision ──────────────────────────────────────────
function attachScrollTracking(el, name) {
  try {
    if (!el) return;
    var lastY = 0, lastDir = null, dirChanges = 0;
    el.addEventListener('scroll', function() {
      try {
        var y = el.scrollTop;
        var dir = y > lastY ? 'down' : (y < lastY ? 'up' : lastDir);
        if (dir && lastDir && dir !== lastDir) {
          dirChanges++;
          if (dirChanges >= 3) {
            tracentTrack('scroll_indecision', { container: name, directionChanges: dirChanges });
            dirChanges = 0;
          }
        }
        lastDir = dir;
        lastY = y;
      } catch(e) {}
    }, { passive: true });
  } catch(e) {}
}
window.attachScrollTracking = attachScrollTracking;

// ── 9. CTA ignore detection (visibility + no-action timer) ────────
var _ctaIgnoreTimers = {};
function watchCtaIgnore(ctaName, delayMs) {
  try {
    delayMs = delayMs || 5000;
    if (_ctaIgnoreTimers[ctaName]) return;
    _ctaIgnoreTimers[ctaName] = setTimeout(function() {
      tracentTrack('cta_ignored', { ctaName: ctaName });
      pbfdeState.ignoredCtas = (pbfdeState.ignoredCtas || 0) + 1;
      delete _ctaIgnoreTimers[ctaName];
    }, delayMs);
  } catch(e) {}
}
function clearCtaIgnore(ctaName) {
  try {
    if (_ctaIgnoreTimers[ctaName]) {
      clearTimeout(_ctaIgnoreTimers[ctaName]);
      delete _ctaIgnoreTimers[ctaName];
    }
  } catch(e) {}
}
window.watchCtaIgnore   = watchCtaIgnore;
window.clearCtaIgnore   = clearCtaIgnore;

// ── 10. Debug + dump ──────────────────────────────────────────────
window.TRACENT_DEBUG_TELEMETRY = false; // set true in console to enable
function tracentMarkModalComplete(id) {
  try {
    var ms = window.TRACENT_TELEMETRY.modalState[id];
    if (ms) ms.completed = true;
  } catch(e) {}
}
window.tracentMarkModalComplete = tracentMarkModalComplete;

window.tracentDumpTelemetry = function() {
  return {
    sessionId:  window.TRACENT_TELEMETRY.sessionId,
    events:     window.TRACENT_TELEMETRY.events.slice(-50),
    flowState:  window.TRACENT_TELEMETRY.flowState,
    pbfdeStateSummary: {
      hesitationCount: pbfdeState.hesitationCount,
      actionsTaken:    pbfdeState.actionsTaken,
      commitmentRate:  pbfdeState.commitmentRate,
      nbmViewCount:    pbfdeState.nbmViewCount,
      nbmClickCount:   pbfdeState.nbmClickCount,
      nbmIgnoreCount:  pbfdeState.nbmIgnoreCount,
      confidence:      pbfdeState.psych ? pbfdeState.psych.confidence : null,
      anxiety:         pbfdeState.psych ? pbfdeState.psych.anxiety    : null,
      avoidance:       pbfdeState.psych ? pbfdeState.psych.avoidance  : null,
      stage:           pbfdeState.stage,
      behavioralScore: pbfdeState.behavioralScore,
      ignoredCtas:     pbfdeState.ignoredCtas,
      modalAbandons:   pbfdeState.modalAbandons,
      flowAbandons:    pbfdeState.flowAbandons,
      repeatedTapCount:pbfdeState.repeatedTapCount
    }
  };
};
