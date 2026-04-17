/* ═══ Tracent Core: Hydration ═══
   Session-aware boot hydration + debounced persistence.

   Pipeline:
   1. Restore auth session
   2. If signed in → load profile from Supabase
   3. If signed in → load goals from Supabase
   4. applyHydrationToEngine(profile) → hydrate window.G + legacy DOM inputs
   5. triggerRecalculation() → engine recalculates → BSE chain fires

   Falls back to existing localStorage flow when not signed in.
   Does NOT touch BSE, engine, or render modules directly.

   Depends on: TracentAuth, TracentProfileStore, TracentGoalsStore, TracentConfig
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Config ─────────────────────────────────────────────
  var _cfg = window.TracentConfig || {};
  var DEBOUNCE_MS = _cfg.PERSISTENCE_DEBOUNCE_MS || 2000;

  // ── Debounced save state ───────────────────────────────
  var _saveTimer = null;

  // ═══════════════════════════════════════════════════════
  // HYDRATION CONTAINMENT
  // All state writes flow through these two functions.
  // ═══════════════════════════════════════════════════════

  /**
   * applyHydrationToEngine(profileData)
   * Writes Supabase profile data into window.G and legacy DOM inputs.
   * This is the ONLY function that writes hydrated data into the engine.
   */
  function applyHydrationToEngine(profileData) {
    if (!profileData) return;

    // Start from a clean object — do NOT merge stale window.G financial fields.
    // Stale computed or partial data from a prior session must not contaminate
    // the restored profile. Only non-financial metadata is preserved.
    var _prior = window.G || {};
    var g = {};
    if (_prior._scoreHistory) g._scoreHistory = _prior._scoreHistory;

    // ── Top-level profile fields ─────────────────────────
    if (profileData.firstname)           g.firstname      = profileData.firstname;
    if (profileData.intent)              g.primaryIntent   = profileData.intent;
    if (profileData.onboarding_complete) g.scoreFinal      = true;

    // ── Financial inputs (canonical) ─────────────────────
    var fi = profileData.financial_inputs;
    if (fi && typeof fi === 'object') {
      var fields = [
        'income','takeHome','state','filingStatus','jobType','expenses',
        'ccDebt','ccRate','studentDebt','carDebt','otherDebt','emergency',
        'retMatch','homePrice','depositSaved','currentRent','purchasePrice',
        'housingType','credit','savingsAmt',
        'ageRange','primaryIntent',
        'retirementStage','goalMode','retirementIncomeSource',
        'retirementSavings','socialSecurityMonthly','pensionIncome',
        'homeIncomeMode','homeHouseholdTakeHome',
        'carPayment','otherPayment','goal',
        'homeValue'
      ];
      fields.forEach(function(key) {
        if (fi[key] !== null && fi[key] !== undefined) g[key] = fi[key];
      });
      // Aliases — engine reads both names
      if (fi.homePrice)     g.targetHomePrice = fi.homePrice;
      if (fi.depositSaved)  g.downPayment     = fi.depositSaved;
      // Mark G as carrying real hydrated data — financial_inputs block was present
      g.__initialized = true;
    }

    // ── Preferences ──────────────────────────────────────
    var prefs = profileData.preferences;
    if (prefs && typeof prefs === 'object') {
      if (prefs.v21Mode)        g.v21Mode = prefs.v21Mode;
      if (prefs.selectedCredit && typeof window.selectedCredit !== 'undefined') {
        window.selectedCredit = prefs.selectedCredit;
      }
      if (prefs.progressSub)    window._progressSub = prefs.progressSub;
    }

    // ── Commit back to window ────────────────────────────
    window.G = g;

    // ── Push to legacy hidden DOM inputs ─────────────────
    _pushToLegacyInputs(g);
  }

  /**
   * Apply goals data into canonical state.
   * Goals live in window.G.goals (canonical location).
   */
  function applyGoalsToEngine(goalsData) {
    if (!goalsData || !Array.isArray(goalsData) || goalsData.length === 0) return;

    var mapped = goalsData.map(function(row) {
      return {
        id:       row.id,
        name:     row.name     || '',
        target:   Number(row.target  || 0),
        current:  Number(row.current || 0),
        monthly:  Number(row.monthly || 0),
        reminder: row.reminder || 'none'
      };
    });

    // Canonical: goals live in G.goals
    // Read existing G so __initialized and financial fields are preserved.
    // Goals alone do not constitute real financial data — do not set __initialized here.
    var g = window.G || {};
    g.goals = mapped;
    window.G = g;
  }

  /**
   * triggerRecalculation()
   * The ONLY place that calls the engine recalculation function.
   * After this, BSE auto-updates via the v21RenderPostAnalysis chain.
   */
  function triggerRecalculation() {
    if (typeof window._0x82f61a0 === 'function') {
      try {
        window._0x82f61a0();
        console.log('[Tracent:Hydration] Engine recalculation triggered.');
      } catch(e) {
        console.warn('[Tracent:Hydration] Engine recalc failed:', e);
      }
    } else {
      console.warn('[Tracent:Hydration] Engine function not available — skipping recalc.');
    }
    // BSE recomputes automatically via v21RenderPostAnalysis chain
  }

  // ── Push values to hidden legacy DOM inputs ────────────
  function _pushToLegacyInputs(g) {
    if (!g) return;
    var map = {
      'income':           g.income,
      'takehome':         g.takeHome,
      'state':            g.state,
      'filing-status':    g.filingStatus,
      'jobtype':          g.jobType,
      'expenses':         g.expenses,
      'cc-debt':          g.ccDebt,
      'cc-rate':          g.ccRate,
      'student-debt':     g.studentDebt,
      'car-debt':         g.carDebt,
      'other-debt':       g.otherDebt,
      'emergency':        g.emergency,
      'retirement-match': g.retMatch,
      'home-price':       (g.homePrice    != null) ? g.homePrice    : g.targetHomePrice,
      'home-value':       g.homeValue,
      'deposit-saved':    (g.depositSaved != null) ? g.depositSaved : g.downPayment,
      'current-rent':     g.currentRent,
      'purchase-price':   g.purchasePrice,
      'car-payment':      g.carPayment,
      'other-payment':    g.otherPayment,
      'goal':             g.goal,
      'firstname':        g.firstname
    };
    Object.keys(map).forEach(function(id) {
      var el = document.getElementById(id);
      if (el && map[id] !== null && map[id] !== undefined) {
        el.value = map[id];
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // DEBOUNCED PERSISTENCE
  // ═══════════════════════════════════════════════════════

  /**
   * scheduleSave()
   * Debounced write — coalesces rapid state changes into a single save.
   * Safe to call frequently; only fires persist() after DEBOUNCE_MS.
   */
  function scheduleSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function() {
      _saveTimer = null;
      _persist();
    }, DEBOUNCE_MS);
  }

  /** Internal persist — saves profile + goals to Supabase */
  async function _persist() {
    if (!window.TracentAuth || !TracentAuth.isSignedIn()) return;

    // Save profile
    if (window.TracentProfileStore) {
      try { await TracentProfileStore.save(); } catch(e) {
        console.warn('[Tracent:Hydration] Profile persist failed:', e);
      }
    }

    // Save goals — read from canonical G.goals
    if (window.TracentGoalsStore) {
      var adapter = window.TracentStateAdapter;
      var goalsArray = adapter ? adapter.getGoals() : ((window.G || {}).goals || []);
      if (goalsArray && goalsArray.length > 0) {
        try { await TracentGoalsStore.saveAll(goalsArray); } catch(e) {
          console.warn('[Tracent:Hydration] Goals persist failed:', e);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════

  window.TracentHydration = {

    /**
     * Full boot hydration.
     * Call once at app startup (after DOMContentLoaded).
     * Returns: { source: 'supabase'|'localStorage'|'none', signedIn: bool }
     */
    boot: async function() {
      var result = { source: 'none', signedIn: false };

      // ── FIX 5: Boot dependency guard ───────────────────
      // If required modules are missing, fail safe — do not throw.
      if (!window.TracentAuth || !window.TracentProfileStore) {
        console.warn('[Tracent:Hydration] Dependencies not ready — TracentAuth or TracentProfileStore missing.');
        return result;
      }

      // 1. Try Supabase session restore
      var session = null;
      try {
        session = await TracentAuth.restoreSession();
      } catch(e) {
        console.warn('[Tracent:Hydration] Session restore failed:', e);
      }

      if (session && TracentAuth.isSignedIn()) {
        result.signedIn = true;

        // 2. Load profile from Supabase
        var profile = null;
        try {
          profile = await TracentProfileStore.load();
        } catch(e) {
          console.warn('[Tracent:Hydration] Profile load failed:', e);
        }

        if (profile) {
          // 3. Apply profile to engine (contained)
          applyHydrationToEngine(profile);
          result.source = 'supabase';

          // ── FIX 1: Recalculate after profile hydration only when real data exists ──
          // Partial / mid-flow profiles with no financial inputs must not trigger
          // engine computation — empty G produces phantom scores and archetypes.
          if (typeof window.tracentHasRealData === 'function' && window.tracentHasRealData()) {
            triggerRecalculation();
          }

          // 4. Load + apply goals from Supabase
          if (window.TracentGoalsStore) {
            try {
              var goalsData = await TracentGoalsStore.loadAll();
              if (goalsData && goalsData.length > 0) {
                applyGoalsToEngine(goalsData);
                // ── FIX 2: Recalculate after goals hydration only when real data exists ──
                // Goals are canonical state but do not independently constitute
                // valid financial state — guard the same way as profile hydration.
                if (typeof window.tracentHasRealData === 'function' && window.tracentHasRealData()) {
                  triggerRecalculation();
                }
              }
            } catch(e) {
              console.warn('[Tracent:Hydration] Goals load failed:', e);
            }
          }
        }
      }

      // If no Supabase data, existing localStorage restore handles it
      // (via the engine's _0xf0f2b75 which runs during normal boot)
      if (result.source === 'none') {
        result.source = 'localStorage';
      }

      console.log('[Tracent:Hydration] Boot complete:', result);
      return result;
    },

    /**
     * Debounced save — call this from the RPA chain or after meaningful updates.
     * Coalesces rapid calls into a single write after DEBOUNCE_MS.
     */
    scheduleSave: scheduleSave,

    /**
     * Immediate persist — bypasses debounce. Use sparingly.
     * Safe to call even when not signed in — silently skips.
     */
    persist: _persist,

    /** Exposed for testing / direct use by other modules */
    applyHydrationToEngine: applyHydrationToEngine,
    applyGoalsToEngine:     applyGoalsToEngine,
    triggerRecalculation:   triggerRecalculation,
    _pushToLegacyInputs:   _pushToLegacyInputs
  };

})();
