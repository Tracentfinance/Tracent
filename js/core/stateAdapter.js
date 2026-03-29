/* ═══ Tracent Core: State Adapter ═══
   Provides a clean, structured read of canonical app state.
   Decouples service/store files from direct window.G / window.BSE access.

   Usage:
     var state = TracentStateAdapter.getCanonicalState();
     // state.profile.income, state.scores.health, etc.

   Does NOT write state — read-only accessor.
   Does NOT replace window.G — G is still the live source for V6 engine.
   Does NOT touch BSE logic — only reads BSE.archetype / BSE.stage.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Financial input field list (canonical) ─────────────
  var FINANCIAL_FIELDS = [
    'income','takeHome','state','filingStatus','jobType','expenses',
    'ccDebt','ccRate','studentDebt','carDebt','otherDebt','emergency',
    'retMatch','homePrice','depositSaved','currentRent','purchasePrice',
    'housingType','credit','savingsAmt'
  ];

  // ── Safe readers ───────────────────────────────────────
  function _g() { return window.G || {}; }
  function _bse() { return window.BSE || {}; }

  function _inferLifeStage() {
    var bse = _bse();
    if (bse.archetype === 'in_retirement')  return 'in_retirement';
    if (bse.archetype === 'pre_retirement') return 'pre_retirement';
    return 'working';
  }

  function _extractFinancialInputs() {
    var g = _g();
    var result = {};
    FINANCIAL_FIELDS.forEach(function(key) {
      result[key] = (g[key] !== undefined && g[key] !== null) ? g[key] : null;
    });
    // Aliases — include both names so consumers don't need to guess
    result.homePrice    = result.homePrice    || g.targetHomePrice || null;
    result.depositSaved = result.depositSaved || g.downPayment    || null;
    result.currentRent  = result.currentRent  || g.rentAmount     || null;
    return result;
  }

  function _extractPreferences() {
    var g = _g();
    return {
      v21Mode:        g.v21Mode || 'today',
      selectedCredit: (typeof window.selectedCredit !== 'undefined') ? window.selectedCredit : 'fair',
      progressSub:    window._progressSub || 'goals'
    };
  }

  function _extractGoals() {
    var g = _g();
    // Goals live in window.G.goals (canonical) or legacy `goals` var
    if (Array.isArray(g.goals) && g.goals.length > 0) return g.goals;
    if (typeof window.goals !== 'undefined' && Array.isArray(window.goals)) return window.goals;
    return [];
  }

  // ═══ PUBLIC API ════════════════════════════════════════

  window.TracentStateAdapter = {

    /** Canonical financial field list */
    FINANCIAL_FIELDS: FINANCIAL_FIELDS,

    /**
     * Returns a clean structured snapshot of current app state.
     * Does NOT include derived calculations — only canonical inputs.
     */
    getCanonicalState: function() {
      var g = _g();
      var bse = _bse();
      return {
        profile: {
          firstname:           g.firstname || '',
          intent:              g.primaryIntent || null,
          lifeStage:           _inferLifeStage(),
          onboardingComplete:  !!(g.scoreFinal),
          financialInputs:     _extractFinancialInputs(),
          preferences:         _extractPreferences()
        },
        scores: {
          health:    g.score || null,
          // ── FIX 4: Clamp stability so it never goes below 0 ──
          stability: bse.stress != null ? Math.max(0, 10 - (bse.stress || 0)) : null
        },
        goals:     _extractGoals(),
        archetype: bse.archetype || null,
        stage:     bse.stage     || null
      };
    },

    /** Just the financial inputs (convenience) */
    getFinancialInputs: _extractFinancialInputs,

    /** Just the preferences (convenience) */
    getPreferences: _extractPreferences,

    /** Just the goals (convenience) */
    getGoals: _extractGoals,

    /** Life stage string */
    getLifeStage: _inferLifeStage
  };

})();
