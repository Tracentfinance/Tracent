/* ═══ Tracent Service: Auth ═══
   Sign up, sign in, sign out, session restore.
   All auth goes through TracentSupabase.
   
   Fails gracefully — app works without auth.
   Does NOT touch BSE, engine, or render modules.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── State ──────────────────────────────────────────────
  var _session = null;
  var _user    = null;
  var _listeners = [];

  // ── Helpers ────────────────────────────────────────────
  function _sb() { return window.TracentSupabase; }
  function _auth() { var sb = _sb(); return sb ? sb.auth() : null; }

  function _notify(event, session) {
    _session = session;
    _user = session ? session.user : null;
    _listeners.forEach(function(fn) { try { fn(event, session); } catch(e) {} });
  }

  // ── Public API ─────────────────────────────────────────
  window.TracentAuth = {

    /** Get current user or null */
    getUser: function() { return _user; },

    /** Get current session or null */
    getSession: function() { return _session; },

    /** True if user is signed in */
    isSignedIn: function() { return !!_user; },

    /** Subscribe to auth state changes: fn(event, session) */
    onAuthChange: function(fn) {
      if (typeof fn === 'function') _listeners.push(fn);
    },

    /** Sign up with email + password */
    signUp: async function(email, password) {
      var auth = _auth();
      if (!auth) return { error: { message: 'Supabase not configured' } };
      try {
        var result = await auth.signUp({ email: email, password: password });
        if (result.data && result.data.session) {
          _notify('SIGNED_UP', result.data.session);
        }
        return result;
      } catch(e) {
        return { error: { message: e.message || 'Sign up failed' } };
      }
    },

    /** Sign in with email + password */
    signIn: async function(email, password) {
      var auth = _auth();
      if (!auth) return { error: { message: 'Supabase not configured' } };
      try {
        var result = await auth.signInWithPassword({ email: email, password: password });
        if (result.data && result.data.session) {
          _notify('SIGNED_IN', result.data.session);
        }
        return result;
      } catch(e) {
        return { error: { message: e.message || 'Sign in failed' } };
      }
    },

    /** Sign out */
    signOut: async function() {
      var auth = _auth();
      if (!auth) return { error: null };
      try {
        var result = await auth.signOut();
        _notify('SIGNED_OUT', null);
        return result;
      } catch(e) {
        _notify('SIGNED_OUT', null);
        return { error: { message: e.message || 'Sign out failed' } };
      }
    },

    /** Restore session from Supabase's persisted auth (cookie/localStorage) */
    restoreSession: async function() {
      var auth = _auth();
      if (!auth) return null;
      try {
        var result = await auth.getSession();
        if (result.data && result.data.session) {
          _notify('SESSION_RESTORED', result.data.session);
          return result.data.session;
        }
      } catch(e) {
        console.warn('[Tracent:Auth] Session restore failed:', e);
      }
      return null;
    },

    /** Wire the Supabase auth state listener */
    _wireListener: function() {
      var auth = _auth();
      if (!auth) return;
      try {
        auth.onAuthStateChange(function(event, session) {
          _notify(event, session);
        });
      } catch(e) {
        console.warn('[Tracent:Auth] Listener wire failed:', e);
      }
    }
  };

  // Wire listener on load (safe if Supabase not configured)
  TracentAuth._wireListener();

})();
