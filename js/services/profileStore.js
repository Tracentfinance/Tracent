/* ═══ Tracent Service: Profile Store ═══
   Persists canonical user profile and financial inputs to Supabase.
   Falls back to localStorage when Supabase is not available.

   Reads state through TracentStateAdapter — does NOT access window.G
   or window.BSE directly for building profile snapshots.

   Schema (Supabase table: `profiles`):
   - id           uuid (PK, matches auth.users.id)
   - updated_at   timestamptz
   - firstname    text
   - intent       text  (stable/debt/home/grow/retire)
   - life_stage   text  (working/pre_retirement/in_retirement)
   - onboarding_complete boolean
   - financial_inputs    jsonb  (canonical income/debt/housing/etc)
   - preferences         jsonb  (density, default mode, etc)

   Depends on: TracentSupabase, TracentAuth, TracentStateAdapter
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  var TABLE = 'profiles';

  function _sb() { return window.TracentSupabase; }
  function _userId() {
    var auth = window.TracentAuth;
    var user = auth ? auth.getUser() : null;
    return user ? user.id : null;
  }
  function _adapter() { return window.TracentStateAdapter; }

  // ── Build profile from state adapter ───────────────────
  function _buildProfile() {
    var adapter = _adapter();
    if (!adapter) {
      // Fallback: read G directly if adapter not loaded yet
      var g = window.G || {};
      return {
        firstname:           g.firstname || '',
        intent:              g.primaryIntent || null,
        life_stage:          'working',
        onboarding_complete: !!(g.scoreFinal),
        financial_inputs:    {},
        preferences:         {}
      };
    }
    var state = adapter.getCanonicalState();
    return {
      firstname:           state.profile.firstname,
      intent:              state.profile.intent,
      life_stage:          state.profile.lifeStage,
      onboarding_complete: state.profile.onboardingComplete,
      financial_inputs:    state.profile.financialInputs,
      preferences:         state.profile.preferences
    };
  }

  // ═══ PUBLIC API ════════════════════════════════════════

  window.TracentProfileStore = {

    /** Save current profile to Supabase (or localStorage fallback) */
    save: async function() {
      var profile = _buildProfile();
      var userId = _userId();

      // Always update localStorage as fallback
      try { localStorage.setItem('tracent_profile_cache', JSON.stringify(profile)); } catch(e) {}

      // Supabase save
      if (!userId) return { ok: false, reason: 'not_signed_in' };
      var sb = _sb();
      if (!sb || !sb.isConfigured()) return { ok: false, reason: 'supabase_not_configured' };

      // ── FIX 3: Null-safe table access ─────────────────
      var table = sb.from(TABLE);
      if (!table) return { ok: false, reason: 'no_client' };

      try {
        var result = await table.upsert({
          id:                 userId,
          updated_at:         new Date().toISOString(),
          firstname:          profile.firstname,
          intent:             profile.intent,
          life_stage:         profile.life_stage,
          onboarding_complete:profile.onboarding_complete,
          financial_inputs:   profile.financial_inputs,
          preferences:        profile.preferences
        }, { onConflict: 'id' });

        if (result.error) {
          console.warn('[Tracent:ProfileStore] Save error:', result.error.message);
          return { ok: false, reason: result.error.message };
        }
        console.log('[Tracent:ProfileStore] Saved to Supabase.');
        return { ok: true };
      } catch(e) {
        console.warn('[Tracent:ProfileStore] Save exception:', e);
        return { ok: false, reason: e.message };
      }
    },

    /** Load profile from Supabase and return it (does NOT hydrate G) */
    load: async function() {
      var userId = _userId();
      if (!userId) return null;
      var sb = _sb();
      if (!sb || !sb.isConfigured()) return null;

      // ── FIX 3: Null-safe table access ─────────────────
      var table = sb.from(TABLE);
      if (!table) return null;

      try {
        var result = await table
          .select('*')
          .eq('id', userId)
          .single();

        if (result.error || !result.data) {
          console.warn('[Tracent:ProfileStore] Load returned no data.');
          return null;
        }
        console.log('[Tracent:ProfileStore] Loaded from Supabase.');
        return result.data;
      } catch(e) {
        console.warn('[Tracent:ProfileStore] Load exception:', e);
        return null;
      }
    },

    /** Load from localStorage cache (offline fallback) */
    loadFromCache: function() {
      try {
        var raw = localStorage.getItem('tracent_profile_cache');
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    },

    /** Build profile snapshot (for external use) */
    buildProfile: _buildProfile
  };

})();
