/* ═══ Tracent Service: Supabase Client ═══
   Initializes the Supabase client from TracentConfig.
   Fails gracefully if not configured — app works without it.

   Depends on: js/config/config.js (TracentConfig)
   Loaded after config.js, before auth.js and store files.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Read config (no hardcoded credentials) ─────────────
  var _cfg = window.TracentConfig || {};
  var _url  = _cfg.SUPABASE_URL  || '';
  var _anon = _cfg.SUPABASE_ANON || '';

  // ── Client state ───────────────────────────────────────
  var _client     = null;
  var _configured = false;
  var _initAttempted = false;

  function _init() {
    if (_initAttempted) return _client;
    _initAttempted = true;

    // Validate config
    if (!_url || !_anon) {
      console.warn('[Tracent:Supabase] Not configured — running in local-only mode.');
      return null;
    }
    if (_url.indexOf('REPLACE') !== -1 || _url.indexOf('xxxx') !== -1) {
      console.warn('[Tracent:Supabase] Placeholder URL detected — running in local-only mode.');
      return null;
    }

    // Validate SDK presence
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('[Tracent:Supabase] SDK not loaded — running in local-only mode.');
      return null;
    }

    // Initialize client
    try {
      _client = window.supabase.createClient(_url, _anon, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      _configured = true;
      console.log('[Tracent:Supabase] Client initialized.');
    } catch (e) {
      console.error('[Tracent:Supabase] Init failed:', e);
      _client = null;
    }
    return _client;
  }

  // ── Public API ─────────────────────────────────────────
  window.TracentSupabase = {
    /** Returns the Supabase client, or null if not configured */
    getClient: function() { return _client || _init(); },

    /** True if Supabase is configured and client exists */
    isConfigured: function() { return _configured && !!_client; },

    /** Safe table accessor — returns null instead of throwing */
    from: function(table) {
      var c = this.getClient();
      return c ? c.from(table) : null;
    },

    /** Auth accessor */
    auth: function() {
      var c = this.getClient();
      return c ? c.auth : null;
    }
  };

  // Attempt init on load
  _init();

})();
