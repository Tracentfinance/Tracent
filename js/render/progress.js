/* ═══ Tracent Render: Progress Tab ═══
   Progress subnav rendering, life-stage-aware pill adaptation,
   net worth/career/retirement/goals sub-views.
   
   Depends on: core/navigation.js
   Called by: switchTab → runTabRenderers, mode routing, BSE._applyNav
═══════════════════════════════════════════════ */

// ── Progress subtabs ──────────────────────────────────────
function showProgressSub(sub) {
  console.log('[DASH] showProgressSub', sub);
  window._progressSub = sub;
  var allSubs = ['networth','career','retirement','goals'];
  allSubs.forEach(function(s) {
    var panel = document.getElementById('prog-sub-' + s);
    var pill  = document.getElementById('ppill-' + s);
    if (panel) panel.style.display = s === sub ? 'block' : 'none';
    if (pill)  pill.classList.toggle('active', s === sub);
  });
  // Mode-aware pill adjustment — defers to BSE's applyLifeStageProgress when available
  // Only apply basic mode dimming here as a fallback; BSE handles archetype-level enforcement
  var activeMode = (typeof G !== 'undefined' && G.v21Mode) || 'today';
  if (activeMode === 'retire') {
    var careerPill = document.getElementById('ppill-career');
    if (careerPill && careerPill.style.display !== 'none') careerPill.style.opacity = '0.40';
  }
  if (sub === 'networth')   { try { if (typeof _0x5517bf6 === 'function') _0x5517bf6(); } catch(e) { console.error('[DASH] networth:', e); } }
  if (sub === 'career')     { try { if (typeof _0x32147da === 'function') _0x32147da(); } catch(e) { console.error('[DASH] career:',   e); } }
  if (sub === 'goals')      { try { if (typeof _0x338efee === 'function') _0x338efee(); } catch(e) { console.error('[DASH] goals:',    e); } }
  if (sub === 'retirement') { try { _renderRetirementSub(); } catch(e) { console.error('[DASH] retirement:', e); } }
}


// ── Window export ─────────────────────────────────────────
window.showProgressSub = showProgressSub;


/* ═══════════════════════════════════════════════════════════
   LIFE-STAGE-AWARE PROGRESS RENDERING
   Called by BSE after compute to adapt progress tab by archetype.
   Owns: pill visibility, career/retirement adaptation, mode awareness.
═══════════════════════════════════════════════════════════ */

/**
 * applyLifeStageProgress(archetype)
 * Adapts progress subnav pills by life stage.
 * Called by BSE._enforceRetirementLifeStage().
 */
window.applyLifeStageProgress = function(archetype) {
  var isInRetirement  = (archetype === 'in_retirement');
  var isPreRetirement = (archetype === 'pre_retirement');

  var careerPill  = document.getElementById('ppill-career');
  var retirePill  = document.getElementById('ppill-retirement');

  if (isInRetirement) {
    /* in_retirement: Career pill removed, retirement pill prominent */
    if (careerPill) careerPill.style.display = 'none';
    if (retirePill) { retirePill.style.display = ''; retirePill.style.opacity = '1'; }
  } else if (isPreRetirement) {
    /* pre_retirement: Career pill dimmed, retirement pill shown */
    if (careerPill) { careerPill.style.opacity = '0.35'; careerPill.style.pointerEvents = 'none'; }
    if (retirePill) { retirePill.style.display = ''; retirePill.style.opacity = '1'; }
  } else {
    /* Non-retirement: restore defaults */
    if (careerPill) { careerPill.style.display = ''; careerPill.style.opacity = '1'; careerPill.style.pointerEvents = ''; }
    if (retirePill) retirePill.style.display = '';
  }
};

/**
 * applyLifeStageCareerUI(archetype)
 * Hides/shows career-related UI elements by life stage.
 * Called by BSE._enforceRetirementLifeStage().
 */
window.applyLifeStageCareerUI = function(archetype) {
  var isInRetirement  = (archetype === 'in_retirement');
  var isPreRetirement = (archetype === 'pre_retirement');

  if (isInRetirement) {
    /* Hide career-related mode rail buttons */
    var modeCareer = document.getElementById('mode-btn-career');
    if (modeCareer) modeCareer.style.display = 'none';
    var modeGrow = document.getElementById('mode-btn-grow');
    if (modeGrow) { modeGrow.style.opacity = '0.3'; modeGrow.style.pointerEvents = 'none'; }
    var careerY10 = document.getElementById('pill-career-y10');
    if (careerY10) careerY10.style.display = 'none';
    /* Remove career strategy cards */
    ['career-compare-card','career-chart-card','career-promo-card','career-log-card'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    /* Hide career sub entirely */
    var careerSub = document.getElementById('prog-sub-career');
    if (careerSub) careerSub.style.display = 'none';
  } else if (isPreRetirement) {
    /* Promotion simulator hidden — irrelevant at this stage */
    var promoCard = document.getElementById('career-promo-card');
    if (promoCard) promoCard.style.display = 'none';
    var logCard = document.getElementById('career-log-card');
    if (logCard) logCard.style.display = 'none';
  }
  /* Non-retirement: CSS handles defaults via body class removal */
};
