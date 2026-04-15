/* ═══ Tracent App Entry: Retention + Initialization ═══
   Retention pass: weekly check-ins, monthly review, life event triggers.
   Loaded before BSE to ensure retention hooks are in place.
═══════════════════════════════════════════════ */

/* ═══ MODULE: Retention Pass — check-ins, monthly review, life events ═══ */
(function(){
  if (window.__TRACENT_RETENTION_PASS__) return;
  window.__TRACENT_RETENTION_PASS__ = true;

  /* ── utils ─────────────────────────────────────────────── */
  function fmt(n, compact){
    var v = Number(n||0), abs = Math.abs(Math.round(v));
    var sign = v < 0 ? '-$' : '$';
    if (compact && abs >= 1000000) return sign + (abs/1000000).toFixed(1) + 'M';
    if (compact && abs >= 1000)    return sign + (abs/1000).toFixed(1)    + 'k';
    return sign + abs.toLocaleString('en-US');
  }
  function g(){ return window.G || null; }

  /* ── session state ──────────────────────────────────────── */
  var WAITLIST_KEY  = 'tracent_waitlist_email';
  var PREMIUM_SHOWN = 'tracent_premium_shown_ts';

  // Session count deferred to BSE._mem.sessions — do NOT maintain a parallel counter.
  function sessionCount(){
    try {
      var mem = JSON.parse(localStorage.getItem('tracent_v3') || '{}');
      return (mem._mem && mem._mem.sessions) ? Number(mem._mem.sessions) : 0;
    } catch(e){ return 0; }
  }
  function hasWaitlistEmail(){
    try { return !!localStorage.getItem(WAITLIST_KEY); } catch(e){ return false; }
  }
  function isReturnSession(){ return sessionCount() >= 2; }

  // Premium eligible: return visit OR user has explicitly tried a depth feature
  window.__tracent_premiumDepthAttempted = false;
  function premiumEligible(){
    return isReturnSession() || window.__tracent_premiumDepthAttempted;
  }
  window.tracent_premiumEligible = premiumEligible;

  // When user taps a depth feature (salary coach, AI, scenarios), mark the flag
  function markDepthAttempt(){
    window.__tracent_premiumDepthAttempted = true;
    // Premium teaser visibility is owned by BSE via bseApplyModuleVis.
    // Do NOT write style.display here — let the next RPA cycle apply it.
  }
  window.tracent_markDepthAttempt = markDepthAttempt;

  // Patch depth-feature entry points to mark depth attempt.
  // Lazy-captured after current task queue so definitions from later scripts are available.
  setTimeout(function() {
    var _origOpenSalary = window.openSalaryNegotiation;
    if (typeof _origOpenSalary === 'function') {
      window.openSalaryNegotiation = function() {
        markDepthAttempt();
        return _origOpenSalary.apply(this, arguments);
      };
    }

    var _origOpenWhatIf = window.openWhatIf;
    if (typeof _origOpenWhatIf === 'function') {
      window.openWhatIf = function() {
        markDepthAttempt();
        return _origOpenWhatIf.apply(this, arguments);
      };
    }

    var _origOpenScenarios = window.openScenarios;
    if (typeof _origOpenScenarios === 'function') {
      window.openScenarios = function() {
        markDepthAttempt();
        return _origOpenScenarios.apply(this, arguments);
      };
    }
  }, 0);

  /* ════════════════════════════════════════════════════════
     1. WEEKLY CHECK-IN — rich snapshot + one next action
  ════════════════════════════════════════════════════════ */
  function buildCheckinContent(){
    var gv = g();
    var score    = (gv && gv.scoreFinal && gv.score) ? gv.score : null;
    var history  = (gv && gv._scoreHistory) || [];
    var delta    = null, deltaLabel = '', daysAgo = 0;
    if (history.length >= 2){
      var last = history[history.length-1], prev = history[history.length-2];
      delta    = last.score - prev.score;
      daysAgo  = Math.round((Date.now() - new Date(prev.ts).getTime()) / 86400000);
      deltaLabel = (delta >= 0 ? '+' : '') + delta + ' pts';
    }

    // Win and drag from score drivers
    var drivers = (gv && gv.lastScoreDrivers) || [];
    var win  = drivers.find(function(d){ return d.type === 'positive'; });
    var drag = drivers.find(function(d){ return d.type === 'negative'; });

    // Next 7-day action from mode-aware NBM
    var moves = (typeof window._v21GetRankedMovesLegacy === 'function') ? window._v21GetRankedMovesLegacy() : [];
    var nextMove = moves[0];

    // Score display
    var scoreColor = score == null ? 'var(--gray-3)' :
      score >= 70 ? 'var(--teal)' : score >= 55 ? 'var(--amber)' : 'var(--red)';
    var deltaColor = delta == null ? 'var(--gray-3)' :
      delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--gray-4)';

    var bandLabel = (score && typeof v21BandForScore === 'function')
      ? v21BandForScore(score).label.replace(/[⬤●🔴🟡🔵🟢⬡]\s*/,'')
      : '';

    // Last check-in date
    var lastCheckin = gv && gv.v21LastCheckin
      ? 'Last check-in ' + new Date(gv.v21LastCheckin).toLocaleDateString([],{month:'short',day:'numeric'})
      : 'First check-in';

    return '<div class="tret-checkin">' +

      // Score hero
      '<div class="tret-score-hero">' +
        '<div class="tret-score-hero-inner">' +
          '<div class="tret-score-num" style="color:' + scoreColor + '">' +
            (score != null ? score : '—') +
          '</div>' +
          '<div class="tret-score-band">' + (bandLabel || 'Run your analysis to see score') + '</div>' +
          (delta != null ? '<div class="tret-score-delta" style="color:' + deltaColor + '">' +
            deltaLabel + (daysAgo ? ' · ' + daysAgo + 'd ago' : '') + '</div>' : '') +
        '</div>' +
        '<div class="tret-score-badge">' + lastCheckin + '</div>' +
      '</div>' +

      // Win / drag
      '<div class="tret-row-pair">' +
        '<div class="tret-signal tret-win">' +
          '<div class="tret-signal-label">This week\'s win</div>' +
          '<div class="tret-signal-text">' +
            (win ? win.text : (score && score >= 65 ? 'Score is holding steady above 65' : 'Complete a full re-analysis to surface wins')) +
          '</div>' +
        '</div>' +
        '<div class="tret-signal tret-drag">' +
          '<div class="tret-signal-label">Biggest drag</div>' +
          '<div class="tret-signal-text">' +
            (drag ? drag.text : (gv && (gv.ccDebt||0) > 0 && gv.ccRate != null ? 'CC interest cost: ' + fmt(Math.round((gv.ccDebt||0)*(gv.ccRate)/100/12)) + '/mo' : 'No active drag factors found')) +
          '</div>' +
        '</div>' +
      '</div>' +

      // Next 7-day action
      '<div class="tret-next-action">' +
        '<div class="tret-next-label">Your one move this week</div>' +
        (nextMove
          ? '<div class="tret-next-title">' + nextMove.title + '</div>' +
            '<div class="tret-next-detail">' + nextMove.action + '</div>'
          : '<div class="tret-next-title">Re-run your analysis to refresh recommendations</div>') +
      '</div>' +

      // Yes/no flags (compact)
      '<div class="tret-flags">' +
        '<div class="tret-flags-label">Anything changed this week?</div>' +
        '<div class="tret-flags-grid" id="tret-checkin-flags">' +
          _flagBtn('income','Income') + _flagBtn('debt','Debt') +
          _flagBtn('savings','Savings') + _flagBtn('housing','Housing') +
        '</div>' +
      '</div>' +

    '</div>';
  }

  function _flagBtn(key, label){
    return '<button class="tret-flag-btn" id="tret-flag-' + key + '" onclick="tret_toggleFlag(this,\'' + key + '\')">' + label + '</button>';
  }

  window._tret_flagState = {};
  window.tret_toggleFlag = function(btn, key){
    window._tret_flagState[key] = !window._tret_flagState[key];
    btn.classList.toggle('tret-flag-on', !!window._tret_flagState[key]);
  };

  /* ════════════════════════════════════════════════════════
     2. MONTHLY REVIEW — score comparison + recommendation
  ════════════════════════════════════════════════════════ */
  function buildMonthlyReviewContent(){
    var gv = g();
    var score   = (gv && gv.scoreFinal && gv.score) ? gv.score : null;
    var history = (gv && gv._scoreHistory) || [];

    var prevScore = null, prevDate = null, delta = null;
    if (history.length >= 2){
      var prev = history[history.length-2];
      prevScore = prev.score;
      prevDate  = new Date(prev.ts).toLocaleDateString([],{month:'short',day:'numeric'});
      delta     = score - prevScore;
    }

    var drivers   = (gv && gv.lastScoreDrivers) || [];
    var wins      = drivers.filter(function(d){ return d.type==='positive'; });
    var drags     = drivers.filter(function(d){ return d.type==='negative'; });
    var moves     = (typeof window._v21GetRankedMovesLegacy === 'function') ? window._v21GetRankedMovesLegacy() : [];

    // What changed narrative
    var whatChanged = (function(){
      if (!gv) return 'No analysis data found.';
      var changes = [];
      if (gv.v21CheckinFlags){
        if (gv.v21CheckinFlags.income_yes)  changes.push('income changed');
        if (gv.v21CheckinFlags.debt_yes)    changes.push('debt balance updated');
        if (gv.v21CheckinFlags.savings_yes) changes.push('savings moved');
        if (gv.v21CheckinFlags.housing_yes) changes.push('housing situation updated');
      }
      if (changes.length) return 'You flagged: ' + changes.join(', ') + '.';
      if (delta === 0)    return 'No significant inputs changed. Score is stable.';
      if (delta > 0)      return 'Score improved — your financial position strengthened.';
      if (delta < 0)      return 'Score dipped — a factor moved in the wrong direction.';
      return 'First recorded snapshot — check in next month to see movement.';
    })();

    // Stay-the-course vs change-course
    var recommendation = (function(){
      if (!score) return { type:'neutral', title:'Run your analysis first', body:'Complete a full analysis to generate a monthly recommendation.' };
      var fcf      = gv ? (gv.fcf||0) : 0;
      var _efRaw = gv ? gv.emergency : undefined;
      var _efProvided = _efRaw !== undefined && _efRaw !== null && _efRaw !== '';
      var efMonths = _efProvided ? parseInt(_efRaw, 10) : null;
      var totalDebt= gv ? ((gv.ccDebt||0)+(gv.carDebt||0)+(gv.studentDebt||0)+(gv.otherDebt||0)) : 0;

      if (delta !== null && delta < -3) return {
        type:'change', title:'Change course',
        body: 'Your score dropped ' + Math.abs(delta) + ' points. ' +
          (fcf < 0 ? 'Spending is exceeding income — that\'s the first thing to fix.' :
           totalDebt > 0 && (gv.ccDebt||0) > 0 ? 'The credit card balance is the highest-leverage thing to reduce.' :
           (_efProvided && efMonths < 2) ? 'Your emergency fund is low — that\'s the resilience gap.' :
           'Review your inputs and re-run analysis to identify the shift.')
      };
      if (score >= 65 && (delta === null || delta >= 0)) return {
        type:'stay', title:'Stay the course',
        body: 'Your position is ' + (score >= 70 ? 'strong' : 'building') + '. ' +
          (moves[0] ? 'Keep your focus on: ' + moves[0].title + '.' : 'Consistency is your biggest asset right now.')
      };
      return {
        type:'change', title:'One adjustment needed',
        body: drags[0] ? 'The main drag: ' + drags[0].text + '. Address this before anything else.' :
          (fcf < 200 ? 'Free cash flow is very tight. Find one recurring expense to reduce.' :
           efMonths < 3 ? 'Emergency fund is below 3 months. Build this before investing.' :
           'Re-run your analysis with updated numbers to get a sharper recommendation.')
      };
    })();

    var deltaColor = delta == null ? 'var(--gray-3)' : delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--gray-4)';
    var recColor   = recommendation.type === 'stay' ? 'var(--green)' : recommendation.type === 'change' ? 'var(--amber)' : 'var(--gray-4)';
    var recBg      = recommendation.type === 'stay' ? 'rgba(16,185,129,0.06)' : recommendation.type === 'change' ? 'rgba(245,158,11,0.07)' : 'var(--gray-1)';
    var recBorder  = recommendation.type === 'stay' ? 'rgba(16,185,129,0.20)' : recommendation.type === 'change' ? 'rgba(245,158,11,0.22)' : 'var(--gray-2)';

    return '<div class="tret-monthly">' +

      // Score comparison
      '<div class="tret-score-compare">' +
        '<div class="tret-cmp-block">' +
          '<div class="tret-cmp-label">Last recorded</div>' +
          '<div class="tret-cmp-val">' + (prevScore != null ? prevScore : '—') + '</div>' +
          (prevDate ? '<div class="tret-cmp-date">' + prevDate + '</div>' : '') +
        '</div>' +
        '<div class="tret-cmp-arrow" style="color:' + deltaColor + '">' +
          (delta == null ? '→' : delta > 0 ? '▲ +'+delta : delta < 0 ? '▼ '+delta : '→ 0') +
        '</div>' +
        '<div class="tret-cmp-block">' +
          '<div class="tret-cmp-label">This month</div>' +
          '<div class="tret-cmp-val" style="color:' + deltaColor + '">' + (score != null ? score : '—') + '</div>' +
          '<div class="tret-cmp-date">Current</div>' +
        '</div>' +
      '</div>' +

      // What changed
      '<div class="tret-what-changed">' +
        '<div class="tret-wc-label">What changed</div>' +
        '<div class="tret-wc-text">' + whatChanged + '</div>' +
      '</div>' +

      // Gain and blocker
      '<div class="tret-row-pair">' +
        '<div class="tret-signal tret-win">' +
          '<div class="tret-signal-label">Biggest gain</div>' +
          '<div class="tret-signal-text">' + (wins[0] ? wins[0].text : 'Complete analysis to see gains') + '</div>' +
        '</div>' +
        '<div class="tret-signal tret-drag">' +
          '<div class="tret-signal-label">Biggest blocker</div>' +
          '<div class="tret-signal-text">' + (drags[0] ? drags[0].text : (gv && (gv.ccDebt||0)>0 && gv.ccRate != null ? 'CC debt at '+gv.ccRate+'%' : 'No major blockers identified')) + '</div>' +
        '</div>' +
      '</div>' +

      // Recommendation
      '<div class="tret-recommendation" style="background:' + recBg + ';border-color:' + recBorder + '">' +
        '<div class="tret-rec-title" style="color:' + recColor + '">' + recommendation.title + '</div>' +
        '<div class="tret-rec-body">' + recommendation.body + '</div>' +
      '</div>' +

    '</div>';
  }

  /* ════════════════════════════════════════════════════════
     3. LIFE EVENTS — quick paths per event type
  ════════════════════════════════════════════════════════ */
  var LIFE_EVENT_PATHS = {
    raise: {
      icon: '', label: 'Got a raise',
      steps: [
        { n:1, title:'Don\'t inflate your lifestyle first', body:'Wait 30 days before changing spending. Use the pause to decide intentionally where the extra income goes.' },
        { n:2, title:'Allocate the increase in priority order', body:'(1) Top up emergency fund if under 3 months. (2) Increase retirement contribution to capture any match gap. (3) Direct remainder to your primary goal: debt, deposit, or investment.' },
        { n:3, title:'Update your income in Tracent', body:'Tap "Update my numbers" in Settings. Your score, DTI, and NBM will recalculate with the new figure.' }
      ]
    },
    new_job: {
      icon: '', label: 'New job',
      steps: [
        { n:1, title:'Check your benefits before your first payday', body:'Confirm 401k enrollment, match vesting schedule, and health coverage. Gaps in the first 30 days cost real money.' },
        { n:2, title:'Do not change your spending rate yet', body:'Income may shift during the transition. Keep your old budget for 60 days and treat any difference as a buffer.' },
        { n:3, title:'Update Tracent with your new income and state', body:'Your tax rate, take-home estimate, and market benchmarks all depend on your employer state. Re-run analysis after updating.' }
      ]
    },
    job_loss: {
      icon: '', label: 'Job loss',
      steps: [
        { n:1, title:'Pause all non-essential savings and investments', body:'Protect cash flow first. Redirect freed-up money to covering fixed obligations: housing, food, minimum debt payments.' },
        { n:2, title:'Activate emergency fund — that\'s what it\'s for', body:'This is the scenario it was built for. Use it without guilt. Replenishing it is a future problem.' },
        { n:3, title:'Update Tracent to reflect current income', body:'Set income to $0 or your severance/unemployment amount. Your score will reflect reality and your roadmap will shift to a stability-first plan.' }
      ]
    },
    move: {
      icon: '', label: 'Moving home',
      steps: [
        { n:1, title:'Calculate your full cost-of-move, not just rent', body:'Add: deposits, movers, overlap rent, setup costs. Most people underestimate by 40%. Budget that number before committing.' },
        { n:2, title:'If buying: check your DTI before applying', body:'Your DTI after the purchase will determine your rate. Run the Tracent Home mode with the new target price before you get pre-approved.' },
        { n:3, title:'Update your housing inputs after you move', body:'Rent, mortgage, location, and housing costs all affect your score. Update in Settings and re-run analysis once you\'re settled.' }
      ]
    },
    new_baby: {
      icon: '', label: 'New baby',
      steps: [
        { n:1, title:'Childcare cost must enter your budget now', body:'Average US childcare runs $1,200–$2,400/month. If it\'s not in your plan, your free cash flow figure is wrong. Add it before making any other financial moves.' },
        { n:2, title:'Build emergency fund to 6 months', body:'The standard 3-month target was set for two adults without dependents. With a child, the downside of a cash shortfall is significantly higher. Extend the target.' },
        { n:3, title:'Review beneficiaries and insurance', body:'Life insurance needs and beneficiary designations change immediately. These are outside Tracent\'s scope but urgent. Handle them within 90 days.' }
      ]
    },
    major_purchase: {
      icon: '', label: 'Major purchase',
      steps: [
        { n:1, title:'Run the "What if" scenario before committing', body:'A large purchase affects your emergency fund, DTI, and free cash flow simultaneously. Understand the post-purchase position before you sign anything.' },
        { n:2, title:'Check whether debt financing makes sense', body:'If financing: compare the APR against your highest-return alternative. Financing a depreciating asset at 8%+ while holding CC debt at 20% is the wrong sequence.' },
        { n:3, title:'Update Tracent after the purchase', body:'Adjust savings, any new debt, and monthly payment. Your score and roadmap will reflect the new baseline.' }
      ]
    },
    rate_drop: {
      icon: '', label: 'Rate drop',
      steps: [
        { n:1, title:'Check your break-even before refinancing', body:'Closing costs typically run 1.5–3% of your loan. Divide that by your monthly savings. If break-even is under 24 months and you plan to stay, refinancing likely makes sense.' },
        { n:2, title:'Get three quotes on the same day', body:'Rates vary between lenders. Comparing quotes within a 24-hour window ensures you\'re comparing equivalent market conditions.' },
        { n:3, title:'Open the Rate Simulator tab', body:'Enter the new rate to see your exact payment change, break-even, and lifetime interest savings. Then decide.' }
      ]
    },
    debt_milestone: {
      icon: '', label: 'Debt payoff milestone',
      steps: [
        { n:1, title:'Redirect the freed payment immediately — don\'t spend it', body:'The month you pay off a debt is the highest-risk month for lifestyle inflation. Set up an automatic transfer the same day.' },
        { n:2, title:'Apply the freed payment to the next debt in rank', body:'This is the debt avalanche/snowball cascade. Your monthly payment total stays the same. Your debt elimination accelerates.' },
        { n:3, title:'Update Tracent and see your score move', body:'Remove the paid-off debt from your inputs. Your DTI, cash flow, and score will all improve. Use that as momentum.' }
      ]
    }
  };

  function buildLifeEventContent(){
    var selected = window._tret_activeLifeEvent || null;
    if (selected && LIFE_EVENT_PATHS[selected]) return _renderLifePath(LIFE_EVENT_PATHS[selected]);
    return _renderLifeGrid();
  }

  function _renderLifeGrid(){
    var order = ['raise','new_job','job_loss','move','new_baby','major_purchase','rate_drop','debt_milestone'];
    var btns = order.map(function(k){
      var ev = LIFE_EVENT_PATHS[k];
      return '<button class="tret-life-btn" onclick="tret_selectLifeEvent(\'' + k + '\')">' +
        '<span class="tret-life-btn-icon">' + ev.icon + '</span>' +
        '<span class="tret-life-btn-label">' + ev.label + '</span>' +
      '</button>';
    }).join('');
    return '<div class="tret-life-grid">' + btns + '</div>' +
      '<div style="font-size:12px;color:var(--gray-4);margin-top:14px;line-height:1.55;">Select what happened. Tracent gives you the 3 most important moves to make first.</div>';
  }

  function _renderLifePath(ev){
    var steps = ev.steps.map(function(s){
      return '<div class="tret-step">' +
        '<div class="tret-step-n">' + s.n + '</div>' +
        '<div class="tret-step-body">' +
          '<div class="tret-step-title">' + s.title + '</div>' +
          '<div class="tret-step-detail">' + s.body + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="tret-path">' +
      '<button class="tret-path-back" onclick="tret_selectLifeEvent(null)">← All events</button>' +
      '<div class="tret-path-header">' +
        '<span class="tret-path-icon">' + ev.icon + '</span>' +
        '<div class="tret-path-title">' + ev.label + '</div>' +
      '</div>' +
      '<div class="tret-steps">' + steps + '</div>' +
    '</div>';
  }

  window.tret_selectLifeEvent = function(key){
    window._tret_activeLifeEvent = key;
    var host = document.getElementById('tret-life-body');
    if (host) host.innerHTML = buildLifeEventContent();
    // Also wire to existing engine
    if (key && typeof v21TriggerLifeEvent === 'function'){
      var btn = document.getElementById('tret-life-btn-'+key);
      try { v21TriggerLifeEvent(key, btn); } catch(e){}
    }
  };

  /* ════════════════════════════════════════════════════════
     4. MODAL SHELL BUILDERS — inject into existing modals
  ════════════════════════════════════════════════════════ */
  function rebuildCheckinModal(){
    var sheet = document.querySelector('#v21-checkin-overlay .modal-sheet');
    if (!sheet) return;
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div style="padding:20px 24px 0;">' +
        '<div style="font-family:var(--font-display);font-size:22px;color:var(--navy);margin-bottom:4px;">Weekly check-in</div>' +
        '<div style="font-size:12px;color:var(--gray-4);margin-bottom:18px;">Where you stand and what to do next.</div>' +
        '<div id="tret-checkin-body">' + buildCheckinContent() + '</div>' +
        '<button class="btn-cta" onclick="tret_saveCheckin()" style="margin-top:18px;margin-bottom:10px;">Save check-in →</button>' +
        '<button onclick="closeModal(\'v21-checkin-overlay\')" style="width:100%;padding:12px;background:none;border:none;font-family:var(--font-body);font-size:13px;color:var(--gray-3);cursor:pointer;margin-bottom:8px;">Close</button>' +
      '</div>';
  }

  function rebuildMonthlyModal(){
    var sheet = document.querySelector('#v21-review-overlay .modal-sheet');
    if (!sheet) return;
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div style="padding:20px 24px 0;">' +
        '<div style="font-family:var(--font-display);font-size:22px;color:var(--navy);margin-bottom:4px;">Monthly review</div>' +
        '<div style="font-size:12px;color:var(--gray-4);margin-bottom:18px;">What changed, what to carry forward.</div>' +
        '<div id="tret-monthly-body">' + buildMonthlyReviewContent() + '</div>' +
        '<button onclick="closeModal(\'v21-review-overlay\')" style="width:100%;padding:14px;background:none;border:none;font-family:var(--font-body);font-size:13px;color:var(--gray-3);cursor:pointer;margin-top:14px;margin-bottom:8px;">Close</button>' +
      '</div>';
  }

  function rebuildLifeModal(){
    var sheet = document.querySelector('#v21-events-overlay .modal-sheet');
    if (!sheet) return;
    window._tret_activeLifeEvent = null;
    sheet.innerHTML =
      '<div class="modal-handle"></div>' +
      '<div style="padding:20px 24px 0;">' +
        '<div style="font-family:var(--font-display);font-size:22px;color:var(--navy);margin-bottom:4px;">Life event</div>' +
        '<div style="font-size:12px;color:var(--gray-4);margin-bottom:18px;">Select what happened — Tracent shows the 3 highest-leverage moves to make first.</div>' +
        '<div id="tret-life-body">' + _renderLifeGrid() + '</div>' +
        '<button onclick="closeModal(\'v21-events-overlay\')" style="width:100%;padding:14px;background:none;border:none;font-family:var(--font-body);font-size:13px;color:var(--gray-3);cursor:pointer;margin-top:16px;margin-bottom:8px;">Close</button>' +
      '</div>';
  }

  /* ════════════════════════════════════════════════════════
     5. OVERRIDE OPEN FUNCTIONS
  ════════════════════════════════════════════════════════ */
  window.v21OpenCheckin = function(){
    rebuildCheckinModal();
    window._tret_flagState = {};
    openModal('v21-checkin-overlay');
    try { if (typeof tracentRevealMonthlyReview === 'function') tracentRevealMonthlyReview(); } catch(e){}
  };

  window.v21OpenMonthlyReview = function(){
    rebuildMonthlyModal();
    openModal('v21-review-overlay');
  };

  window.v21OpenLifeEvents = function(){
    rebuildLifeModal();
    openModal('v21-events-overlay');
  };

  /* ════════════════════════════════════════════════════════
     6. SAVE CHECK-IN — flag → update G
  ════════════════════════════════════════════════════════ */
  window.tret_saveCheckin = function(){
    var flags = window._tret_flagState || {};
    var hasYes = Object.values(flags).some(function(v){ return v; });
    if (typeof G !== 'undefined' && G){
      var mapped = {};
      Object.keys(flags).forEach(function(k){ if(flags[k]) mapped[k+'_yes'] = true; });
      G.v21CheckinFlags  = mapped;
      G.v21LastCheckin   = new Date().toISOString();
      if (hasYes && typeof _0x36940e3 === 'function') _0x36940e3();
    }
    if (typeof v21ShowToast === 'function') v21ShowToast('Check-in saved');
    closeModal('v21-checkin-overlay');
  };

  /* ════════════════════════════════════════════════════════
     7. PREMIUM PLACEMENT — gated + waitlist state
  ════════════════════════════════════════════════════════ */
  function hasRealStripe(){
    return typeof window._stripeMonthlyLink === 'string' &&
      window._stripeMonthlyLink &&
      window._stripeMonthlyLink !== 'YOUR_MONTHLY_LINK' &&
      window._stripeMonthlyLink.indexOf('YOUR_') === -1;
  }

  // Override shouldShowPremium: only eligible after return session or depth attempt
  window.shouldShowPremium = function(){
    return premiumEligible();
  };

  // Override showPaywall: waitlist state when Stripe not configured
  window.showPaywall = function(feature){
    markDepthAttempt();

    var contextNotes = {
      'whatif':    'The What If Simulator is part of Edge \u2014 it helps you model decisions before you make them.',
      'ai':        'Contextual AI guidance is part of Edge \u2014 it\u2019s built around your numbers and adapts when your situation changes.',
      'copilot':   'Copilot is part of Edge \u2014 it provides contextual guidance grounded in your actual financial position.',
      'career':    'The career trajectory view is part of Edge \u2014 it helps you see how income changes affect your long-term position.',
      'negotiate': 'AI Salary coaching is part of Edge \u2014 it builds a personalised plan from your actual income gap.',
      'scenarios': 'Saved scenarios are part of Edge \u2014 they let you compare your best path forward.',
      'archive':   'Monthly review history is part of Edge \u2014 it helps you track how your position has changed over time.',
    };

    var overlay = document.getElementById('paywall-overlay');
    var titleEl = document.getElementById('paywall-feature-title');
    var subEl   = document.getElementById('paywall-feature-sub');
    var ctaEl   = document.getElementById('paywall-cta-label');
    var noteEl  = document.getElementById('paywall-context-note');

    if (titleEl) titleEl.textContent = 'Keep your plan moving';

    var note = contextNotes[feature] || null;
    if (noteEl) { noteEl.textContent = note || ''; noteEl.style.display = note ? 'block' : 'none'; }

    if (hasRealStripe()){
      if (subEl) subEl.textContent = 'Tracent Edge helps you keep improving your position with deeper reviews, saved scenarios, and contextual guidance built around your numbers.';
      if (ctaEl) ctaEl.textContent = 'Unlock Edge \u00b7 $6/mo \u2192';
    } else {
      if (subEl) {
        if (hasWaitlistEmail()) {
          subEl.textContent = 'You\u2019re on the waitlist. We\u2019ll reach out when Edge is available.';
        } else {
          while (subEl.firstChild) subEl.removeChild(subEl.firstChild);
          subEl.appendChild(document.createTextNode('Tracent Edge helps you keep improving your position with deeper reviews, saved scenarios, and contextual guidance built around your numbers. Leave your email and we\u2019ll let you know when it\u2019s ready.'));
          subEl.appendChild(document.createElement('br'));
          subEl.appendChild(document.createElement('br'));
          var _inp = document.createElement('input');
          _inp.type = 'email'; _inp.id = 'tret-waitlist-email'; _inp.placeholder = 'your@email.com';
          _inp.style.cssText = 'width:100%;padding:11px 14px;border:1.5px solid var(--gray-2);border-radius:var(--r-sm);font-family:var(--font-body);font-size:14px;color:var(--navy);margin-top:8px;outline:none;box-sizing:border-box;';
          _inp.addEventListener('focus', function(){ this.style.borderColor = 'var(--sky)'; });
          _inp.addEventListener('blur',  function(){ this.style.borderColor = 'var(--gray-2)'; });
          subEl.appendChild(_inp);
        }
      }
      if (ctaEl) ctaEl.textContent = hasWaitlistEmail() ? 'On the waitlist \u2713' : 'Request access \u2192';
    }

    window._paywallTarget = feature || 'edge';
    if (overlay){
      overlay.style.display = 'flex';
      requestAnimationFrame(function(){ overlay.classList.add('open'); });
    }
  };

  // Override unlockPremium: save waitlist email or redirect to Stripe
  window.unlockPremium = function(){
    if (hasRealStripe()){
      window.open(window._stripeMonthlyLink, '_blank');
      return;
    }
    // Waitlist capture
    var emailEl = document.getElementById('tret-waitlist-email');
    var email   = emailEl ? emailEl.value.trim() : '';
    if (email && email.indexOf('@') > 0){
      try { localStorage.setItem(WAITLIST_KEY, email); } catch(e){}
      var ctaEl  = document.getElementById('paywall-cta-label');
      var subEl  = document.getElementById('paywall-feature-sub');
      if (ctaEl) ctaEl.textContent = 'On the waitlist \u2713';
      if (subEl) subEl.textContent = 'Thanks \u2014 we\'ll reach out when Edge is ready.';
      if (typeof v21ShowToast === 'function') v21ShowToast('You\'re on the waitlist \u2013 we\'ll be in touch');
    } else {
      if (typeof v21ShowToast === 'function') v21ShowToast('Enter your email above to request access');
    }
  };

  // Refresh premium teaser visibility after render.
  // Wrapped lazily after DOMContentLoaded so BSE has already defined v21RenderPostAnalysis.
  setTimeout(function() {
    var _prevRPA = window.v21RenderPostAnalysis;
    window.v21RenderPostAnalysis = function(){
      if (typeof _prevRPA === 'function') _prevRPA();
      var el = document.getElementById('v21-premium-teaser');
      if (el && !window._tracentPlus){
        el.style.display = premiumEligible() ? 'block' : 'none';
      }
      // ── Feature layer renders (after BSE._compute has run) ──
      // Adaptive dashboard + debt experience read G + BSE and render into staged containers.
      // Runs on a short delay to ensure BSE._renderHome has applied its DOM decisions first.
      setTimeout(function() {
        // Skip adaptive dashboard when Decision Flow Renderer has taken over (scoreFinal users)
        var _dfrActive = (window.G && window.G.scoreFinal) ||
                         (function(){ var el = document.getElementById('bse-focus-mode'); return el && el.innerHTML && el.innerHTML.length > 0; }());
        if (typeof TracentRenderAdaptiveDashboard !== 'undefined') {
          if (_dfrActive) {
            try { TracentRenderAdaptiveDashboard.hide(); } catch(e) {}
          } else {
            try { TracentRenderAdaptiveDashboard.render(); } catch(e) { console.warn('[Tracent:Features] Dashboard render:', e); }
          }
        }
        if (typeof TracentRenderDebtExperience !== 'undefined') {
          try { TracentRenderDebtExperience.render(); } catch(e) { console.warn('[Tracent:Features] Debt render:', e); }
        }
      }, 80);
    };
  }, 0);

  // ── Global recompute + render utilities ──
  // Called by settings saves or any module that needs a full refresh.
  window.recomputeAll = function() {
    try {
      if (typeof window.computeAndShow === 'function') window.computeAndShow();
    } catch(e) { console.warn('[Tracent] recomputeAll error', e); }
  };
  window.renderAll = function() {
    try {
      if (typeof TracentRenderDebtExperience !== 'undefined' && TracentRenderDebtExperience.render) {
        TracentRenderDebtExperience.render();
      }
    } catch(e) { console.warn('[Tracent] renderAll error', e); }
  };

  // Update premium sub-copy to sell continuity, not basic understanding
  document.addEventListener('DOMContentLoaded', function(){
    // Hydration is owned exclusively by TracentHydration.boot() — do NOT load profile here.

    var premSub = document.querySelector('#v21-premium-teaser .v21-premium-sub');
    if (premSub) premSub.textContent = 'Edge extends your free plan with continuity: monthly digests, saved scenarios, deeper AI analysis, and salary coaching — built for people already using Tracent, not just starting.';
    var premTitle = document.querySelector('#v21-premium-teaser .v21-premium-title');
    if (premTitle) premTitle.textContent = 'Keep the momentum going with Edge';
    // Update the premium teaser CTA text
    var premCta = document.querySelector('#v21-premium-teaser .btn-cta');
    if (premCta && !hasRealStripe()) premCta.textContent = 'Request access \u2192';
    else if (premCta) premCta.textContent = 'Unlock Edge \u2192';

    // ── Sort state dropdown alphabetically by full name ──────
    (function() {
      var STATE_NAMES = {
        AL:'Alabama', AK:'Alaska', AZ:'Arizona', AR:'Arkansas',
        CA:'California', CO:'Colorado', CT:'Connecticut',
        DC:'District of Columbia', DE:'Delaware', FL:'Florida',
        GA:'Georgia', HI:'Hawaii', ID:'Idaho', IL:'Illinois',
        IN:'Indiana', IA:'Iowa', KS:'Kansas', KY:'Kentucky',
        LA:'Louisiana', ME:'Maine', MD:'Maryland', MA:'Massachusetts',
        MI:'Michigan', MN:'Minnesota', MS:'Mississippi', MO:'Missouri',
        MT:'Montana', NE:'Nebraska', NV:'Nevada', NH:'New Hampshire',
        NJ:'New Jersey', NM:'New Mexico', NY:'New York', NC:'North Carolina',
        ND:'North Dakota', OH:'Ohio', OK:'Oklahoma', OR:'Oregon',
        PA:'Pennsylvania', RI:'Rhode Island', SC:'South Carolina',
        SD:'South Dakota', TN:'Tennessee', TX:'Texas', UT:'Utah',
        VT:'Vermont', VA:'Virginia', WA:'Washington', WV:'West Virginia',
        WI:'Wisconsin', WY:'Wyoming'
      };

      var sel = document.getElementById('state');
      if (!sel) return;

      var current = sel.value;

      // Add Mississippi if missing
      var hasMiss = Array.from(sel.options).some(function(o) { return o.value === 'MS'; });
      if (!hasMiss) {
        var msOpt = document.createElement('option');
        msOpt.value = 'MS';
        msOpt.textContent = 'Mississippi';
        sel.appendChild(msOpt);
      }

      // Sort by full state name
      var opts = Array.from(sel.options);
      opts.sort(function(a, b) {
        var na = STATE_NAMES[a.value] || a.textContent;
        var nb = STATE_NAMES[b.value] || b.textContent;
        return na.localeCompare(nb);
      });
      sel.innerHTML = '';
      opts.forEach(function(o) { sel.appendChild(o); });

      // Restore previous selection (preserve user's selected state)
      sel.value = current;
    })();

    // ── Observation: SESSION_RETURN ─────────────────────────
    // Session count sourced from BSE._mem.sessions (tracent_v3) — no parallel counter written here.
    try {
      var _bseSessions = sessionCount();
      if (_bseSessions >= 1) {
        try { tracentTrack('session_return', { session_n: _bseSessions, ts: Date.now() }); } catch(e) {}
      }
    } catch(e) {}

    // ── Observation: INPUT_EDITED ────────────────────────────
    document.addEventListener('change', function(evt) {
      try {
        var el = evt.target;
        if (!el || !el.id) return;
        var tag = el.tagName;
        if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
        tracentTrack('input_edited', { field_name: el.id });
      } catch(e) {}
    }, true);
  });

  /* ════════════════════════════════════════════════════════
     8. CSS
  ════════════════════════════════════════════════════════ */
  var style = document.createElement('style');
  style.textContent = `
    /* Check-in */
    .tret-score-hero {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(160deg, var(--navy-mid), var(--navy));
      border-radius: var(--r-md); padding: 16px 18px; margin-bottom: 14px;
    }
    .tret-score-hero-inner { }
    .tret-score-num { font-family: var(--font-display); font-size: 44px; line-height: 1; }
    .tret-score-band { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 3px; }
    .tret-score-delta { font-size: 13px; font-weight: 700; margin-top: 4px; }
    .tret-score-badge {
      background: rgba(255,255,255,0.10); border-radius: 999px;
      padding: 5px 10px; font-size: 11px; color: rgba(255,255,255,0.5); white-space: nowrap;
    }
    .tret-row-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
    .tret-signal { border-radius: var(--r-sm); padding: 12px; }
    .tret-win  { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.16); }
    .tret-drag { background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.18); }
    .tret-signal-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; color: var(--gray-4); }
    .tret-signal-text { font-size: 12px; color: var(--navy); line-height: 1.5; }
    .tret-next-action {
      background: var(--gray-1); border-left: 3px solid var(--sky);
      border-radius: var(--r-sm); padding: 12px 14px; margin-bottom: 14px;
    }
    .tret-next-label { font-size: 10px; font-weight: 700; color: var(--teal); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 5px; }
    .tret-next-title { font-size: 14px; font-weight: 700; color: var(--navy); margin-bottom: 4px; line-height: 1.3; }
    .tret-next-detail { font-size: 12px; color: var(--gray-4); line-height: 1.55; }
    .tret-flags { }
    .tret-flags-label { font-size: 11px; font-weight: 700; color: var(--gray-4); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .4px; }
    .tret-flags-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .tret-flag-btn {
      padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--gray-2);
      background: var(--white); font-family: var(--font-body); font-size: 12px;
      font-weight: 600; color: var(--gray-4); cursor: pointer; transition: all .15s;
    }
    .tret-flag-btn.tret-flag-on {
      border-color: var(--sky); background: var(--sky-dim); color: var(--teal);
    }
    /* Monthly review */
    .tret-score-compare {
      display: flex; align-items: center; justify-content: center; gap: 16px;
      background: linear-gradient(160deg, var(--navy-mid), var(--navy));
      border-radius: var(--r-md); padding: 18px; margin-bottom: 14px;
    }
    .tret-cmp-block { text-align: center; }
    .tret-cmp-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .tret-cmp-val { font-family: var(--font-display); font-size: 36px; color: var(--white); line-height: 1; }
    .tret-cmp-date { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 3px; }
    .tret-cmp-arrow { font-family: var(--font-display); font-size: 22px; font-weight: 700; }
    .tret-what-changed { background: var(--gray-1); border-radius: var(--r-sm); padding: 12px 14px; margin-bottom: 12px; }
    .tret-wc-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--gray-4); margin-bottom: 4px; }
    .tret-wc-text { font-size: 13px; color: var(--navy); line-height: 1.55; }
    .tret-recommendation {
      border-radius: var(--r-sm); border: 1px solid; padding: 14px;
    }
    .tret-rec-title { font-size: 13px; font-weight: 700; margin-bottom: 5px; }
    .tret-rec-body { font-size: 13px; color: var(--gray-4); line-height: 1.6; }
    /* Life events */
    .tret-life-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tret-life-btn {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px; border-radius: var(--r-sm);
      border: 1.5px solid var(--gray-2); background: var(--white);
      font-family: var(--font-body); font-size: 13px; font-weight: 600; color: var(--navy);
      cursor: pointer; text-align: left; transition: all .15s;
    }
    .tret-life-btn:active { border-color: var(--sky); background: var(--sky-dim); }
    .tret-life-btn-icon { font-size: 18px; flex-shrink: 0; }
    .tret-life-btn-label { flex: 1; line-height: 1.3; }
    .tret-path-back {
      background: none; border: none; font-family: var(--font-body); font-size: 13px;
      color: var(--teal); cursor: pointer; padding: 0; margin-bottom: 14px; display: block; font-weight: 600;
    }
    .tret-path-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .tret-path-icon { font-size: 28px; }
    .tret-path-title { font-family: var(--font-display); font-size: 20px; color: var(--navy); }
    .tret-steps { display: flex; flex-direction: column; gap: 12px; }
    .tret-step { display: flex; gap: 12px; align-items: flex-start; }
    .tret-step-n {
      width: 26px; height: 26px; border-radius: 50%; background: var(--sky-dim);
      border: 1.5px solid var(--sky-border); display: flex; align-items: center;
      justify-content: center; font-size: 12px; font-weight: 700; color: var(--teal);
      flex-shrink: 0; margin-top: 1px;
    }
    .tret-step-body { flex: 1; }
    .tret-step-title { font-size: 13px; font-weight: 700; color: var(--navy); margin-bottom: 3px; line-height: 1.3; }
    .tret-step-detail { font-size: 12px; color: var(--gray-4); line-height: 1.6; }
  `;
  document.head.appendChild(style);

})();

/* ═══════════════════════════════════════════════════════════
   INTERNAL TELEMETRY REVIEW PANEL
   Access: append ?_tbv=1 to any URL, or call window._tbvOpen()
   Founder-only. Read-only. No external deps. No product impact.
═══════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  // ── Access gate ─────────────────────────────────────────
  function _shouldAutoOpen() {
    try { return new URLSearchParams(window.location.search).get('_tbv') === '1'; } catch(e) { return false; }
  }

  // ── Data layer — read-only, fails silently ───────────────
  function _events() {
    try { return (window.TRACENT_TELEMETRY && window.TRACENT_TELEMETRY.events) || []; } catch(e) { return []; }
  }

  function _compute(evts) {
    var shown   = evts.filter(function(e) { return e.event === 'nbm_shown'; });
    var clicked = evts.filter(function(e) { return e.event === 'nbm_clicked'; });
    var tabs    = evts.filter(function(e) { return e.event === 'tab_switched'; });
    var inputs  = evts.filter(function(e) { return e.event === 'input_edited'; });
    var returns = evts.filter(function(e) { return e.event === 'session_return'; });

    var ctr = shown.length > 0 ? (clicked.length / shown.length * 100).toFixed(1) + '%' : '\u2014';

    function topN(arr, key, n) {
      var counts = {};
      arr.forEach(function(e) { var v = (e.data && e.data[key]) || '(unknown)'; counts[v] = (counts[v]||0) + 1; });
      return Object.keys(counts).sort(function(a,b){ return counts[b]-counts[a]; }).slice(0,n).map(function(k){ return k + ' (' + counts[k] + ')'; });
    }

    return {
      total:         evts.length,
      shownCount:    shown.length,
      clickedCount:  clicked.length,
      ctr:           ctr,
      topShown:      topN(shown,   'move_id', 5),
      topClicked:    topN(clicked, 'move_id', 5),
      movePerf: (function() {
        var shownCounts = {}, clickCounts = {};
        shown.forEach(function(e)   { var id = (e.data&&e.data.move_id)||'(unknown)'; shownCounts[id] = (shownCounts[id]||0)+1; });
        clicked.forEach(function(e) { var id = (e.data&&e.data.move_id)||'(unknown)'; clickCounts[id] = (clickCounts[id]||0)+1; });
        return Object.keys(shownCounts).sort(function(a,b){ return shownCounts[b]-shownCounts[a]; }).map(function(id) {
          var s = shownCounts[id]||0, c = clickCounts[id]||0;
          return { id: id, shown: s, clicked: c, ctr: s > 0 ? Math.round(c/s*100)+'%' : '0%' };
        });
      })(),
      recentTabs:    tabs.slice(-10).reverse(),
      recentInputs:  inputs.slice(-10).reverse(),
      recentReturns: returns.slice(-5).reverse(),
      latest50:      evts.slice(-50).reverse()
    };
  }

  // ── Renderer helpers ─────────────────────────────────────
  function _row(label, value) {
    return '<tr><td style="color:#888;padding:4px 10px 4px 0;white-space:nowrap;">' + label + '</td>' +
           '<td style="color:#e8e8e8;padding:4px 0;">' + value + '</td></tr>';
  }

  function _section(title, html) {
    return '<div style="margin-bottom:20px;">' +
      '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#00a8e8;margin-bottom:8px;">' + title + '</div>' +
      html + '</div>';
  }

  function _pill(text) {
    return '<span style="display:inline-block;background:#1e2a3a;border:1px solid #2a3f55;border-radius:4px;padding:2px 7px;font-size:11px;color:#c8d8e8;margin:2px 3px 2px 0;">' + text + '</span>';
  }

  function _eventRow(e) {
    var t = e.ts ? new Date(e.ts).toLocaleTimeString() : '';
    var d = '';
    try { d = JSON.stringify(e.data || {}); } catch(x) {}
    return '<div style="font-size:11px;padding:3px 0;border-bottom:1px solid #1a2535;display:flex;gap:8px;">' +
      '<span style="color:#555;flex-shrink:0;width:68px;">' + t + '</span>' +
      '<span style="color:#00a8e8;flex-shrink:0;width:130px;">' + (e.event||'') + '</span>' +
      '<span style="color:#8899aa;word-break:break-all;">' + d + '</span>' +
      '</div>';
  }

  function _render() {
    var evts = _events();
    var s    = _compute(evts);

    var statsHtml =
      '<table style="border-collapse:collapse;width:100%;">' +
        _row('Total events',   String(s.total)) +
        _row('NBM shown',      String(s.shownCount)) +
        _row('NBM clicked',    String(s.clickedCount)) +
        _row('Click-through',  s.ctr) +
      '</table>';

    var topShownHtml   = s.topShown.length   ? s.topShown.map(_pill).join('')   : '<span style="color:#555;">none yet</span>';
    var topClickedHtml = s.topClicked.length ? s.topClicked.map(_pill).join('') : '<span style="color:#555;">none yet</span>';

    var tabsHtml = s.recentTabs.length
      ? s.recentTabs.map(function(e){ return _pill((e.data&&e.data.from||'?')+' \u2192 '+(e.data&&e.data.to||'?')); }).join('')
      : '<span style="color:#555;">none yet</span>';

    var inputsHtml = s.recentInputs.length
      ? s.recentInputs.map(function(e){ return _pill(e.data&&e.data.field_name||'?'); }).join('')
      : '<span style="color:#555;">none yet</span>';

    var returnsHtml = s.recentReturns.length
      ? s.recentReturns.map(function(e){
          var n = e.data&&e.data.session_n ? '#'+e.data.session_n : '';
          var t = e.ts ? new Date(e.ts).toLocaleString() : '';
          return _pill(n + (t ? ' \u00b7 ' + t : ''));
        }).join('')
      : '<span style="color:#555;">none yet</span>';

    var rawHtml = s.latest50.length
      ? s.latest50.map(_eventRow).join('')
      : '<span style="color:#555;font-size:12px;">No events recorded yet.</span>';

    var movePerfHtml = s.movePerf.length
      ? '<table style="border-collapse:collapse;width:100%;">' +
        '<tr style="color:#555;font-size:10px;"><td style="padding:2px 10px 6px 0;">MOVE</td><td style="padding:2px 10px 6px 0;">SHOWN</td><td style="padding:2px 10px 6px 0;">CLICKED</td><td style="padding:2px 0 6px 0;">CTR</td></tr>' +
        s.movePerf.map(function(m) {
          var ctrColor = parseInt(m.ctr) >= 50 ? '#4caf7d' : parseInt(m.ctr) >= 20 ? '#e8c84a' : '#e87a4a';
          return '<tr>' +
            '<td style="color:#c8d8e8;padding:3px 10px 3px 0;">' + m.id + '</td>' +
            '<td style="color:#888;padding:3px 10px 3px 0;">' + m.shown + '</td>' +
            '<td style="color:#888;padding:3px 10px 3px 0;">' + m.clicked + '</td>' +
            '<td style="color:'+ctrColor+';font-weight:700;padding:3px 0;">' + m.ctr + '</td>' +
          '</tr>';
        }).join('') +
        '</table>'
      : '<span style="color:#555;">none yet</span>';

    return _section('Overview', statsHtml) +
           _section('NBM performance by move', movePerfHtml) +
           _section('Top move_ids shown', topShownHtml) +
           _section('Top move_ids clicked', topClickedHtml) +
           _section('Recent tab switches', tabsHtml) +
           _section('Recent inputs edited', inputsHtml) +
           _section('Session returns', returnsHtml) +
           _section('Raw \u2014 latest 50 events', rawHtml);
  }

  // ── Panel DOM ────────────────────────────────────────────
  var _panel = null;

  function _open() {
    if (_panel) { _panel.style.display = 'flex'; _refresh(); return; }

    _panel = document.createElement('div');
    _panel.id = '_tbv-panel';
    _panel.style.cssText = [
      'position:fixed;inset:0;z-index:999999',
      'display:flex;flex-direction:column',
      'background:#0d1520;color:#c8d8e8',
      'font-family:ui-monospace,SFMono-Regular,Menlo,monospace',
      'font-size:12px;line-height:1.5'
    ].join(';');

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0a101a;border-bottom:1px solid #1e2e40;flex-shrink:0;';
    header.innerHTML =
      '<span style="font-weight:700;color:#00a8e8;letter-spacing:0.5px;">TRACENT \u00b7 Telemetry Review</span>' +
      '<div style="display:flex;gap:10px;">' +
        '<button id="_tbv-refresh" style="background:#1e2a3a;border:1px solid #2a3f55;color:#c8d8e8;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px;">Refresh</button>' +
        '<button id="_tbv-close" style="background:none;border:none;color:#666;font-size:18px;cursor:pointer;line-height:1;padding:0 4px;">&times;</button>' +
      '</div>';

    var body = document.createElement('div');
    body.id = '_tbv-body';
    body.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';

    _panel.appendChild(header);
    _panel.appendChild(body);
    document.body.appendChild(_panel);

    document.getElementById('_tbv-refresh').onclick = _refresh;
    document.getElementById('_tbv-close').onclick   = _close;

    _refresh();
  }

  function _refresh() {
    var body = document.getElementById('_tbv-body');
    if (body) body.innerHTML = _render();
  }

  function _close() {
    if (_panel) _panel.style.display = 'none';
  }

  // ── Public API ───────────────────────────────────────────
  window._tbvOpen  = _open;
  window._tbvClose = _close;

  // ── Auto-open on ?_tbv=1 ────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { if (_shouldAutoOpen()) _open(); });
  } else {
    if (_shouldAutoOpen()) _open();
  }

})();
