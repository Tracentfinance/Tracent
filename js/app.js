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
    return sign + abs.toLocaleString();
  }
  function g(){ return window.G || null; }

  /* ── session state ──────────────────────────────────────── */
  var SEEN_KEY      = 'tracent_dashboard_seen_count';
  var WAITLIST_KEY  = 'tracent_waitlist_email';
  var PREMIUM_SHOWN = 'tracent_premium_shown_ts';

  function sessionCount(){
    try { return Number(localStorage.getItem(SEEN_KEY)||'0'); } catch(e){ return 0; }
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
    // Refresh premium teaser visibility immediately
    var el = document.getElementById('v21-premium-teaser');
    if (el && !window._tracentPlus) el.style.display = 'block';
  }
  window.tracent_markDepthAttempt = markDepthAttempt;

  // Patch depth-feature entry points to mark depth attempt
  var _origOpenSalary = window.openSalaryNegotiation;
  window.openSalaryNegotiation = function(){
    markDepthAttempt();
    if (typeof _origOpenSalary === 'function') _origOpenSalary();
  };
  // openWhatIf depth trigger
  var _origOpenWhatIf = window.openWhatIf;
  window.openWhatIf = function(){
    markDepthAttempt();
    if (typeof _origOpenWhatIf === 'function') _origOpenWhatIf();
  };

  var _origOpenScenarios = window.openScenarios;
  window.openScenarios = function(){
    markDepthAttempt();
    if (typeof _origOpenScenarios === 'function') _origOpenScenarios();
  };

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
    var moves = (typeof v21GetRankedMoves === 'function') ? v21GetRankedMoves() : [];
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
          '<div class="tret-signal-label">✅ This week\'s win</div>' +
          '<div class="tret-signal-text">' +
            (win ? win.text : (score && score >= 65 ? 'Score is holding steady above 65' : 'Complete a full re-analysis to surface wins')) +
          '</div>' +
        '</div>' +
        '<div class="tret-signal tret-drag">' +
          '<div class="tret-signal-label">⚠️ Biggest drag</div>' +
          '<div class="tret-signal-text">' +
            (drag ? drag.text : (gv && (gv.ccDebt||0) > 0 ? 'CC interest cost: ' + fmt(Math.round((gv.ccDebt||0)*(gv.ccRate||21)/100/12)) + '/mo' : 'No active drag factors found')) +
          '</div>' +
        '</div>' +
      '</div>' +

      // Next 7-day action
      '<div class="tret-next-action">' +
        '<div class="tret-next-label">📍 Your one move this week</div>' +
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
    var moves     = (typeof v21GetRankedMoves === 'function') ? v21GetRankedMoves() : [];

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
      var efMonths = gv ? parseInt(gv.emergency||'0') : 0;
      var totalDebt= gv ? ((gv.ccDebt||0)+(gv.carDebt||0)+(gv.studentDebt||0)+(gv.otherDebt||0)) : 0;

      if (delta !== null && delta < -3) return {
        type:'change', title:'Change course',
        body: 'Your score dropped ' + Math.abs(delta) + ' points. ' +
          (fcf < 0 ? 'Spending is exceeding income — that\'s the first thing to fix.' :
           totalDebt > 0 && (gv.ccDebt||0) > 0 ? 'The credit card balance is the highest-leverage thing to reduce.' :
           efMonths < 2 ? 'Your emergency fund is low — that\'s the resilience gap.' :
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
          '<div class="tret-signal-label">📈 Biggest gain</div>' +
          '<div class="tret-signal-text">' + (wins[0] ? wins[0].text : 'Complete analysis to see gains') + '</div>' +
        '</div>' +
        '<div class="tret-signal tret-drag">' +
          '<div class="tret-signal-label">🚧 Biggest blocker</div>' +
          '<div class="tret-signal-text">' + (drags[0] ? drags[0].text : (gv && (gv.ccDebt||0)>0 ? 'CC debt at '+(gv.ccRate||21)+'%' : 'No major blockers identified')) + '</div>' +
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
      icon: '📈', label: 'Got a raise',
      steps: [
        { n:1, title:'Don\'t inflate your lifestyle first', body:'Wait 30 days before changing spending. Use the pause to decide intentionally where the extra income goes.' },
        { n:2, title:'Allocate the increase in priority order', body:'(1) Top up emergency fund if under 3 months. (2) Increase retirement contribution to capture any match gap. (3) Direct remainder to your primary goal: debt, deposit, or investment.' },
        { n:3, title:'Update your income in Tracent', body:'Tap "Update my numbers" in Settings. Your score, DTI, and NBM will recalculate with the new figure.' }
      ]
    },
    new_job: {
      icon: '🚀', label: 'New job',
      steps: [
        { n:1, title:'Check your benefits before your first payday', body:'Confirm 401k enrollment, match vesting schedule, and health coverage. Gaps in the first 30 days cost real money.' },
        { n:2, title:'Do not change your spending rate yet', body:'Income may shift during the transition. Keep your old budget for 60 days and treat any difference as a buffer.' },
        { n:3, title:'Update Tracent with your new income and state', body:'Your tax rate, take-home estimate, and market benchmarks all depend on your employer state. Re-run analysis after updating.' }
      ]
    },
    job_loss: {
      icon: '⚠️', label: 'Job loss',
      steps: [
        { n:1, title:'Pause all non-essential savings and investments', body:'Protect cash flow first. Redirect freed-up money to covering fixed obligations: housing, food, minimum debt payments.' },
        { n:2, title:'Activate emergency fund — that\'s what it\'s for', body:'This is the scenario it was built for. Use it without guilt. Replenishing it is a future problem.' },
        { n:3, title:'Update Tracent to reflect current income', body:'Set income to $0 or your severance/unemployment amount. Your score will reflect reality and your roadmap will shift to a stability-first plan.' }
      ]
    },
    move: {
      icon: '📦', label: 'Moving home',
      steps: [
        { n:1, title:'Calculate your full cost-of-move, not just rent', body:'Add: deposits, movers, overlap rent, setup costs. Most people underestimate by 40%. Budget that number before committing.' },
        { n:2, title:'If buying: check your DTI before applying', body:'Your DTI after the purchase will determine your rate. Run the Tracent Home mode with the new target price before you get pre-approved.' },
        { n:3, title:'Update your housing inputs after you move', body:'Rent, mortgage, location, and housing costs all affect your score. Update in Settings and re-run analysis once you\'re settled.' }
      ]
    },
    new_baby: {
      icon: '👶', label: 'New baby',
      steps: [
        { n:1, title:'Childcare cost must enter your budget now', body:'Average US childcare runs $1,200–$2,400/month. If it\'s not in your plan, your free cash flow figure is wrong. Add it before making any other financial moves.' },
        { n:2, title:'Build emergency fund to 6 months', body:'The standard 3-month target was set for two adults without dependents. With a child, the downside of a cash shortfall is significantly higher. Extend the target.' },
        { n:3, title:'Review beneficiaries and insurance', body:'Life insurance needs and beneficiary designations change immediately. These are outside Tracent\'s scope but urgent. Handle them within 90 days.' }
      ]
    },
    major_purchase: {
      icon: '🛒', label: 'Major purchase',
      steps: [
        { n:1, title:'Run the "What if" scenario before committing', body:'A large purchase affects your emergency fund, DTI, and free cash flow simultaneously. Understand the post-purchase position before you sign anything.' },
        { n:2, title:'Check whether debt financing makes sense', body:'If financing: compare the APR against your highest-return alternative. Financing a depreciating asset at 8%+ while holding CC debt at 20% is the wrong sequence.' },
        { n:3, title:'Update Tracent after the purchase', body:'Adjust savings, any new debt, and monthly payment. Your score and roadmap will reflect the new baseline.' }
      ]
    },
    rate_drop: {
      icon: '📉', label: 'Rate drop',
      steps: [
        { n:1, title:'Check your break-even before refinancing', body:'Closing costs typically run 1.5–3% of your loan. Divide that by your monthly savings. If break-even is under 24 months and you plan to stay, refinancing likely makes sense.' },
        { n:2, title:'Get three quotes on the same day', body:'Rates vary between lenders. Comparing quotes within a 24-hour window ensures you\'re comparing equivalent market conditions.' },
        { n:3, title:'Open the Rate Simulator tab', body:'Enter the new rate to see your exact payment change, break-even, and lifetime interest savings. Then decide.' }
      ]
    },
    debt_milestone: {
      icon: '🏁', label: 'Debt payoff milestone',
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
    if (typeof v21ShowToast === 'function') v21ShowToast('Check-in saved ✓');
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

  // Refresh premium teaser visibility after render
  var _prevRPAfull = window.v21RenderPostAnalysis;
  window.v21RenderPostAnalysis = function(){
    if (typeof _prevRPAfull === 'function') _prevRPAfull();
    var el = document.getElementById('v21-premium-teaser');
    if (el && !window._tracentPlus){
      el.style.display = premiumEligible() ? 'block' : 'none';
    }
    // ── Supabase persist (inputs only) ──
    if (typeof TracentSupabase !== 'undefined' && TracentSupabase.isConfigured()) {
      try { TracentSupabase.saveProfile(); } catch(e) {}
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

  // ── Global recompute + render utilities ──
  // Called by settings saves or any module that needs a full refresh.
  window.recomputeAll = function() {
    try {
      if (typeof G !== 'undefined') window.G = G;
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
    // ── Supabase boot: load inputs, merge into G ──
    if (typeof TracentSupabase !== 'undefined' && TracentSupabase.isConfigured()) {
      TracentSupabase.loadProfile().then(function(data) {
        // Guard: skip if data is absent or too sparse to be a real profile
        if (!data || Object.keys(data).length < 3) return;
        var g = window.G || {};
        Object.assign(g, data);
        // Never allow derived values from stored data
        delete g.fcf; delete g.dti; delete g.totalDebt; delete g.totalPayments;
        window.G = g;
        console.log('[Tracent:App] Hydrated safely', Object.keys(data).length, 'fields');
      }).catch(function(e) {
        console.warn('[Tracent:App] Profile load error:', e);
      });
    }

    var premSub = document.querySelector('#v21-premium-teaser .v21-premium-sub');
    if (premSub) premSub.textContent = 'Edge extends your free plan with continuity: monthly digests, saved scenarios, deeper AI analysis, and salary coaching — built for people already using Tracent, not just starting.';
    var premTitle = document.querySelector('#v21-premium-teaser .v21-premium-title');
    if (premTitle) premTitle.textContent = 'Keep the momentum going with Edge';
    // Update the premium teaser CTA text
    var premCta = document.querySelector('#v21-premium-teaser .btn-cta');
    if (premCta && !hasRealStripe()) premCta.textContent = 'Request access \u2192';
    else if (premCta) premCta.textContent = 'Unlock Edge \u2192';
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
