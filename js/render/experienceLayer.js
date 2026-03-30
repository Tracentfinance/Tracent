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
    // Strategy selector visible for all modes — CALM does not lose this control
    if (method) method.style.display = '';
    // Accelerator slider: hidden for CALM (secondary / complexity), visible otherwise
    if (accel) accel.style.display = (mode === 'CALM') ? 'none' : '';
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
  var _SECONDARY_IDS = ['bse-metrics-strip', 'bse-driver-strip', 'bse-mode-strategy'];

  function _applyProgressiveDisclosure(mode) {
    _SECONDARY_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (mode === 'CALM') {
        // Only hide if BSE hasn't already hidden it (BSE controls primary visibility)
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
    applySettingsModal: _applySettingsModal
  };

})();
