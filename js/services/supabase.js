/* ═══ Tracent Service: Supabase (Phase 1 — minimal persistence) ═══
   ONE table: profiles
   ONE column: data (jsonb)
   NO auth, NO goals, NO adapters.

   PROFILE_ID: anonymous stable ID stored in localStorage.
   Load → merge inputs into G.
   Save → inputs only, never derived values.

   Fails gracefully — app works without Supabase.
   Depends on: js/config/config.js (TracentConfig)
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  var _cfg  = window.TracentConfig || {};
  var _url  = _cfg.SUPABASE_URL  || '';
  var _anon = _cfg.SUPABASE_ANON || '';
  var _client = null;

  // ── Stable anonymous profile ID ───────────────────────
  var PROFILE_ID_KEY = 'tracent_profile_id';
  function _getProfileId() {
    var id = null;
    try { id = localStorage.getItem(PROFILE_ID_KEY); } catch(e) {}
    if (!id) {
      id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem(PROFILE_ID_KEY, id); } catch(e) {}
    }
    return id;
  }

  // ── Client init ────────────────────────────────────────
  function _client_get() {
    if (_client) return _client;
    if (!_url || !_anon) return null;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return null;
    try {
      _client = window.supabase.createClient(_url, _anon, { auth: { persistSession: false } });
    } catch(e) { _client = null; }
    return _client;
  }

  // ── Input fields — ONLY these are saved ───────────────
  var INPUT_FIELDS = [
    'income','takeHome','state','filingStatus','jobType','expenses',
    'ccDebt','ccRate','studentDebt','carDebt','carPayment','otherDebt','otherPayment',
    'emergency','retMatch','homePrice','depositSaved','currentRent','purchasePrice',
    'housingType','credit','savingsAmt','ageRange','primaryIntent',
    'firstname','scoreFinal','goal'
  ];

  function _extractInputs() {
    var g = window.G || {};
    var out = {};
    INPUT_FIELDS.forEach(function(k) {
      if (g[k] !== undefined && g[k] !== null) out[k] = g[k];
    });
    return out;
  }

  // ═══ PUBLIC API ════════════════════════════════════════
  window.TracentSupabase = {

    /** Load profile data → returns plain inputs object or null */
    loadProfile: async function() {
      var sb = _client_get();
      if (!sb) return null;
      var pid = _getProfileId();
      try {
        var res = await sb.from('profiles').select('data').eq('id', pid).single();
        if (res.error || !res.data) return null;
        return res.data.data || null;
      } catch(e) {
        console.warn('[Tracent:Supabase] Load failed:', e);
        return null;
      }
    },

    /** Save inputs only — never derived values */
    saveProfile: async function() {
      var sb = _client_get();
      if (!sb) return;
      var pid = _getProfileId();
      var inputs = _extractInputs();
      // Belt-and-suspenders: strip any derived keys that should never be saved
      ['fcf','dti','totalDebt','totalPayments','score','readiness'].forEach(function(k) { delete inputs[k]; });
      try {
        await sb.from('profiles').upsert({ id: pid, data: inputs, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      } catch(e) {
        console.warn('[Tracent:Supabase] Save failed:', e);
      }
    },

    /** True if Supabase client is available */
    isConfigured: function() { return !!_client_get(); }
  };

})();
