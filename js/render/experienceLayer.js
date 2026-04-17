/* ═══ Tracent Render: Experience Layer ═══
   Reads window.BSE.archetype and applies render-layer adaptations.
   Does NOT modify BSE logic, calculations, or architecture.
   Fires after BSE completes its own render pass.

   Public API: TracentExperienceLayer.render()
   Modes: CALM | STANDARD | EXPANDED
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Mode mapping ──────────────────────────────────────── */
  var CALM_ARCHETYPES     = ['anxious_overwhelmed', 'avoider'];
  var EXPANDED_ARCHETYPES = ['optimizer'];

  function _getMode() {
    var arch = (window.BSE && window.BSE.archetype) ? window.BSE.archetype : '';
    if (CALM_ARCHETYPES.indexOf(arch) !== -1)     return 'CALM';
    if (EXPANDED_ARCHETYPES.indexOf(arch) !== -1)  return 'EXPANDED';
    return 'STANDARD';
  }

  /* ── Body mode classes ─────────────────────────────────── */
  function _applyBodyMode(mode) {
    var b = document.body;
    b.classList.remove('xp-mode-calm', 'xp-mode-standard', 'xp-mode-expanded');
    if (mode === 'CALM')     b.classList.add('xp-mode-calm');
    if (mode === 'EXPANDED') b.classList.add('xp-mode-expanded');
    // STANDARD: no extra class — base styles apply
  }

  /* ── Debt tab adaptation ───────────────────────────────── */
  // Visibility of debt tab modules is owned by BSE.
  // This function is retained as a no-op stub so call sites in _render() remain valid.
  function _applyDebtTab(mode) {
  }

  /* ── NBM supportive note ───────────────────────────────── */
  var _NBM_NOTE_ID = 'xp-nbm-calm-note';

  function _applyNBMSupportiveNote(mode) {
    // Remove any existing note first (handles mode changes)
    var existing = document.getElementById(_NBM_NOTE_ID);
    if (existing) existing.parentNode.removeChild(existing);

    if (mode !== 'CALM') return;

    var eyebrow = document.querySelector('#v21-nbm-card .v21-nbm-eyebrow');
    if (!eyebrow) return;

    var note = document.createElement('div');
    note.id = _NBM_NOTE_ID;
    note.className = 'xp-nbm-calm-note';
    note.textContent = 'One thing. That\u2019s all this is.';
    eyebrow.parentNode.insertBefore(note, eyebrow.nextSibling);
  }

  /* ── Progressive disclosure ────────────────────────────── */
  // CALM: collapse secondary metric sections that BSE may leave open
  // RETIREMENT: collapse metric/driver strips (not strategy — pre_retirement uses it;
  //   BSE already suppresses strategy for in_retirement via show.modeStrategy:false)
  // Progressive disclosure is owned by BSE via bseApplyModuleVis.
  // This function is retained as a no-op stub so call sites in _render() remain valid.
  function _applyProgressiveDisclosure(mode) {
  }

  /* ── Retirement mode detection ────────────────────────── */
  function _isRetirementMode() {
    // Authoritative source only — G.isRetirementMode is set by BSE._compute()
    var g = window.G || {};
    return !!(g && g.isRetirementMode);
  }

  /* ── Retirement hero ───────────────────────────────────── */
  function _renderRetirementHero() {
    var el = document.getElementById('xp-retirement-hero');
    if (!el) return;
    var g = window.G || {};
    var arch = (window.BSE && window.BSE.archetype) || '';
    var takeHome = g.takeHome || 0;
    var efMonths = parseInt(g.emergency || g.emergencyMonths || '0');
    var fcf = g.fcf || 0;
    var fmt = function(n) { return '$' + Math.round(Math.abs(n || 0)).toLocaleString('en-US'); };

    // ── Stability band (derived from buffer + cashflow, NOT actuarial) ─
    var _bandLabel, _bandClass;
    if (efMonths >= 6 && fcf >= 0) {
      _bandLabel = 'Stable outlook';    _bandClass = 'solid';
    } else if (efMonths >= 3) {
      _bandLabel = 'Building stability'; _bandClass = 'building';
    } else {
      _bandLabel = 'Needs attention';    _bandClass = 'attention';
    }

    // ── Near-term coverage line (honest, uses emergency months as proxy) ─
    var _coverageLine;
    if (efMonths >= 6) {
      _coverageLine = efMonths + ' months of security in reserve';
    } else if (efMonths >= 3) {
      _coverageLine = efMonths + ' months covered \u2014 building from here';
    } else if (efMonths > 0) {
      _coverageLine = efMonths + ' month buffer \u2014 growing this is the priority';
    } else {
      _coverageLine = 'A safety buffer is the first priority';
    }

    var headline, sub, label;
    if (arch === 'in_retirement') {
      // Gate reserve/stability claims on real user-entered savings balances.
      // efMonths is a dropdown — not backed by dollar amounts — so we must not
      // show quantified reserve language unless the user has entered real figures.
      var _hasRealReserve = (g.retirementSavings > 0) || (g.savingsAmt > 0) || (g.depositSaved > 0)
        || (g.socialSecurityMonthly > 0) || (g.pensionIncome > 0);
      if (_hasRealReserve) {
        label = (_bandClass === 'solid') ? 'Horizon of peace' : 'Stability outlook';
        headline = takeHome > 0
          ? fmt(takeHome) + '/mo \u2014 your income foundation'
          : 'Your plan is focused on monthly stability';
        sub = _coverageLine;
      } else {
        label    = 'Stability outlook';
        headline = 'Your plan is focused on monthly stability';
        sub      = 'Reserve picture not yet defined';
        _bandLabel = 'Stability outlook';
        _bandClass = 'building';
      }
    } else {
      // pre_retirement or age-only (≥60 without explicit retire intent)
      label = 'Retirement readiness';
      headline = 'Building toward a stable retirement';
      sub = efMonths >= 6
        ? 'Strong safety buffer \u2014 ' + efMonths + ' months covered'
        : takeHome > 0
          ? fmt(takeHome) + '/mo income to direct toward retirement'
          : 'Review your savings rate as a priority';
    }

    var h = '<div class="xp-ret-hero">';
    h += '<div class="xp-ret-label">' + label + '</div>';
    h += '<div class="xp-ret-headline">' + headline + '</div>';
    h += '<div class="xp-ret-sub">' + sub + '</div>';
    // FCF flexibility line — only for confirmed in_retirement with meaningful positive FCF
    if (arch === 'in_retirement' && fcf > 100) {
      h += '<div class="xp-ret-fcf">' + fmt(fcf) + '/mo in monthly flexibility</div>';
    }
    h += '<div class="xp-ret-band xp-ret-band--' + _bandClass + '">' + _bandLabel + '</div>';
    h += '</div>';

    el.innerHTML = h;
  }

  function _clearRetirementHero() {
    var el = document.getElementById('xp-retirement-hero');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  }

  /* ── Retirement body adaptation ────────────────────────── */
  function _applyRetirementBodyMode(active) {
    var b = document.body;
    if (active) {
      b.classList.add('xp-mode-retirement');
    } else {
      b.classList.remove('xp-mode-retirement');
    }
  }

  /* ── Settings modal APR section ───────────────────────── */
  // Modal state (display) is owned by modals.js.
  // Only chevron text and non-structural helper text are safe for XP to set.
  function _applySettingsModal() {
    var mode = _getMode();
    var aprChevron = document.getElementById('se-apr-chevron');
    var aprHelper  = document.getElementById('se-apr-helper');
    var creditHelper = document.getElementById('se-credit-helper');

    if (mode === 'CALM') {
      if (aprChevron) aprChevron.textContent = '\u25b8';
      if (aprHelper)  aprHelper.style.display = 'none';
    } else if (mode === 'STANDARD') {
      if (aprChevron) aprChevron.textContent = '\u25be';
      if (aprHelper)  aprHelper.style.display = 'none';
      if (creditHelper) creditHelper.style.display = 'none';
    } else {
      // EXPANDED — show helper texts
      if (aprChevron)   aprChevron.textContent = '\u25be';
      if (aprHelper)    aprHelper.style.display = 'block';
      if (creditHelper) creditHelper.style.display = 'block';
    }
  }

  /* ── Main render ───────────────────────────────────────── */
  function _render() {
    var mode = _getMode();
    _applyBodyMode(mode);
    _applyDebtTab(mode);
    _applyNBMSupportiveNote(mode);
    _applyProgressiveDisclosure(mode);
    // Retirement mode
    var retMode = _isRetirementMode();
    _applyRetirementBodyMode(retMode);
    if (retMode) _renderRetirementHero();
    else _clearRetirementHero();
  }

  /* ── Event wiring ──────────────────────────────────────── */
  // Fire at 160ms — after BSE _renderHome (120ms) has completed its pass
  document.addEventListener('tracent:scoreComputed', function (e) {
    if (!e.detail || !e.detail.final) return;
    setTimeout(_render, 160);
  });

  /* ═══ PUBLIC API ═══════════════════════════════════════════ */
  window.TracentExperienceLayer = {
    render:             _render,
    getMode:            _getMode,
    applySettingsModal: _applySettingsModal,
    isRetirementMode:   _isRetirementMode
  };

})();
