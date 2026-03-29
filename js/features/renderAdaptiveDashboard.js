/* ═══ Tracent Feature: Adaptive Dashboard (Render) ═══
   Renders a new adaptive dashboard surface above existing home content.
   4 sections: Emotional Header | Primary Focus | Action Path | Optional Context

   Reads from: TracentAdaptiveDashboard.getState()
   Renders into: #tracent-adaptive-dashboard (injected at top of #tab-home)

   High stress = minimal. Low stress = optional detail visible.
   Does NOT replace existing home content — layers above it.
   Does NOT override any navigation globals.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  var CONTAINER_ID = 'tracent-adaptive-dashboard';
  var DEFAULT_MOUNT = 'tab-home';

  function fmt(n) { return '$' + Math.abs(Math.round(n || 0)).toLocaleString(); }

  /* ── Tone background gradients (only dynamic value that must be inline) ── */
  var TONE_BG = {
    calm:        'linear-gradient(160deg, #0D1B2A, #001F33)',
    reassuring:  'linear-gradient(160deg, #0A1929, #001525)',
    encouraging: 'linear-gradient(160deg, #001F33, #003B5C)',
    confident:   'linear-gradient(160deg, #001525, #003B5C)',
    neutral:     'linear-gradient(160deg, #001F33, #001525)'
  };
  var TONE_DOT = {
    calm: '#EF4444', reassuring: '#10B981', encouraging: '#00A8E8',
    confident: '#8B5CF6', neutral: '#94A3B8'
  };

  /* ── Ensure container ───────────────────────────────── */
  function _ensureContainer(mountId) {
    var id = mountId || DEFAULT_MOUNT;
    if (document.getElementById(CONTAINER_ID)) return true;
    var parent = document.getElementById(id);
    if (!parent) return false;
    var container = document.createElement('div');
    container.id = CONTAINER_ID;
    parent.insertBefore(container, parent.firstChild);
    return true;
  }

  /* ── Build HTML ─────────────────────────────────────── */
  function _render(state) {
    if (!state) return '';
    var tone = state.emotionalHeader.tone || 'neutral';
    var bg = TONE_BG[tone] || TONE_BG.neutral;
    var dot = TONE_DOT[tone] || TONE_DOT.neutral;
    var urgColor = state.primaryFocus.urgency === 'high' ? 'var(--red)'
                 : state.primaryFocus.urgency === 'medium' ? 'var(--amber)' : 'var(--teal)';
    var h = '';

    /* 1. Emotional Header */
    h += '<div class="tad-header" style="background:' + bg + '">';
    h += '<div class="tad-header-bar" style="background:' + dot + '"></div>';
    if (state.score) h += '<div class="tad-header-ghost-score">' + state.score + '</div>';
    h += '<div class="tad-header-title">' + state.emotionalHeader.title + '</div>';
    h += '<div class="tad-header-sub">' + state.emotionalHeader.sub + '</div>';
    h += '</div>';

    /* 2. Primary Focus */
    h += '<div class="tf-card tad-focus" style="border-left:4px solid ' + urgColor + '">';
    h += '<div class="tad-focus-row">';
    h += '<div class="tad-focus-label" style="color:' + urgColor + '">' + state.primaryFocus.label + '</div>';
    h += '<div class="tad-focus-metric">' + state.primaryFocus.metric + '</div>';
    h += '</div>';
    h += '<div class="tad-focus-action">' + state.primaryFocus.action + '</div>';
    h += '<button class="tad-cta" onclick="' + state.primaryFocus.cta.fn + '">' + state.primaryFocus.cta.text + '</button>';
    h += '</div>';

    /* 3. Action Path */
    if (state.steps && state.steps.length > 0) {
      h += '<div class="tf-card">';
      h += '<div class="tf-section-label">Your path forward</div>';
      state.steps.forEach(function(step) {
        h += '<div class="tf-step-row">';
        h += '<div class="tf-step-n">' + step.n + '</div>';
        h += '<div class="tf-step-text">' + step.text + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    /* 4. Optional Context */
    if (state.showExpandedMetrics) {
      h += '<div class="tad-context"><div class="tad-context-grid">';
      if (state.score) {
        var sColor = state.score >= 70 ? 'var(--green)' : state.score >= 55 ? 'var(--amber)' : 'var(--red)';
        h += '<div class="tad-context-cell"><div class="tad-context-val" style="color:' + sColor + '">' + state.score + '</div><div class="tad-context-label">Score</div></div>';
      }
      var fcfColor = state.fcf >= 0 ? 'var(--green)' : 'var(--red)';
      h += '<div class="tad-context-cell"><div class="tad-context-val" style="font-size:18px;color:' + fcfColor + '">' + fmt(state.fcf) + '</div><div class="tad-context-label">Monthly FCF</div></div>';
      var modeLabels = { debt_relief:'Debt mode', home_focus:'Home mode', growth_focus:'Growth mode', retirement_focus:'Retirement mode', stabilize:'Stabilizing' };
      h += '<div class="tad-context-cell"><div class="tad-context-val-sm">' + (modeLabels[state.dashboardMode] || 'Active') + '</div><div class="tad-context-label">Current focus</div></div>';
      h += '</div></div>';
    }

    return h;
  }

  /* ═══ PUBLIC API ════════════════════════════════════════ */

  window.TracentRenderAdaptiveDashboard = {
    /**
     * Render the adaptive dashboard.
     * @param {string} [mountId] — optional parent element ID (default: 'tab-home')
     */
    render: function(mountId) {
      if (!_ensureContainer(mountId)) return;
      var container = document.getElementById(CONTAINER_ID);
      if (!container) return;

      var provider = window.TracentAdaptiveDashboard;
      if (!provider) { container.style.display = 'none'; return; }

      var state = provider.getState();
      if (!state) { container.style.display = 'none'; return; }

      container.innerHTML = _render(state);
      container.style.display = 'block';
    },

    /** Render only if the container or mount point exists in DOM */
    renderIfPresent: function() {
      var container = document.getElementById(CONTAINER_ID);
      var mount = document.getElementById(DEFAULT_MOUNT);
      if (container || mount) this.render();
    },

    /** Hide the adaptive dashboard */
    hide: function() {
      var container = document.getElementById(CONTAINER_ID);
      if (container) container.style.display = 'none';
    }
  };

})();
