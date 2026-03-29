/* ═══ Tracent Config ═══
   Single source of truth for environment configuration.
   Loaded FIRST — before any service file.

   To activate Supabase:
   1. Replace the values below with your project credentials
   2. Uncomment the Supabase SDK script tag in index.html

   The anon key is safe to expose client-side — RLS protects data.
   When both values are empty strings, the app runs in local-only mode.
═══════════════════════════════════════════════ */

(function() {
  'use strict';

  window.TracentConfig = Object.freeze({

    // ── Supabase ─────────────────────────────────────────
    SUPABASE_URL:  '',   // e.g. 'https://your-project.supabase.co'
    SUPABASE_ANON: '',   // e.g. 'eyJhbGciOi...'

    // ── AI Proxy ─────────────────────────────────────────
    // Moved here for future consolidation; state.js still reads
    // TRACENT_PROXY_URL directly for now (no breaking change).
    AI_PROXY_URL:  '',   // e.g. 'https://tracent-ai.workers.dev/api/ai'

    // ── Feature flags ────────────────────────────────────
    DEBUG_TELEMETRY: false,
    PERSISTENCE_DEBOUNCE_MS: 2000,

    // ── Version ──────────────────────────────────────────
    BUILD: 'v7-supabase'
  });

})();
