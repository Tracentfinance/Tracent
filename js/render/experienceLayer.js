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
  function _applyDebtTab(mode) {
    var accel   = document.getElementById('bse-debt-accelerator-card');
    var method  = document.getElementById('bse-debt-method-card');
    var tabDebt = document.getElementById('tab-debtrank');

    // All modes: remove strategy-hidden so the strategy selector is always
    // visible on the Debt tab. bseApplyModuleVis adds this class during home-tab
    // render; it is never removed unless BSE reruns while the tab is active.
    if (tabDebt) tabDebt.classList.remove('bse-debt-strategy-hidden');
    // Strategy selector visible for all modes
    if (method) method.style.display = '';
    // Accelerator slider: hidden for CALM (complexity) and retirement (simplicity priority —
    // debt framing shifts to monthly flexibility, not payoff-speed competition)
    var _retMode = _isRetirementMode();
    if (accel) accel.style.display = (mode === 'CALM' || _retMode) ? 'none' : '';
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
  var _SECONDARY_IDS = ['bse-metrics-strip', 'bse-driver-strip', 'bse-mode-strategy'];

  function _applyProgressiveDisclosure(mode) {
    var _retMode = _isRetirementMode();
    _SECONDARY_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var _shouldCollapse = (mode === 'CALM') ||
        (_retMode && id !== 'bse-mode-strategy');
      if (_shouldCollapse) {
        // Only hide if BSE hasn't already hidden it
        if (el.style.display !== 'none') {
          el.setAttribute('data-xp-collapsed', '1');
          el.style.display = 'none';
        }
      } else {
        // Restore only if WE hid it, not if BSE hid it
        if (el.getAttribute('data-xp-collapsed') === '1') {
          el.removeAttribute('data-xp-collapsed');
          el.style.display = '';
        }
      }
    });
  }

  /* ── Retirement mode detection ────────────────────────── */
  function _isRetirementMode() {
    var navStyle = (window.BSE && window.BSE.navStyle) || '';
    var g = window.G || {};
    var age = parseInt(g.age || g.currentAge || 0);
    return navStyle === 'retirement' || age >= 60;
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
    var fmt = function(n) { return '$' + Math.round(Math.abs(n || 0)).toLocaleString(); };

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
      label = (_bandClass === 'solid') ? 'Horizon of peace' : 'Stability outlook';
      headline = takeHome > 0
        ? fmt(takeHome) + '/mo \u2014 your income foundation'
        : 'Your plan is focused on monthly stability';
      sub = _coverageLine;
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
    el.style.display = 'block';
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
      // For age-only path (BSE archetype is NOT in_retirement/pre_retirement),
      // also add the BSE retirement body class so existing CSS injection rules apply.
      var arch = (window.BSE && window.BSE.archetype) || '';
      if (arch !== 'in_retirement' && arch !== 'pre_retirement') {
        b.classList.add('bse-arch-in_retirement');
      }
      // Override NBM eyebrow for age-only path where BSE tone is still 'standard'
      var nbmStyle = (window.BSE && window.BSE.nbmStyle) || '';
      if (nbmStyle !== 'readiness_first' && nbmStyle !== 'stability_first') {
        var eye = document.querySelector('#v21-nbm-card .v21-nbm-eyebrow');
        if (eye) eye.innerHTML = '<span class="v21-live-dot"></span>Next step for your plan';
        var meta = document.querySelector('#v21-nbm-card .v21-nbm-meta');
        if (meta) meta.style.display = 'none';
      }
    } else {
      b.classList.remove('xp-mode-retirement');
      // Only remove the supplemental BSE class if WE added it (not if BSE set it)
      var arch = (window.BSE && window.BSE.archetype) || '';
      if (arch !== 'in_retirement' && arch !== 'pre_retirement') {
        b.classList.remove('bse-arch-in_retirement');
      }
    }
  }

  /* ── Settings modal APR section ───────────────────────── */
  function _applySettingsModal() {
    var mode = _getMode();
    var aprFields  = document.getElementById('se-apr-fields');
    var aprChevron = document.getElementById('se-apr-chevron');
    var aprHelper  = document.getElementById('se-apr-helper');
    var creditHelper = document.getElementById('se-credit-helper');

    if (!aprFields) return;

    if (mode === 'CALM') {
      // Stay collapsed — CALM users see the toggle but section is closed
      aprFields.style.display = 'none';
      if (aprChevron) aprChevron.textContent = '\u25b8';
      if (aprHelper)  aprHelper.style.display = 'none';
    } else if (mode === 'STANDARD') {
      // Auto-expand, no helper text
      aprFields.style.display = 'block';
      if (aprChevron) aprChevron.textContent = '\u25be';
      if (aprHelper)  aprHelper.style.display = 'none';
      if (creditHelper) creditHelper.style.display = 'none';
    } else {
      // EXPANDED — auto-expand + show helper texts
      aprFields.style.display = 'block';
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
  // Fire ~80ms after BSE completes so BSE render pass runs first
  document.addEventListener('tracent:scoreComputed', function () {
    setTimeout(_render, 80);
  });

  /* ═══ PUBLIC API ═══════════════════════════════════════════ */
  window.TracentExperienceLayer = {
    render:             _render,
    getMode:            _getMode,
    applySettingsModal: _applySettingsModal,
    isRetirementMode:   _isRetirementMode
  };

})();
