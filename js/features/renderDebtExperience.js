/* ═══ Tracent Feature: Debt Experience (Render) ═══
   Renders a new debt experience surface above existing debt content.
   Order: Emotional entry → Total pressure → Biggest issue →
          Action plan → Relief preview → Collapsed breakdown

   Reads from: TracentDebtExperience.getState()
   Renders into: #tracent-debt-experience (injected at top of #tab-debtrank)

   Does NOT replace existing debt content — layers above it.
   Does NOT override any navigation globals.
   Existing BSE debt relief + strategy tools remain below as secondary.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  var CONTAINER_ID = 'tracent-debt-experience';
  var DEFAULT_MOUNT = 'tab-debtrank';

  function fmt(n) { return '$' + Math.abs(Math.round(n || 0)).toLocaleString(); }

  /* ── Tone background gradients ──────────────────────── */
  var TONE_BG = {
    calm:        'linear-gradient(160deg, #0D1B2A, #001F33)',
    honest:      'linear-gradient(160deg, #1A0D0D, #1F1000)',
    reassuring:  'linear-gradient(160deg, #0A1929, #001525)',
    direct:      'linear-gradient(160deg, #001525, #001F33)',
    encouraging: 'linear-gradient(160deg, #001F33, #003B5C)'
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

  /* ── Toggle handler for breakdown ───────────────────── */
  function _toggleBreakdown() {
    var list = document.getElementById('tde-detail-list');
    var btn  = document.getElementById('tde-toggle-btn');
    if (!list) return;
    var hidden = list.style.display === 'none';
    list.style.display = hidden ? '' : 'none';
    if (btn) btn.textContent = hidden ? 'Hide details \u25b4' : 'Show all debts \u25be';
  }
  window._tdeToggleBreakdown = _toggleBreakdown;

  /* ── Build HTML ─────────────────────────────────────── */
  function _render(state) {
    if (!state) return '';
    var h = '';
    var isHighStress = state.stressLevel === 'high';
    var toneBg = TONE_BG[state.emotionalIntro.tone] || TONE_BG.direct;

    /* 1. Emotional Entry */
    h += '<div class="tde-emotional" style="background:' + toneBg + '">';
    h += '<div class="tde-emotional-bar"></div>';
    h += '<div class="tde-emotional-text">' + state.emotionalIntro.text + '</div>';
    h += '</div>';

    /* 2. Total Pressure */
    h += '<div class="tde-pressure">';
    h += '<div class="tde-pressure-cell">';
    h += '<div class="tde-pressure-val">' + fmt(state.totalDebt) + '</div>';
    h += '<div class="tde-pressure-label">Total debt</div>';
    h += '</div>';
    var pressColor = state.pressureRatio > 20 ? 'var(--red)' : state.pressureRatio > 10 ? 'var(--amber)' : 'var(--navy)';
    h += '<div class="tde-pressure-cell">';
    h += '<div class="tde-pressure-val" style="color:' + pressColor + '">' + fmt(state.monthlyPressure) + '<span>/mo</span></div>';
    h += '<div class="tde-pressure-label">Minimum payments \u00b7 ' + state.pressureRatio + '% of income</div>';
    h += '</div></div>';

    /* 3. Priority Debt */
    if (state.priorityDebt) {
      var pri = state.priorityDebt;
      h += '<div class="tf-card tde-priority">';
      h += '<div class="tf-eyebrow" style="color:var(--teal)">Target first</div>';
      h += '<div class="tde-priority-header">';
      h += '<div class="tde-priority-name">' + pri.name + '</div>';
      h += '<div class="tde-priority-bal">' + fmt(pri.balance) + '</div>';
      h += '</div>';
      h += '<div class="tde-priority-why">' + pri.why + '</div>';
      h += '<div class="tde-priority-stats">';
      h += '<div><span style="color:var(--red);font-weight:600">' + fmt(pri.monthlyInterest) + '/mo</span> <span style="color:var(--gray-3)">in interest</span></div>';
      if (pri.suggestedExtra > 0) {
        h += '<div><span style="color:var(--green);font-weight:600">+' + fmt(pri.suggestedExtra) + '/mo</span> <span style="color:var(--gray-3)">suggested extra</span></div>';
      }
      h += '</div></div>';
    }

    /* 4. Action Plan */
    if (state.plan && state.plan.length > 0) {
      h += '<div class="tf-card">';
      h += '<div class="tf-section-label">Your debt plan</div>';
      state.plan.forEach(function(step) {
        h += '<div class="tf-step-row">';
        h += '<div class="tf-step-n">' + step.n + '</div>';
        h += '<div style="flex:1"><div class="tf-step-title">' + step.title + '</div>';
        h += '<div class="tf-step-detail">' + step.detail + '</div></div>';
        h += '</div>';
      });
      h += '</div>';
    }

    /* 5. Relief Preview */
    if (state.relief) {
      var reliefBg = state.relief.type === 'forecast' ? 'rgba(16,185,129,0.06)' :
                     state.relief.type === 'stabilize' ? 'rgba(245,158,11,0.06)' : 'rgba(0,168,232,0.06)';
      var reliefBorder = state.relief.type === 'forecast' ? 'rgba(16,185,129,0.18)' :
                         state.relief.type === 'stabilize' ? 'rgba(245,158,11,0.18)' : 'rgba(0,168,232,0.15)';
      h += '<div class="tde-relief" style="background:' + reliefBg + ';border:1px solid ' + reliefBorder + '">';
      h += '<div class="tde-relief-headline">' + state.relief.headline + '</div>';
      h += '<div class="tde-relief-detail">' + state.relief.detail + '</div>';
      h += '</div>';
    }

    /* 6. Collapsed Breakdown */
    if (!isHighStress && state.allDebts && state.allDebts.length > 1) {
      h += '<div>';
      h += '<button id="tde-toggle-btn" class="tde-toggle-btn" onclick="_tdeToggleBreakdown()">Show all debts \u25be</button>';
      h += '<div id="tde-detail-list" style="display:none">';
      state.allDebts.forEach(function(d) {
        var intMo = Math.round(d.bal * (d.rate / 100) / 12);
        h += '<div class="tde-debt-row">';
        h += '<div><div class="tde-debt-name">' + d.name + '</div><div class="tde-debt-meta">' + d.rate + '% \u00b7 ' + fmt(d.minPmt) + '/mo min</div></div>';
        h += '<div><div class="tde-debt-bal">' + fmt(d.bal) + '</div><div class="tde-debt-int">' + fmt(intMo) + '/mo interest</div></div>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    /* Separator */
    h += '<div class="tf-separator"></div>';

    return h;
  }

  /* ═══ PUBLIC API ════════════════════════════════════════ */

  window.TracentRenderDebtExperience = {
    /**
     * Render the debt experience.
     * @param {string} [mountId] — optional parent element ID (default: 'tab-debtrank')
     */
    render: function(mountId) {
      if (!_ensureContainer(mountId)) return;
      var container = document.getElementById(CONTAINER_ID);
      if (!container) return;

      var provider = window.TracentDebtExperience;
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

    /** Hide the debt experience */
    hide: function() {
      var container = document.getElementById(CONTAINER_ID);
      if (container) container.style.display = 'none';
    }
  };

  /* ── NO navigation overrides — render is called explicitly by: ──
     1. app.js RPA chain (after every engine + BSE cycle)
     2. render/debt.js bseRenderDebtRelief() (after BSE's tab-switch debt rebuild)
  ────────────────────────────────────────────────────────── */

})();
