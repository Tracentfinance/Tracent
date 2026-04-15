/* ═══ Tracent Core: State & Persistence ═══
   Storage key, domain validation, AI proxy configuration.
   Loaded FIRST — all other modules depend on these globals.
   
   Startup contract:
   - STORAGE_KEY is available globally
   - G object exists (may be empty)
   - pbfdeState exists (may be empty)
   - window._tracentAIRequest is available
═══════════════════════════════════════════════ */

// ── Canonical storage key — single source of truth ───────
// Declared here (state.js loads FIRST) so all modules can rely on it.
var STORAGE_KEY = 'tracent_v3';

// ── Startup guards — ensure critical globals exist ────────
if (typeof window.G === 'undefined') {
  window.G = { __initialized: false };
} else if (typeof window.G.__initialized === 'undefined') {
  // G exists (e.g. injected by a prior script) but has no initialization flag —
  // mark as initialized so existing partial state is not treated as empty.
  window.G.__initialized = true;
}
if (typeof window.pbfdeState === 'undefined') window.pbfdeState = {};

/* ================================================================
 * TRACENT (c) 2026 - PROPRIETARY AND CONFIDENTIAL
 * Unauthorised copying, distribution or use is strictly prohibited.
 * Tracent(TM) is a registered trademark of Tracent LLC.
 * Build: 20260326  |  V21 Deep Fix Pass
 * ================================================================ */


/* [CLEANED] Duplicate haptic removed — canonical version in dashboard tabs section */

// ── AI PROXY CONFIGURATION ───────────────────────────────────────
// All AI calls route through this function.
// Before going live: set TRACENT_PROXY_URL to your Cloudflare Worker URL.
// Worker must accept POST with {system, prompt, max_tokens} and forward
// to Anthropic's /v1/messages API with the server-side API key.
// Example: 'https://tracent-ai.YOUR_SUBDOMAIN.workers.dev/api/ai'
var TRACENT_PROXY_URL = ''; // ← set before production deploy

/**
 * _tracentAIRequest — single choke-point for all AI calls.
 * Returns a fetch Response (or throws if proxy not configured).
 * Callers must check r.ok before reading r.json().
 */
async function _tracentAIRequest(opts) {
  if (!TRACENT_PROXY_URL) {
    // Proxy not configured — return a mock Response that signals unavailability
    try { tracentTrack('ai_unavailable_proxy_missing'); } catch(e) {}
    return new Response(JSON.stringify({error:'proxy_not_configured'}), {
      status: 503,
      headers: {'Content-Type':'application/json'}
    });
  }
  return fetch(TRACENT_PROXY_URL, {
    method:  'POST',
    headers: {'Content-Type':'application/json'},
    body:    JSON.stringify({
      system:     opts.system     || '',
      prompt:     opts.prompt     || '',
      max_tokens: opts.max_tokens || 1000
    })
  });
}
window._tracentAIRequest = _tracentAIRequest;

// ── Safe data presence check ─────────────────────────────
// Returns true only when G contains real user-entered financial data.
// Used to gate computation and rendering on non-empty state.
window.tracentHasRealData = function() {
  var g = window.G || {};
  return !!(
    g.__initialized &&
    (
      g.income ||
      g.housingType ||
      g.ccDebt ||
      g.carDebt ||
      g.studentDebt
    )
  );
};

// ── [STABILIZE] Canonical storage key — single source of truth ──
// All localStorage reads/writes MUST use this constant.
