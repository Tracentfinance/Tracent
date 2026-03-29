/* ═══ Tracent Service: Goals Store ═══
   Persists user goals to Supabase.
   Falls back to localStorage when Supabase is not available.
   
   Schema (Supabase table: `goals`):
   - id          text (PK — client-generated)
   - user_id     uuid (FK → auth.users.id)
   - name        text
   - target      numeric
   - current     numeric
   - monthly     numeric
   - reminder    text
   - created_at  timestamptz
   - updated_at  timestamptz
   
   Does NOT store derived progress calculations.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  var TABLE = 'goals';

  function _sb() { return window.TracentSupabase; }
  function _userId() {
    var auth = window.TracentAuth;
    var user = auth ? auth.getUser() : null;
    return user ? user.id : null;
  }

  // ═══ PUBLIC API ════════════════════════════════════════

  window.TracentGoalsStore = {

    /** Save all goals to Supabase */
    saveAll: async function(goalsArray) {
      if (!goalsArray || !goalsArray.length) return { ok: true };
      var userId = _userId();

      // localStorage fallback
      try { localStorage.setItem('tracent_goals_cache', JSON.stringify(goalsArray)); } catch(e) {}

      if (!userId) return { ok: false, reason: 'not_signed_in' };
      var sb = _sb();
      if (!sb || !sb.isConfigured()) return { ok: false, reason: 'supabase_not_configured' };

      try {
        // Upsert all goals with user_id
        var rows = goalsArray.map(function(g) {
          return {
            id:         String(g.id),
            user_id:    userId,
            name:       g.name       || '',
            target:     g.target     || 0,
            current:    g.current    || 0,
            monthly:    g.monthly    || 0,
            reminder:   g.reminder   || 'none',
            updated_at: new Date().toISOString()
          };
        });

        var result = await sb.from(TABLE).upsert(rows, { onConflict: 'id' });
        if (result.error) {
          console.warn('[Tracent:GoalsStore] Save error:', result.error.message);
          return { ok: false, reason: result.error.message };
        }
        return { ok: true };
      } catch(e) {
        console.warn('[Tracent:GoalsStore] Save exception:', e);
        return { ok: false, reason: e.message };
      }
    },

    /** Load goals from Supabase */
    loadAll: async function() {
      var userId = _userId();
      if (!userId) return null;
      var sb = _sb();
      if (!sb || !sb.isConfigured()) return null;

      try {
        var result = await sb.from(TABLE)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        if (result.error || !result.data) return null;
        return result.data;
      } catch(e) {
        console.warn('[Tracent:GoalsStore] Load exception:', e);
        return null;
      }
    },

    /** Delete a single goal from Supabase */
    deleteOne: async function(goalId) {
      var userId = _userId();
      if (!userId) return { ok: false };
      var sb = _sb();
      if (!sb || !sb.isConfigured()) return { ok: false };

      try {
        var result = await sb.from(TABLE)
          .delete()
          .eq('id', String(goalId))
          .eq('user_id', userId);
        return { ok: !result.error };
      } catch(e) {
        return { ok: false };
      }
    },

    /** Load from localStorage cache (offline fallback) */
    loadFromCache: function() {
      try {
        var raw = localStorage.getItem('tracent_goals_cache');
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    }
  };

})();
