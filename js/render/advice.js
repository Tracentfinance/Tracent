/* ═══ Tracent Render: Advice Tab ═══
   AI personalization prompt construction + copilot chat/recommendations.
═══════════════════════════════════════════════ */

/* ═══ MODULE: Personalization — AI copilot prompt construction ═══ */
/* ── Behavioral Memory & Personalization Pass ───────────────
   Extends pbfdeState • classifies user archetype •
   adjusts NBM tone • enriches check-in/review •
   adds Position label • auto-triggers return check-in.
   Does not break scoring, onboarding, telemetry, or layout.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_PERSONALIZATION__) return;
  window.__TRACENT_PERSONALIZATION__ = true;

  /* ═══════════════════════════════════════════════════════
     1. EXTEND pbfdeState WITH BEHAVIORAL MEMORY
  ═══════════════════════════════════════════════════════ */
  var ps = window.pbfdeState;
  if (!ps) { ps = {}; window.pbfdeState = ps; }

  // Safe-merge new fields without overwriting existing values
  var defaults = {
    // action history
    ignoredActions:   [],   // [{id, ts, context}]
    acceptedActions:  [],   // [{id, ts, context}]
    timeToFirstAction: null, // seconds from first NBM shown to first click
    firstNBMShownTs:   null,
    // engagement
    checkinCount:      0,
    checkinDates:      [],  // ISO date strings
    preferredModes:    {},  // {mode: count}
    engagementDepth:   0,   // 0–10 composite (views * clicks * sessions)
    sessionDates:      [],  // ISO date strings of each session
    // archetype
    archetype:         null,  // 'avoider'|'optimizer'|'anxious'|'reactive'|'passive'
    archetypeTs:       null,
    // position
    positionLabel:     null,  // 'stabilizing'|'under_pressure'|'improving'|'optimizing'
    positionTs:        null,
    // score history for trend
    scoreHistory:      [],  // [{score, ts}]
    // behavioral notes for review
    lastBehavioralInsight: null
  };
  Object.keys(defaults).forEach(function(k){
    if (ps[k] === undefined || ps[k] === null) ps[k] = defaults[k];
  });

  // Record this session date
  var todayStr = new Date().toISOString().slice(0,10);
  if (ps.sessionDates[ps.sessionDates.length-1] !== todayStr) {
    ps.sessionDates.push(todayStr);
    if (ps.sessionDates.length > 60) ps.sessionDates = ps.sessionDates.slice(-60);
  }

  // Persist helper
  function persist(){
    try { localStorage.setItem('tracent_pbfde', JSON.stringify(ps)); } catch(e){}
  }

  /* ═══════════════════════════════════════════════════════
     2. ARCHETYPE CLASSIFIER
     Pure behavioral — reads pbfdeState counters only.
  ═══════════════════════════════════════════════════════ */
  function classifyArchetype(){
    var ignored    = ps.ignoredActions.length   || ps.ignoredCtas    || 0;
    var accepted   = ps.acceptedActions.length  || ps.nbmClickCount  || 0;
    var hesitation = ps.hesitationCount  || 0;
    var abandons   = ps.modalAbandons    || 0;
    var sessions   = ps.sessionDates.length || 1;
    var views      = ps.nbmViewCount     || 0;
    var commitment = ps.commitmentRate   || 0;
    var depth      = ps.engagementDepth  || 0;

    // Engagement depth score (0–10)
    depth = Math.min(10, Math.round(
      (accepted * 2) + (views * 0.5) + (sessions * 0.5) - (hesitation * 0.3) - (abandons * 0.2)
    ));
    ps.engagementDepth = depth;

    var archetype;
    if (ignored > 4 || (views > 3 && accepted === 0)) {
      archetype = 'avoider';
    } else if (hesitation > 3 || abandons > 2) {
      archetype = 'anxious';
    } else if (sessions > 1 && accepted > 0 && sessions <= 3 && commitment < 0.4) {
      archetype = 'reactive';
    } else if (depth <= 1 && sessions <= 2 && accepted === 0) {
      archetype = 'passive';
    } else if (commitment >= 0.5 && accepted >= 2) {
      archetype = 'optimizer';
    } else {
      // Fallback: derive from score if available
      var score = (window.G && window.G.score) || 0;
      if (score >= 70) archetype = 'optimizer';
      else if (score > 0) archetype = 'reactive';
      else archetype = 'passive';
    }

    ps.archetype   = archetype;
    ps.archetypeTs = Date.now();
    persist();
    return archetype;
  }
  window.tbmClassifyArchetype = classifyArchetype;

  /* ═══════════════════════════════════════════════════════
     3. POSITION LABEL
  ═══════════════════════════════════════════════════════ */
  var POSITION_META = {
    stabilizing:   { label: 'Stabilizing',    icon: '\u{1F4CA}', color: 'rgba(0,119,182,0.85)',  bg: 'rgba(0,119,182,0.10)', desc: 'You\'re building a stronger base. Keep the momentum going.' },
    under_pressure:{ label: 'Under Pressure', icon: '\u26A0\uFE0F', color: 'rgba(220,80,60,0.85)', bg: 'rgba(220,80,60,0.08)',  desc: 'Short-term pressure is high. Your next move matters more than ever.' },
    improving:     { label: 'Improving',      icon: '\u{1F4C8}', color: 'rgba(16,185,129,0.85)', bg: 'rgba(16,185,129,0.08)', desc: 'Your position is moving in the right direction. Stay consistent.' },
    optimizing:    { label: 'Optimizing',     icon: '\u2728',    color: 'rgba(0,168,232,0.85)',  bg: 'rgba(0,168,232,0.10)', desc: 'The foundation is solid. The next gains come from precision.' }
  };

  function computePositionLabel(){
    var g     = window.G || {};
    var score = g.score  || 0;
    var fcf   = g.fcf    || 0;
    var ef    = parseInt(g.emergency||'0');
    var cc    = g.ccDebt || 0;
    var hist  = ps.scoreHistory;

    // Score trend: compare last two entries
    var trend = 0;
    if (hist.length >= 2) {
      trend = hist[hist.length-1].score - hist[hist.length-2].score;
    }

    var label;
    if (fcf < 0 || (cc > 5000 && ef === 0)) {
      label = 'under_pressure';
    } else if (trend > 3 || (score >= 55 && ps.checkinCount >= 1)) {
      label = trend > 3 ? 'improving' : 'stabilizing';
    } else if (score >= 70 && ef >= 3 && cc === 0) {
      label = 'optimizing';
    } else if (score >= 55) {
      label = 'stabilizing';
    } else {
      label = 'under_pressure';
    }

    ps.positionLabel = label;
    ps.positionTs    = Date.now();
    persist();
    return label;
  }

  function renderPositionLabel(){
    var el = document.getElementById('v21-position-label');
    if (!el) return;
    if (!window.G || !window.G.score || !window.G.scoreFinal) return;
    // Partial-data gate: position labels (including "Under Pressure") require complete data
    if (Number((window.G||{}).profileCompleteness||0) < 60) { el.style.display = 'none'; return; }

    var label = computePositionLabel();
    var meta  = POSITION_META[label] || POSITION_META.stabilizing;

    el.innerHTML = '<div class="tbm-position-bar">' +
      '<div class="tbm-position-inner">' +
        '<div class="tbm-position-badge" style="background:'+meta.bg+';border-color:'+meta.color+';">' +
          '<span class="tbm-position-icon">'+meta.icon+'</span>' +
          '<span class="tbm-position-text" style="color:'+meta.color+';">'+meta.label+'</span>' +
        '</div>' +
        '<div class="tbm-position-desc">'+meta.desc+'</div>' +
      '</div>' +
    '</div>';
    el.style.display = 'block';
  }

  /* ═══════════════════════════════════════════════════════
     4. NBM TONE MODIFIER
     Wraps v21GetRankedMoves to adjust copy per archetype.
  ═══════════════════════════════════════════════════════ */
  var TONE_CONFIG = {
    avoider: {
      actionPrefix: 'One small step: ',
      whyPrefix:    'No rush — ',
      sizeScale:    0.5,   // suggest half the dollar amount
      ctaVerb:      'Try this →',
      reassurance:  'This is the simplest thing to do first.'
    },
    anxious: {
      actionPrefix: 'Here\'s what to do: ',
      whyPrefix:    'This is clear and manageable \u2014 ',
      sizeScale:    0.7,
      ctaVerb:      'Start here →',
      reassurance:  'This has been chosen to reduce uncertainty, not add to it.'
    },
    optimizer: {
      actionPrefix: 'Optimal action: ',
      whyPrefix:    '',
      sizeScale:    1.0,
      ctaVerb:      'Act on this →',
      reassurance:  null
    },
    reactive: {
      actionPrefix: '',
      whyPrefix:    'Highest-impact move right now: ',
      sizeScale:    1.0,
      ctaVerb:      'Do this now →',
      reassurance:  'Timing matters here \u2014 acting now beats waiting.'
    },
    passive: {
      actionPrefix: 'When you\u2019re ready: ',
      whyPrefix:    'Whenever you have 5 minutes: ',
      sizeScale:    0.6,
      ctaVerb:      'Start when ready →',
      reassurance:  'No urgency \u2014 just the next logical step.'
    }
  };

  function applyArchetypeTone(moves, archetype){
    if (!moves || !moves.length) return moves;
    var cfg = TONE_CONFIG[archetype];
    if (!cfg) return moves;

    return moves.map(function(move, idx){
      if (idx > 0) return move; // Only tone-adjust the top move
      var adjusted = Object.assign({}, move);

      // Prefix action with tone
      if (cfg.actionPrefix && adjusted.action && adjusted.action.indexOf(cfg.actionPrefix) !== 0) {
        adjusted.action = cfg.actionPrefix + adjusted.action.charAt(0).toLowerCase() + adjusted.action.slice(1);
      }
      // Prefix why with tone
      if (cfg.whyPrefix && adjusted.why && cfg.whyPrefix.length > 0) {
        adjusted.why = cfg.whyPrefix + adjusted.why.charAt(0).toLowerCase() + adjusted.why.slice(1);
      }
      // Add reassurance note for anxious/avoider/passive
      if (cfg.reassurance && adjusted.confidenceNote) {
        adjusted.confidenceNote = cfg.reassurance + ' ' + adjusted.confidenceNote;
      } else if (cfg.reassurance) {
        adjusted.confidenceNote = cfg.reassurance;
      }
      // Scale dollar amounts in title for avoider/passive (make them feel manageable)
      if (cfg.sizeScale < 1.0) {
        adjusted._archetypeScaled = true;
        adjusted._archetype = archetype;
      }
      return adjusted;
    });
  }

  var _prevGetMoves = window.v21GetRankedMoves;
  window.v21GetRankedMoves = function(){
    var moves = typeof _prevGetMoves === 'function' ? _prevGetMoves() : [];
    if (!moves || !moves.length) return moves;
    var at = classifyArchetype();
    // Track NBM first-show timing
    if (ps.firstNBMShownTs === null) ps.firstNBMShownTs = Date.now();
    return applyArchetypeTone(moves, at);
  };

  /* ═══════════════════════════════════════════════════════
     5. ACTION TRACKING — wrap NBM card render to log
  ═══════════════════════════════════════════════════════ */
  var _prevRenderNBM = window.v21RenderNBMCard;
  window.v21RenderNBMCard = function(){
    if (typeof _prevRenderNBM === 'function') _prevRenderNBM();
    // Record first-action timing
    if (ps.timeToFirstAction === null && ps.firstNBMShownTs) {
      var elapsed = (Date.now() - ps.firstNBMShownTs) / 1000;
      if (elapsed > 0.5) ps.timeToFirstAction = Math.round(elapsed);
    }
    persist();
  };

  // Patch NBM click to record accepted action
  var _prevShowNext = window.v21ShowNextMove;
  window.v21ShowNextMove = function(direction){
    if (typeof _prevShowNext === 'function') _prevShowNext(direction);
    try {
      var moves = window.v21GetRankedMoves ? window.v21GetRankedMoves() : [];
      var top   = moves[0];
      if (top && top.id) {
        ps.acceptedActions.push({ id: top.id, ts: Date.now(), context: 'nbm_next' });
        if (ps.acceptedActions.length > 50) ps.acceptedActions = ps.acceptedActions.slice(-50);
      }
    } catch(e){}
    persist();
  };

  // Track CTA ignores as ignored actions
  var _origWatchCta = window.watchCtaIgnore;
  if (typeof _origWatchCta === 'function') {
    window.watchCtaIgnore = function(id, delay){
      _origWatchCta(id, delay);
      // When cta_ignored fires, pbfdeTrack already counts it;
      // we also log into ignoredActions for archetype use
      setTimeout(function(){
        var ignored = (ps.ignoredCtas || 0);
        var prev    = ps._lastIgnoredCtaCount || 0;
        if (ignored > prev) {
          ps.ignoredActions.push({ id: id||'cta', ts: Date.now(), context: 'timeout' });
          if (ps.ignoredActions.length > 50) ps.ignoredActions = ps.ignoredActions.slice(-50);
          ps._lastIgnoredCtaCount = ignored;
          persist();
        }
      }, (delay||6000) + 500);
    };
  }

  // Track mode switches as preferred mode
  var _prevSetMode = window.v21SetMode;
  window.v21SetMode = function(mode, btn){
    if (typeof _prevSetMode === 'function') _prevSetMode(mode, btn);
    if (mode) {
      ps.preferredModes[mode] = (ps.preferredModes[mode] || 0) + 1;
      persist();
    }
  };

  /* ═══════════════════════════════════════════════════════
     6. SCORE HISTORY — append on each post-analysis render
  ═══════════════════════════════════════════════════════ */
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRPA === 'function') _prevRPA();

    var g = window.G || {};
    if (g.score && g.scoreFinal) {
      // Append to score history (dedupe same session)
      var last = ps.scoreHistory[ps.scoreHistory.length-1];
      if (!last || Math.abs(Date.now() - last.ts) > 60000) {
        ps.scoreHistory.push({ score: g.score, ts: Date.now() });
        if (ps.scoreHistory.length > 30) ps.scoreHistory = ps.scoreHistory.slice(-30);
      }
    }

    classifyArchetype();
    renderPositionLabel();
    renderReturnBanner();
    persist();
  };

  /* ═══════════════════════════════════════════════════════
     7. RETURNING USER — auto check-in banner
  ═══════════════════════════════════════════════════════ */
  function renderReturnBanner(){
    // Only show on return sessions (session 2+) and only once per day
    if (!isReturnSession()) return;
    var el = document.getElementById('v21-return-banner');
    if (!el) return;
    if (el.dataset.shown) return;
    el.dataset.shown = '1';

    var g = window.G || {};
    if (!g.score || !g.scoreFinal) return;

    var archetype = ps.archetype || classifyArchetype();
    var atMeta = ARCHETYPE_META[archetype] || ARCHETYPE_META.passive;
    var greeting = atMeta.returnGreeting;

    el.innerHTML = '<div class="tbm-return-banner">' +
      '<div class="tbm-return-inner">' +
        '<div class="tbm-return-left">' +
          '<div class="tbm-return-icon">'+atMeta.icon+'</div>' +
          '<div>' +
            '<div class="tbm-return-title">'+greeting+'</div>' +
            '<div class="tbm-return-sub">Quick check-in takes under 60 seconds.</div>' +
          '</div>' +
        '</div>' +
        '<button class="tbm-return-btn" onclick="tbmOpenCheckin()">Check in →</button>' +
      '</div>' +
    '</div>';
    el.style.display = 'block';
  }

  var ARCHETYPE_META = {
    avoider: {
      icon: '\u{1F331}', label: 'Getting started',
      returnGreeting: 'Good to see you back. One small update is all it takes.',
      insightLabel:   'You tend to watch before acting \u2014 that\u2019s fine. The moves here are designed to be low-friction.'
    },
    anxious: {
      icon: '\u{1F6E1}', label: 'Focused on clarity',
      returnGreeting: 'Welcome back. Your situation is clear and manageable.',
      insightLabel:   'You tend to overthink before deciding \u2014 this review cuts through the noise to one thing.'
    },
    optimizer: {
      icon: '\u{1F3AF}', label: 'Optimizing',
      returnGreeting: 'Welcome back. Let\u2019s see what\u2019s moved.',
      insightLabel:   'You engage consistently and follow through. Here\u2019s where the next gain is.'
    },
    reactive: {
      icon: '\u26A1', label: 'High-momentum',
      returnGreeting: 'Welcome back. Here\u2019s what needs your attention.',
      insightLabel:   'You act quickly when motivated. The goal is consistency between the peaks.'
    },
    passive: {
      icon: '\u{1F4CB}', label: 'Building habits',
      returnGreeting: 'Welcome back. No pressure \u2014 just one thing to review.',
      insightLabel:   'You\u2019re still building the habit of reviewing your finances. One consistent check-in per month changes the trajectory.'
    }
  };
  window.ARCHETYPE_META = ARCHETYPE_META;

  /* Check-in trigger */
  function isReturnSession(){
    try { return Number(localStorage.getItem('tracent_dashboard_seen_count')||'0') >= 2; } catch(e){ return false; }
  }

  window.tbmOpenCheckin = function(){
    try {
      ps.checkinCount++;
      ps.checkinDates.push(new Date().toISOString());
      if (ps.checkinDates.length > 30) ps.checkinDates = ps.checkinDates.slice(-30);
      persist();
      if (typeof window.v21OpenCheckin === 'function') window.v21OpenCheckin();
    } catch(e){}
  };

  /* ═══════════════════════════════════════════════════════
     8. ENHANCED CHECK-IN CONTENT (archetype-aware)
  ═══════════════════════════════════════════════════════ */
  var _prevBuildCheckin = window.buildCheckinContent;
  window.buildCheckinContent = function(){
    var baseContent = typeof _prevBuildCheckin === 'function' ? _prevBuildCheckin() : '';
    var archetype   = ps.archetype || classifyArchetype();
    var atMeta      = ARCHETYPE_META[archetype] || ARCHETYPE_META.passive;
    var g           = window.G || {};

    // Score trend note
    var trendNote = '';
    if (ps.scoreHistory.length >= 2) {
      var delta = ps.scoreHistory[ps.scoreHistory.length-1].score - ps.scoreHistory[ps.scoreHistory.length-2].score;
      trendNote = delta > 0 ? '\u2191 Score is up '+delta+' pts since last check-in.'
                : delta < 0 ? '\u2193 Score is down '+Math.abs(delta)+' pts \u2014 one of your factors slipped.'
                : 'Score is unchanged \u2014 stable position.';
    }

    // Behavioral insight block
    var insightBlock = '<div class="tbm-ci-insight">' +
      '<div class="tbm-ci-insight-label">Your behavioral pattern</div>' +
      '<div class="tbm-ci-insight-text">'+atMeta.insightLabel+'</div>' +
      (trendNote ? '<div class="tbm-ci-trend">'+trendNote+'</div>' : '') +
    '</div>';

    // Prepend insight to base content
    return insightBlock + (baseContent || '');
  };

  /* ═══════════════════════════════════════════════════════
     9. ENHANCED MONTHLY REVIEW (behavioral section)
  ═══════════════════════════════════════════════════════ */
  var _prevBuildMonthly = window.buildMonthlyReviewContent;
  window.buildMonthlyReviewContent = function(){
    var baseContent = typeof _prevBuildMonthly === 'function' ? _prevBuildMonthly() : '';
    var archetype   = ps.archetype || classifyArchetype();
    var atMeta      = ARCHETYPE_META[archetype] || ARCHETYPE_META.passive;

    // Score trend analysis
    var hist = ps.scoreHistory;
    var trendAnalysis = '';
    if (hist.length >= 2) {
      var earliest = hist[0], latest = hist[hist.length-1];
      var totalDelta = latest.score - earliest.score;
      var days = Math.round((latest.ts - earliest.ts) / 86400000);
      if (totalDelta > 5) {
        trendAnalysis = 'Score has improved by '+totalDelta+' points over the last '+days+' days. The trend is positive.';
      } else if (totalDelta < -3) {
        trendAnalysis = 'Score has dipped by '+Math.abs(totalDelta)+' points. One factor moved backward \u2014 check the factor breakdown.';
      } else {
        trendAnalysis = 'Score is holding steady \u2014 no major shift in either direction over '+days+' days.';
      }
    }

    // Engagement summary
    var sessions    = ps.sessionDates.length;
    var checkins    = ps.checkinCount || 0;
    var commitRate  = Math.round((ps.commitmentRate || 0) * 100);
    var engInsight;
    if (commitRate >= 50) {
      engInsight = 'You\u2019ve been acting on recommendations consistently ('+commitRate+'% follow-through). That\u2019s what moves the score.';
    } else if (sessions <= 1) {
      engInsight = 'This is an early session \u2014 more data will sharpen the behavioral insight over time.';
    } else {
      engInsight = 'You\u2019ve visited '+sessions+' times this period. Follow-through on even one recommendation per session accelerates progress.';
    }

    // Next behavioral adjustment
    var nextAdjust = (function(){
      if (archetype === 'avoider')   return 'Try one small action this week. Not the biggest one \u2014 the one you can do in 10 minutes.';
      if (archetype === 'anxious')   return 'Focus on one factor at a time. The score breakdown shows exactly which lever to pull.';
      if (archetype === 'optimizer') return 'You\u2019re in good shape. The next gain is in the details \u2014 check whether your retirement match is fully captured.';
      if (archetype === 'reactive')  return 'Sustain the momentum from your last action. A monthly check-in calendar reminder keeps you consistent.';
      return 'Set a recurring 5-minute check-in date. Monthly reviews compound over time even if nothing feels urgent.';
    })();

    // Store for use in other screens
    ps.lastBehavioralInsight = engInsight;
    persist();

    var behavioralSection = '<div class="tbm-monthly-behavioral">' +
      '<div class="tbm-monthly-beh-title">Behavioral review</div>' +
      (trendAnalysis ? '<div class="tbm-monthly-beh-row"><span class="tbm-beh-label">Score trend</span><span class="tbm-beh-value">'+trendAnalysis+'</span></div>' : '') +
      '<div class="tbm-monthly-beh-row"><span class="tbm-beh-label">Engagement</span><span class="tbm-beh-value">'+engInsight+'</span></div>' +
      '<div class="tbm-monthly-beh-row"><span class="tbm-beh-label">Your pattern</span><span class="tbm-beh-value">'+atMeta.insightLabel+'</span></div>' +
      '<div class="tbm-monthly-beh-next"><strong>Next adjustment:</strong> '+nextAdjust+'</div>' +
    '</div>';

    return (baseContent || '') + behavioralSection;
  };

  /* ═══════════════════════════════════════════════════════
     10. RETURN BANNER HTML SLOT (inject into tab-home)
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function(){
    var tabHome = document.getElementById('tab-home');
    if (tabHome && !document.getElementById('v21-return-banner')) {
      var slot = document.createElement('div');
      slot.id = 'v21-return-banner';
      slot.style.display = 'none';
      // Insert after position label
      var posLabel = document.getElementById('v21-position-label');
      if (posLabel && posLabel.parentNode) {
        posLabel.parentNode.insertBefore(slot, posLabel.nextSibling);
      } else {
        tabHome.insertBefore(slot, tabHome.firstChild);
      }
    }
  });

  /* ═══════════════════════════════════════════════════════
     11. CSS
  ═══════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = [
    /* Position label */
    '#v21-position-label { margin-bottom: 0; }',
    '.tbm-position-bar { padding: 10px 20px 0; }',
    '.tbm-position-inner { display: flex; align-items: center; gap: 10px; }',
    '.tbm-position-badge {',
    '  display: inline-flex; align-items: center; gap: 6px;',
    '  padding: 5px 12px; border-radius: 999px;',
    '  border: 1px solid;',
    '  font-size: 12px; font-weight: 700;',
    '}',
    '.tbm-position-icon { font-size: 13px; }',
    '.tbm-position-text { letter-spacing: 0.2px; }',
    '.tbm-position-desc {',
    '  font-size: 12px; color: rgba(255,255,255,0.48);',
    '  line-height: 1.5; flex: 1;',
    '}',
    /* Return banner */
    '#v21-return-banner { margin-bottom: 0; }',
    '.tbm-return-banner { padding: 0 20px; }',
    '.tbm-return-inner {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  gap: 12px; padding: 12px 14px;',
    '  background: rgba(255,255,255,0.06);',
    '  border: 1px solid rgba(255,255,255,0.10);',
    '  border-radius: var(--r-sm);',
    '  margin-top: 10px;',
    '}',
    '.tbm-return-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }',
    '.tbm-return-icon { font-size: 20px; flex-shrink: 0; }',
    '.tbm-return-title { font-size: 13px; font-weight: 600; color: var(--white); margin-bottom: 2px; line-height: 1.35; }',
    '.tbm-return-sub { font-size: 11px; color: rgba(255,255,255,0.45); }',
    '.tbm-return-btn {',
    '  padding: 8px 14px; border-radius: 999px; border: none;',
    '  background: var(--sky); color: var(--white);',
    '  font-family: var(--font-body); font-size: 12px; font-weight: 700;',
    '  cursor: pointer; white-space: nowrap; flex-shrink: 0;',
    '  transition: opacity 0.15s;',
    '}',
    '.tbm-return-btn:active { opacity: 0.80; }',
    /* Check-in behavioral insight */
    '.tbm-ci-insight {',
    '  background: var(--gray-1); border-radius: var(--r-sm);',
    '  padding: 12px 14px; margin-bottom: 14px;',
    '}',
    '.tbm-ci-insight-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--gray-3); margin-bottom: 5px; }',
    '.tbm-ci-insight-text { font-size: 13px; color: var(--navy); line-height: 1.55; }',
    '.tbm-ci-trend { font-size: 12px; color: var(--teal); font-weight: 600; margin-top: 6px; }',
    /* Monthly review behavioral section */
    '.tbm-monthly-behavioral {',
    '  margin-top: 14px; padding: 14px;',
    '  background: var(--gray-1); border-radius: var(--r-sm);',
    '}',
    '.tbm-monthly-beh-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: var(--gray-3); margin-bottom: 10px; }',
    '.tbm-monthly-beh-row { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }',
    '.tbm-beh-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--gray-3); }',
    '.tbm-beh-value { font-size: 13px; color: var(--navy); line-height: 1.55; }',
    '.tbm-monthly-beh-next {',
    '  margin-top: 6px; padding-top: 10px;',
    '  border-top: 1px solid var(--gray-2);',
    '  font-size: 12px; color: var(--teal); line-height: 1.55;',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // Expose archetype meta for use by other passes
  window.tbmArchetypeMeta = ARCHETYPE_META;
  window.tbmGetArchetype  = function(){ return ps.archetype || classifyArchetype(); };
  window.tbmGetPosition   = function(){ return ps.positionLabel || computePositionLabel(); };

  // Init immediately
  classifyArchetype();
  persist();

})();


/* ═══ MODULE: Copilot — AI advice tab, chat, recommendations ═══ */
/* ── Tracent Copilot ─────────────────────────────────────────
   Context-aware AI assistant grounded in the user's real
   financial state. Not a generic chatbot. Every response is
   structured: grounding → answer → reasoning → impact → next step.
   Uses _tracentAIRequest for all LLM calls.
─────────────────────────────────────────────────────────── */
(function(){
  if (window.__TRACENT_COPILOT__) return;
  window.__TRACENT_COPILOT__ = true;

  /* ═══════════════════════════════════════════════════════
     1. CONTEXT OBJECT BUILDER
  ═══════════════════════════════════════════════════════ */
  function buildCopilotContext(){
    var gv = window.G || {};
    var ps = window.pbfdeState || {};

    var active = (function(){
      var btn = document.querySelector('.v21-mode-btn.active');
      return btn ? btn.id.replace('mode-btn-','') : (gv.primaryIntent||'today');
    })();

    var score      = gv.score || 0;
    var scoreFinal = !!gv.scoreFinal;
    var band       = (typeof v21BandForScore === 'function' && score)
      ? v21BandForScore(score).label.replace(/[⬤●🔴🟡🔵🟢⬡]\s*/,'')
      : (score>=85?'Compounding':score>=70?'Advancing':score>=55?'Stabilizing':score>=40?'Exposed':'Fragile');

    var cats = gv.scoreCategories ? Object.values(gv.scoreCategories) : [];
    var factors = cats.map(function(c){
      return c.label+': '+c.score+'/100 ('+c.weight+'% weight)';
    });

    var moves = [];
    try { moves = window.v21GetRankedMoves ? window.v21GetRankedMoves() : []; } catch(e){}
    var nbm = moves[0] || null;

    var archetype = ps.archetype || (window.tbmGetArchetype ? window.tbmGetArchetype() : 'passive');
    var inf = Array.isArray(gv._inferredFields) ? gv._inferredFields : [];
    var completeness = gv.profileCompleteness || 0;
    var confidence = completeness>=80&&inf.length===0?'high':completeness>=60&&inf.length<=2?'medium':'low';

    return {
      activeMode:    active,
      score:         score,
      scoreFinal:    scoreFinal,
      band:          band,
      factors:       factors,
      nbmTitle:      nbm ? nbm.title : null,
      nbmWhy:        nbm ? nbm.why   : null,
      nbmAction:     nbm ? nbm.action: null,
      nbmCategory:   nbm ? nbm.category : null,
      takeHome:      gv.takeHome  || 0,
      fcf:           gv.fcf       || 0,
      income:        gv.income    || 0,
      ccDebt:        gv.ccDebt    || 0,
      ccRate:        gv.ccRate    || 21,
      carDebt:       gv.carDebt   || 0,
      studentDebt:   gv.studentDebt || 0,
      otherDebt:     gv.otherDebt   || 0,
      totalDebt:     (gv.ccDebt||0)+(gv.carDebt||0)+(gv.studentDebt||0)+(gv.otherDebt||0),
      dti:           gv.dti       || 0,
      efMonths:      parseInt(gv.emergency||'0'),
      homePrice:     gv.homePrice||gv.targetHomePrice||0,
      depSaved:      gv.depositSaved||gv.downPayment||0,
      retMatch:      gv.retMatch  || 'unknown',
      credit:        gv.credit    || 'unknown',
      archetype:     archetype,
      confidence:    confidence,
      inferredFields: inf,
      positionLabel: ps.positionLabel || null,
      stage:         ps.stage || 'observe'
    };
  }

  /* ═══════════════════════════════════════════════════════
     2. INTENT DETECTION
  ═══════════════════════════════════════════════════════ */
  var PURCHASE_PATTERNS = [/afford|buy|purchase|spend|cost|price|worth it|should i get/i];
  var EXPLAIN_PATTERNS  = [/why|what.*score|how.*score|explain|tell me|what.*mean|factor/i];
  var OPTIMIZE_PATTERNS = [/improve|faster|better|increase|boost|raise|optimize|best.*way|how.*do/i];
  var GUIDANCE_PATTERNS = [/what.*should|next.*step|next.*move|what.*do|this week|help|plan|start/i];

  function detectIntent(text){
    if (PURCHASE_PATTERNS.some(function(r){ return r.test(text); })) return 'purchase';
    if (EXPLAIN_PATTERNS.some(function(r){ return r.test(text); }))  return 'explain';
    if (OPTIMIZE_PATTERNS.some(function(r){ return r.test(text); })) return 'optimize';
    if (GUIDANCE_PATTERNS.some(function(r){ return r.test(text); })) return 'guidance';
    return 'general';
  }

  /* ═══════════════════════════════════════════════════════
     3. PURCHASE DECISION LOGIC (client-side, no AI needed)
  ═══════════════════════════════════════════════════════ */
  function evaluatePurchase(cost, ctx){
    var fmt = function(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString(); };
    var fcf = ctx.fcf;
    var ef  = ctx.efMonths;
    var cc  = ctx.ccDebt;

    // Metrics
    var fcfRatio   = fcf > 0 ? cost / fcf : Infinity;          // months of FCF
    var efAfterCash= ef;                                         // EF unaffected by most purchases
    var isOnCard   = cc > 0;                                     // risky if already carrying CC
    var debtWorsens= isOnCard && cost > fcf;                     // would likely go on card

    var verdict, reasoning, impact;

    if (fcf < 0) {
      verdict   = 'risky';
      reasoning = 'Your free cash flow is currently negative — you are spending more than you earn. This purchase would worsen an already unstable cash position.';
      impact    = 'High. Could trigger additional debt with no clear payoff path.';
    } else if (fcfRatio > 3 || debtWorsens) {
      verdict   = 'risky';
      reasoning = cost > 0
        ? 'This purchase represents '+Math.round(fcfRatio).toFixed(1)+'x your monthly free cash flow'+(debtWorsens?' and would likely need to go on your credit card at '+(ctx.ccRate||21)+'% APR':'')+'.'
        : 'This purchase would be a significant strain relative to your current financial position.';
      impact    = 'Moderate to high. Delays debt payoff and emergency fund growth.';
    } else if (ef < 1 && cost > 500) {
      verdict   = 'borderline';
      reasoning = 'You have no emergency buffer. A purchase of this size leaves you exposed if anything unexpected comes up in the next 30 days.';
      impact    = 'Moderate. Manageable if income is stable, but fragile.';
    } else if (fcfRatio > 1 && fcfRatio <= 3) {
      verdict   = 'borderline';
      reasoning = 'This purchase costs roughly '+Math.round(fcfRatio*10)/10+' months of your free cash flow. It is feasible but would slow other goals.';
      impact    = 'Low to moderate. Delays your next financial milestone by ~'+Math.round(fcfRatio)+' months.';
    } else {
      verdict   = 'safe';
      reasoning = 'At '+fmt(cost)+', this represents '+Math.round(fcfRatio*10)/10+' months of free cash flow. Your emergency fund ('+ef+' months) stays intact.';
      impact    = 'Minimal. Fits within your current financial capacity.';
    }

    return { verdict: verdict, reasoning: reasoning, impact: impact, cost: cost, fcf: fcf };
  }

  /* ═══════════════════════════════════════════════════════
     4. TONE CONFIG PER ARCHETYPE
  ═══════════════════════════════════════════════════════ */
  var TONE_SYSTEM = {
    avoider:   'Be warm, low-pressure, and concrete. Break everything into the smallest possible steps. Never use urgency. Avoid jargon. If recommending an action, make it feel trivially easy.',
    optimizer: 'Be direct, data-led, and precise. Skip reassurance. Use exact numbers. Identify the highest-leverage action and state it clearly without hedging.',
    anxious:   'Be calm, clear, and methodical. Acknowledge uncertainty without amplifying it. Show the logic. One step at a time. Avoid ambiguous language.',
    reactive:  'Be energetic, specific, and action-focused. Lead with the most urgent thing. Short sentences. Make the next step feel compelling and immediate.',
    passive:   'Be gentle and non-judgmental. Frame everything as optional but valuable. Short, easy wins. No pressure.'
  };

  /* ═══════════════════════════════════════════════════════
     5. SYSTEM PROMPT BUILDER
  ═══════════════════════════════════════════════════════ */
  function buildSystemPrompt(ctx, intent){
    var toneLine = TONE_SYSTEM[ctx.archetype] || TONE_SYSTEM.passive;
    var factorLines = ctx.factors.length
      ? 'Score breakdown: ' + ctx.factors.join(' | ')
      : 'Score breakdown: not yet available';

    return 'You are Tracent Copilot — a grounded financial planning assistant.\n'+
      'The user has a Tracent planning score of '+(ctx.scoreFinal?ctx.score+'/100 ('+ctx.band+')':'not yet calculated')+'.\n'+
      'Active mode: '+ctx.activeMode+'.\n'+
      factorLines+'.\n'+
      'Free cash flow: $'+Math.round(ctx.fcf)+'/mo. '+
      'Take-home: $'+Math.round(ctx.takeHome)+'/mo. '+
      'Emergency fund: '+ctx.efMonths+' months. '+
      'Credit card debt: $'+Math.round(ctx.ccDebt)+'. '+
      'Total non-housing debt: $'+Math.round(ctx.totalDebt)+'. '+
      'DTI: '+ctx.dti+'%. '+
      'Behavioral pattern: '+ctx.archetype+'. '+
      (ctx.nbmTitle ? 'Top recommended action: '+ctx.nbmTitle+'. Why: '+ctx.nbmWhy+'. ' : '')+
      'Confidence in data: '+ctx.confidence+(ctx.inferredFields.length?' ('+ctx.inferredFields.length+' fields estimated)':'')+'.\n\n'+
      'CRITICAL RULES:\n'+
      '1. Your response MUST be valid JSON with exactly these keys: {"grounding":"","answer":"","reasoning":"","impact":"","recommendation":""}.\n'+
      '2. grounding: One sentence confirming what you can see in their data (cite real numbers).\n'+
      '3. answer: A direct, specific answer to their question — no hedging, no generic advice.\n'+
      '4. reasoning: The "why" behind the answer — connect it to their specific numbers.\n'+
      '5. impact: What happens to their financial position if they follow or ignore this.\n'+
      '6. recommendation: One concrete next action (specific, actionable, sized to their situation).\n'+
      '7. Never say "consult a financial advisor", "it depends", "consider your goals", or similar generic hedges.\n'+
      '8. Every number you mention must come from the data above — no invented figures.\n'+
      '9. Tone: '+toneLine+'\n'+
      '10. Return ONLY the JSON object. No prose, no markdown, no backticks.';
  }

  /* ═══════════════════════════════════════════════════════
     6. CALL AI + PARSE STRUCTURED RESPONSE
  ═══════════════════════════════════════════════════════ */
  async function callCopilot(userMessage, ctx){
    var intent   = detectIntent(userMessage);

    // Purchase shortcut — evaluate client-side first
    var purchaseCost = null;
    if (intent === 'purchase') {
      var numMatch = userMessage.match(/\$?([\d,]+(?:\.\d+)?)/);
      if (numMatch) purchaseCost = parseFloat(numMatch[1].replace(/,/g,''));
    }

    var systemPrompt = buildSystemPrompt(ctx, intent);
    var userPrompt   = userMessage;

    if (purchaseCost !== null) {
      var pre = evaluatePurchase(purchaseCost, ctx);
      userPrompt += '\n[Pre-analysis: This purchase costs $'+purchaseCost+
        '. Initial evaluation: '+pre.verdict+'. '+pre.reasoning+']';
    }

    try {
      var r = await _tracentAIRequest({
        system:     systemPrompt,
        prompt:     userPrompt,
        max_tokens: 800
      });
      if (!r.ok) throw new Error('proxy_unavailable');
      var data = await r.json();
      var text = data.content && data.content[0] ? data.content[0].text : '';
      var clean = text.replace(/```json|```/g,'').trim();
      // Fix common truncation: add closing brace if missing
      if (clean.charAt(0)==='{' && clean.charAt(clean.length-1)!=='}') clean += '"}';;
      var parsed = JSON.parse(clean);
      return { ok: true, data: parsed, intent: intent, purchasePre: purchaseCost!==null?pre:null };
    } catch(err) {
      return { ok: false, error: err.message, intent: intent };
    }
  }

  /* ═══════════════════════════════════════════════════════
     7. LOCAL FALLBACK (no proxy)
  ═══════════════════════════════════════════════════════ */
  function localFallback(userMessage, ctx){
    var intent = detectIntent(userMessage);
    var fmt = function(n){ return '$'+Math.round(Math.abs(n||0)).toLocaleString(); };

    if (intent === 'purchase') {
      var numMatch = userMessage.match(/\$?([\d,]+(?:\.\d+)?)/);
      var cost = numMatch ? parseFloat(numMatch[1].replace(/,/g,'')) : null;
      if (cost !== null) {
        var ev = evaluatePurchase(cost, ctx);
        var verdictLabel = ev.verdict==='safe'?'This looks manageable':ev.verdict==='borderline'?'This is on the edge':'I\'d pause on this';
        return {
          grounding:      'You have '+fmt(ctx.fcf)+'/mo free cash flow, '+ctx.efMonths+' months of emergency savings, and '+fmt(ctx.ccDebt)+' in credit card debt.',
          answer:         verdictLabel+' — verdict: '+ev.verdict.toUpperCase(),
          reasoning:      ev.reasoning,
          impact:         ev.impact,
          recommendation: ev.verdict==='safe'
            ? 'Go ahead. Confirm you can pay it in full before it affects your cash position.'
            : ev.verdict==='borderline'
            ? 'If you do this, pause any other discretionary spending for 30 days.'
            : 'Delay this purchase until your free cash flow has been positive for 3+ months.'
        };
      }
    }

    if (intent === 'guidance' || intent === 'general') {
      var nbmTitle = ctx.nbmTitle || 'build a 1-month cash buffer';
      return {
        grounding:      'Your current score is '+(ctx.scoreFinal?ctx.score+'/100 ('+ctx.band+')':'not yet calculated')+', with '+fmt(ctx.fcf)+'/mo free cash flow.',
        answer:         'The highest-leverage action for your position right now is: '+nbmTitle,
        reasoning:      ctx.nbmWhy || 'This action addresses the biggest drag on your current score and frees the most capacity.',
        impact:         'Acting on this in the next 7 days moves your position faster than anything else you could do.',
        recommendation: ctx.nbmAction || 'Start today — even a partial step is progress.'
      };
    }

    if (intent === 'explain') {
      var worstFactor = null;
      if (window.G && window.G.scoreCategories) {
        var cats2 = Object.values(window.G.scoreCategories);
        cats2.sort(function(a,b){ return (a.score*a.weight)-(b.score*b.weight); });
        worstFactor = cats2[0];
      }
      return {
        grounding:      'Your planning score is '+(ctx.scoreFinal?ctx.score+'/100':'not yet calculated')+', built from '+ctx.factors.length+' weighted factors.',
        answer:         worstFactor
          ? 'Your score is most held back by '+worstFactor.label+' ('+worstFactor.score+'/100, '+worstFactor.weight+'% weight).'
          : 'Your score reflects your cash flow, debt load, emergency cushion, credit standing, and wealth trajectory.',
        reasoning:      worstFactor
          ? worstFactor.label+' carries the most weight and is currently scoring '+worstFactor.score+'/100.'
          : 'Each factor is weighted by its real-world impact on financial resilience.',
        impact:         worstFactor
          ? 'Improving this one factor could move your score by up to '+(worstFactor.weight*0.3).toFixed(0)+' points.'
          : 'Improving the lowest-scoring, highest-weight factor has the biggest effect.',
        recommendation: 'Open the score breakdown (tap your score number) to see each factor and model a fix with the What-If sliders.'
      };
    }

    // optimize fallback
    return {
      grounding:      'Your position: score '+(ctx.scoreFinal?ctx.score+'/100 ('+ctx.band+')':'unscored')+', FCF '+fmt(ctx.fcf)+'/mo, EF '+ctx.efMonths+' months.',
      answer:         'The fastest improvement path for your current position is: '+(ctx.nbmTitle||'complete your profile for a full analysis'),
      reasoning:      ctx.nbmWhy || 'This was ranked highest across urgency, impact, and feasibility.',
      impact:         'Consistent action on the top-ranked move each week compounds meaningfully over 3 months.',
      recommendation: ctx.nbmAction || 'Start with one concrete step this week.'
    };
  }

  /* ═══════════════════════════════════════════════════════
     8. UI — RENDER RESPONSE
  ═══════════════════════════════════════════════════════ */
  var VERDICT_STYLE = {
    safe:       { bg:'rgba(16,185,129,0.07)', border:'rgba(16,185,129,0.20)', label:'✅ Safe' },
    borderline: { bg:'rgba(245,158,11,0.07)', border:'rgba(245,158,11,0.22)', label:'⚠️ Borderline' },
    risky:      { bg:'rgba(239,68,68,0.07)',  border:'rgba(239,68,68,0.20)',  label:'🔴 Risky' }
  };

  function renderResponse(container, resp, intent, purchasePre){
    if (!container) return;
    container.innerHTML = '';

    // Purchase verdict banner
    if (purchasePre) {
      var vs = VERDICT_STYLE[purchasePre.verdict] || VERDICT_STYLE.borderline;
      var banner = document.createElement('div');
      banner.className = 'tcp-verdict-banner';
      banner.style.cssText = 'background:'+vs.bg+';border:1.5px solid '+vs.border+';border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:13px;font-weight:700;color:var(--navy);';
      banner.textContent = vs.label;
      container.appendChild(banner);
    }

    var sections = [
      { key:'grounding',       label:'What I can see', icon:'🔍' },
      { key:'answer',          label:'Direct answer',  icon:'✦' },
      { key:'reasoning',       label:'Why this',       icon:'📐' },
      { key:'impact',          label:'Impact',         icon:'📊' },
      { key:'recommendation',  label:'Next step',      icon:'→', highlight: true }
    ];

    sections.forEach(function(sec){
      var text = resp[sec.key];
      if (!text) return;
      var el = document.createElement('div');
      el.className = 'tcp-resp-section' + (sec.highlight ? ' tcp-resp-highlight' : '');
      el.innerHTML =
        '<div class="tcp-resp-label"><span class="tcp-resp-icon">'+sec.icon+'</span>'+sec.label+'</div>'+
        '<div class="tcp-resp-body">'+text+'</div>';
      container.appendChild(el);
    });

    // Disclaimer
    var disc = document.createElement('div');
    disc.className = 'tcp-disclaimer';
    disc.textContent = 'For planning purposes only. Not financial advice. Verify with a qualified professional before acting.';
    container.appendChild(disc);
  }

  function setLoading(container, on){
    if (!container) return;
    if (on) {
      container.innerHTML = '<div class="tcp-loading"><div class="tcp-dot"></div><div class="tcp-dot"></div><div class="tcp-dot"></div></div>';
    }
  }

  /* ═══════════════════════════════════════════════════════
     9. COPILOT SEND
  ═══════════════════════════════════════════════════════ */
  window.tcpSend = async function(userMessage){
    if (!userMessage || !userMessage.trim()) return;
    var input     = document.getElementById('tcp-input');
    var respArea  = document.getElementById('tcp-response');
    var history   = document.getElementById('tcp-history');
    if (!respArea) return;

    var msg = userMessage.trim();
    if (input) input.value = '';

    // Add user message to history
    if (history) {
      var userEl = document.createElement('div');
      userEl.className = 'tcp-user-msg';
      userEl.textContent = msg;
      history.appendChild(userEl);
      history.scrollTop = history.scrollHeight;
    }

    setLoading(respArea, true);

    var ctx = buildCopilotContext();

    try { tracentTrack('ai_opened', { surface: 'copilot', intent: detectIntent(msg) }); } catch(e){}

    var result;
    if (!window.TRACENT_PROXY_URL || !window.TRACENT_PROXY_URL.trim()) {
      // No proxy — use structured local fallback
      await new Promise(function(r){ setTimeout(r, 600); }); // simulate thinking
      result = { ok: true, data: localFallback(msg, ctx), intent: detectIntent(msg), purchasePre: null };
      // Also check for purchase pre-analysis
      if (detectIntent(msg)==='purchase') {
        var nm = msg.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (nm) result.purchasePre = evaluatePurchase(parseFloat(nm[1].replace(/,/g,'')), ctx);
      }
    } else {
      result = await callCopilot(msg, ctx);
    }

    if (result.ok) {
      renderResponse(respArea, result.data, result.intent, result.purchasePre);
    } else {
      respArea.innerHTML = '<div class="tcp-error">Copilot is not connected. Set TRACENT_PROXY_URL to enable AI responses. Your local financial analysis is still fully available.</div>';
    }

    if (history) history.scrollTop = history.scrollHeight;
  };

  window.tcpSendPrompt = function(text){
    var input = document.getElementById('tcp-input');
    if (input) input.value = text;
    window.tcpSend(text);
  };

  /* ═══════════════════════════════════════════════════════
     10. PANEL OPEN/CLOSE
  ═══════════════════════════════════════════════════════ */
  window.tcpOpen = function(){
    var panel = document.getElementById('tcp-panel');
    var overlay = document.getElementById('tcp-overlay');
    if (!panel) return;
    panel.classList.add('tcp-open');
    if (overlay) overlay.classList.add('tcp-overlay-show');
    document.body.style.overflow = 'hidden';
    // Auto-greet on first open if no analysis yet
    var respArea = document.getElementById('tcp-response');
    if (respArea && !respArea.hasChildNodes()) {
      var ctx = buildCopilotContext();
      if (ctx.scoreFinal && ctx.nbmTitle) {
        var greet = localFallback('What should I do this week?', ctx);
        renderResponse(respArea, greet, 'guidance', null);
      }
    }
    try { tracentTrack('copilot_opened', {}); } catch(e){}
  };

  window.tcpClose = function(){
    var panel = document.getElementById('tcp-panel');
    var overlay = document.getElementById('tcp-overlay');
    if (!panel) return;
    panel.classList.remove('tcp-open');
    if (overlay) overlay.classList.remove('tcp-overlay-show');
    document.body.style.overflow = '';
    try { tracentTrack('copilot_closed', {}); } catch(e){}
  };

  window.tcpKeydown = function(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      var input = document.getElementById('tcp-input');
      if (input) window.tcpSend(input.value);
    }
  };

  /* ═══════════════════════════════════════════════════════
     11. INJECT HTML
  ═══════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function(){
    if (document.getElementById('tcp-panel')) return;

    var wrapper = document.createElement('div');
    wrapper.innerHTML = [
      // Overlay
      '<div id="tcp-overlay" onclick="tcpClose()"></div>',

      // Floating button
      '<button id="tcp-fab" onclick="tcpOpen()" aria-label="Open Tracent Copilot">',
        '<span class="tcp-fab-icon">',
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">',
            '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
          '</svg>',
        '</span>',
        '<span class="tcp-fab-label">Copilot</span>',
      '</button>',

      // Panel
      '<div id="tcp-panel" role="dialog" aria-modal="true">',
        '<div class="tcp-header">',
          '<div class="tcp-header-left">',
            '<div class="tcp-header-logo">',
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">',
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
              '</svg>',
            '</div>',
            '<div>',
              '<div class="tcp-header-title">Tracent Copilot</div>',
              '<div class="tcp-header-sub" id="tcp-context-line">Based on your current position</div>',
            '</div>',
          '</div>',
          '<button class="tcp-close-btn" onclick="tcpClose()" aria-label="Close">',
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
          '</button>',
        '</div>',

        '<div class="tcp-body">',
          // Suggested prompts
          '<div class="tcp-prompts" id="tcp-prompts">',
            '<div class="tcp-prompts-label">Suggested questions</div>',
            '<div class="tcp-chips">',
              '<button class="tcp-chip" onclick="tcpSendPrompt(\'Can I afford this purchase?\')">Can I afford this?</button>',
              '<button class="tcp-chip" onclick="tcpSendPrompt(\'What should I do this week?\')">What to do this week?</button>',
              '<button class="tcp-chip" onclick="tcpSendPrompt(\'What\'s hurting my score most?\')">What\'s hurting me?</button>',
              '<button class="tcp-chip" onclick="tcpSendPrompt(\'How do I improve faster?\')">How to improve faster?</button>',
            '</div>',
          '</div>',

          // History
          '<div id="tcp-history" class="tcp-history"></div>',

          // Response area
          '<div id="tcp-response" class="tcp-response"></div>',
        '</div>',

        '<div class="tcp-footer">',
          '<div class="tcp-input-wrap">',
            '<textarea id="tcp-input" class="tcp-input-field" rows="1" placeholder="Ask about your finances..." onkeydown="tcpKeydown(event)" oninput="this.style.height=\'auto\';this.style.height=Math.min(this.scrollHeight,120)+\'px\'"></textarea>',
            '<button class="tcp-send-btn" onclick="tcpSend(document.getElementById(\'tcp-input\').value)" aria-label="Send">',
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
            '</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(wrapper);

    // Update context line with real data
    var ctx = buildCopilotContext();
    var ctxEl = document.getElementById('tcp-context-line');
    if (ctxEl && ctx.scoreFinal) {
      ctxEl.textContent = 'Score: '+ctx.score+' · '+ctx.band+' · '+ctx.archetype.charAt(0).toUpperCase()+ctx.archetype.slice(1)+' mode';
    }
  });

  /* ═══════════════════════════════════════════════════════
     12. UPDATE CONTEXT LINE AFTER ANALYSIS
  ═══════════════════════════════════════════════════════ */
  var _prevRPA = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRPA === 'function') _prevRPA();
    setTimeout(function(){
      var ctx = buildCopilotContext();
      var ctxEl = document.getElementById('tcp-context-line');
      if (ctxEl && ctx.scoreFinal) {
        ctxEl.textContent = 'Score: '+ctx.score+' · '+ctx.band+' · '+ctx.archetype.charAt(0).toUpperCase()+ctx.archetype.slice(1)+' mode';
      }
    }, 200);
  };

  /* ═══════════════════════════════════════════════════════
     13. CSS
  ═══════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = `
    /* ── Overlay ── */
    #tcp-overlay {
      display: none;
      position: fixed; inset: 0;
      background: rgba(0,31,51,0.40);
      backdrop-filter: blur(2px);
      z-index: 9998;
      opacity: 0;
      transition: opacity var(--med) ease;
    }
    #tcp-overlay.tcp-overlay-show {
      display: block;
      opacity: 1;
    }

    /* ── FAB ── */
    #tcp-fab {
      position: fixed;
      bottom: 80px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 11px 16px 11px 13px;
      background: linear-gradient(135deg, var(--teal), var(--sky));
      color: white;
      border: none;
      border-radius: 999px;
      box-shadow: 0 4px 20px rgba(0,119,182,0.35), 0 1px 6px rgba(0,0,0,0.15);
      cursor: pointer;
      font-family: var(--font-body);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1px;
      z-index: 9997;
      transition: transform 0.18s var(--spring), box-shadow 0.18s;
      animation: tcpFabPulse 3s ease-in-out infinite;
    }
    #tcp-fab:active { transform: scale(0.95); box-shadow: 0 2px 10px rgba(0,119,182,0.25); }
    .tcp-fab-icon { display: flex; align-items: center; }
    .tcp-fab-label { line-height: 1; }
    @keyframes tcpFabPulse {
      0%,100% { box-shadow: 0 4px 20px rgba(0,119,182,0.35), 0 1px 6px rgba(0,0,0,0.15); }
      50%      { box-shadow: 0 4px 28px rgba(0,119,182,0.55), 0 1px 8px rgba(0,0,0,0.18); }
    }

    /* ── Panel ── */
    #tcp-panel {
      position: fixed;
      bottom: 0; right: 0;
      width: min(420px, 100vw);
      max-height: 86vh;
      background: var(--white);
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      box-shadow: 0 -4px 40px rgba(0,31,51,0.18), 0 -1px 8px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      z-index: 9999;
      transform: translateY(100%);
      transition: transform 0.35s var(--spring);
    }
    #tcp-panel.tcp-open { transform: translateY(0); }

    /* ── Header ── */
    .tcp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 14px;
      border-bottom: 1px solid var(--gray-2);
      background: linear-gradient(160deg, var(--navy-mid), var(--navy));
      border-radius: var(--r-lg) var(--r-lg) 0 0;
      flex-shrink: 0;
    }
    .tcp-header-left { display: flex; align-items: center; gap: 10px; }
    .tcp-header-logo {
      width: 34px; height: 34px;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: white;
      flex-shrink: 0;
    }
    .tcp-header-title {
      font-family: var(--font-display);
      font-size: 17px;
      color: white;
      line-height: 1.2;
    }
    .tcp-header-sub {
      font-size: 11px;
      color: rgba(255,255,255,0.50);
      margin-top: 1px;
    }
    .tcp-close-btn {
      background: rgba(255,255,255,0.10);
      border: none;
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: rgba(255,255,255,0.65);
      transition: background 0.15s;
    }
    .tcp-close-btn:active { background: rgba(255,255,255,0.20); }

    /* ── Body ── */
    .tcp-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 16px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* ── Suggested prompts ── */
    .tcp-prompts-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--gray-3);
      margin-bottom: 8px;
    }
    .tcp-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tcp-chip {
      padding: 7px 12px;
      background: var(--sky-dim);
      border: 1.5px solid var(--sky-border);
      border-radius: 999px;
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      color: var(--teal);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .tcp-chip:active { background: rgba(0,119,182,0.15); border-color: var(--teal); }

    /* ── History ── */
    .tcp-history { display: flex; flex-direction: column; gap: 6px; }
    .tcp-user-msg {
      align-self: flex-end;
      background: linear-gradient(135deg, var(--teal), var(--sky));
      color: white;
      padding: 9px 13px;
      border-radius: 14px 14px 4px 14px;
      font-size: 13px;
      font-weight: 500;
      max-width: 85%;
      line-height: 1.45;
    }

    /* ── Response sections ── */
    .tcp-response { display: flex; flex-direction: column; gap: 8px; padding-bottom: 8px; }
    .tcp-resp-section {
      background: var(--gray-1);
      border-radius: var(--r-sm);
      padding: 11px 13px;
    }
    .tcp-resp-section.tcp-resp-highlight {
      background: var(--sky-dim);
      border: 1.5px solid var(--sky-border);
    }
    .tcp-resp-label {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: var(--gray-4);
      margin-bottom: 5px;
    }
    .tcp-resp-section.tcp-resp-highlight .tcp-resp-label { color: var(--teal); }
    .tcp-resp-icon { font-size: 11px; }
    .tcp-resp-body {
      font-size: 13px;
      color: var(--navy);
      line-height: 1.6;
    }
    .tcp-resp-section.tcp-resp-highlight .tcp-resp-body {
      font-weight: 600;
      color: var(--navy);
    }
    .tcp-disclaimer {
      font-size: 10px;
      color: var(--gray-3);
      line-height: 1.5;
      padding: 0 2px;
    }

    /* ── Loading dots ── */
    .tcp-loading {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 16px;
      justify-content: center;
    }
    .tcp-dot {
      width: 7px; height: 7px;
      background: var(--sky);
      border-radius: 50%;
      animation: tcpDotBounce 1.2s ease-in-out infinite;
    }
    .tcp-dot:nth-child(2) { animation-delay: 0.15s; }
    .tcp-dot:nth-child(3) { animation-delay: 0.30s; }
    @keyframes tcpDotBounce {
      0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
      40%         { transform: scale(1.1); opacity: 1; }
    }

    /* ── Error ── */
    .tcp-error {
      font-size: 12px;
      color: var(--gray-4);
      padding: 14px;
      background: var(--gray-1);
      border-radius: var(--r-sm);
      line-height: 1.6;
    }

    /* ── Footer / input ── */
    .tcp-footer {
      padding: 10px 14px 14px;
      border-top: 1px solid var(--gray-2);
      flex-shrink: 0;
    }
    .tcp-input-wrap {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: var(--gray-1);
      border: 1.5px solid var(--gray-2);
      border-radius: 14px;
      padding: 8px 8px 8px 12px;
      transition: border-color 0.15s;
    }
    .tcp-input-wrap:focus-within { border-color: var(--sky); }
    .tcp-input-field {
      flex: 1;
      background: none;
      border: none;
      outline: none;
      font-family: var(--font-body);
      font-size: 13px;
      color: var(--navy);
      resize: none;
      line-height: 1.5;
      max-height: 120px;
      overflow-y: auto;
    }
    .tcp-input-field::placeholder { color: var(--gray-3); }
    .tcp-send-btn {
      width: 32px; height: 32px;
      border-radius: 10px;
      background: var(--teal);
      border: none;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      color: white;
      flex-shrink: 0;
      transition: background 0.15s, transform 0.1s;
    }
    .tcp-send-btn:active { background: var(--navy); transform: scale(0.92); }

    /* ── Verdict banner ── */
    .tcp-verdict-banner {
      font-size: 13px;
      font-weight: 700;
    }

    /* ── Responsive: on very small screens, full width ── */
    @media (max-width: 440px) {
      #tcp-panel { width: 100vw; border-radius: 20px 20px 0 0; max-height: 90vh; }
    }
  `;
  document.head.appendChild(style);

})();
